@echo off
echo 📦 Installing missing dependencies...
echo.

echo Installing WebSocket package...
npm install ws

echo Installing MongoDB local (alternative to cloud)...
npm install mongodb-memory-server

echo Installing all other dependencies...
npm install

echo.
echo ✅ Dependencies installed!
echo.
echo 📋 Next steps:
echo 1. Copy .env.example to .env
echo 2. Add your BOT_TOKEN to .env
echo 3. Run: node check-env.js
echo 4. Run: start-simple.bat
echo.
pause
