@echo off
echo 🚀 STARTING TELEGRAM BOT WITH NGROK
echo Your ngrok URL: https://5a6fdd935cb2.ngrok-free.app
echo.

echo ==========================================
echo STEP 1: Starting Backend Server
echo ==========================================
start "Backend" cmd /k "cd /d %~dp0 && echo ✅ Backend starting on port 3001... && npm start"

timeout /t 3 /nobreak

echo.
echo ==========================================  
echo STEP 2: Starting Frontend
echo ==========================================
start "Frontend" cmd /k "cd /d %~dp0\frontend && echo ✅ Frontend starting on port 3000... && npm run dev"

timeout /t 5 /nobreak

echo.
echo ==========================================
echo CONFIGURATION CHECK
echo ==========================================
echo ✅ ngrok URL: https://5a6fdd935cb2.ngrok-free.app
echo ✅ Frontend: http://localhost:3000 
echo ✅ Backend: http://localhost:3001
echo ✅ Tunnel: ngrok forwards to frontend
echo.
echo 📱 Your bot should now work on mobile!
echo 🤖 BotFather menu button should be set to: https://5a6fdd935cb2.ngrok-free.app
echo.
echo 🔗 Test your web app directly: https://5a6fdd935cb2.ngrok-free.app
echo.
pause
