const pool = require('../config/database');

// GET /api/settings
async function getSettings(req, res) {
  try {
    const result = await pool.query('SELECT key, value FROM settings ORDER BY key');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/settings
async function updateSettings(req, res) {
  const client = await pool.connect();
  try {
    const updates = req.body; // { key: value, ... }
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(updates)) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Pengaturan disimpan' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// GET /api/templates
async function getTemplates(req, res) {
  try {
    const result = await pool.query('SELECT * FROM templates ORDER BY nama');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/templates
async function createTemplate(req, res) {
  try {
    const { nama, deskripsi, config } = req.body;
    if (!nama) return res.status(400).json({ success: false, message: 'Nama template wajib diisi' });
    const result = await pool.query(
      'INSERT INTO templates (nama, deskripsi, config) VALUES ($1, $2, $3) RETURNING *',
      [nama, deskripsi, JSON.stringify(config || {})]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/templates/:id
async function deleteTemplate(req, res) {
  try {
    await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Template dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/stats
async function getStats(req, res) {
  try {
    const [total, eksemplar, tahun] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM books'),
      pool.query('SELECT COALESCE(SUM(jumlah_eksemplar),0) as total FROM books'),
      pool.query(`SELECT tahun_terbit, COUNT(*) as jumlah FROM books
                  WHERE tahun_terbit IS NOT NULL GROUP BY tahun_terbit ORDER BY tahun_terbit DESC LIMIT 10`),
    ]);
    res.json({
      success: true,
      data: {
        total_judul:    parseInt(total.rows[0].total),
        total_eksemplar:parseInt(eksemplar.rows[0].total),
        per_tahun:      tahun.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/nomor-preview  - preview format nomor induk
async function previewNomor(req, res) {
  try {
    const BULAN_ROMAWI = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    const result = await pool.query('SELECT key, value FROM settings ORDER BY key');
    const s = {};
    result.rows.forEach(r => { s[r.key] = r.value; });

    const format  = req.query.format  || s['nomor_induk_format']  || '{NO}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}';
    const unit    = req.query.unit    || s['nomor_induk_unit']    || 'UPT-Lib-BP';
    const padding = parseInt(req.query.padding || s['nomor_induk_padding']) || 5;
    const counter = parseInt(req.query.counter || s['nomor_induk_counter'] || '0') + 1;

    const now   = new Date();
    const tahun = now.getFullYear();
    const bulan = String(now.getMonth() + 1).padStart(2, '0');
    const bulanRomawi = BULAN_ROMAWI[now.getMonth()];
    const no    = String(counter).padStart(padding, '0');

    const preview = format
      .replace('{NO}',           no)
      .replace('{UNIT}',         unit)
      .replace('{PREFIX}',       unit)
      .replace('{BULAN_ROMAWI}', bulanRomawi)
      .replace('{BULAN}',        bulan)
      .replace('{TAHUN}',        tahun);

    res.json({ success: true, preview, counter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getSettings, updateSettings, getTemplates, createTemplate, deleteTemplate, getStats, previewNomor };
