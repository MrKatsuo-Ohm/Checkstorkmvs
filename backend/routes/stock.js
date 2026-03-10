const express = require('express');
const router = express.Router();
const StockModel = require('../models/Stock');

// GET /api/stock - Get all items
router.get('/', (req, res) => {
  try {
    const items = StockModel.getAll();
    res.json({ success: true, data: items, count: items.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stock/stats - Get statistics
router.get('/stats', (req, res) => {
  try {
    const stats = StockModel.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stock/:id - Get single item
router.get('/:id', (req, res) => {
  try {
    const item = StockModel.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/stock - Create new item
router.post('/', (req, res) => {
  try {
    const { name, category, subcategory, quantity, price } = req.body;

    // Validation
    if (!name || !category || !subcategory || quantity === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category, subcategory, quantity, price'
      });
    }

    const newItem = StockModel.create(req.body);
    res.status(201).json({ success: true, data: newItem, message: 'Item created successfully' });
  } catch (err) {
    if (err.message.includes('Maximum limit')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/stock/:id - Update item
router.put('/:id', (req, res) => {
  try {
    const item = StockModel.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const updated = StockModel.update(req.params.id, req.body);
    res.json({ success: true, data: updated, message: 'Item updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/stock/:id - Delete item
router.delete('/:id', (req, res) => {
  try {
    const deleted = StockModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
