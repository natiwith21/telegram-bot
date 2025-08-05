@echo off
echo ========================================
echo     TESTING PROFESSIONAL UI
echo ========================================
echo.

echo Starting Professional Gaming UI...
echo.

echo Step 1: Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Step 2: Starting Bot Backend...
start "Backend" cmd /k "cd /d %~dp0 && npm start"

echo.
echo ========================================
echo     UI TESTING GUIDE
echo ========================================
echo.
echo 🎮 DIRECT BROWSER ACCESS:
echo • Main Menu: http://localhost:3000
echo • Professional Bingo: http://localhost:3000/bingo?mode=demo
echo • Professional Spin: http://localhost:3000/spin
echo • Admin Panel: http://localhost:3000/admin
echo.
echo 🎯 NEW PROFESSIONAL FEATURES:
echo • Dark gaming theme with neon accents
echo • Smooth animations and transitions
echo • Glass morphism effects
echo • Professional typography
echo • Enhanced sound effects
echo • Real-time statistics
echo • Mobile-responsive design
echo.
echo 📱 TELEGRAM BOT TESTING:
echo 1. Go to your Telegram bot
echo 2. Click "Play Bingo" 
echo 3. Select any level
echo 4. Click "🌐 Browser Game" button
echo 5. Enjoy the professional UI!
echo.
echo ========================================
echo     ENJOY THE NEW EXPERIENCE!
echo ========================================
pause
