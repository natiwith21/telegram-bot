const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('Fix: Update MongoDB URI in .env file or check network connection');
    process.exit(1);
  }
};

module.exports = connectDB;
