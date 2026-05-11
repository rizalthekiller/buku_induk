
const pool = require('../config/database');
const { auth } = require('../config/auth');

exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, "createdAt" FROM "user" ORDER BY "createdAt" DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, name, email FROM "user" WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data user' });
  }
};


exports.createUser = async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
  }

  try {
    // Gunakan Better Auth API untuk membuat user agar password ter-hash dengan benar
    const user = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      }
    });

    res.json({ success: true, message: 'User berhasil dibuat', data: user });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: err.message || 'Gagal membuat user' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  
  // Jangan biarkan user menghapus dirinya sendiri jika Anda ingin keamanan extra
  if (req.session?.user?.id === id) {
    return res.status(400).json({ success: false, message: 'Anda tidak bisa menghapus akun Anda sendiri' });
  }

  try {
    // Better Auth menyimpan data di beberapa tabel (user, account, session)
    // Karena kita menggunakan ON DELETE CASCADE pada foreign key, cukup hapus di tabel user
    await pool.query('DELETE FROM "user" WHERE id = $1', [id]);
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus user' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    await pool.query(
      'UPDATE "user" SET name = $1, email = $2, "updatedAt" = NOW() WHERE id = $3',
      [name, email, id]
    );
    res.json({ success: true, message: 'User berhasil diperbarui' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui user' });
  }
};

