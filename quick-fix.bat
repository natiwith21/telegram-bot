@echo off
echo ========================================
echo 🔧 QUICK FIX FOR TELEGRAM BOT ISSUES
echo ========================================
echo.

echo 📦 Step 1: Installing missing dependencies...
npm install ws mongodb-memory-server
echo.

echo 📝 Step 2: Creating correct .env file...
echo BOT_TOKEN=your_bot_token_here > .env
echo WEB_APP_URL=http://localhost:3000 >> .env
echo ADMIN_ID_1=492994227 >> .env
echo # Add your actual bot token above >> .env
echo.

echo ✅ Created .env file with your admin ID: 492994227
echo.

echo 📋 Step 3: You need to add your BOT_TOKEN manually:
echo 1. Open .env file
echo 2. Replace "your_bot_token_here" with your actual bot token
echo 3. Save the file
echo.

echo 🧪 Step 4: Testing configuration...
node check-env.js
echo.

echo 🚀 Step 5: Starting bot...
echo If check-env.js shows all green, press any key to start the bot
pause

start-simple.bat
