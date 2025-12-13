# Telegram Bingo Bot - Complete Documentation

This document explains how every file in this project works and how developers should use them.

---

## 📁 Project Structure

```
telegram-bot/
├── bot.js                      ← Main Telegram bot (START HERE)
├── server.js                   ← Express API server
├── websocket-server.js         ← Real-time multiplayer server
├── package.json                ← Dependencies and scripts
├── .env                        ← Environment variables (your secrets)
├── .env.example                ← Template for .env
├── .gitignore                  ← Git exclusion rules
├── README.md                   ← Project overview
├── DOCUMENTATION.md            ← This file
├── models/                     ← Database schemas
│   ├── User.js                 ← User data model
│   ├── Payment.js              ← Payment records model
│   └── GameSession.js          ← Game session model
├── utils/                      ← Helper functions
│   └── db.js                   ← MongoDB connection
├── commands/                   ← Game logic
│   └── games.js                ← Game mechanics
├── frontend/                   ← Web UI (React/Vite)
│   ├── src/                    ← React components
│   ├── public/                 ← Static assets
│   └── package.json            ← Frontend dependencies
├── assets/                     ← Images, icons, files
├── quick-start.bat             ← Windows quick start
└── start-simple.bat            ← Windows simple start
```

---

## 🔧 Core Files Explained

### 1. **bot.js** - Main Telegram Bot
**What it does:**
- Connects to Telegram using your BOT_TOKEN
- Handles all user commands (/start, /play, /deposit, etc.)
- Manages game invitations and multiplayer rooms
- Processes payments and balance updates
- Sends notifications to users

**Key Functions:**
```javascript
bot.start()           // User /start command
bot.command('play')   // User /play command
bot.action('xxx')     // Button clicks
bot.on('callback_query') // Handle callbacks
```

**How to find specific features:**
- Search `/start` → user welcome message
- Search `bot.action('support')` → support feature
- Search `bot.command('deposit')` → payment feature
- Search `bot.command('play')` → game launch

**Environment Variables Used:**
- `BOT_TOKEN` - Your Telegram bot token from @BotFather
- `NODE_ENV` - 'development' or 'production'
- `WEBHOOK_URL` - Production webhook URL
- `SUPPORT_EMAIL` - Support contact email
- `SUPPORT_TELEGRAM` - Support Telegram handle

---

### 2. **server.js** - Express API Server
**What it does:**
- Runs HTTP API on PORT (default 3001)
- Handles game endpoints
- Manages user balance updates
- Processes bingo wins and payouts
- Validates game sessions with tokens

**Key Endpoints:**
```
GET  /api/user/:telegramId                    → Get user balance
POST /api/bingo-win/:telegramId               → Record bingo win
POST /api/bonus/:telegramId                   → Update bonus
GET  /api/game-history/:telegramId            → Get game history
POST /api/payment/check-status/:telegramId    → Check payment status
```

**Key Function:**
```javascript
const PORT = process.env.PORT || 3001;
app.listen(PORT)  // Start server on port
```

**Why it exists:**
- Bingo game runs in browser and needs to send win data to backend
- User balance must be updated in real-time
- Separates bot logic from game logic

---

### 3. **websocket-server.js** - Real-Time Multiplayer Server
**What it does:**
- Runs WebSocket server on WS_PORT (default 3002)
- Handles multiplayer bingo games
- Synchronizes ball calls across all players
- Manages game rooms and player connections
- Sends real-time updates to frontend

**Key Events:**
```javascript
'join-room'       // Player joins game room
'start-game'      // Game starts
'call-number'     // New ball called
'bingo'           // Player wins
'end-game'        // Game ends
```

**Why it exists:**
- Multiplayer games need instant communication
- HTTP is too slow for real-time updates
- WebSocket keeps connection open for instant messages

---

## 📊 Database Models

### **models/User.js**
```javascript
{
  telegramId: "123456",
  name: "John Doe",
  balance: 1000,
  bonus: 500,
  gameHistory: ["Game 1: won 100", ...],
  referralCount: 5,
  joinedDate: Date,
  lastActive: Date
}
```
**Stores:** User account data, balance, bonuses, game history

### **models/Payment.js**
```javascript
{
  telegramId: "123456",
  amount: 50,
  status: "completed",
  method: "card",
  transactionId: "tx_12345",
  createdDate: Date
}
```
**Stores:** All payment records and transactions

