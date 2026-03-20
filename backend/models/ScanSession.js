const mongoose = require('mongoose')

const ScanSessionSchema = new mongoose.Schema({
  key:     { type: String, required: true, unique: true },
  serials: { type: [String], default: [] },
  updatedAt: { type: Date, default: Date.now },
}, {
  versionKey: false
})

module.exports = mongoose.model('ScanSession', ScanSessionSchema)
