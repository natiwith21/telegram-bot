@echo off
echo 🔧 TELEGRAM BOT WEBHOOK FIX
echo ============================

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found!
    echo 💡 Create .env file with BOT_TOKEN and RENDER_EXTERNAL_URL
    pause
    exit /b 1
)

echo 🚀 Running webhook fix script...
node fix-webhook.js

echo.
echo ✅ Webhook fix completed!
echo 🧪 Test your bot by sending /start
echo.
pause