### **models/GameSession.js**
```javascript
{
  telegramId: "123456",
  gameMode: "classic",
  sessionToken: "token_xyz",
  isActive: true,
  gamesPlayed: 0,
  maxGames: 5,
  expiresAt: Date
}
```
**Stores:** Active game sessions with tokens for security

---

## 🔗 Utility Functions

### **utils/db.js**
**What it does:**
- Connects to MongoDB database
- Creates connection pool
- Handles connection errors
- Initializes database on startup

**Usage:**
```javascript
const connectDB = require('./utils/db');
connectDB(); // Call once at startup
```

---

## 🎮 Game Commands

### **commands/games.js**
**What it does:**
- Defines all game types (Bingo, Slots, Dice, etc.)
- Game rules and win conditions
- Calculates payouts
- Manages game state

**Example Game:**
```javascript
{
  name: 'Classic Bingo',
  minStake: 10,
  maxStake: 1000,
  pattern: '5x5',
  rules: '...'
}
```

---

## 🖥️ Frontend - Mini App

### **frontend/**
**What it does:**
- React/Vite web application
- Runs inside Telegram as mini-app
- Shows game UI (bingo cards, numbers, etc.)
- Communicates with server.js and websocket-server.js
- Mobile optimized

**Key Files:**
```
frontend/src/
├── pages/
│   ├── LikeBingo.jsx      ← Bingo game UI
│   ├── Profile.jsx        ← User profile
│   └── Games.jsx          ← Game selection
├── components/
│   ├── BingoCard.jsx      ← Bingo card component
│   └── Header.jsx         ← Navigation
├── hooks/
│   └── useWebSocket.js    ← WebSocket connection
└── App.jsx                ← Main app
```

**How it communicates:**
1. **With server.js** (HTTP):
   ```javascript
   fetch('/api/user/' + userId)  // Get balance
   fetch('/api/bingo-win/' + userId, {method: 'POST'})  // Send win
   ```

2. **With websocket-server.js** (WebSocket):
   ```javascript
   ws.send({event: 'join-room', roomId: 123})
   ws.on('call-number', (num) => { ... })
   ```

---

## 📦 Configuration Files

### **.env** (Your Secrets - DO NOT SHARE)
```bash
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
PORT=3001
WS_PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
WEBHOOK_URL=https://yourdomain.com
RENDER_EXTERNAL_URL=https://yourdomain.onrender.com
SUPPORT_EMAIL=your@email.com
SUPPORT_TELEGRAM=@yourusername
```

**Where to get values:**
- `BOT_TOKEN` → @BotFather on Telegram
- `MONGODB_URI` → MongoDB Atlas (mongodb.com)
- `WEBHOOK_URL` → Your server's public URL

### **.env.example**
Template for developers. They copy this to `.env` and fill in their own values.

### **package.json**
Defines:
- Project name and version
- Dependencies (libraries needed)
- npm scripts (commands to run)

**Key Scripts:**
```bash
npm start          # Start bot (uses bot.js)
npm run dev        # Dev mode with auto-reload
npm run setup      # Install all dependencies
npm run frontend   # Start frontend dev server
```

---

## 🚀 How Everything Works Together

### **User Clicks /play Command**

```
1. User in Telegram → /play command
2. bot.js receives command
   ├─ Creates game session
   ├─ Stores in GameSession model
   ├─ Generates security token
   └─ Sends mini-app link to user

3. Frontend mini-app opens
   ├─ Connects to websocket-server.js
   ├─ Fetches user balance from server.js
   └─ Shows bingo card

4. User plays multiplayer game
   ├─ WebSocket sends ball numbers to all players
   ├─ Frontend updates bingo card
   └─ User clicks bingo when they win

5. Frontend sends win to server.js
   ├─ server.js validates with token
   ├─ Updates User model balance
   ├─ Sends confirmation back

6. bot.js sends win notification
   └─ User sees "You won 100 coins!"
```

---

## 🔐 Security Features

### **Token Validation**
- Every game gets unique `sessionToken`
- Frontend must send token with wins
- server.js validates token before updating balance
- Prevents cheating

### **Environment Variables**
- Secrets stored in .env (not in code)
- Never commit .env to git
- Different values for dev/production

