const pool = require('../config/database');

// GET /api/columns
async function getColumns(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM column_styles ORDER BY order_no ASC'
    );
    // Gabungkan dengan custom columns
    const custom = await pool.query(
      'SELECT * FROM custom_columns WHERE is_visible = true ORDER BY order_no ASC'
    );
    res.json({ success: true, data: { builtin: result.rows, custom: custom.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/columns/:field_name  - update style kolom
async function updateColumnStyle(req, res) {
  try {
    const { field_name } = req.params;
    const { bg_color, text_color, width, order_no, is_visible, is_frozen, label } = req.body;

    const sets   = [];
    const values = [];
    let   idx    = 1;

    if (bg_color   !== undefined) { sets.push(`bg_color = $${idx++}`);   values.push(bg_color); }
    if (text_color !== undefined) { sets.push(`text_color = $${idx++}`); values.push(text_color); }
    if (width      !== undefined) { sets.push(`width = $${idx++}`);      values.push(width); }
    if (order_no   !== undefined) { sets.push(`order_no = $${idx++}`);   values.push(order_no); }
    if (is_visible !== undefined) { sets.push(`is_visible = $${idx++}`); values.push(is_visible); }
    if (is_frozen  !== undefined) { sets.push(`is_frozen = $${idx++}`);  values.push(is_frozen); }
    if (label      !== undefined) { sets.push(`label = $${idx++}`);      values.push(label); }

    if (!sets.length) return res.status(400).json({ success: false, message: 'Tidak ada yang diubah' });

    values.push(field_name);
    const result = await pool.query(
      `UPDATE column_styles SET ${sets.join(', ')} WHERE field_name = $${idx} RETURNING *`,
      values
    );

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Kolom tidak ditemukan' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/columns/order  - simpan urutan kolom (bulk)
async function updateColumnOrder(req, res) {
  const client = await pool.connect();
  try {
    const { orders } = req.body; // [{field_name, order_no}]
    await client.query('BEGIN');
    for (const item of orders) {
      await client.query(
        'UPDATE column_styles SET order_no = $1 WHERE field_name = $2',
        [item.order_no, item.field_name]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Urutan kolom disimpan' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// POST /api/columns/custom  - tambah kolom custom
async function addCustomColumn(req, res) {
  try {
    const { field_name, label, data_type, width, bg_color, text_color, order_no } = req.body;
    if (!field_name || !label) return res.status(400).json({ success: false, message: 'field_name dan label wajib diisi' });

    const result = await pool.query(
      `INSERT INTO custom_columns (field_name, label, data_type, width, bg_color, text_color, order_no)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [field_name, label, data_type || 'text', width || 150, bg_color || '#FFFFFF', text_color || '#000000', order_no || 999]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Nama field sudah ada' });
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/columns/custom/:field_name
async function deleteCustomColumn(req, res) {
  try {
    const { field_name } = req.params;
    await pool.query('DELETE FROM custom_columns WHERE field_name = $1', [field_name]);
    res.json({ success: true, message: 'Kolom custom dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getColumns, updateColumnStyle, updateColumnOrder, addCustomColumn, deleteCustomColumn };
