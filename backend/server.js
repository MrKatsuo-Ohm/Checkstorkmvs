const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const stockRoutes = require('./routes/stock');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/stock', stockRoutes);

// ── Scan Session (เก็บลงไฟล์) ────────────────────────────────────────────────
const SESSION_FILE = path.join(__dirname, 'scan_sessions.json');
let scanSessions = {};
try {
  if (fs.existsSync(SESSION_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    for (const [k, v] of Object.entries(parsed)) {
      scanSessions[k] = new Set(v);
    }
  }
} catch (e) { console.warn('Could not load scan sessions:', e.message); }

const saveSessions = () => {
  try {
    const obj = {};
    for (const [k, v] of Object.entries(scanSessions)) obj[k] = Array.from(v);
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) { console.warn('Could not save scan sessions:', e.message); }
};

app.get('/api/scan-session/:key', (req, res) => {
  res.json({ serials: Array.from(scanSessions[req.params.key] || []) });
});
app.post('/api/scan-session/:key', (req, res) => {
  const { serial } = req.body;
  if (!serial) return res.status(400).json({ error: 'serial required' });
  if (!scanSessions[req.params.key]) scanSessions[req.params.key] = new Set();
  scanSessions[req.params.key].add(serial.toLowerCase());
  saveSessions();
  res.json({ ok: true, count: scanSessions[req.params.key].size });
});
app.delete('/api/scan-session/:key', (req, res) => {
  delete scanSessions[req.params.key];
  saveSessions();
  res.json({ ok: true });
});

// ── History (เก็บลงไฟล์) ──────────────────────────────────────────────────────
const HISTORY_FILE = path.join(__dirname, 'history.json');
let historyData = [];
try {
  if (fs.existsSync(HISTORY_FILE)) {
    historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
} catch (e) { console.warn('Could not load history:', e.message); }

const saveHistory = () => {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2), 'utf8');
  } catch (e) { console.warn('Could not save history:', e.message); }
};

// GET  /api/history — ดึงประวัติทั้งหมด
app.get('/api/history', (req, res) => {
  res.json(historyData);
});

// POST /api/history — เพิ่มรายการประวัติ
app.post('/api/history', (req, res) => {
  const entry = req.body;
  if (!entry || !entry.id) return res.status(400).json({ error: 'invalid entry' });
  // ป้องกัน duplicate id
  if (!historyData.find(h => h.id === entry.id)) {
    historyData.unshift(entry); // ใหม่สุดอยู่หัว
    saveHistory();
  }
  res.json({ ok: true });
});

// DELETE /api/history — ล้างประวัติทั้งหมด
app.delete('/api/history', (req, res) => {
  historyData = [];
  saveHistory();
  res.json({ ok: true });
});

// ── Count Lock ───────────────────────────────────────────────────────────────
const LOCK_FILE = path.join(__dirname, 'count_locks.json');
let countLocks = new Set();
try {
  if (fs.existsSync(LOCK_FILE)) {
    countLocks = new Set(JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')));
  }
} catch (e) { console.warn('Could not load count locks:', e.message); }

const saveLocks = () => {
  try { fs.writeFileSync(LOCK_FILE, JSON.stringify(Array.from(countLocks)), 'utf8'); }
  catch (e) { console.warn('Could not save count locks:', e.message); }
};

app.get('/api/count-lock/:key', (req, res) => {
  res.json({ locked: countLocks.has(req.params.key) });
});
app.post('/api/count-lock/:key', (req, res) => {
  countLocks.add(req.params.key);
  saveLocks();
  res.json({ ok: true });
});
app.delete('/api/count-lock/all', (req, res) => {
  countLocks.clear();
  saveLocks();
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IT Stock API is running' });
});

// Serve React build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// React Router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
