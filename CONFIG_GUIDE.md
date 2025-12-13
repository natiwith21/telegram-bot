# Configuration Guide

All sensitive configuration values have been centralized in the `.env` file for easy management.

## Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Update the `.env` file with your actual values:**
   - Replace `your_bot_token_here` with your actual Telegram Bot Token
   - Replace `admin_id_1_here` and `admin_id_2_here` with actual admin IDs
   - Replace `your_mongodb_uri_here` with your MongoDB connection string
   - Update URLs if deploying to a different server
   - Update payment information (phone, bank account, bank name)
   - Update admin usernames

3. **Ensure `.env` is in `.gitignore`** (it should already be there)

## Environment Variables Reference

### Telegram Configuration
- `BOT_TOKEN` - Your Telegram bot token from BotFather
- `ADMIN_ID_1` - First admin's Telegram ID
- `ADMIN_ID_2` - Second admin's Telegram ID
- `ADMIN_USERNAME_1` - First admin's Telegram username
- `ADMIN_USERNAME_2` - Second admin's Telegram username

### Database
- `MONGODB_URI` - MongoDB connection string with credentials

### Server
- `PORT` - API server port (default: 3001)
- `WS_PORT` - WebSocket server port (default: 3002)
- `NODE_ENV` - Environment (development/production)

### URLs
- `BACKEND_URL` - Backend/API server URL
- `FRONTEND_URL` - Frontend application URL
- `WEBHOOK_URL` - Telegram webhook URL
- `REACT_APP_BACKEND_URL` - Frontend environment variable for backend URL

### Payment & Banking
- `AGENT_PHONE` - Payment agent phone number
- `BANK_NAME` - Bank name for transfers
- `BANK_ACCOUNT_NUMBER` - Bank account number

## Files Updated to Use `.env`

1. **bot.js** - Payment configuration
2. **frontend/src/hooks/useWebSocket.js** - WebSocket connection URL
3. **frontend/src/pages/LikeBingo.jsx** - API endpoints

All hardcoded values have been replaced with `process.env.VARIABLE_NAME` references.

## For Next Developer

Simply update the `.env` file with the correct values for your deployment, and all configurations will be applied automatically across the entire application.

No need to search through files or change code - everything is centralized in one place.
