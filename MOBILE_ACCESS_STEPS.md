# 📱 Quick Steps to Access Your Bot on Mobile

## 🚀 Step 1: Start Your Bot
```bash
npm start
```
Keep this running.

## 🌐 Step 2: Start ngrok (NEW TERMINAL)
```bash
ngrok http 3000
```

You'll see something like:
```
Forwarding  https://abc123def.ngrok-free.app -> http://localhost:3000
```

**Copy that HTTPS URL!** (e.g., `https://abc123def.ngrok-free.app`)

## ⚙️ Step 3: Update Your .env File
Add the ngrok URL to your .env:
```
MONGODB_URI=mongodb+srv://natnaelabiy88:bingo@cluster0.0dqmbh8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
BOT_TOKEN=your_bot_token
WEB_APP_URL=https://abc123def.ngrok-free.app
PORT=3000
```

## 🤖 Step 4: Update Telegram Bot Menu
1. Open Telegram and message @BotFather
2. Send `/mybots`
3. Select your bot
4. Choose "Bot Settings" → "Menu Button"
5. Send the ngrok URL: `https://abc123def.ngrok-free.app`

## 🔄 Step 5: Restart Your Bot
Stop your bot (Ctrl+C) and restart:
```bash
npm start
```

## 📱 Step 6: Test on Phone
1. Open Telegram on your phone
2. Find your bot
3. Send `/start`
4. Click the game buttons - they should open the web app!

## ⚠️ Important Notes
- Keep both terminals running (bot + ngrok)
- The ngrok URL changes each restart (unless paid plan)
- If ngrok URL changes, update .env and BotFather again
- Free ngrok works perfectly for testing!

## 🛠️ Quick Restart Script
Want to make this easier? Run this instead:
```bash
# Use the pre-made script
start-all.bat
```

This starts everything automatically!
