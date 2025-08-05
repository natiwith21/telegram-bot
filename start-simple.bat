@echo off
echo ========================================
echo     SIMPLE TELEGRAM BOT STARTUP
echo ========================================
echo.

echo Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo Waiting for frontend to load...
timeout /t 8 /nobreak

echo.
echo Starting Bot...
start "Bot" cmd /k "cd /d %~dp0 && npm start"

echo.
echo ========================================
echo             SUCCESS!
echo ========================================
echo.
echo ✅ Frontend: http://localhost:3000
echo ✅ Bot: Running with Telegram integration
echo.
echo 🎮 How to test:
echo 1. Go to your Telegram bot
echo 2. Click "Play Bingo"
echo 3. Select any Bingo option
echo 4. Click "🌐 Browser Game" button
echo 5. Game opens in browser!
echo.
echo 📱 Mini App buttons might not work due to HTTPS
echo 🌐 Browser buttons will always work!
echo.
pause
