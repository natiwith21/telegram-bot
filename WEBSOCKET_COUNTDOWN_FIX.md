# WebSocket Connection Fix - Countdown & Current Call

## Problem
Game loads, shows balance correctly, BUT:
- ❌ Countdown doesn't work
- ❌ Current Call (number calling) doesn't work
- ❌ Game appears to be stuck/frozen
- Game features that depend on real-time WebSocket data fail

## Root Cause
WebSocket URL was using incorrect environment variables:
- `process.env.REACT_APP_BACKEND_URL` doesn't work in Vite (old React CRA way)
- Was falling back to wrong URL protocol
- Could not establish WebSocket connection to backend

## Solution

### 1. Fixed useWebSocket Hook
**File:** `frontend/src/hooks/useWebSocket.js`

Changed WebSocket URL construction to:
```javascript
// NEW - CORRECT:
const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  return 'https://telegram-bot-u2ni.onrender.com';
};

// Proper protocol handling:
if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
  wsUrl = `ws://localhost:3002?...`; // Local dev
} else if (backendUrl.includes('http://')) {
  wsUrl = backendUrl.replace('http://', 'ws://') + `/ws?...`; // HTTP → WS
} else {
  wsUrl = backendUrl.replace('https://', 'wss://') + `/ws?...`; // HTTPS → WSS
}
```

### 2. Updated Environment Variables
**File:** `frontend/.env.example`

Clarified that `VITE_BACKEND_URL` is used for BOTH REST API and WebSocket connection.

## What This Fixes

✅ WebSocket connects to backend
✅ Real-time countdown messages received
✅ Current call numbers displayed in real-time
✅ Player synchronization works
✅ Game can be played properly

## How It Works

### Connection Flow:
```
Frontend (LikeBingo.jsx)
  ↓
useWebSocket hook
  ↓
Build correct WebSocket URL:
  - https://telegram-bot-u2ni.onrender.com
  - → converted to: wss://telegram-bot-u2ni.onrender.com/ws
  ↓
backend (bot.js - WebSocket server)
  ↓
Send countdown/current_call messages
  ↓
Frontend receives messages
  ↓
Update UI with countdown & current call
```

### Message Types Received:
1. **shared_game_countdown** - Updates countdown timer
2. **shared_number_called** - Broadcasts current number being called
3. **shared_game_started** - Signals game has started
4. **shared_game_ended** - Signals game has ended
5. **player_marked** - Shows when other players mark numbers

## Setup Checklist

### Frontend
- [ ] `frontend/.env` has `VITE_BACKEND_URL=https://telegram-bot-u2ni.onrender.com`
- [ ] `useWebSocket.js` is updated with correct URL logic
- [ ] Frontend is rebuilt: `npm run build`
- [ ] Frontend is deployed to Render

### Backend
- [ ] `bot.js` has `NODE_ENV=production` in `.env`
- [ ] WebSocket server is enabled (not disabled)
- [ ] Port 3002 is not blocked (in production, uses same port as backend)
- [ ] Backend is deployed to Render

### Testing
- [ ] Browser console shows: "🔌 WebSocket URL: wss://telegram-bot-u2ni.onrender.com/ws..."
- [ ] Browser console shows: "WebSocket connected"
- [ ] Game countdown appears and updates every second
- [ ] Current Call number displays
- [ ] No connection errors in console

## Verification Commands

### Check WebSocket Connection in Browser Console:
```javascript
// Open browser DevTools (F12) → Console tab

// You should see these logs:
// 🔌 WebSocket URL: wss://telegram-bot-u2ni.onrender.com/ws?...
// WebSocket connected
// WebSocket message received: {type: "shared_game_countdown", countdown: 5}
```

### Check Backend WebSocket Server:
Visit: `https://telegram-bot-u2ni.onrender.com/health`

Response should show:
```json
{
  "status": "healthy",
  "database": { "status": "connected" }
}
```

Check Render logs for:
```
🔌 Starting WebSocket server...
✅ WebSocket server started successfully
WebSocket connection from user XXX
```

## Common Issues & Solutions

### Issue: "WebSocket is not connected"
**Cause:** WebSocket didn't establish connection
**Solution:**
1. Check browser console for WebSocket connection error
2. Verify VITE_BACKEND_URL is correct
3. Check if backend WebSocket server is running (see logs on Render)
4. Clear browser cache and reload

### Issue: Countdown shows but doesn't update
**Cause:** WebSocket messages not being sent from backend
**Solution:**
1. Check backend logs on Render
2. Verify `NODE_ENV=production` in backend `.env`
3. Check that websocket-server.js is loaded in bot.js
4. Restart backend on Render

### Issue: "Connection failed" error
**Cause:** WebSocket protocol mismatch (wss:// vs ws://)
**Solution:**
1. The new fix automatically handles this
2. Clear browser cache
3. Reload page
4. Check console for correct WSS URL format

## File Changes

### Updated Files:
1. ✅ `frontend/src/hooks/useWebSocket.js` - Fixed WebSocket URL logic
2. ✅ `frontend/.env.example` - Clarified VITE_BACKEND_URL usage

### No changes needed:
- `backend/bot.js` - Already correct
- `backend/websocket-server.js` - Already correct

## Deployment Steps

### Step 1: Deploy Frontend
```bash
cd frontend
npm install
npm run build
git add .
git commit -m "Fix: WebSocket connection with correct URL handling"
git push origin main
```
Render auto-deploys in 2-3 minutes.

### Step 2: Verify
1. Open game page
2. Play a game
3. Check console: "🔌 WebSocket URL: wss://..."
4. Verify countdown displays
5. Verify current call numbers show

## Testing Scenarios

### Scenario 1: Play a Game
1. Open LikeBingo game
2. Wait for countdown to appear
3. Watch countdown update every second
4. Watch numbers get called
5. Mark some numbers
6. Win or lose a game

✓ If countdown and current call work → WebSocket is working!

### Scenario 2: Check Connections
In browser console:
```javascript
// Check WebSocket logs
// Should see many messages like:
// WebSocket message received: {type: "shared_number_called", number: 45}
```

### Scenario 3: Multiple Players
- Open game in 2+ browser tabs/windows
- See synchronized countdown
- See same numbers called across all tabs
- Both players see each other marking numbers

✓ If synchronized → WebSocket is working!

## Additional Notes

### Why WebSocket is Critical:
- REST API is stateless (one request/response)
- WebSocket is persistent connection (real-time messages)
- Game needs real-time updates for:
  - Countdown timer
  - Number calling
  - Player synchronization
  - Win notifications

### Protocol Conversion:
- Development: `http://localhost:3001` → `ws://localhost:3002`
- Production: `https://telegram-bot-u2ni.onrender.com` → `wss://telegram-bot-u2ni.onrender.com/ws`

### Behind the Scenes:
The new fix automatically detects the backend URL and converts it:
- Localhost/127.0.0.1 → Use `ws://localhost:3002`
- `http://` → Use `ws://`
- `https://` → Use `wss://`

## Next Steps

If still having issues:
1. Check browser DevTools Network tab → WS filter
2. See if WebSocket shows "Connected" or "Error"
3. Look at actual error message
4. Check Render backend logs for WebSocket connection logs
5. Verify MongoDB is connected (needed for some features)

## Support

Reference files:
- BALANCE_SYNC_FIX_2025.md - For API/balance issues
- DEPLOY_FIX.md - For general deployment
- WEBSOCKET_COUNTDOWN_FIX.md - This file (WebSocket specific)
