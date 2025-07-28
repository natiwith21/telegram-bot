# 📱💻 Complete Testing Guide - PC & Mobile

## 🚀 **STEP 1: Setup Your .env File**

1. **Copy `.env.template` to `.env`**
2. **Fill in your bot token** (get from @BotFather):

```env
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
MONGODB_URI=mongodb://localhost:27017/telegram-bot
WEB_APP_URL=https://temporary-url.loca.lt
PORT=3001
```

## 🖥️ **STEP 2: Start All Services**

### **Method A: One-Click (Recommended)**
1. **Double-click `start-all.bat`**
2. Wait for 3 windows to open:
   - Backend Server (port 3001)
   - Frontend App (port 3000)
   - LocalTunnel (public HTTPS URL)

### **Method B: Manual**
```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend
npm run frontend

# Terminal 3 - Public tunnel
npm run tunnel
```

## 🌐 **STEP 3: Get Your Public URL**

From the LocalTunnel window, copy the HTTPS URL:
```
your url is: https://abc123xyz.loca.lt
```

**Update your .env file** with this URL:
```env
WEB_APP_URL=https://abc123xyz.loca.lt
```

**Restart your backend** (Ctrl+C in backend terminal, then `npm start`)

## 💻 **TESTING ON PC**

### **Option 1: Test Web Interface Directly**
1. **Open browser** and go to: `http://localhost:3000`
2. **Test all pages**:
   - Main menu: `http://localhost:3000/menu`
   - Bingo game: `http://localhost:3000/bingo`
   - Spin wheel: `http://localhost:3000/spin`
   - Admin panel: `http://localhost:3000/admin` (password: `admin123`)

### **Option 2: Test via Telegram Desktop**
1. **Install Telegram Desktop** on PC
2. **Search for your bot** (use the username you created)
3. **Send `/start`**
4. **Test the full flow**

## 📱 **TESTING ON MOBILE PHONE**

### **Step 1: Configure BotFather**
1. **Open Telegram** on your phone
2. **Search for @BotFather**
3. **Send `/mybots`**
4. **Select your bot**
5. **Choose "Bot Settings" → "Menu Button"**
6. **Send your tunnel URL**: `https://abc123xyz.loca.lt`
7. **Send button text**: "Play Games"

### **Step 2: Test Your Bot**
1. **Search for your bot** in Telegram (use the @username)
2. **Send `/start`** to your bot
3. **You should see**: Welcome message with "Start Playing" button
4. **Tap "Start Playing"**
5. **You should see**: Main menu with 8 options

### **Step 3: Test Registration Flow**
1. **Tap "Play Bingo"** (if not registered)
2. **You should see**: Registration prompt
3. **Tap "Share Contact"**
4. **Tap "Share Contact"** again in popup
5. **You should see**: Registration success message

### **Step 4: Test Games**
1. **Tap "Play Bingo"** again
2. **Choose a bet level** (10/20/50/100/Demo)
3. **Tap "Start"** in Terms popup
4. **Mini app should open** with the Bingo game
5. **Test Spin wheel** the same way

## 🔍 **TESTING CHECKLIST**

### **Backend Health Check:**
- [ ] `npm start` runs without errors
- [ ] Console shows: "🤖 Bot started" and "API Server running on port 3001"
- [ ] No error messages in console

### **Frontend Health Check:**
- [ ] Browser opens `http://localhost:3000` successfully
- [ ] All pages load without errors
- [ ] Games are playable
- [ ] Admin panel accessible

### **Tunnel Health Check:**
- [ ] LocalTunnel shows HTTPS URL
- [ ] URL is accessible from outside your network
- [ ] No connection errors

### **Bot Health Check:**
- [ ] Bot responds to `/start` command
- [ ] Main menu buttons work
- [ ] Registration flow works
- [ ] Mini apps open correctly
- [ ] Balance updates after games

## 🆘 **Troubleshooting**

### **Problem: Bot doesn't respond**
- Check BOT_TOKEN in .env is correct
- Restart backend server
- Check bot isn't banned by Telegram

### **Problem: Mini app doesn't open**
- Verify WEB_APP_URL in .env matches tunnel URL
- Update BotFather menu button URL
- Restart backend after .env changes

### **Problem: Tunnel URL not working**
- Try `npm run tunnel` again
- Use the new URL in .env and BotFather
- Check LocalTunnel window for errors

### **Problem: Frontend not loading**
- Check `npm run frontend` is running
- Verify port 3000 isn't blocked
- Try `http://localhost:3000` directly

## 🎮 **Expected User Experience**

1. **Welcome**: Nice intro message with game overview
2. **Registration**: One-time phone number sharing
3. **Menu**: Clean 8-button interface
4. **Games**: Smooth mini app experience
5. **Balance**: Real-time coin tracking
6. **Admin**: Full user management panel

## 📊 **Demo Data for Testing**

- **Starting balance**: 100 coins
- **Starting bonus**: 50 coins
- **Bingo prizes**: 20-350 coins based on bet
- **Spin prizes**: 10-50 coins or 5-10 bonus
- **Admin password**: `admin123`

Your bot is now ready for real users! 🚀
