const pool = require('../config/database');
const fs   = require('fs');
const path = require('path');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Menjalankan migrasi database...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Migrasi berhasil!');
  } catch (err) {
    console.error('❌ Migrasi gagal:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
