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

module.exports = router
