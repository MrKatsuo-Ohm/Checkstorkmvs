const mongoose = require('mongoose')

const HistorySchema = new mongoose.Schema({
  type:           { type: String, enum: ['create', 'update', 'delete'], required: true },
  itemId:         { type: String, default: '' },
  itemName:       { type: String, required: true },
  category:       { type: String, default: '' },
  subcategory:    { type: String, default: '' },
  quantityBefore: { type: Number, default: 0 },
  quantityAfter:  { type: Number, default: 0 },
  priceBefore:    { type: Number, default: 0 },
  priceAfter:     { type: Number, default: 0 },
  counter:        { type: String, default: 'ไม่ระบุ' },
  note:           { type: String, default: '' },
  timestamp:      { type: Date, default: Date.now },
}, {
  versionKey: false
})

HistorySchema.index({ timestamp: -1 })
HistorySchema.index({ counter: 1 })

module.exports = mongoose.model('History', HistorySchema)
