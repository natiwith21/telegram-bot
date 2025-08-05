@echo off
echo ========================================
echo 🔍 TELEGRAM BOT SETUP DIAGNOSTICS
echo ========================================
echo.

echo 📁 Checking files...
if exist .env (
    echo ✅ .env file found
) else (
    echo ❌ .env file missing!
    echo    Create .env file with your configuration
    goto :end
)

if exist bot.js (
    echo ✅ bot.js found
) else (
    echo ❌ bot.js missing!
    goto :end
)

if exist package.json (
    echo ✅ package.json found
) else (
    echo ❌ package.json missing!
    goto :end
)

echo.
echo 📋 .env file contents:
echo ----------------------------------------
type .env
echo ----------------------------------------
echo.

echo 📦 Installing dependencies...
npm install

echo.
echo 🤖 Starting bot with debug mode...
echo ========================================
echo Look for these messages in the output:
echo - "✅ X admin(s) configured"
echo - "ADMIN_ID_1: 492994227"
echo - No warnings about usernames
echo ========================================
echo.

node bot.js

:end
pause
