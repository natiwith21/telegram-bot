const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  username: String,
  phoneNumber: String,
  balance: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  gameHistory: [String],
  transactions: [String],
  banned: { type: Boolean, default: false },
  registeredAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  ui: { type: String, default: 'default' }
});

module.exports = mongoose.model('User', userSchema);
