const express = require('express');
const cors = require('cors');
const path = require('path');
const stockRoutes = require('./routes/stock');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/stock', stockRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'IT Stock API is running' });
});

// Serve React build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// React Router fallback (ต้องอยู่หลัง API routes เสมอ)
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
