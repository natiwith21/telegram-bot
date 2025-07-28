@echo off
echo 🚀 STARTING EVERYTHING FOR MOBILE TESTING
echo.

echo ==========================================
echo STEP 1: Starting Backend Server (port 3001)
echo ==========================================
start "Backend Server" cmd /k "cd /d %~dp0 && echo 🔧 Starting backend server... && npm start"

echo ⏳ Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak

echo.
echo ==========================================
echo STEP 2: Starting Frontend (port 3000)
echo ==========================================
start "Frontend" cmd /k "cd /d %~dp0\frontend && echo 🎮 Starting frontend... && npm run dev"

echo ⏳ Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak

echo.
echo ==========================================
echo STEP 3: Starting ngrok tunnel (port 3000)
echo ==========================================
echo 🌐 Starting ngrok tunnel to frontend...
echo Copy the HTTPS URL and update your .env file!
echo.
start "Ngrok Tunnel" cmd /k "ngrok http 3000"

echo.
echo ==========================================
echo 📋 NEXT STEPS:
echo ==========================================
echo 1. ✅ Backend running on http://localhost:3001
echo 2. ✅ Frontend running on http://localhost:3000  
echo 3. ✅ ngrok tunnel started
echo 4. 📝 Copy the ngrok HTTPS URL (e.g., https://abc123.ngrok-free.app)
echo 5. 🔧 Update WEB_APP_URL in your .env file
echo 6. 🤖 Already updated BotFather? ✅
echo 7. 🔄 Restart backend: Ctrl+C in backend window, then 'npm start'
echo 8. 📱 Test on your phone!
echo.
pause
