# ✅ Complete Setup Checklist

Use this checklist to ensure everything is set up correctly for the bot to work.

---

## 📋 Pre-Installation Checklist

- [ ] Windows/Mac/Linux system with Node.js installed (v14+)
- [ ] Telegram account
- [ ] Internet connection
- [ ] Text editor (VS Code recommended)
- [ ] Terminal/Command Prompt access

---

## 🔧 Installation Checklist

### Step 1: Clone/Download Project
- [ ] Project folder downloaded or cloned
- [ ] All files present (bot.js, server.js, frontend/, etc.)
- [ ] No red error marks in code editor

### Step 2: Install Dependencies
```bash
npm install
cd frontend && npm install
cd ..
```
- [ ] `npm install` completed without errors
- [ ] `node_modules/` folder created
- [ ] `frontend/node_modules/` folder created

### Step 3: Environment Setup
- [ ] `.env` file created (copied from `.env.example`)
- [ ] `.env` file is in root directory
- [ ] `.env` is added to `.gitignore` (already done)

---

## 🔑 Get Your Credentials Checklist

### Get BOT_TOKEN from Telegram
- [ ] Opened Telegram app
- [ ] Found `@BotFather`
- [ ] Sent `/newbot` command
- [ ] Followed BotFather's prompts
- [ ] Received bot token
- [ ] Bot token is 50+ characters long
- [ ] Added BOT_TOKEN to `.env` file
- [ ] No spaces around the token

### Get MONGODB_URI
- [ ] Created account at [mongodb.com](https://www.mongodb.com)
- [ ] Created a project
- [ ] Created a cluster
- [ ] Went to "Connect" button
- [ ] Selected "Drivers" / "Node.js"
- [ ] Copied connection string
- [ ] Replaced `<password>` with your password
- [ ] Replaced `<database>` with your database name
- [ ] Added MONGODB_URI to `.env` file
- [ ] URI format: `mongodb+srv://user:pass@cluster...`

### Set Port Numbers
- [ ] PORT=3001 in `.env`
- [ ] WS_PORT=3002 in `.env`
- [ ] NODE_ENV=development in `.env`

---

## 📝 .env File Checklist

Your `.env` file should look like:
```
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
PORT=3001
WS_PORT=3002
NODE_ENV=development
SUPPORT_EMAIL=your@email.com
SUPPORT_TELEGRAM=@yourusername
```

- [ ] BOT_TOKEN is filled in
- [ ] MONGODB_URI is filled in
- [ ] PORT=3001
- [ ] WS_PORT=3002
- [ ] NODE_ENV=development
- [ ] SUPPORT_EMAIL and SUPPORT_TELEGRAM (optional but recommended)
- [ ] No syntax errors (no quotes or brackets)
- [ ] File is saved

---

## 🚀 Startup Checklist

### Before Starting
- [ ] All terminals closed
- [ ] MongoDB cluster is active (check MongoDB Atlas)
- [ ] Internet connection is stable
- [ ] System has at least 1GB free RAM

### Start the Bot
```bash
npm start
```
- [ ] Bot starts without errors
- [ ] See message: "🤖 Bot started successfully"
- [ ] See message: "API Server running on port 3001"
- [ ] See message: "WebSocket server running on port 3002"
- [ ] No red "Error" messages

### Start the Frontend (in another terminal)
```bash
npm run frontend
```
- [ ] Frontend compiles successfully
- [ ] See message: "✓ ready in xxx ms"
- [ ] Local server running (http://localhost:5173 or similar)

---

## 🧪 Testing Checklist

### Test Bot Connection
```bash
node check-env.js
```
- [ ] All environment variables show as "✓"
- [ ] No "❌" marks

### Test Bot Setup
```bash
node check-setup.js
```
- [ ] Bot connection successful
- [ ] No error messages

### Test in Telegram
- [ ] Open Telegram
- [ ] Search for your bot name
- [ ] Send `/start` command
- [ ] See welcome message
- [ ] Send `/play` command
- [ ] Mini-app opens without errors
- [ ] Click a game
- [ ] Game loads and is playable

---

## 🔐 Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] `.env` file is NOT shared with anyone
- [ ] BOT_TOKEN not hardcoded anywhere in source code
- [ ] MONGODB_URI not hardcoded anywhere in source code
- [ ] `.env` file is only on your local machine
- [ ] No `.env` in git commits (check with `git status`)

---

## 🛠️ Troubleshooting Checklist

### If Bot Won't Start
- [ ] BOT_TOKEN is correctly set in `.env`
- [ ] BOT_TOKEN has no extra spaces
- [ ] MONGODB_URI is correct
- [ ] MongoDB cluster is active
- [ ] Port 3001 is not already in use
- [ ] Run `node check-env.js` to verify variables

### If Frontend Won't Load
- [ ] `npm run frontend` is running in separate terminal
- [ ] No errors in frontend terminal
- [ ] Try `cd frontend && npm install` again
- [ ] Clear browser cache (Ctrl+Shift+Delete)

### If WebSocket Won't Connect
- [ ] WS_PORT=3002 in `.env`
- [ ] Port 3002 is not blocked by firewall
- [ ] websocket-server.js is running
- [ ] Check browser console (F12) for errors

### If Database Connection Fails
- [ ] MONGODB_URI is correct
- [ ] MongoDB cluster is active (check Atlas)
- [ ] IP address is whitelisted in MongoDB
- [ ] Database user password is correct
- [ ] No special characters in password (or they're URL-encoded)

---

## 📚 Documentation Checklist

- [ ] Read `START_HERE.md` (quick start guide)
- [ ] Read `DOCUMENTATION.md` (detailed file guide)
- [ ] Read `README.md` (project overview)
- [ ] Understand file structure
- [ ] Know which file does what

---

## ✨ Final Verification

- [ ] All installation steps completed
- [ ] All credentials added to `.env`
- [ ] All tests passed
- [ ] Bot runs without errors
- [ ] Frontend loads
- [ ] Game is playable in Telegram
- [ ] Can understand project structure
- [ ] Ready to start coding

---

## 🎉 You're Ready!

If all checkboxes are checked, you're ready to:
1. Start developing new features
2. Modify existing functionality
3. Deploy to production
4. Invite other developers

**Happy coding!** 🚀

---

## 📞 Quick Reference

| Issue | Solution |
|-------|----------|
| Bot won't start | Check BOT_TOKEN in .env |
| Can't connect to database | Check MONGODB_URI and MongoDB Atlas |
| Frontend won't load | Run `npm run frontend` in separate terminal |
| WebSocket error | Check WS_PORT=3002 is not blocked |
| Mini-app won't open | Check BOT_TOKEN is valid |

For more help, read the documentation files or check console for error messages.
