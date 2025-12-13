# Deploy to GitHub & Fix Balance Sync on Render

## ✅ Problem Fixed

Changed LikeBingo.jsx to use `window.location.origin` instead of hardcoded localhost. This makes it work on both:
- **Local development:** localhost:3001
- **Render deployment:** https://telegram-bot-u2ni.onrender.com

---

## 📤 Steps to Push to GitHub

### Step 1: Initialize Git (if not already done)
```bash
cd c:/Users/natna/Desktop/telegram-bot
git init
git add .
git commit -m "Fix balance sync for Render deployment"
```

### Step 2: Create GitHub Repository
1. Go to https://github.com/new
2. Create repository: `telegram-bot`
3. Copy the repository URL

### Step 3: Add Remote and Push
```bash
git remote add origin https://github.com/YOUR_USERNAME/telegram-bot.git
git branch -M main
git push -u origin main
```

---

## 🔧 What's Been Fixed

### Before (Broken on Render):
```javascript
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
// On Render: Uses localhost:3001 ❌ DOESN'T EXIST
```

### After (Works Everywhere):
```javascript
const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
// On Render: Uses https://telegram-bot-u2ni.onrender.com ✅
// Local: Uses http://localhost:3001 ✅
```

---

## 📋 Other Files to Push

Make sure these files are included:

### Root Directory (.env - DON'T COMMIT THIS!)
```
.gitignore already protects it
```

### Key Files to Commit:
- ✅ bot.js
- ✅ server.js
- ✅ websocket-server.js
- ✅ package.json
- ✅ .env.example (for reference)
- ✅ models/
- ✅ utils/
- ✅ commands/
- ✅ frontend/
- ✅ assets/

### Files NOT to Commit:
- ❌ .env (has secrets)
- ❌ node_modules/ (regenerated from package.json)
- ❌ frontend/node_modules/
- ❌ .git/

---

## 🚀 Redeploy on Render

### Step 1: Push Code to GitHub
```bash
git push origin main
```

### Step 2: Render Auto-Deploys
- Go to https://dashboard.render.com
- Your service should auto-redeploy when you push to GitHub
- Check deploy logs to verify it works

### Step 3: Test the Deployed Bot
1. Go to your bot: @your_bot_name
2. Send `/play`
3. Check if balance loads (no warning)

---

## ✅ Verification Checklist

After deploying:

- [ ] Code pushed to GitHub successfully
- [ ] Render auto-deployed the new code
- [ ] Bot on Telegram opens without errors
- [ ] `/play` command works
- [ ] Balance displays correctly (no warning)
- [ ] Can play games
- [ ] Balance updates after game ends

---

## 🔍 If Balance Still Doesn't Sync on Render

### Check Server Logs on Render:
1. Go to https://dashboard.render.com
2. Select your service
3. Click "Logs" tab
4. Look for errors

### Common Issues:

**Issue 1: MongoDB Connection**
- Check MONGODB_URI is correct
- Check IP whitelist on MongoDB Atlas

**Issue 2: Server Not Starting**
- Check PORT environment variable
- Check if environment variables are set in Render

**Issue 3: CORS Issues**
- Check if frontend and backend are on same domain
- Check server.js has CORS enabled

---

## 📝 Environment Variables on Render

Make sure these are set in Render dashboard:

```
BOT_TOKEN=8124555651:AAG1g5j4mHenXZq6uzMLswXWPUqYc0Jdi1s
MONGODB_URI=mongodb+srv://natnaelabiy88:wise97531nF.@cluster0.9i4w5qt.mongodb.net/...
PORT=3001
WS_PORT=3002
NODE_ENV=production
BACKEND_URL=https://telegram-bot-u2ni.onrender.com
```

---

## 🎯 Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Fix LikeBingo.jsx | ✅ DONE |
| 2 | Push to GitHub | → DO THIS NEXT |
| 3 | Render auto-deploys | → AUTOMATIC |
| 4 | Test on bot | → VERIFY |

---

## 📤 Quick Commands to Push

```bash
# From project root
git add .
git commit -m "Fix balance sync for Render deployment"
git push origin main

# Done! Render will redeploy automatically
```

That's it! Your balance sync issue should be fixed on Render. 🎉
