const mongoose = require('mongoose')

const StockSchema = new mongoose.Schema({
  product_code: { type: String, default: '' },
  name:         { type: String, required: true, trim: true },
  category:     { type: String, required: true, trim: true },
  subcategory:  { type: String, required: true, trim: true },
  quantity:     { type: Number, default: 0, min: 0 },
  serials:      { type: [String], default: [] },
  min_stock:    { type: Number, default: 5, min: 0 },
  price:        { type: Number, default: 0, min: 0 },
  location:     { type: String, default: '' },
  notes:        { type: String, default: '' },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {                              
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString()
      delete ret._id
      return ret
    }
  }
})

StockSchema.index({ category: 1, subcategory: 1 })
StockSchema.index({ name: 'text' })

module.exports = mongoose.model('Stock', StockSchema)
