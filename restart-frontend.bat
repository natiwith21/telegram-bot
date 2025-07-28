@echo off
echo 🔄 RESTARTING FRONTEND WITH NGROK FIX
echo.

echo Stopping any running frontend processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Frontend*" 2>nul

echo.
echo Starting frontend with ngrok support...
start "Frontend Fixed" cmd /k "cd /d %~dp0\frontend && echo ✅ Frontend restarting with ngrok support... && npm run dev"

echo.
echo ✅ Frontend should now work with ngrok URL!
echo 🔗 Test: https://5a6fdd935cb2.ngrok-free.app
echo.
pause
