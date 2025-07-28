@echo off
echo 🚀 Starting Telegram Bot Gaming Platform...
echo.

echo ✅ Installing dependencies...
call npm install
cd frontend
call npm install
cd ..

echo.
echo 🎮 Starting all services...
echo.
echo 📋 This will open 3 windows:
echo   1. Backend Server (port 3001)
echo   2. Frontend App (port 3000)  
echo   3. LocalTunnel (public HTTPS URL)
echo.

start "Backend Server" cmd /k "echo 🔧 Backend Server && npm start"
timeout /t 3 /nobreak >nul

start "Frontend App" cmd /k "echo 🎨 Frontend App && npm run frontend"
timeout /t 3 /nobreak >nul

start "ngrok Tunnel" cmd /k "echo 🌐 Public URL && ngrok http 3000"

echo.
echo ✅ All services started!
echo.
echo 📝 Next steps:
echo   1. Copy the HTTPS URL from LocalTunnel window
echo   2. Update your .env file with WEB_APP_URL=https://your-url.loca.lt
echo   3. Update BotFather menu button with the same URL
echo   4. Restart backend by pressing Ctrl+C and running 'npm start' again
echo.
pause
