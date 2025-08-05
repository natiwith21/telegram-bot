const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  telegramId: { type: String, required: true },
  gameMode: { type: String, required: true }, // '10', '20', '50', '100', 'demo'
  sessionToken: { type: String, unique: true, required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  isActive: { type: Boolean, default: true },
  gamesPlayed: { type: Number, default: 0 },
  maxGames: { type: Number, default: 1 }, // How many games allowed with this payment
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) } // 7 days
});

// Create index for cleanup of expired sessions
gameSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GameSession', gameSessionSchema);
