@echo off
echo 📱 Starting Telegram Bot for Mobile Testing...
echo.
echo ✅ Step 1: Make sure your .env file has:
echo - MONGODB_URI (your MongoDB connection)
echo - BOT_TOKEN (from BotFather)
echo - WEB_APP_URL (will be updated with ngrok)
echo - PORT=3000
echo.
echo 🚀 Step 2: Starting bot server...
start "Bot Server" cmd /k "npm start"

echo.
echo ⏳ Waiting 5 seconds for server to start...
timeout /t 5 /nobreak

echo.
echo 🌐 Step 3: Starting ngrok tunnel...
echo Copy the HTTPS URL that appears and update your .env WEB_APP_URL
echo.
start "Ngrok Tunnel" cmd /k "ngrok http 3000"

echo.
echo 📋 Next Steps:
echo 1. Copy the ngrok HTTPS URL (e.g., https://abc123.ngrok-free.app)
echo 2. Update WEB_APP_URL in your .env file
echo 3. Update BotFather menu button with the ngrok URL
echo 4. Restart the bot (Ctrl+C and npm start)
echo 5. Test on your phone!
echo.
pause
