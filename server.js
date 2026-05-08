require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────
const booksRouter   = require('./src/routes/books');
const columnsRouter = require('./src/routes/columns');
const printRouter   = require('./src/routes/print');
const miscRouter    = require('./src/routes/misc');

app.use('/api/books',   booksRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/print',   printRouter);
app.use('/api',         miscRouter);

// ─── Health check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Catch-all → SPA ─────────────────────────────────────
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Buku Induk Server berjalan di http://localhost:${PORT}`);
});
