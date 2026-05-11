const pool = require('../src/config/database');

async function debug() {
  const res = await pool.query("SELECT id, judul, pengarang, klasifikasi, call_number FROM books WHERE call_number LIKE '%I M m%' OR call_number LIKE '%SUD m%' LIMIT 10");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
debug();
