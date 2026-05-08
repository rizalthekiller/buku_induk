-- ============================================================
--  BUKU INDUK DATABASE SCHEMA
--  PostgreSQL
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. Tabel SETTINGS (konfigurasi global)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(100) UNIQUE NOT NULL,
    value       TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('nomor_induk_format', '{PREFIX}/{TAHUN}/{NO}'),
  ('nomor_induk_prefix', 'INDUK'),
  ('nomor_induk_padding', '6'),
  ('nomor_induk_counter', '0'),
  ('app_name', 'Sistem Buku Induk Perpustakaan'),
  ('app_institution', 'UIN Samarinda')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. Tabel BOOKS (data buku utama)
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_induk         VARCHAR(100),
    nomor_registrasi    VARCHAR(100),
    judul               TEXT NOT NULL,
    pengarang           TEXT,
    penanggung_jawab    TEXT,
    penerbit            TEXT,
    tahun_terbit        VARCHAR(10),
    kota_terbit         VARCHAR(100),
    edisi_cetakan       VARCHAR(50),
    isbn                VARCHAR(50),
    fisik               VARCHAR(100),
    klasifikasi         VARCHAR(50),
    subjek              TEXT,
    call_number         VARCHAR(100),
    tanggal_olah        DATE,
    tanggal_entri       DATE DEFAULT CURRENT_DATE,
    sumber_perolehan    VARCHAR(255),
    jumlah_eksemplar    INTEGER DEFAULT 1,
    custom_data         JSONB DEFAULT '{}',
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. Tabel EXEMPLARS (nomor induk per eksemplar)
-- ============================================================
CREATE TABLE IF NOT EXISTS exemplars (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    nomor_induk     VARCHAR(100) UNIQUE NOT NULL,
    barcode         VARCHAR(100) UNIQUE,
    kondisi         VARCHAR(50) DEFAULT 'Baik',
    lokasi_rak      VARCHAR(100),
    keterangan      TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. Tabel CUSTOM_COLUMNS (kolom dinamis)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_columns (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name  VARCHAR(100) UNIQUE NOT NULL,
    label       VARCHAR(100) NOT NULL,
    data_type   VARCHAR(50) DEFAULT 'text',
    width       INTEGER DEFAULT 150,
    is_required BOOLEAN DEFAULT false,
    is_visible  BOOLEAN DEFAULT true,
    is_frozen   BOOLEAN DEFAULT false,
    order_no    INTEGER DEFAULT 999,
    bg_color    VARCHAR(20) DEFAULT '#FFFFFF',
    text_color  VARCHAR(20) DEFAULT '#000000',
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. Tabel COLUMN_STYLES (warna header kolom bawaan)
-- ============================================================
CREATE TABLE IF NOT EXISTS column_styles (
    id          SERIAL PRIMARY KEY,
    field_name  VARCHAR(100) UNIQUE NOT NULL,
    label       VARCHAR(100),
    bg_color    VARCHAR(20) DEFAULT '#4A90D9',
    text_color  VARCHAR(20) DEFAULT '#FFFFFF',
    width       INTEGER DEFAULT 150,
    order_no    INTEGER DEFAULT 0,
    is_visible  BOOLEAN DEFAULT true,
    is_frozen   BOOLEAN DEFAULT false
);

-- Default column styles
INSERT INTO column_styles (field_name, label, bg_color, text_color, width, order_no, is_frozen) VALUES
  ('no',               'No',               '#374151', '#FFFFFF', 60,  1,  true),
  ('nomor_induk',      'Nomor Induk',      '#1D4ED8', '#FFFFFF', 140, 2,  true),
  ('judul',            'Judul',            '#DB2777', '#FFFFFF', 280, 3,  false),
  ('pengarang',        'Pengarang',        '#7C3AED', '#FFFFFF', 200, 4,  false),
  ('penanggung_jawab', 'Penanggung Jawab', '#9D174D', '#FFFFFF', 180, 5,  false),
  ('penerbit',         'Penerbit',         '#065F46', '#FFFFFF', 180, 6,  false),
  ('tahun_terbit',     'Tahun Terbit',     '#92400E', '#FFFFFF', 110, 7,  false),
  ('kota_terbit',      'Kota Terbit',      '#1E40AF', '#FFFFFF', 130, 8,  false),
  ('edisi_cetakan',    'Edisi/Cetakan',    '#4C1D95', '#FFFFFF', 130, 9,  false),
  ('isbn',             'ISBN',             '#1E7DA6', '#FFFFFF', 150, 10, false),
  ('fisik',            'Deskripsi Fisik',  '#155E75', '#FFFFFF', 160, 11, false),
  ('klasifikasi',      'Klasifikasi',      '#166534', '#FFFFFF', 120, 12, false),
  ('subjek',           'Subjek',           '#92400E', '#FFFFFF', 180, 13, false),
  ('call_number',      'Call Number',      '#7C2D12', '#FFFFFF', 140, 14, false),
  ('tanggal_olah',     'Tanggal Olah',     '#374151', '#FFFFFF', 130, 15, false),
  ('tanggal_entri',    'Tanggal Entri',    '#374151', '#FFFFFF', 130, 16, false),
  ('sumber_perolehan', 'Sumber Perolehan', '#1F2937', '#FFFFFF', 160, 17, false),
  ('jumlah_eksemplar', 'Jml Eks',          '#7C3AED', '#FFFFFF', 80,  18, false)
ON CONFLICT (field_name) DO NOTHING;

-- ============================================================
-- 6. Tabel TEMPLATES (template buku induk)
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        VARCHAR(100) NOT NULL,
    deskripsi   TEXT,
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO templates (nama, deskripsi, config) VALUES
  ('Buku Induk Umum',     'Template standar untuk koleksi umum',    '{"prefix":"UMUM"}'),
  ('Buku Induk Referensi','Template untuk koleksi referensi',        '{"prefix":"REF"}'),
  ('Buku Induk Tandon',   'Template untuk koleksi tandon',           '{"prefix":"TDN"}'),
  ('Buku Induk Skripsi',  'Template untuk koleksi skripsi/TA',       '{"prefix":"SKR"}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_books_nomor_induk  ON books(nomor_induk);
CREATE INDEX IF NOT EXISTS idx_books_judul        ON books USING GIN (to_tsvector('simple', judul));
CREATE INDEX IF NOT EXISTS idx_books_isbn         ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_exemplars_book_id  ON exemplars(book_id);
