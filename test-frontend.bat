@echo off
echo ========================================
echo    TESTING MINI APP ACCESS
echo ========================================
echo.

echo Step 1: Starting frontend...
cd frontend
start "Frontend" cmd /k "npm run dev"

echo.
echo Step 2: Waiting for frontend to start...
timeout /t 10 /nobreak

echo.
echo Step 3: Testing direct access...
echo.
echo ✅ Open these URLs in your browser to test:
echo.
echo 🎮 Main Menu: http://localhost:3000
echo 🎯 Bingo Demo: http://localhost:3000/bingo?mode=demo
echo 🎰 Spin Game: http://localhost:3000/spin
echo 💼 Admin Panel: http://localhost:3000/admin
echo.

echo Step 4: If URLs work in browser, the mini app is fine!
echo The issue is just the Telegram Web App integration.
echo.

echo ========================================
echo    DIRECT ACCESS TEST
echo ========================================
pause
