@echo off
echo ========================================
echo    TESTING LIKE BINGO GAME
echo ========================================
echo.

echo Starting Like Bingo Game with your preferred UI style...
echo.

echo Step 1: Starting Backend API...
start "Backend" cmd /k "cd /d %~dp0 && npm start"

echo.
echo Step 2: Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ========================================
echo     LIKE BINGO TESTING GUIDE
echo ========================================
echo.
echo 🎮 DIRECT BROWSER ACCESS:
echo • Like Bingo Game: http://localhost:3000/like-bingo
echo • Main Menu: http://localhost:3000/menu
echo.
echo 📱 TELEGRAM BOT TESTING:
echo 1. Go to your Telegram bot
echo 2. Click "Play Bingo"
echo 3. Click "Like Bingo (NEW)"
echo 4. Click "🎮 Play Like Bingo (Browser)" button
echo.
echo 🎯 GAME FEATURES:
echo • Mobile-first UI design (purple theme)
echo • Number selection (1-100, max 10 numbers)
echo • Variable stakes (5-50 coins)
echo • Real-time balance updates
echo • Game history tracking
echo • Tab navigation (Game/Scores/History/Wallet/Profile)
echo • Animated game results
echo • Win multipliers up to 20x
echo.
echo 🏆 HOW TO WIN:
echo • Select numbers (1-100)
echo • More matches = higher multiplier
echo • 3 matches: 1.2x stake
echo • 5 matches: 2x stake  
echo • 7 matches: 5x stake
echo • 10 matches: 20x stake
echo.
echo ========================================
echo     ENJOY THE MOBILE EXPERIENCE!
echo ========================================
pause
