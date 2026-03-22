const express    = require('express')
const cors       = require('cors')
const path       = require('path')
const mongoose   = require('mongoose')
const stockRoutes = require('./routes/stock')
const History    = require('./models/History')
const CountLock  = require('./models/CountLock')
const ScanSession = require('./models/ScanSession')

const app  = express()
const PORT = process.env.PORT || 5000

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '2mb' }))

// ── Stock Routes ──────────────────────────────────────────────────────────────
app.use('/api/stock', stockRoutes)

// ── Scan Session ──────────────────────────────────────────────────────────────
app.get('/api/scan-session/:key', async (req, res) => {
  try {
    const session = await ScanSession.findOne({ key: req.params.key })
    res.json({ serials: session?.serials || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/scan-session/:key', async (req, res) => {
  try {
    const { serial } = req.body
    if (!serial || typeof serial !== 'string')
      return res.status(400).json({ error: 'serial is required' })

    const session = await ScanSession.findOneAndUpdate(
      { key: req.params.key },
      {
        $addToSet: { serials: serial.toLowerCase().trim() },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, new: true }
    )
    res.json({ ok: true, count: session.serials.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/scan-session/:key', async (req, res) => {
  try {
    await ScanSession.deleteOne({ key: req.params.key })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── History ───────────────────────────────────────────────────────────────────
app.get('/api/history', async (req, res) => {
  try {
    const history = await History.find().sort({ timestamp: -1 }).limit(5000)
    res.json(history)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/history', async (req, res) => {
  try {
    const entry = req.body
    if (!entry || !entry.itemName)
      return res.status(400).json({ error: 'invalid entry' })

    await History.create({
      type:           entry.type,
      itemId:         entry.itemId || '',
      itemName:       entry.itemName,
      category:       entry.category || '',
      subcategory:    entry.subcategory || '',
      quantityBefore: entry.quantityBefore ?? 0,
      quantityAfter:  entry.quantityAfter  ?? 0,
      priceBefore:    entry.priceBefore    ?? 0,
      priceAfter:     entry.priceAfter     ?? 0,
      counter:        entry.counter || 'ไม่ระบุ',
      note:           entry.note || '',
      timestamp:      entry.timestamp ? new Date(entry.timestamp) : new Date(),
      scannedSerials: Array.isArray(entry.scannedSerials) ? entry.scannedSerials : [],
      missingSerials: Array.isArray(entry.missingSerials) ? entry.missingSerials : [],
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/history/subcategory?cat=xxx&sub=xxx — ลบ history ของ subcategory นั้นก่อนนับใหม่
app.delete('/api/history/subcategory', async (req, res) => {
  try {
    const { cat, sub } = req.query
    if (!cat || !sub) return res.status(400).json({ error: 'cat and sub required' })
    await History.deleteMany({ category: cat, subcategory: sub, type: 'update' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/history', async (req, res) => {
  try {
    await History.deleteMany({})
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Count Lock ────────────────────────────────────────────────────────────────
// ใช้ wildcard (*) แทน :key เพราะ key มี | และ / ซึ่ง Express ไม่ allow ใน :param

app.get('/api/count-lock', async (req, res) => {
  try {
    const locks = await CountLock.find({}, 'key')
    res.json({ keys: locks.map(l => l.key) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/count-lock/check', async (req, res) => {
  try {
    const key = decodeURIComponent(req.query.key || '')
    const lock = await CountLock.findOne({ key })
    res.json({ locked: !!lock })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/count-lock/set', async (req, res) => {
  try {
    const key = decodeURIComponent(req.query.key || '')
    await CountLock.findOneAndUpdate(
      { key },
      { $set: { lockedAt: new Date() } },
      { upsert: true }
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/count-lock/one', async (req, res) => {
  try {
    const key = decodeURIComponent(req.query.key || '')
    await CountLock.deleteOne({ key })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/count-lock/all', async (req, res) => {
  try {
    await CountLock.deleteMany({})
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  })
})

// ── Serve React build ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/dist')))

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/'))
    return res.status(404).json({ error: 'API route not found' })
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'))
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// ── Connect MongoDB → Start server ────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Please add it to your environment variables.')
  process.exit(1)
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected')

    // Seed ข้อมูลเริ่มต้น ถ้า collection ยังว่างอยู่
    const count = await require('./models/Stock').countDocuments()
    if (count === 0) {
      console.log('📦 Seeding initial stock data...')
      await require('./scripts/seed')()
      console.log('✅ Seed complete')
    }

    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`))
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })
