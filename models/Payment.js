const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // User information
  userId: { type: String, required: true }, // Telegram user ID
  username: { type: String, required: true }, // Telegram username
  firstName: String, // User's first name
  
  // Payment details
  amount: { type: Number, required: true }, // Amount in points (can be negative for refunds)
  type: { 
    type: String, 
    enum: ['deposit', 'refund', 'game_payment', 'bonus'], 
    default: 'deposit' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'rejected', 'cancelled'], 
    default: 'pending' 
  },
  
  // Agent verification
  approvedBy: String, // Admin/agent ID who approved
  approvedAt: Date, // When payment was approved
  
  // Transaction tracking
  transactionId: { type: String, required: true, unique: true }, // Unique transaction ID
  paymentMethod: String, // Telebirr, HelloCash, Bank Transfer, etc.
  paymentProof: String, // Screenshot or transaction code
  
  // Game-related fields (for backward compatibility)
  gameMode: String, // For game payments
  sessionToken: String, // Token for game access
  
  // Admin notes
  adminNotes: String, // Admin verification notes
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) } // 24 hours for pending payments
});

// Create indexes
paymentSchema.index({ userId: 1 });
paymentSchema.index({ username: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update the updatedAt field on save
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
