@echo off
echo 🔧 FIXING NGROK POPUP ISSUE
echo.

echo ==========================================
echo STEP 1: Check if anything runs on port 3000
echo ==========================================
netstat -ano | findstr :3000
if %errorlevel% neq 0 (
    echo ❌ Nothing running on port 3000!
    echo ✅ SOLUTION: Start your server first!
    echo.
    echo Starting server now...
    start "Server" cmd /k "cd /d %~dp0 && npm start"
    echo ⏳ Waiting 5 seconds for server to start...
    timeout /t 5 /nobreak
    echo.
) else (
    echo ✅ Something is running on port 3000
)

echo ==========================================
echo STEP 2: Setup ngrok authentication
echo ==========================================
echo Adding auth token...
ngrok config add-authtoken 305ycN0ipqo9S135NXDQl2JXf8E_6yTJ6Kv2qr8k65nZZnEM6
if %errorlevel% neq 0 (
    echo ❌ Failed to add auth token
) else (
    echo ✅ Auth token added
)

echo.
echo ==========================================
echo STEP 3: Testing ngrok with proper setup
echo ==========================================
echo Now starting ngrok tunnel...
echo This window will stay open!
echo.
ngrok http 3000 --log=stdout