### **Game Session Expiry**
- Sessions expire after game ends
- Can't reuse expired tokens
- Prevents replay attacks

---

## 📝 How to Add a New Feature

### Example: Add a new command `/shop`

1. **Add to bot.js:**
```javascript
bot.command('shop', async (ctx) => {
  await ctx.reply('Welcome to shop!');
});
```

2. **If it needs balance update:**
   - Add endpoint to server.js
   - Update User model in models/User.js

3. **If it's a multiplayer feature:**
   - Add WebSocket event to websocket-server.js
   - Add event handler in frontend

4. **Test locally:**
   ```bash
   npm start              # Start bot
   npm run frontend       # In another terminal
   npm run dev            # Run WebSocket separately if needed
   ```

---

## 🐛 Debugging Tips

### **Check if bot connects:**
```bash
node check-env.js    # Verify all env variables
node check-setup.js  # Test bot connection
```

### **View logs:**
- All console.log() output appears in terminal
- Search for `Error:` or `❌` for problems
- Look for `✅` for successful operations

### **Test specific endpoint:**
```bash
curl http://localhost:3001/api/user/123456
# Returns: {"telegramId":"123456", "balance":1000, ...}
```

### **Check WebSocket:**
- Open browser console (F12) in frontend
- Look for WebSocket connection logs
- Should see "ws://localhost:3002" messages

---

## 📖 Development Workflow

### **First Time Setup:**
```bash
1. Copy .env.example to .env
2. Fill in BOT_TOKEN, MONGODB_URI, etc.
3. npm install                    # Install dependencies
4. npm run setup                  # Setup frontend too
5. npm start                       # Start bot
6. (in another terminal) npm run frontend  # Start frontend dev
7. Open mini-app link in Telegram
```

### **While Developing:**
```bash
npm run dev              # Auto-restarts on file changes
# Edit files and save
# Changes appear immediately
```

### **Before Deployment:**
```bash
npm start              # Test production mode
NODE_ENV=production npm start  # Test as production
```

---

## 🔄 How Data Flows

### **User Balance Update Flow:**
```
Frontend (game.jsx)
    ↓
    POST /api/bingo-win
    ↓
server.js (validates token)
    ↓
User model (MongoDB)
    ↓
bot.js (sends notification)
    ↓
Telegram (user sees "won!")
```

### **Real-Time Game Flow:**
```
Player 1                    WebSocket Server            Player 2
    ↓                            ↓                           ↓
join-room ────────────────→ gameRooms.set()  ←────────── join-room
    ↓                            ↓                           ↓
start-game ───────────────→ emit to all  ←────────────── (receives start)
    ↓                            ↓                           ↓
(waiting)                   call-number ─────→ (sees new number)
    ↓                            ↓                           ↓
(bingo!)  ────────────────→ validate & end  ←─────────── (playing)
    ↓                            ↓                           ↓
(lost)                      win notification ────────→ (lost)
```

---

## 🎯 Key Takeaways for New Developers

1. **bot.js** = Entry point for everything
2. **server.js** = Handles game data/balance
3. **websocket-server.js** = Real-time multiplayer
4. **models/** = Database schemas
5. **frontend/** = User interface
6. **All communication** uses tokens for security
7. **Never hardcode** secrets - use .env
8. **Test locally** before deploying

---

## 🆘 Common Issues

### Issue: "Bot token not found"
**Fix:** Check .env file has BOT_TOKEN

### Issue: "Cannot connect to database"
**Fix:** Check MONGODB_URI in .env is correct

### Issue: "WebSocket connection failed"
**Fix:** Check WS_PORT (3002) is not blocked

### Issue: "Game balance not updating"
**Fix:** Check server.js API endpoint is running on PORT 3001

---

## 📚 File Reference Quick Lookup

| I need to... | Edit this file | Function/Section |
|---|---|---|
| Add new command | bot.js | Search: `bot.command()` |
| Change game rules | commands/games.js | Game definitions |
| Add payment method | models/Payment.js | Payment schema |
| Change UI | frontend/src/ | React components |
| Add API endpoint | server.js | `app.post()` or `app.get()` |
| Multiplayer feature | websocket-server.js | Event handlers |
| Connect database | utils/db.js | Connection setup |
| Store new user data | models/User.js | User schema |

---

**Last Updated:** December 2024
**Version:** 1.0
**For:** Telegram Bingo Bot Project
