const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Database and models with error handling
let connectDB, User, Payment, GameSession;
try {
  connectDB = require('./utils/db');
  User = require('./models/User');
  Payment = require('./models/Payment');
  GameSession = require('./models/GameSession');
  console.log('✅ Database models loaded for API server');
} catch (error) {
  console.error('❌ Error loading database models:', error.message);
  process.exit(1); // API server cannot work without database
}

const app = express();
const PORT = process.env.PORT || 3001;

connectDB();

app.use(cors());
app.use(express.json());

// Token validation middleware
async function validateToken(req, res, next) {
  const token = req.query.token || req.body.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const session = await GameSession.findOne({ 
      sessionToken: token, 
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('paymentId');
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.gameSession = session;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Token validation failed' });
  }
}

// Bingo win endpoint - now requires token
app.post('/api/bingo-win/:telegramId', validateToken, async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { amount, gameMode, pattern } = req.body;
    const session = req.gameSession;
    
    // Verify session belongs to user and game mode matches
    if (session.telegramId !== telegramId || session.gameMode !== gameMode) {
      return res.status(403).json({ error: 'Invalid session for this game' });
    }
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Add winnings
    user.balance += amount;
    user.gameHistory.push(`Bingo ${gameMode}: won ${amount} coins (${pattern || 'Pattern'})`);
    user.lastActive = new Date();
    await user.save();
    
    res.json({ 
      success: true, 
      newBalance: user.balance,
      gamesRemaining: session.maxGames - session.gamesPlayed
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Token validation for game access
app.get('/api/validate-token/:telegramId', validateToken, async (req, res) => {
  try {
    const { telegramId } = req.params;
    const session = req.gameSession;
    
    // Check if the session belongs to the user
    if (session.telegramId !== telegramId) {
      return res.status(403).json({ error: 'Token does not belong to user' });
    }
    
    // Check if user has games remaining
    if (session.gamesPlayed >= session.maxGames) {
      return res.status(403).json({ error: 'No games remaining' });
    }
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      gameMode: session.gameMode,
      gamesRemaining: session.maxGames - session.gamesPlayed,
      user: {
        name: user.name,
        balance: user.balance,
        bonus: user.bonus
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bingo bet endpoint (for starting game) - now requires token
app.post('/api/bingo-bet/:telegramId', validateToken, async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { gameMode } = req.body;
    const session = req.gameSession;
    
    // Verify session belongs to user and game mode matches
    if (session.telegramId !== telegramId || session.gameMode !== gameMode) {
      return res.status(403).json({ error: 'Invalid session for this game' });
    }
    
    // Check if user has games remaining
    if (session.gamesPlayed >= session.maxGames) {
      return res.status(403).json({ error: 'No games remaining. Purchase a new session.' });
    }
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (gameMode === 'demo') {
      return res.json({ success: true, balance: user.balance });
    }
    
    // For paid games, increment games played
    session.gamesPlayed += 1;
    await session.save();
    
    user.gameHistory.push(`Bingo ${gameMode}: started game (${session.gamesPlayed}/${session.maxGames})`);
    user.lastActive = new Date();
    await user.save();
    
    res.json({ 
      success: true, 
      newBalance: user.balance,
      gamesRemaining: session.maxGames - session.gamesPlayed
    });
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

// Like Bingo Game Endpoints
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        telegramId: user.telegramId,
        name: user.name,
        balance: user.balance || 0,
        bonus: user.bonus || 0,
        gameHistory: user.gameHistory || []
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/like-bingo-play', async (req, res) => {
  try {
    const { telegramId, selectedNumbers, stake, token, gameMode, balanceUpdate, reason, isWin } = req.body;
    
    // Handle balance update requests (for wins/losses)
    if (balanceUpdate) {
      const user = await User.findOne({ telegramId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (isWin) {
        // Add winnings based on game mode
        const winMultipliers = {
          '10': 2.5,   // 10 coins -> 25 coins (2.5x)
          '20': 3,     // 20 coins -> 60 coins (3x)  
          '50': 3.5,   // 50 coins -> 175 coins (3.5x)
          '100': 4     // 100 coins -> 400 coins (4x)
        };
        
        const multiplier = winMultipliers[gameMode] || 2;
        const winnings = stake * multiplier;
        user.balance += winnings;
        
        // Add to game history
        const gameResult = `Bingo ${gameMode}: WIN +${winnings} coins`;
        user.gameHistory = user.gameHistory || [];
        user.gameHistory.push(gameResult);
      } else {
        // Handle loss - deduct stake if not already deducted
        if (reason === 'game_loss') {
          user.balance -= stake;
        }
        const gameResult = `Bingo ${gameMode}: LOSS -${stake} coins`;
        user.gameHistory = user.gameHistory || [];
        user.gameHistory.push(gameResult);
      }
      
      // Keep only last 20 game records
      if (user.gameHistory.length > 20) {
        user.gameHistory = user.gameHistory.slice(-20);
      }
      
      await user.save();
      
      return res.json({
        success: true,
        newBalance: user.balance
      });
    }
    
    // Validate input for regular game play
    if (!telegramId || !selectedNumbers || !stake) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Skip validation for demo mode
    if (gameMode === 'demo') {
      return res.json({
        success: true,
        newBalance: 1000, // Demo balance
        winningNumbers: Array.from({length: 20}, () => Math.floor(Math.random() * 100) + 1),
        matches: [],
        winAmount: 0,
        gameResult: 'Demo game'
      });
    }
    
    if (!Array.isArray(selectedNumbers) || selectedNumbers.length === 0) {
      return res.status(400).json({ error: 'Must select at least one number' });
    }
    
    if (selectedNumbers.length > 10) {
      return res.status(400).json({ error: 'Cannot select more than 10 numbers' });
    }
    
    // Find user
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check balance
    if (user.balance < stake) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Deduct stake from balance
    user.balance -= stake;
    
    // Generate winning numbers (20 random numbers from 1-100)
    const winningNumbers = [];
    while (winningNumbers.length < 20) {
      const num = Math.floor(Math.random() * 100) + 1;
      if (!winningNumbers.includes(num)) {
        winningNumbers.push(num);
      }
    }
    
    // Calculate matches
    const matches = selectedNumbers.filter(num => winningNumbers.includes(num));
    
    // Calculate winnings based on matches
    const multipliers = {
      0: 0, 1: 0, 2: 0, 3: 1.2, 4: 1.5, 5: 2, 
      6: 3, 7: 5, 8: 8, 9: 12, 10: 20
    };
    
    const winMultiplier = multipliers[matches.length] || 0;
    const winAmount = Math.floor(stake * winMultiplier);
    
    // Add winnings to balance
    if (winAmount > 0) {
      user.balance += winAmount;
    }
    
    // Add to game history
    const gameResult = `Like Bingo: ${matches.length}/10 matches, ${winAmount > 0 ? `+${winAmount}` : '0'} coins`;
    user.gameHistory = user.gameHistory || [];
    user.gameHistory.push(gameResult);
    
    // Keep only last 20 game records
    if (user.gameHistory.length > 20) {
      user.gameHistory = user.gameHistory.slice(-20);
    }
    
    await user.save();
    
    res.json({
      success: true,
      newBalance: user.balance,
      winningNumbers,
      matches,
      winAmount,
      gameResult
    });
    
  } catch (error) {
    console.error('Like Bingo play error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/spin-result/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { coins, bonus, prize } = req.body;
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update balance and bonus
    user.balance = (user.balance || 0) + coins;
    user.bonus = (user.bonus || 0) + bonus;
    
    // Add to game history
    const gameResult = `Spin: ${prize}, +${coins} coins, +${bonus} bonus`;
    user.gameHistory = user.gameHistory || [];
    user.gameHistory.push(gameResult);
    
    // Keep only last 20 game records
    if (user.gameHistory.length > 20) {
      user.gameHistory = user.gameHistory.slice(-20);
    }
    
    await user.save();
    
    res.json({
      success: true,
      newBalance: user.balance,
      newBonus: user.bonus
    });
    
  } catch (error) {
    console.error('Spin result error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
