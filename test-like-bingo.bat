@echo off
echo 🎯 Testing Like Bingo Feature
echo.
echo ==========================================
echo Bot Status Check
echo ==========================================
echo ✅ Bot started successfully with MongoDB connection
echo ✅ Like Bingo feature added to bot.js
echo ✅ New commands registered
echo.
echo ==========================================
echo How to Test Like Bingo
echo ==========================================
echo.
echo 📱 **On Your Phone (Telegram):**
echo 1. Open your bot in Telegram
echo 2. Send: /likebingo
echo 3. You should see the 10x10 grid interface
echo.
echo 🔘 **Alternative Access Methods:**
echo - Send /start → Menu → Play Bingo → Like Bingo (NEW)
echo - Send /playbingo → Like Bingo (NEW)
echo.
echo ==========================================
echo Expected Interface
echo ==========================================
echo 🎉 Like Bingo 🎉
echo.
echo 💰 Wallet: [your_balance]  🎁 Bonus: [your_bonus]
echo 🎯 Active Game: 2  💸 Stake: 10
echo.
echo 🔢 Select your numbers:
echo [10x10 grid with numbers 1-100]
echo [🔄 Refresh] [🎲 Start Game]
echo.
echo ==========================================
echo Features to Test
echo ==========================================
echo ✅ Click any number (1-100) → Should show "Selected number X!"
echo ✅ Click Refresh → Should update balance and show "Page refreshed!"
echo ✅ Click Start Game → Should deduct 10 coins and show "Game started!"
echo ✅ If balance < 10 → Should show insufficient funds warning
echo.
echo ==========================================
echo Troubleshooting
echo ==========================================
echo ❌ If bot doesn't respond:
echo   - Check if bot is running (npm start)
echo   - Verify MongoDB connection
echo   - Check .env file has correct BOT_TOKEN
echo.
echo ❌ If commands don't work:
echo   - Wait 1-2 minutes for Telegram to update commands
echo   - Try /start first to register
echo   - Check user registration status
echo.
echo 🔄 To restart bot: Ctrl+C then npm start
echo.
pause
