const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true },
  name: String,
  balance: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  gameHistory: [String],
  transactions: [String],
  ui: { type: String, default: 'default' }
});

module.exports = mongoose.model('User', userSchema);
