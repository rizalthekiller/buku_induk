const pool = require('../config/database');
const { suggestDDC } = require('../utils/ddcMapper');
const { enrichBookData, suggestDDCByAI } = require('../utils/aiAssistant');
const { generateNomorInduk, incrementFormattedNumber, generateCutter } = require('../utils/numberGenerator');


// =============================================
// Helper: Auto Call Number
// =============================================
function generateCallNumber({ klasifikasi, pengarang, judul }) {
  const klas   = klasifikasi || '000';
  const cutter = generateCutter(pengarang);
  const judulKode = judul ? judul.charAt(0).toLowerCase() : 'x';
  return `${klas}\n${cutter}\n${judulKode}`;
}

// =============================================
// GET /api/books  - list dengan pagination & filter
// =============================================
async function getBooks(req, res) {
  try {
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(100, parseInt(req.query.limit) || 50);
    const offset  = (page - 1) * limit;
    const search  = req.query.search || '';
    const sortBy  = req.query.sort_by  || 'created_at';
    const sortDir = req.query.sort_dir === 'asc' ? 'ASC' : 'DESC';

    const allowedSort = ['judul','pengarang','nomor_induk','tahun_terbit','penerbit','created_at','tanggal_entri'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'created_at';

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE (judul ILIKE $${params.length} OR pengarang ILIKE $${params.length} OR nomor_induk ILIKE $${params.length} OR isbn ILIKE $${params.length})`;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM books ${whereClause}`, params);
    const total    = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT *, ROW_NUMBER() OVER (ORDER BY ${safeSort} ${sortDir}) AS no
       FROM books ${whereClause}
       ORDER BY ${safeSort} ${sortDir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: dataRes.rows,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// =============================================
// GET /api/books/:id
// =============================================
async function getBookById(req, res) {
  try {
    const { id } = req.params;
    const bookRes = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (!bookRes.rows.length) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });

    const exemplarsRes = await pool.query('SELECT * FROM exemplars WHERE book_id = $1 ORDER BY created_at', [id]);
    res.json({ success: true, data: { ...bookRes.rows[0], exemplars: exemplarsRes.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// =============================================
// POST /api/books  - tambah buku + generate eksemplar
// =============================================
async function createBook(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      nomor_induk: manualNomorInduk,
      judul, pengarang, penanggung_jawab, penerbit, tahun_terbit,
      kota_terbit, edisi_cetakan, isbn, fisik, klasifikasi, subjek,
      call_number: manualCallNumber, tanggal_olah, sumber_perolehan,
      jumlah_eksemplar = 1, custom_data = {}
    } = req.body;

    if (!judul) throw new Error('Judul wajib diisi');

    // Auto call number jika kosong
    const call_number = manualCallNumber || generateCallNumber({ klasifikasi, pengarang, judul });

    // Insert buku
    const bookRes = await client.query(
      `INSERT INTO books
        (judul, pengarang, penanggung_jawab, penerbit, tahun_terbit,
         kota_terbit, edisi_cetakan, isbn, fisik, klasifikasi, subjek,
         call_number, tanggal_olah, sumber_perolehan, jumlah_eksemplar,
         tanggal_entri, custom_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_DATE,$16)
       RETURNING *`,
      [judul, pengarang, penanggung_jawab, penerbit, tahun_terbit,
       kota_terbit, edisi_cetakan, isbn, fisik, klasifikasi, subjek,
       call_number, tanggal_olah, sumber_perolehan, jumlah_eksemplar,
       JSON.stringify(custom_data)]
    );
    const book = bookRes.rows[0];

    // Generate eksemplar + nomor induk per copy
    const exemplars = [];
    let lastUsedNumber = null;

    for (let i = 0; i < jumlah_eksemplar; i++) {
      let nomorInduk;
      if (manualNomorInduk && manualNomorInduk.trim()) {
        // Smart increment dari nomor manual
        nomorInduk = incrementFormattedNumber(manualNomorInduk.trim(), i);
        
        // Simpan angka terakhir untuk update counter nanti
        const m = nomorInduk.match(/\d+/);
        if (m) lastUsedNumber = Math.max(lastUsedNumber || 0, parseInt(m[0]));
      } else {
        nomorInduk = await generateNomorInduk(client);
      }
      
      const barcode = `BK-${Date.now()}-${i + 1}`;
      const exRes = await client.query(
        `INSERT INTO exemplars (book_id, nomor_induk, barcode)
         VALUES ($1, $2, $3) RETURNING *`,
        [book.id, nomorInduk, barcode]
      );
      exemplars.push(exRes.rows[0]);
    }

    // Jika manual, sinkronkan counter di settings agar tidak bentrok di buku berikutnya
    if (lastUsedNumber !== null) {
      await client.query(
        "UPDATE settings SET value = $1 WHERE key = 'nomor_induk_counter' AND value::int < $1",
        [String(lastUsedNumber)]
      );
    }

    // Update nomor_induk buku = nomor induk pertama
    await client.query('UPDATE books SET nomor_induk = $1, updated_at = NOW() WHERE id = $2', [exemplars[0].nomor_induk, book.id]);
    book.nomor_induk = exemplars[0].nomor_induk;

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { ...book, exemplars }, message: `Buku berhasil ditambah dengan ${jumlah_eksemplar} eksemplar` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// =============================================
// PUT /api/books/:id  - update buku
// =============================================
async function updateBook(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const fields = ['nomor_induk','judul','pengarang','penanggung_jawab','penerbit','tahun_terbit',
                    'kota_terbit','edisi_cetakan','isbn','fisik','klasifikasi','subjek',
                    'call_number','tanggal_olah','sumber_perolehan','custom_data','jumlah_eksemplar'];

    const sets   = [];
    const values = [];
    let   idx    = 1;

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = $${idx++}`);
        values.push(f === 'custom_data' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    });

    await client.query('BEGIN');

    // Ambil data lama untuk cek nomor_induk dan jumlah_eksemplar
    const oldBookRes = await client.query('SELECT nomor_induk, jumlah_eksemplar FROM books WHERE id = $1', [id]);
    if (!oldBookRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
    }
    const oldNomorInduk = oldBookRes.rows[0].nomor_induk;
    const oldQty        = parseInt(oldBookRes.rows[0].jumlah_eksemplar) || 0;

    let newBook;
    if (sets.length) {
      sets.push(`updated_at = NOW()`);
      values.push(id);
      const result = await client.query(
        `UPDATE books SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      newBook = result.rows[0];
    } else {
      const currentRes = await client.query('SELECT * FROM books WHERE id = $1', [id]);
      newBook = currentRes.rows[0];
    }

    const newQty  = parseInt(newBook.jumlah_eksemplar);
    
    // 1. Jika nomor_induk berubah, update eksemplar pertama (atau yang lama)
    if (req.body.nomor_induk !== undefined && req.body.nomor_induk !== oldNomorInduk) {
      await client.query(
        `UPDATE exemplars SET nomor_induk = $1 
         WHERE book_id = $2 AND (nomor_induk = $3 OR id = (SELECT id FROM exemplars WHERE book_id = $2 ORDER BY created_at ASC LIMIT 1))`,
        [newBook.nomor_induk, id, oldNomorInduk]
      );
    }

    // 2. Sesuaikan jumlah record di tabel exemplars berdasarkan jumlah asli di DB
    const countRes = await client.query('SELECT COUNT(*) FROM exemplars WHERE book_id = $1', [id]);
    const actualQty = parseInt(countRes.rows[0].count);

    if (newQty !== actualQty) {
      if (newQty > actualQty) {
        // Tambah eksemplar baru
        let lastUsedNumber = null;
        for (let i = actualQty; i < newQty; i++) {
          const nextNomor = incrementFormattedNumber(newBook.nomor_induk, i);
          const barcode   = `BK-${Date.now()}-${i + 1}`;
          await client.query(
            `INSERT INTO exemplars (book_id, nomor_induk, barcode) VALUES ($1, $2, $3)`,
            [id, nextNomor, barcode]
          );
          
          const m = nextNomor.match(/\d+/);
          if (m) lastUsedNumber = Math.max(lastUsedNumber || 0, parseInt(m[0]));
        }
        // Sinkronkan counter global
        if (lastUsedNumber !== null) {
          await client.query(
            "UPDATE settings SET value = $1 WHERE key = 'nomor_induk_counter' AND value::int < $1",
            [String(lastUsedNumber)]
          );
        }
      } else {
        // Kurangi eksemplar (hapus yang terbaru)
        await client.query(
          `DELETE FROM exemplars WHERE id IN (
            SELECT id FROM exemplars WHERE book_id = $1 ORDER BY created_at DESC LIMIT $2
          )`,
          [id, actualQty - newQty]
        );
      }
    }


    await client.query('COMMIT');

    res.json({ success: true, data: newBook, message: 'Buku berhasil diperbarui' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// =============================================
// DELETE /api/books/:id
// =============================================
async function deleteBook(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
    res.json({ success: true, message: 'Buku berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// =============================================
// PATCH /api/books/:id/cell  - inline edit single cell
// =============================================
async function updateCell(req, res) {
  const client = await pool.connect();
  try {
    const { id }    = req.params;
    const { field, value } = req.body;

    const allowedFields = ['nomor_induk','judul','pengarang','penanggung_jawab','penerbit','tahun_terbit',
                           'kota_terbit','edisi_cetakan','isbn','fisik','klasifikasi','subjek',
                           'call_number','tanggal_olah','sumber_perolehan', 'jumlah_eksemplar'];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: `Field '${field}' tidak diizinkan diedit` });
    }

    await client.query('BEGIN');

    const oldBookRes = await client.query('SELECT nomor_induk FROM books WHERE id = $1', [id]);
    if (!oldBookRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Buku tidak ditemukan' });
    }
    const oldNomorInduk = oldBookRes.rows[0].nomor_induk;

    const result = await client.query(
      `UPDATE books SET ${field} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [value, id]
    );

    // Sync nomor_induk ke exemplars jika diubah
    if (field === 'nomor_induk' && value !== oldNomorInduk) {
      await client.query(
        `UPDATE exemplars SET nomor_induk = $1 
         WHERE book_id = $2 AND (nomor_induk = $3 OR id = (SELECT id FROM exemplars WHERE book_id = $2 ORDER BY created_at ASC LIMIT 1))`,
        [value, id, oldNomorInduk]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// =============================================
// GET /api/books/auto-cutter?name=...
// =============================================
function autoCutter(req, res) {
  const { name } = req.query;
  res.json({ success: true, cutter: generateCutter(name || '') });
}

// =============================================
// GET /api/books/suggest-ddc?subject=...
// =============================================
async function suggestDDCHandler(req, res) {
  const { subject } = req.query;
  if (!subject) return res.status(400).json({ success: false, message: 'subject wajib diisi' });
  
  const results = suggestDDC(subject);
  
  // Jika tidak ada hasil lokal, coba AI
  if (results.length === 0) {
    const aiDDC = await suggestDDCByAI(subject);
    if (aiDDC) {
      results.push({ ddc: aiDDC, score: 100, is_ai: true });
    }
  }

  res.json({ success: true, data: results });
}

async function bulkDeleteBooks(req, res) {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: 'ID tidak valid' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM books WHERE id = ANY($1)', [ids]);
    await client.query('COMMIT');
    res.json({ success: true, message: `${ids.length} buku berhasil dihapus` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal menghapus buku secara massal' });
  } finally {
    client.release();
  }
}

// =============================================
// GET /api/books/ai-enrich?title=...
// =============================================
async function aiEnrichHandler(req, res) {
  try {
    const { title, isbn } = req.query;
    if (!title) return res.status(400).json({ success: false, message: 'title wajib diisi' });
    
    const data = await enrichBookData(title, isbn);
    if (!data) return res.status(404).json({ success: false, message: 'AI tidak dapat menemukan data untuk buku ini. Coba judul yang lebih lengkap.' });
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('AI Enrich Error:', err.message);
    const status = err.code === 'QUOTA_EXCEEDED' ? 429 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
}

async function bulkAiEnrichHandler(req, res) {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: 'ID tidak valid' });
  }

  const client = await pool.connect();
  const results = { success: 0, fail: 0, errors: [] };

  try {
    for (const id of ids) {
      try {
        // 1. Ambil judul buku
        const bookRes = await client.query('SELECT judul FROM books WHERE id = $1', [id]);
        if (bookRes.rows.length === 0) continue;
        const title = bookRes.rows[0].judul;

        // 2. Tanya AI
        const aiData = await enrichBookData(title);
        if (!aiData) {
          results.fail++;
          continue;
        }

        // 3. Update buku (hanya field yang masih kosong)
        // Kita ambil data buku saat ini dulu
        const currBook = await client.query('SELECT * FROM books WHERE id = $1', [id]);
        const b = currBook.rows[0];

        const updates = [];
        const values = [];
        let idx = 1;

        const fieldsToEnrich = [
          'pengarang', 'penerbit', 'tahun_terbit', 'kota_terbit', 
          'isbn', 'fisik', 'klasifikasi', 'subjek', 'edisi_cetakan'
        ];

        fieldsToEnrich.forEach(f => {
          // Hanya update jika nilai aslinya kosong/null/000
          const val = b[f];
          const isMissing = !val || val === '000' || val === '0';
          if (isMissing && aiData[f]) {
            updates.push(`${f} = $${idx++}`);
            values.push(aiData[f]);
          }
        });

        if (updates.length > 0) {
          values.push(id);
          await client.query(`UPDATE books SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values);
          results.success++;
        } else {
          results.success++; // Terhitung sukses meski tidak ada yang perlu diupdate
        }

        // Delay sedikit agar tidak terkena rate limit Gemini (sekitar 1-2 detik)
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        console.error(`Error enriching book ${id}:`, err);
        results.fail++;
        results.errors.push({ id, message: err.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Bulk AI Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses AI secara massal' });
  } finally {
    client.release();
  }
}

module.exports = { 
  getBooks, getBookById, createBook, updateBook, 
  deleteBook, bulkDeleteBooks, updateCell, 
  autoCutter, suggestDDCHandler, aiEnrichHandler, bulkAiEnrichHandler
};
