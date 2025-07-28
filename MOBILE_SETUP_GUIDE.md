# 📱 Mobile Setup Guide - Telegram Bot

## Step 1: Create Your Bot

1. **Open Telegram** on your phone
2. **Search for @BotFather** 
3. **Start conversation** with BotFather
4. **Send `/newbot`**
5. **Choose bot name** (e.g., "My Bingo Game Bot")
6. **Choose username** (must end with 'bot', e.g., "mybingo_game_bot")
7. **Copy the bot token** (looks like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)

## Step 2: Configure Your Bot

1. **Add token to .env file**:
   ```
   BOT_TOKEN=your_bot_token_here
   MONGODB_URI=mongodb://localhost:27017/telegram-bot
   WEB_APP_URL=http://localhost:3000
   PORT=3001
   ```

## Step 3: Set Up Web App (Important!)

1. **Send `/setmenubutton`** to BotFather
2. **Select your bot**
3. **Send the web app URL**: `http://localhost:3000`
4. **Send web app name**: "Play Games"

OR

1. **Send `/mybots`** to BotFather
2. **Select your bot**
3. **Choose "Bot Settings"**
4. **Choose "Menu Button"**
5. **Send URL**: `http://localhost:3000`

## Step 4: Start Your Servers

```bash
# Terminal 1 - Start backend
node server.js

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

## Step 5: Test on Mobile

1. **Find your bot** in Telegram (search for your bot username)
2. **Send `/start`** to your bot
3. **Follow the registration flow**
4. **Test the games!**

## 🌐 For Public Access (Optional)

If you want others to access your bot, you need to deploy it online:

### Option 1: Use ngrok (Quick Testing)
```bash
# Install ngrok
npm install -g ngrok

# Expose your frontend
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update WEB_APP_URL in .env to this URL
# Update BotFather menu button with this URL
```

### Option 2: Deploy to Hosting Service
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Backend**: Railway, Render, Heroku
- **Database**: MongoDB Atlas

## 📝 Testing Checklist

- [ ] Bot responds to `/start`
- [ ] Registration flow works
- [ ] Main menu buttons work
- [ ] Games open in mini app
- [ ] Balance updates correctly
- [ ] All features functional

## 🔧 Troubleshooting

**Bot doesn't respond?**
- Check bot token is correct
- Ensure server is running
- Check console for errors

**Web app doesn't open?**
- Verify WEB_APP_URL is set correctly
- Check frontend is running on correct port
- Update BotFather menu button URL

**Registration fails?**
- Check MongoDB connection
- Verify database permissions
- Check server logs

## 🎮 Ready to Play!

Once everything is set up, you can:
1. Register with phone number
2. Get starting coins (100) and bonus (50)
3. Play Bingo games with different bet levels
4. Spin the wheel for prizes
5. Track your balance and history
