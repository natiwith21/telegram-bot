@echo off
echo 🔍 DEBUGGING MOBILE TELEGRAM BOT ISSUE
echo.

echo ==========================================
echo CHECKING CONFIGURATION
echo ==========================================
echo Reading .env file...
node -e "require('dotenv').config(); console.log('✅ BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET (length: ' + process.env.BOT_TOKEN.length + ')' : '❌ MISSING'); console.log('✅ WEB_APP_URL:', process.env.WEB_APP_URL || '❌ MISSING'); console.log('✅ MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : '❌ MISSING');"

echo.
echo ==========================================
echo TESTING NGROK URL
echo ==========================================
echo Testing if ngrok URL is accessible...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" https://5a6fdd935cb2.ngrok-free.app
if %errorlevel% equ 0 (
    echo ✅ ngrok URL is accessible from outside
) else (
    echo ❌ ngrok URL not accessible
)

echo.
echo ==========================================
echo BOTFATHER CHECKLIST
echo ==========================================
echo Did you do these in BotFather?
echo 1. ✅ Send /mybots to @BotFather
echo 2. ✅ Select your bot
echo 3. ✅ Choose "Bot Settings" → "Menu Button"  
echo 4. ✅ Send: https://5a6fdd935cb2.ngrok-free.app
echo.
echo If not, do this now on your phone!

echo.
echo ==========================================
echo NEXT STEPS
echo ==========================================
echo 1. Make sure backend is running (npm start)
echo 2. Make sure frontend is running (cd frontend && npm run dev)
echo 3. Make sure ngrok is running (ngrok http 3000)
echo 4. Update BotFather menu button with: https://5a6fdd935cb2.ngrok-free.app
echo 5. Test bot on mobile
echo.
pause
