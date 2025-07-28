@echo off
echo Starting Telegram Bot...
echo.
echo Make sure your .env file contains:
echo MONGODB_URI=mongodb+srv://natnaelabiy88:bingo@cluster0.0dqmbh8.mongodb.net/?retryWrites=true^&w=majority^&appName=Cluster0
echo BOT_TOKEN=your_bot_token
echo WEB_APP_URL=your_web_app_url
echo PORT=3001
echo.
pause
npm start
