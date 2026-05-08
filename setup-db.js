/**
 * setup-db.js
 * Jalankan: node setup-db.js
 * Script ini membuat database (jika belum ada) lalu menjalankan schema.
 */
require('dotenv').config();
const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'buku_induk_db';

async function main() {
  // 1. Konek ke database 'postgres' untuk buat database baru
  const admin = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });

  try {
    await admin.connect();
    console.log('✅ Terhubung ke PostgreSQL (database: postgres)');

    const exists = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]
    );
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✅ Database "${DB_NAME}" berhasil dibuat`);
    } else {
      console.log(`ℹ️  Database "${DB_NAME}" sudah ada`);
    }
  } finally {
    await admin.end();
  }

  // 2. Konek ke database baru, jalankan schema
  const db = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: DB_NAME,
  });

  try {
    await db.connect();
    console.log(`✅ Terhubung ke database "${DB_NAME}"`);
    const sql = fs.readFileSync(path.join(__dirname, 'src/database/schema.sql'), 'utf8');
    await db.query(sql);
    console.log('✅ Schema berhasil dijalankan!');
    console.log('');
    console.log('🚀 Sekarang jalankan: npm run dev');
    console.log('🌐 Buka browser: http://localhost:3000');
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error('');
  console.error('Pastikan PostgreSQL berjalan dan cek file .env:');
  console.error('  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD');
  process.exit(1);
});
