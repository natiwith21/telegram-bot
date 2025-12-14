# Developer Guide - Telegram Bingo Game

## Project Structure

### Backend Files

#### Core Server
- **bot.js** - Telegram bot handler using Telegraf library. Manages user interactions, game commands, and payment processing
- **server.js** - Express.js HTTP server. Handles API endpoints for user validation, balance management, and token generation
- **websocket-server.js** - WebSocket server using ws library. Manages real-time game synchronization, countdown timers, and multiplayer state

#### Database & Models
- **models/** - Database schemas for users, transactions, and game records
- **utils/** - Helper functions for balance calculations, payment verification, and data validation

#### Commands & Features
- **commands/** - Individual command handlers for /start, /play, /balance, /admin, etc.

### Frontend Files

#### Pages
- **frontend/src/pages/BingoPro.jsx** - Professional bingo game UI with grid rendering, countdown display, and game controls. Uses global synchronized game mode
- **frontend/src/pages/LikeBingo.jsx** - Multiplayer bingo game with real-time synchronization, stake settings (10/20 coins), and balance management
- **frontend/src/pages/Spin.jsx** - Spin wheel game page with number selection and winning logic
- **frontend/src/pages/SpinPro.jsx** - Enhanced spin game with animations and professional UI
- **frontend/src/pages/Menu.jsx** - Main navigation menu with game mode selection
- **frontend/src/pages/Admin.jsx** - Admin panel for game statistics and management

#### Hooks
- **frontend/src/hooks/useWebSocket.js** - WebSocket connection manager with auto-reconnection logic
  - `useWebSocket()` - Generic WebSocket hook
  - `usePaymentWebSocket()` - Payment status monitoring
  - `useBingoWebSocket()` - Bingo game specific features
  - `useGlobalBingoWebSocket()` - Synchronized multiplayer bingo coordination

- **frontend/src/hooks/useTelegram.jsx** - Telegram Web App integration and user context

#### Components
- **frontend/src/components/Navigation.jsx** - Route navigation and menu
- **frontend/src/components/WalletBalance.jsx** - Balance display component
- **frontend/src/components/Layout.jsx** - Page layout wrapper

#### Utilities
- **frontend/src/utils/api.js** - HTTP API call functions for backend communication

---

## Key Game Mechanics

### Bingo Game Flow (LikeBingo.jsx & BingoPro.jsx)

1. **Setup Phase** - User selects numbers or joins multiplayer game
2. **Countdown Phase** - Server-side countdown (sent via WebSocket every 1 second)
3. **Playing Phase** - Numbers are called, players mark cards
4. **Win Detection** - Player bingo claimed via button or automatic detection
5. **Result Processing** - Balance updated based on win/loss

### Real-time Synchronization

- **Server sends countdown ticks** every 1 second via `shared_game_countdown` message
- **Frontend local fallback** - If no server update for 1.5s, frontend decrements locally
- **Number calling** - Server controls all number calls every 3 seconds for paid versions
- **Player synchronization** - All players see same numbers at same time (server timestamp)

### Balance Management

- **User balance stored in database** - Updated on game end only
- **Frontend caching** - Balance refreshed every 15 seconds via API
- **Stake system** - Deducted on game start, returned with winnings on game end
- **Multipliers** - 10 coins (2.5x), 20 coins (3x), 50 coins (3.5x), 100 coins (4x)

---

## Critical Components to Understand

### WebSocket Message Types

**Game Countdown Messages:**
```javascript
{
  type: 'shared_game_countdown',
  countdown: 24,           // Seconds remaining
  serverTime: timestamp,
  startTime: timestamp,
  playersCount: 3,
  gameId: 'game-123'
}
```

**Number Called Messages:**
```javascript
{
  type: 'shared_number_called',
  number: 52,
  calledNumbers: [10, 25, 52],
  totalCalled: 3,
  serverTime: timestamp
}
```

**Game Win Messages:**
```javascript
{
  type: 'global_game_win',
  winner: telegramId,
  winPattern: 'Horizontal Line',
  winAmount: 150
}
```

### State Management

**Frontend uses React hooks:**
- `useState` - Local component state (countdown, stake, marked numbers)
- `useEffect` - Synchronize with WebSocket messages
- `useRef` - Track intervals and timing references

**No Redux/Zustand** - State is managed per component and synced via WebSocket

### Game Modes

- **demo** - Practice mode, no real coins
- **10**, **20**, **50**, **100** - Paid modes with real coins, multiplayer synchronized

---

## Common Tasks for Developers

### Adding a New Game
1. Create new page in `frontend/src/pages/NewGame.jsx`
2. Add route in `frontend/src/pages/App.jsx`
3. Implement WebSocket handler in `websocket-server.js`
4. Create API endpoint in `server.js` for balance updates

### Modifying Stake Values
- Frontend: Update menu options in `LikeBingo.jsx` line 1616-1617
- Backend: Update multipliers in `websocket-server.js` game configuration
- Ensure balance checks work with new values

### Debugging Countdown Issues
- Check `websocket-server.js` lines 540-570 for server countdown logic
- Check `LikeBingo.jsx` lines 85-141 for frontend countdown sync
- Enable console logs: look for `⏱️` and `🔄` prefixes

### Testing Multiplayer
1. Open game in 2 browser windows/tabs
2. Check WebSocket connection: `useWebSocket` logs in console
3. Verify countdown syncs across both clients
4. Verify numbers called appear on both sides simultaneously

---

## Configuration Files

- **.env** - Environment variables (Telegram token, database URL, backend URL)
- **package.json** - Dependencies and scripts
- **frontend/vite.config.js** - Vite bundler configuration
- **frontend/tailwind.config.js** - Tailwind CSS configuration

---

## Performance Considerations

- **WebSocket broadcasts** - Synchronized to 1-second intervals to avoid message flooding
- **Local decrement fallback** - Prevents countdown freezing if server connection lags
- **Balance refresh interval** - 15 seconds to minimize API calls while staying in sync
- **Sound effects** - Toggle-able to prevent audio issues on low-end devices

---

## Testing Checklist

- [ ] Countdown displays correctly (matches backend logs)
- [ ] Stake menu changes work (10/20 coins both functional)
- [ ] Balance deducts on game start, updates on game end
- [ ] WebSocket reconnects after disconnect
- [ ] All players see same numbers at same time
- [ ] Win detection works for all patterns
- [ ] Sound toggle works and persists during game
