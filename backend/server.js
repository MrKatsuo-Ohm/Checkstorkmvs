const express = require('express');
const cors = require('cors');
const path = require('path');
const stockRoutes = require('./routes/stock');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/stock', stockRoutes);

// ── Scan Session (in-memory, shared ข้ามเครื่อง) ─────────────────────────────
// key → Set of serial strings
const scanSessions = {};

// GET  /api/scan-session/:key  — ดึง serials ที่สแกนแล้ว
app.get('/api/scan-session/:key', (req, res) => {
  const serials = Array.from(scanSessions[req.params.key] || []);
  res.json({ serials });
});

// POST /api/scan-session/:key  — เพิ่ม serial เข้า session
app.post('/api/scan-session/:key', (req, res) => {
  const { serial } = req.body;
  if (!serial) return res.status(400).json({ error: 'serial required' });
  if (!scanSessions[req.params.key]) scanSessions[req.params.key] = new Set();
  scanSessions[req.params.key].add(serial.toLowerCase());
  res.json({ ok: true, count: scanSessions[req.params.key].size });
});

// DELETE /api/scan-session/:key — ล้าง session (หลัง save)
app.delete('/api/scan-session/:key', (req, res) => {
  delete scanSessions[req.params.key];
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
