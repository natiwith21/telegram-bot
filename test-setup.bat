@echo off
echo 🧪 TESTING YOUR SETUP
echo.

echo Testing ngrok URL: https://5a6fdd935cb2.ngrok-free.app
echo.

echo ==========================================
echo TEST 1: Check if frontend is accessible
echo ==========================================
curl -s -o nul -w "HTTP Status: %%{http_code}\n" https://5a6fdd935cb2.ngrok-free.app
if %errorlevel% equ 0 (
    echo ✅ ngrok URL is accessible
) else (
    echo ❌ ngrok URL not accessible - make sure frontend is running
)

echo.
echo ==========================================
echo TEST 2: Check local ports
echo ==========================================
echo Checking port 3000 (frontend):
netstat -ano | findstr :3000
echo.
echo Checking port 3001 (backend):
netstat -ano | findstr :3001

echo.
echo ==========================================
echo TEST 3: Open test URLs
echo ==========================================
echo Opening your ngrok URL in browser...
start https://5a6fdd935cb2.ngrok-free.app

echo.
echo ==========================================
echo RESULTS
echo ==========================================
echo If the web page opened successfully: ✅ Setup is working!
echo If you see an error page: ❌ Frontend not running properly
echo.
echo Next: Test your Telegram bot on mobile
echo.
pause
