const pool = require('../src/config/database');

async function fix2025() {
  console.log("🔍 Memeriksa data 2025...");
  const res = await pool.query(`
    SELECT b.id, b.judul, b.pengarang, b.klasifikasi, b.call_number, e.nomor_induk
    FROM books b
    JOIN exemplars e ON b.id = e.book_id
    WHERE e.nomor_induk LIKE '%/2025'
  `);

  console.log(`Ditemukan ${res.rows.length} eksemplar 2025.`);

  for (const row of res.rows) {
    const { id, judul, pengarang, klasifikasi } = row;
    
    // Logic Cutter: 3 huruf pertama pengarang (bersih), jika kosong gunakan 3 huruf pertama judul
    let cleanAuthor = (pengarang || "").trim().replace(/^(Muhammad|Mohammad|Moh\.|Dr\.|Prof\.|Ir\.|Drs\.)\s+/i, "");
    let cutter = "";
    if (cleanAuthor.length >= 3) {
      cutter = cleanAuthor.substring(0, 3).toUpperCase();
    } else {
      cutter = (judul || "XXX").trim().substring(0, 3).toUpperCase();
    }

    // Logic Title Code: 1 huruf pertama judul (kecil)
    const titleCode = (judul || "x").trim().charAt(0).toLowerCase();

    const newCall = `${klasifikasi || '000'}\n${cutter}\n${titleCode}`;
    
    if (row.call_number !== newCall) {
      // console.log(`Fixing ${row.nomor_induk}: ${row.call_number.replace(/\n/g, ' ')} -> ${newCall.replace(/\n/g, ' ')}`);
      await pool.query("UPDATE books SET call_number = $1 WHERE id = $2", [newCall, id]);
    }
  }

  console.log("✅ Semua Call Number 2025 telah diperbaiki.");
  process.exit(0);
}

fix2025();
