@echo off
echo ========================================
echo    TELEGRAM BOT HTTPS TUNNEL SETUP
echo ========================================
echo.

echo Step 1: Starting frontend on port 3000...
start "Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo Waiting for frontend to start...
timeout /t 8 /nobreak

echo.
echo Step 2: Starting ngrok tunnel...
echo.
echo ⚠️ IMPORTANT: Copy the HTTPS URL from the ngrok window!
echo Example: https://abc123.ngrok-free.app
echo.
start "Ngrok" cmd /k "ngrok http 3000"

echo.
echo Step 3: Update your .env file
echo Replace: WEB_APP_URL=https://your-ngrok-url.ngrok-free.app
echo With:    WEB_APP_URL=https://[your-actual-ngrok-url].ngrok-free.app
echo.

echo Step 4: Restart your bot
echo Run: npm start
echo.

echo ========================================
echo    SETUP COMPLETE
echo ========================================
pause
