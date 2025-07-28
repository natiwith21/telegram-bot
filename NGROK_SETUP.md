# 🌐 Setting Up Public HTTPS URL with ngrok

## Step 1: Install ngrok

### Option A: Download from website
1. Go to https://ngrok.com/download
2. Download for your OS
3. Extract and add to PATH

### Option B: Install via npm
```bash
npm install -g ngrok
```

## Step 2: Create ngrok Account (Free)
1. Go to https://ngrok.com/signup
2. Sign up for free account
3. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken

## Step 3: Setup ngrok
```bash
# Add your auth token
ngrok config add-authtoken 305ycN0ipqo9S135NXDQl2JXf8E_6yTJ6Kv2qr8k65nZZnEM6
```

## Step 4: Start Your Servers
```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - ngrok tunnel
ngrok http 3000
```

## Step 5: Get Your HTTPS URL
After running `ngrok http 3000`, you'll see something like:
```
Forwarding  https://abc123def.ngrok-free.app -> http://localhost:3000
```

Copy the HTTPS URL (e.g., `https://abc123def.ngrok-free.app`)

## Step 6: Update Your Configuration

1. **Update .env file**:
```
BOT_TOKEN=your_bot_token_here
MONGODB_URI=mongodb://localhost:27017/telegram-bot
WEB_APP_URL=https://abc123def.ngrok-free.app
PORT=3001
```

2. **Update BotFather**:
   - Send `/mybots` to BotFather
   - Select your bot
   - Choose "Bot Settings" → "Menu Button"
   - Send the ngrok HTTPS URL: `https://abc123def.ngrok-free.app`

## Step 7: Restart Your Bot
```bash
# Stop and restart your backend server
node server.js
```

## 🎮 Test on Mobile
1. Find your bot in Telegram
2. Send `/start`
3. The web app buttons should now work!

## 📝 Important Notes
- Keep ngrok running while testing
- The URL changes each time you restart ngrok (unless you have a paid plan)
- Update BotFather menu button URL whenever ngrok URL changes
- Free ngrok has some limitations but works perfectly for testing

## 🚀 Alternative: Deploy Online (Permanent Solution)

### Quick Deploy Options:
1. **Frontend**: Deploy to Vercel/Netlify (free)
2. **Backend**: Deploy to Railway/Render (free tier)
3. **Database**: Use MongoDB Atlas (free tier)

This gives you permanent HTTPS URLs that won't change.
