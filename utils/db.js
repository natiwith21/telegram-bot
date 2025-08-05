const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Try MongoDB URI from environment first
    let mongoUri = process.env.MONGODB_URI;
    
    // If no URI provided, use local MongoDB
    if (!mongoUri) {
      mongoUri = 'mongodb://localhost:27017/telegram-bot';
      console.log('⚠️  No MONGODB_URI found, using local MongoDB');
    }
    
    // If cloud MongoDB fails, fallback to local
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
      });
      console.log('✅ MongoDB connected successfully');
    } catch (cloudError) {
      if (mongoUri.includes('mongodb.net')) {
        console.log('⚠️  Cloud MongoDB failed, trying local MongoDB...');
        mongoUri = 'mongodb://localhost:27017/telegram-bot';
        await mongoose.connect(mongoUri);
        console.log('✅ Local MongoDB connected successfully');
      } else {
        throw cloudError;
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Try in-memory database as last resort
    try {
      console.log('🔄 Trying in-memory database...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = new MongoMemoryServer();
      await mongod.start();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ In-memory MongoDB started successfully');
    } catch (memoryError) {
      console.error('❌ All database options failed');
      console.error('💡 Solutions:');
      console.error('   1. Run: npm install mongodb-memory-server');
      console.error('   2. Install MongoDB locally');
      console.error('   3. Fix your MongoDB URI in .env file');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
