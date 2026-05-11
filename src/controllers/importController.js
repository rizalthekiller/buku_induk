const pool = require('../config/database');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { generateNomorInduk, incrementFormattedNumber } = require('../utils/numberGenerator');

const MAPPINGS = {
  judul: ['judul', 'nama buku', 'title', 'name', 'judul buku', 'judul jurnal'],
  pengarang: ['pengarang', 'penulis', 'author', 'writer'],
  penerbit: ['penerbit', 'publisher'],
  tahun_terbit: ['tahun', 'tahun terbit', 'year', 'tahun volume'],
  kota_terbit: ['kota', 'tempat terbit', 'city', 'kota terbit', 'tempat'],
  isbn: ['isbn', 'issn'],
  klasifikasi: ['klasifikasi', 'ddc', 'class', 'nomor klasifikasi', 'no. kls'],
  subjek: ['subjek', 'subject', 'topik', 'subyek'],
  nomor_induk: ['no induk', 'nomor induk', 'barcode', 'id buku', 'no. induk', 'nomor', 'no.induk'],
  sumber_perolehan: ['sumber', 'asal', 'perolehan', 'source', 'sumber perolehan'],
  jumlah_eksemplar: ['jumlah', 'qty', 'stok', 'eksemplar', 'jumlah eksemplar'],
  fisik: ['fisik', 'deskripsi fisik', 'ukuran', 'halaman'],
  penanggung_jawab: ['penanggung jawab', 'editor', 'pj'],
  edisi_cetakan: ['edisi', 'cetakan', 'edisi cetakan'],
  tanggal_olah: ['tgl olah', 'tanggal olah', 'tgl. olah', 'tanggal'],
  tanggal_entri: ['tgl entri', 'tanggal entri', 'tgl. entri']
};

function findField(header) {
  const h = header.toLowerCase().trim();
  for (const field in MAPPINGS) {
    if (MAPPINGS[field].some(syn => h.includes(syn) || syn.includes(h))) {
      return field;
    }
  }
  return null;
}

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    // Handle dd/mm/yyyy
    const parts = val.split(/[/-]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parseInt(parts[2]);
      if (y < 100) { // Handle 2-digit year if necessary
        const fullY = y + (y > 30 ? 1900 : 2000);
        return new Date(fullY, m, d);
      }
      return new Date(y, m, d);
    }
  }
  return val;
}

async function smartImport(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet(1);

    const headers = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString() : null;
    });

    const colMap = {};
    headers.forEach((h, idx) => {
      if (h) {
        const field = findField(h);
        if (field) colMap[idx] = field;
      }
    });

    const client = await pool.connect();
    let successCount = 0;
    let failCount = 0;

    try {
      await client.query('BEGIN');
      
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        if (!row.getCell(1).value && !row.getCell(2).value) continue; // Skip empty rows

        const bookData = {};
        row.eachCell((cell, colNumber) => {
          const field = colMap[colNumber];
          if (field) {
            let val = cell.value?.result ?? cell.value;
            if (field === 'tanggal_olah' || field === 'tanggal_entri') {
              val = parseExcelDate(val);
            }
            bookData[field] = val;
          }
        });

        if (!bookData.judul) {
          failCount++;
          continue;
        }

        const id = uuidv4();
        const qty = parseInt(bookData.jumlah_eksemplar) || 1;

        // Insert Book
        const fields = ['id', 'judul', 'pengarang', 'penerbit', 'tahun_terbit', 'kota_terbit', 'isbn', 'klasifikasi', 'subjek', 'sumber_perolehan', 'jumlah_eksemplar', 'fisik', 'penanggung_jawab', 'edisi_cetakan', 'tanggal_olah', 'tanggal_entri'];
        const values = fields.map(f => {
          if (f === 'id') return id;
          if (f === 'jumlah_eksemplar') return qty;
          return bookData[f] || (f === 'tanggal_entri' ? new Date() : null);
        });
        
        const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(', ');
        const insertBookSql = `INSERT INTO books (${fields.join(', ')}) VALUES (${placeholders}) RETURNING id`;
        
        await client.query(insertBookSql, values);

        // Insert Exemplars
        let lastUsedNumber = null;
        for (let j = 0; j < qty; j++) {
          let ni;
          if (bookData.nomor_induk) {
            // Prioritaskan nomor dari Excel, gunakan increment jika lebih dari 1 eksemplar
            ni = incrementFormattedNumber(String(bookData.nomor_induk).trim(), j);
            const m = ni.match(/\d+/);
            if (m) lastUsedNumber = Math.max(lastUsedNumber || 0, parseInt(m[0]));
          } else {
            // Gunakan nomor otomatis jika di Excel kosong
            ni = await generateNomorInduk(client);
          }
          
          const bc = `BC-${Date.now()}-${successCount}-${j}`;
          await client.query(
            `INSERT INTO exemplars (book_id, nomor_induk, barcode, kondisi) VALUES ($1, $2, $3, 'Baik')`,
            [id, ni, bc]
          );
          if (j === 0) {
            await client.query(`UPDATE books SET nomor_induk = $1 WHERE id = $2`, [ni, id]);
          }
        }

        // Sinkronisasi counter global agar tidak bentrok dengan buku berikutnya
        if (lastUsedNumber !== null) {
          await client.query(
            "UPDATE settings SET value = $1 WHERE key = 'nomor_induk_counter' AND value::int < $1",
            [String(lastUsedNumber)]
          );
        }

        successCount++;
      }

      await client.query('COMMIT');
      res.json({ 
        success: true, 
        message: `Berhasil mengimpor ${successCount} buku. (Gagal: ${failCount})`,
        mapped_columns: Object.values(colMap)
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memproses file: ' + err.message });
  }
}

async function analyzeImport(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet(1);
    
    const headers = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString() : null;
    });

    const colMap = {};
    const mappingDisplay = [];
    headers.forEach((h, idx) => {
      if (h) {
        const field = findField(h);
        if (field) {
          colMap[idx] = field;
          mappingDisplay.push({ header: h, target: field });
        }
      }
    });

    const samples = [];
    const maxSamples = Math.min(sheet.rowCount, 6);
    for (let i = 2; i <= maxSamples; i++) {
      const row = sheet.getRow(i);
      const sample = {};
      row.eachCell((cell, colNumber) => {
        const field = colMap[colNumber];
        if (field) sample[field] = cell.value?.result ?? cell.value;
      });
      if (Object.keys(sample).length > 0) samples.push(sample);
    }

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        totalRows: sheet.rowCount - 1,
        mappings: mappingDisplay,
        samples: samples
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { smartImport, analyzeImport };
