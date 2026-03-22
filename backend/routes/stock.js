const express = require('express')
const router  = express.Router()
const Stock   = require('../models/Stock')

// GET /api/stock
router.get('/', async (req, res) => {
  try {
    const items = await Stock.find().sort({ createdAt: -1 })
    res.json({ success: true, data: items, count: items.length })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/stock/stats
router.get('/stats', async (req, res) => {
  try {
    const items = await Stock.find()
    const total      = items.length
    const totalQty   = items.reduce((s, i) => s + i.quantity, 0)
    const lowStock   = items.filter(i => i.min_stock > 0 && i.quantity <= i.min_stock).length
    const totalValue = items.reduce((s, i) => s + i.quantity * i.price, 0)
    res.json({ success: true, data: { total, totalQty, lowStock, totalValue } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/stock/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Stock.findById(req.params.id)
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' })
    res.json({ success: true, data: item })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/stock
router.post('/', async (req, res) => {
  try {
    const { name, category, subcategory } = req.body
    if (!name || !category || !subcategory)
      return res.status(400).json({ success: false, error: 'Missing required fields: name, category, subcategory' })

    const item = await Stock.create(req.body)
    res.status(201).json({ success: true, data: item, message: 'Item created successfully' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/stock/:id
router.put('/:id', async (req, res) => {
  try {
    const item = await Stock.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' })
    res.json({ success: true, data: item, message: 'Item updated successfully' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/stock/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Stock.findByIdAndDelete(req.params.id)
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' })
    res.json({ success: true, message: 'Item deleted successfully' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/stock/sync — sync สต็อกทั้งหมดให้ตรงกับไฟล์ (ใช้ bulkWrite เร็วกว่า loop)
// body: { items: [...] } — รายการทั้งหมดที่ควรมีในระบบ
router.post('/sync', async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be array' })

    const now = new Date()

    // 1. หา product_code ทั้งหมดในไฟล์
    const fileCodes = items.map(i => i.product_code).filter(Boolean)

    // 2. ลบสินค้าที่ไม่มีในไฟล์ (ครั้งเดียว)
    let deleted = 0
    if (fileCodes.length > 0) {
      const del = await Stock.deleteMany({
        product_code: { $exists: true, $ne: '', $nin: fileCodes }
      })
      deleted = del.deletedCount
    }

    // 3. bulkWrite upsert ทุกรายการพร้อมกัน (เร็วกว่า loop มาก)
    const withCode = items.filter(i => i.product_code)
    const withoutCode = items.filter(i => !i.product_code)

    let upserted = 0
    if (withCode.length > 0) {
      const ops = withCode.map(item => ({
        updateOne: {
          filter: { product_code: item.product_code },
          update: {
            $set: {
              ...item,
              quantity: parseInt(item.quantity) || 0,
              price: parseFloat(item.price) || 0,
              serials: item.serials || [],
              updatedAt: now
            }
          },
          upsert: true
        }
      }))
      const result = await Stock.bulkWrite(ops, { ordered: false })
      upserted = (result.upsertedCount || 0) + (result.modifiedCount || 0)
    }

    // 4. สินค้าไม่มีรหัส → insert ทีละตัว (มักไม่มี)
    let added = 0
    for (const item of withoutCode) {
      await Stock.create({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        price: parseFloat(item.price) || 0,
        serials: item.serials || [],
        updatedAt: now
      })
      added++
    }

    res.json({ ok: true, added, updated: upserted, deleted })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/stock/export-seed — download seed.js ที่มีข้อมูลปัจจุบันทั้งหมด
router.get('/export-seed', async (req, res) => {
  try {
    const items = await Stock.find({}, { _id: 0, __v: 0 }).lean()
    const seedContent = `const Stock = require('../models/Stock')

async function seed() {
  const data = ${JSON.stringify(items, null, 2)}

  await Stock.insertMany(data)
  console.log(\`✅ Seeded \${data.length} items\`)
}

module.exports = seed
`
    res.setHeader('Content-Type', 'application/javascript')
    res.setHeader('Content-Disposition', 'attachment; filename="seed.js"')
    res.send(seedContent)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
