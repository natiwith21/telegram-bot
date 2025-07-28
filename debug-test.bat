@echo off
echo 🔍 DEBUGGING YOUR TELEGRAM BOT SETUP
echo.
echo ==========================================
echo STEP 1: Testing Node.js
echo ==========================================
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js
    pause
    exit /b 1
)
echo ✅ Node.js is working

echo.
echo ==========================================
echo STEP 2: Testing npm packages
echo ==========================================
if not exist node_modules (
    echo ❌ Packages not installed! Running npm install...
    npm install
)
echo ✅ Packages are installed

echo.
echo ==========================================
echo STEP 3: Checking .env file
echo ==========================================
if not exist .env (
    echo ❌ .env file not found!
    echo Please create .env file with:
    echo MONGODB_URI=your_mongodb_connection
    echo BOT_TOKEN=your_bot_token
    echo WEB_APP_URL=http://localhost:3000
    echo PORT=3000
    pause
    exit /b 1
)
echo ✅ .env file exists

echo.
echo ==========================================
echo STEP 4: Testing MongoDB connection
echo ==========================================
echo Testing database connection...
node -e "require('dotenv').config(); console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'MISSING'); console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING'); console.log('WEB_APP_URL:', process.env.WEB_APP_URL || 'NOT SET');"

echo.
echo ==========================================
echo STEP 5: Testing bot startup
echo ==========================================
echo Starting bot for 10 seconds...
timeout /t 3 /nobreak
start "" node bot.js
echo ✅ Bot started in background

echo.
echo ==========================================
echo STEP 6: Testing ngrok
echo ==========================================
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ngrok not found! Installing...
    npm install -g ngrok
)
echo ✅ ngrok is available

echo.
echo ==========================================
echo SUMMARY
echo ==========================================
echo If everything shows ✅, your setup is good!
echo If you see ❌, that's what needs to be fixed.
echo.
echo Next: Tell me which step failed and the error message.
echo.
pause
