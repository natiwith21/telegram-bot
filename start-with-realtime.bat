@echo off
echo Starting Telegram Bot with Real-time WebSocket Features...
echo.

echo Installing WebSocket dependencies...
npm install ws
echo.

echo Starting WebSocket Server (Port 3002)...
start "WebSocket Server" cmd /k "node websocket-server.js"
timeout /t 2

echo Starting API Server (Port 3001)...
start "API Server" cmd /k "node server.js" 
timeout /t 2

echo Starting Telegram Bot...
start "Telegram Bot" cmd /k "node bot.js"
timeout /t 2

echo Starting Frontend Development Server (Port 3000)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo WebSocket Server: http://localhost:3002
echo API Server: http://localhost:3001  
echo Frontend: http://localhost:3000
echo Bot: Running in background
echo.
echo Real-time features enabled:
echo - Instant payment verification notifications
echo - Real-time Bingo number calls
echo - Multiplayer game awareness
echo - Live admin notifications
echo.
pause
