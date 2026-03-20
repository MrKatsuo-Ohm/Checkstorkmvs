const mongoose = require('mongoose')

const CountLockSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  lockedAt:  { type: Date, default: Date.now },
}, {
  versionKey: false
})

module.exports = mongoose.model('CountLock', CountLockSchema)
