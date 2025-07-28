const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./utils/db');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3001;

connectDB();

app.use(cors());
app.use(express.json());

// Get user balance and bonus
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = await User.findOne({ telegramId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      telegramId: user.telegramId,
      name: user.name,
      balance: user.balance,
      bonus: user.bonus
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bingo win endpoint
app.post('/api/bingo-win/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { amount, gameMode } = req.body;
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Deduct bet amount first (except for demo)
    if (gameMode !== 'demo') {
      const betAmount = parseInt(gameMode);
      if (user.balance < betAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      user.balance -= betAmount;
    }
    
    // Add winnings
    user.balance += amount;
    user.gameHistory.push(`Bingo ${gameMode}: won ${amount} coins`);
    user.lastActive = new Date();
    await user.save();
    
    res.json({ success: true, newBalance: user.balance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bingo bet endpoint (for starting game)
app.post('/api/bingo-bet/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { gameMode } = req.body;
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (gameMode === 'demo') {
      return res.json({ success: true, balance: user.balance });
    }
    
    const betAmount = parseInt(gameMode);
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    user.balance -= betAmount;
    user.gameHistory.push(`Bingo ${gameMode}: bet ${betAmount} coins`);
    user.lastActive = new Date();
    await user.save();
    
    res.json({ success: true, newBalance: user.balance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Spin result endpoint
app.post('/api/spin-result/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { type, amount, result } = req.body;
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (type === 'coins') {
      user.balance += amount;
    } else if (type === 'bonus') {
      user.bonus += amount;
    }
    
    user.gameHistory.push(`Spin: ${result}`);
    await user.save();
    
    res.json({ success: true, newBalance: user.balance, newBonus: user.bonus });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin endpoints
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ _id: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance, name } = req.body;
    
    await User.findByIdAndUpdate(userId, { balance, name });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/ban/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(userId, { banned: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/game-history', async (req, res) => {
  try {
    const users = await User.find({});
    const history = [];
    
    users.forEach(user => {
      user.gameHistory.forEach(entry => {
        history.push({
          userName: user.name,
          telegramId: user.telegramId,
          game: entry.includes('Bingo') ? 'Bingo' : 'Spin',
          result: entry,
          amount: entry.match(/[+-]\d+/)?.[0] || '0',
          date: new Date()
        });
      });
    });
    
    res.json(history.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/announcement', async (req, res) => {
  try {
    const { message } = req.body;
    // In a real app, you'd store this and send via Telegram bot
    console.log('Announcement:', message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
