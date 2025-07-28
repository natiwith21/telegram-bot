# 🎮 Telegram Bot Gaming Platform

A complete Telegram Mini Web App with games, wallet system, and admin panel.

## 🚀 Features

### 🎯 Games
- **Bingo**: 10x10 grid with auto number marking
- **Spin Wheel**: Animated wheel with coin/bonus prizes
- **Real-time results** connected to backend

### 💰 Wallet System
- Balance and bonus tracking
- Game winnings automatically credited
- Transaction history

### 🛡️ Admin Panel
- User management (edit balance, ban users)
- Global announcements
- Game/transaction history
- Simple password authentication

## 📱 Setup Instructions

### 🚀 **Quick Start (Windows)**
1. **Double-click `start-all.bat`** - This automatically starts everything!

### 🔧 **Manual Setup**
1. **Copy .env.template to .env** and fill in your bot token
2. **Install dependencies:**
   ```bash
   npm run setup
   ```
3. **Start all services:**
   ```bash
   # Terminal 1 - Backend
   npm start
   
   # Terminal 2 - Frontend  
   npm run frontend
   
   # Terminal 3 - Public tunnel
   npm run tunnel
   ```

### 📱 **Telegram Bot Setup**
1. **Create bot** with @BotFather
2. **Get bot token** and add to .env file
3. **Copy tunnel URL** and update .env WEB_APP_URL
4. **Set menu button** in BotFather with tunnel URL
5. **Restart backend** server

## 🔗 Routes

- `/` or `/menu` - Main menu with wallet and game buttons
- `/bingo` - Bingo game (10x10 grid)
- `/spin` - Spin wheel game
- `/admin` - Admin dashboard (password: `admin123`)

## 🏗️ Architecture

- **Backend**: Express.js server with MongoDB
- **Frontend**: React + Vite + Tailwind CSS
- **Animation**: Framer Motion
- **Routing**: React Router
- **Authentication**: Telegram WebApp API

## 🎲 Game Features

### Bingo
- 10x10 grid with numbers 1-100
- Auto number calling every 2 seconds
- Win conditions: full row, column, or diagonal
- Awards 50 coins on win

### Spin Wheel
- 8 prize segments
- Animated spinning with physics
- Prizes: 10-50 coins, 5-10 bonus, or lose
- Results saved to user history

### Admin Panel
- View all users with balances
- Edit user details and balances
- Ban/unban functionality
- Send global announcements
- View complete game history
