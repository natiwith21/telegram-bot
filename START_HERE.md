# 🚀 START HERE - Quick Developer Guide

Welcome! This project is a **Telegram Bingo Bot** with multiplayer games. Here's how to get started.

---

## 📋 What This Bot Does

- 🎮 Users play Bingo games in Telegram
- 💰 Handle deposits and balance system
- 👥 Multiplayer support with real-time sync
- 📱 Mobile-friendly mini-app UI
- 🎯 Multiple game modes

---

## ⚡ Quick Start (5 minutes)

### 1. **Install Dependencies**
```bash
npm install                  # Install Node packages
cd frontend && npm install   # Install frontend packages
cd ..                        # Go back to root
```

### 2. **Setup Environment Variables**
Copy `.env.example` to `.env`:
```bash
cp .env.example .env  (on Mac/Linux)
# OR manually copy on Windows
```

**Edit `.env` and add your values:**
```
BOT_TOKEN=your_token_from_botfather
MONGODB_URI=your_mongodb_connection
PORT=3001
WS_PORT=3002
NODE_ENV=development
```

### 3. **Get Your Bot Token**
1. Open Telegram
2. Search for `@BotFather`
3. Send `/start` then `/newbot`
4. Follow prompts and copy the token
5. Paste it in `.env` as `BOT_TOKEN`

### 4. **Setup Database**
1. Go to [mongodb.com](https://mongodb.com)
2. Create free account
3. Create cluster
4. Get connection string
5. Paste in `.env` as `MONGODB_URI`

### 5. **Start the Bot**
```bash
npm start                    # Start bot on PORT 3001
# In another terminal:
npm run frontend            # Start frontend on 3000
```

You should see:
```
✅ Bot started successfully
🚀 API Server running on port 3001
WebSocket server running on port 3002
```

---

## 📖 File Guide

| File | What it does |
|------|-------------|
| **bot.js** | Main bot - handles Telegram commands |
| **server.js** | API server - stores game data & balance |
| **websocket-server.js** | Multiplayer - real-time game sync |
| **models/** | Database schemas (User, Payment, GameSession) |
| **frontend/** | Web UI (mini-app for Telegram) |
| **commands/** | Game logic and rules |
| **utils/** | Database connection helper |

**For detailed explanation, read:** `DOCUMENTATION.md`

---

## 🧪 Test the Bot

1. **Open Telegram**
2. **Search for your bot** (the one you created with BotFather)
3. **Send `/start`** - Should see welcome message
4. **Send `/play`** - Should open mini-app
5. **Click a game** - Play!

---

## 🛠️ Common Commands

```bash
# Start bot
npm start

# Dev mode (auto-restart on changes)
npm run dev

# Start frontend mini-app
npm run frontend

# Check environment setup
node check-env.js

# Check bot connection
node check-setup.js
```

---

## 📁 Project Structure

```
telegram-bot/
├── bot.js                 ← Main bot file
├── server.js              ← API server
├── websocket-server.js    ← Real-time multiplayer
├── package.json           ← Dependencies
├── .env                   ← Your secrets (don't share!)
├── README.md              ← Project overview
├── DOCUMENTATION.md       ← Complete file guide
├── models/                ← Database schemas
├── frontend/              ← React mini-app
├── commands/              ← Game logic
├── utils/                 ← Helpers
└── assets/                ← Images & files
```

---

## 🔐 Important Security Notes

1. **Never share `.env`** - Contains secret keys
2. **Never commit `.env` to git** - Already in `.gitignore`
3. **BOT_TOKEN** - Keep it private
4. **MONGODB_URI** - Keep it private

---

## 🚨 If Something Breaks

### Bot won't start?
```bash
node check-env.js  # Check if variables are set
node check-setup.js # Check bot connection
```

### Can't connect to database?
- Check `MONGODB_URI` in `.env`
- Check MongoDB cluster is active
- Check IP whitelist (in MongoDB dashboard)

### Frontend won't load?
```bash
cd frontend && npm install  # Reinstall deps
npm run dev                 # Run dev server
```

### WebSocket not working?
- Check `WS_PORT` (3002) is not blocked
- Restart websocket-server.js

---

## 💡 Development Tips

1. **Read the code** - Start with bot.js
2. **Use console.log()** - Debug statements help
3. **Test locally first** - Don't deploy broken code
4. **Keep .env secure** - Never share it
5. **Read DOCUMENTATION.md** - For detailed guides

---

## 📚 Next Steps

1. ✅ Install dependencies
2. ✅ Setup `.env` variables
3. ✅ Get BOT_TOKEN from @BotFather
4. ✅ Setup MongoDB database
5. ✅ Run `npm start`
6. 📖 **Read DOCUMENTATION.md** for detailed info
7. 🔍 Explore the code files
8. 🚀 Start coding!

---

## 📞 Need Help?

1. **Check DOCUMENTATION.md** - Explains every file
2. **Look at error message** - Usually tells you the problem
3. **Check console output** - Look for `Error:` or `❌`
4. **Search the code** - Use Ctrl+F to find things

---

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] `.env` file created with variables
- [ ] BOT_TOKEN obtained from @BotFather
- [ ] MongoDB database setup
- [ ] `npm start` works without errors
- [ ] Bot appears in Telegram
- [ ] `/start` command works
- [ ] `/play` opens mini-app

**If all checked:** You're ready to code! 🎉

---

**Questions?** Read `DOCUMENTATION.md` for complete details.
