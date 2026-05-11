require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { toNodeHandler } = require("better-auth/node");
const { auth }          = require("./src/config/auth");

const app = express();

// ─── Auth ───────────────────────────────────────────────
app.all("/api/auth/*", toNodeHandler(auth));

// ─── Protection Middleware ──────────────────────────────
app.use(async (req, res, next) => {
  // Biarkan auth API, health check, dan assets terbuka
  if (req.path.startsWith('/api/auth') || 
      req.path.startsWith('/api/health') ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/js/') ||
      req.path.startsWith('/img/')) {
    return next();
  }

  // Cek session via Better Auth API
  let session = null;
  try {
    session = await auth.api.getSession({ headers: req.headers });
  } catch (err) {
    console.error("Auth middleware error:", err);
  }
  
  // Jika akses login.html, biarkan tampil (jangan redirect otomatis ke dashboard)
  if (req.path === '/login.html') {
    return next();
  }

  if (!session) {
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/login.html');
  }

  req.session = session;
  next();
});

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
app.use('/api/import',  require('./src/routes/import'));
app.use('/api/users',   require('./src/routes/users'));
app.use('/api',         miscRouter);

// ─── Health check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Dashboard Route ──────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Catch-all → SPA ─────────────────────────────────────
app.get(/(.*)/, (req, res) => {
  if (req.path === '/login.html') {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  res.redirect('/dashboard');
});

// ─── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Buku Induk Server berjalan di http://localhost:${PORT}`);
});
