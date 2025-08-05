@echo off
echo ========================================
echo 🧪 TESTING INVITE SYSTEM
echo ========================================
echo.

echo 🤖 Starting bot...
echo.

echo 📋 Test Steps:
echo 1. Send /invite to your bot
echo 2. Check if you get a proper invite link
echo 3. Copy the link and try opening it
echo 4. Check if the "Share Link" button works
echo.

echo Expected results:
echo ✅ Bot username should be detected
echo ✅ Invite link should be: https://t.me/YOUR_BOT_USERNAME?start=YOUR_USER_ID
echo ✅ Share button should open Telegram share dialog
echo ❌ If you see error, bot username might not be set
echo.

echo 🚀 Starting bot for testing...
node bot.js

pause
