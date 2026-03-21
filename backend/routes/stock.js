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

// POST /api/stock/sync — sync สต็อกทั้งหมดให้ตรงกับไฟล์
// body: { items: [...] } — รายการทั้งหมดที่ควรมีในระบบ
router.post('/sync', async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be array' })

    const results = { added: 0, updated: 0, deleted: 0, errors: [] }

    // 1. หา product_code ทั้งหมดในไฟล์
    const fileCodes = items.map(i => i.product_code).filter(Boolean)

    // 2. ลบสินค้าที่ไม่มีในไฟล์ (เฉพาะที่มี product_code)
    if (fileCodes.length > 0) {
      const deleted = await Stock.deleteMany({
        product_code: { $exists: true, $ne: '', $nin: fileCodes }
      })
      results.deleted = deleted.deletedCount
    }

    // 3. upsert ทุกรายการในไฟล์
    for (const item of items) {
      try {
        const payload = {
          ...item,
          quantity: parseInt(item.quantity) || 0,
          price: parseFloat(item.price) || 0,
          serials: item.serials || [],
          updatedAt: new Date()
        }

        if (item.product_code) {
          // match ด้วย product_code
          await Stock.findOneAndUpdate(
            { product_code: item.product_code },
            { $set: payload },
            { upsert: true, new: true }
          )
          results.updated++
        } else {
          // ไม่มี product_code → เพิ่มใหม่เสมอ
          await Stock.create(payload)
          results.added++
        }
      } catch (err) {
        results.errors.push({ name: item.name, error: err.message })
      }
    }

    res.json({ ok: true, ...results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
