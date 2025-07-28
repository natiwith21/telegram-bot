@echo off
echo Starting ngrok tunnel...
echo.
cd /d "C:\Users\hp\Desktop\telegram-bot"
echo Current directory: %cd%
echo.
echo Configuring ngrok auth token...
ngrok config add-authtoken 305ycN0ipqo9S135NXDQl2JXf8E_6yTJ6Kv2qr8k65nZZnEM6
echo.
echo Starting ngrok tunnel on port 3000...
ngrok http 3000
echo.
pause
