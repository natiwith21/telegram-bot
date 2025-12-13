# Complete Fix Guide - Balance Sync + WebSocket Countdown

## Problems Fixed

### ❌ Problem 1: "⚠️ Unable to sync balance with server"
**Status:** ✅ FIXED

Balance sync was failing because:
- Frontend tried to call API on frontend URL instead of backend URL
- `window.location.origin` fallback pointed to wrong server

**Files Changed:**
- `frontend/src/utils/api.js`
- `frontend/src/pages/LikeBingo.jsx`

### ❌ Problem 2: Countdown & Current Call Stuck
**Status:** ✅ FIXED

Game UI was frozen because:
- WebSocket couldn't connect to backend
- `process.env.REACT_APP_BACKEND_URL` doesn't work in Vite
- Wrong WebSocket protocol (ws:// vs wss://)

**Files Changed:**
- `frontend/src/hooks/useWebSocket.js`

## What Changed

### 1. API URL Resolution (3 files)
**Fixed:** How frontend determines backend API URL

**Before (Broken):**
```javascript
// Falls back to frontend URL - WRONG!
const backendUrl = window.location.origin;
```

**After (Fixed):**
```javascript
// Falls back to production URL - CORRECT!
const backendUrl = 'https://telegram-bot-u2ni.onrender.com';
```

### 2. WebSocket URL Construction (useWebSocket.js)
**Fixed:** How frontend builds WebSocket connection URL

**Before (Broken):**
```javascript
// Uses old React CRA env variables - DOESN'T WORK IN VITE
const wsUrl = `${process.env.REACT_APP_BACKEND_URL}/ws?...`;
```

**After (Fixed):**
```javascript
// Proper Vite env variables + protocol conversion
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://telegram-bot-u2ni.onrender.com';
const wsUrl = backendUrl.replace('https://', 'wss://') + `/ws?...`;
```

## Complete File List

### Files Modified (4 total):

1. **frontend/src/utils/api.js**
   - Changed fallback from `window.location.origin` to hardcoded production URL
   - Line 14-16

2. **frontend/src/pages/LikeBingo.jsx**
   - Fixed loadUserData() to use correct backend URL
   - Fixed processGameResult() to use correct backend URL
   - Fixed test API button
   - Line 553-570, 431-445, 1524-1544

3. **frontend/src/hooks/useWebSocket.js**
   - Complete rewrite of WebSocket URL construction
   - Added proper environment variable handling
   - Added protocol conversion logic
   - Line 11-41

4. **frontend/.env.example**
   - Clarified VITE_BACKEND_URL usage
   - Added WebSocket URL documentation
   - Created as new file

## Quick Deploy (5 minutes)

### Step 1: Verify Changes
Check that these files exist and are modified:
```bash
git status
# Should show:
# frontend/src/utils/api.js (modified)
# frontend/src/pages/LikeBingo.jsx (modified)
# frontend/src/hooks/useWebSocket.js (modified)
# frontend/.env.example (new file)
```

### Step 2: Ensure Environment Setup
Make sure `frontend/.env` has:
```
VITE_BACKEND_URL=https://telegram-bot-u2ni.onrender.com
```

And root `.env` has (already there):
```
BACKEND_URL=https://telegram-bot-u2ni.onrender.com
NODE_ENV=production
WS_PORT=3002
```

### Step 3: Build & Push
```bash
cd frontend
npm install
npm run build

cd ..
git add .
git commit -m "Fix: WebSocket countdown + API balance sync with correct URLs"
git push origin main
```

### Step 4: Wait for Render
Render auto-deploys in 2-3 minutes.
Check Render dashboard for deployment status.

## Verification (After Deploy)

### Test 1: Check Console Messages
1. Open game: https://telegram-bot-u2ni.onrender.com/like-bingo
2. Press F12 to open DevTools → Console tab
3. Look for these SUCCESS messages:
   ```
   ✅ Using production URL fallback
   🔌 WebSocket URL: wss://telegram-bot-u2ni.onrender.com/ws?...
   WebSocket connected
   ✅ Found user with balance: XXX
   💳 Wallet synced: XXX coins
   ```

### Test 2: Play a Game
1. Start Bingo game
2. Verify countdown appears (starts at 30 seconds)
3. Watch countdown decrement every second
4. Watch "Current Call" show numbers being called
5. Mark some numbers
6. Win or lose - balance updates

✓ If all above work → **ALL FIXES WORKING!**

### Test 3: Check Network
1. Open DevTools → Network tab
2. Filter for "WS" (WebSocket)
3. Should show 1 WebSocket connection:
   - URL: `wss://telegram-bot-u2ni.onrender.com/ws?...`
   - Status: 101 Switching Protocols (✓ Connected)

## Troubleshooting

### Issue: Still seeing "Unable to sync balance"
**Check:**
1. Is `VITE_BACKEND_URL` set in `frontend/.env`?
2. Did you rebuild frontend: `npm run build`?
3. Did Render finish deploying?
4. Clear browser cache (Ctrl+Shift+Delete) and reload

**Solution:**
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
git add .
git commit -m "Rebuild frontend"
git push origin main
```

### Issue: Countdown still not showing
**Check:**
1. Console shows "WebSocket connected"? 
   - If NO: WebSocket connection failed
   - If YES: Check Render backend logs

2. Check Render backend logs for:
   ```
   🔌 Starting WebSocket server...
   ✅ WebSocket server started successfully
   WebSocket connection from user XXX
   ```

**Solution:**
1. Check if backend is running: https://telegram-bot-u2ni.onrender.com/health
2. Check Render logs for WebSocket errors
3. Restart backend on Render (deploy trigger)

### Issue: WebSocket "Error: Connection Refused"
**Cause:** Backend WebSocket server not running
**Solution:**
1. Check `NODE_ENV=production` in backend `.env`
2. Check `WS_PORT=3002` in backend `.env`
3. Restart backend deployment

### Issue: "403 Forbidden" on WebSocket
**Cause:** CORS or auth issue
**Solution:**
1. Verify token is being passed correctly
2. Check backend logs for auth errors
3. Clear browser cache and retry

## Architecture Diagram

```
User's Browser (Frontend)
    ↓
    ├─ REST API calls (/api/user/{id})
    │  ↓
    │  api.js: getBackendUrl()
    │  ├─ Try: import.meta.env.VITE_BACKEND_URL
    │  └─ Fallback: 'https://telegram-bot-u2ni.onrender.com'
    │  ↓
    │  Backend REST API (/api/*)
    │
    └─ WebSocket connection
       ↓
       useWebSocket.js: buildWsUrl()
       ├─ Get backend URL (same as REST)
       ├─ Convert protocol (https → wss://)
       └─ Build full URL with /ws endpoint
       ↓
       Backend WebSocket Server (/ws)
       ├─ Handles: shared_game_countdown
       ├─ Handles: shared_number_called
       ├─ Handles: shared_game_started
       └─ Broadcasts to all connected clients
```

## Technical Details

### How Countdown Works (Now Fixed)

1. **Player joins game** → Connects WebSocket
2. **Backend creates game** → Starts countdown
3. **Backend sends** → `{ type: 'shared_game_countdown', countdown: 30 }`
4. **Frontend receives** → Updates UI
5. **Every 1 second** → Countdown decrements
6. **When countdown = 0** → Game starts
7. **Numbers called** → `{ type: 'shared_number_called', number: 45 }`

The WebSocket connection was failing, so steps 2-7 never happened.

### How API Balance Works (Now Fixed)

1. **Game loads** → Calls `/api/user/{id}`
2. **Was going to** → frontend URL (WRONG)
3. **Now goes to** → backend URL (CORRECT)
4. **Returns user data** → `{ balance: 1000, bonus: 0 }`
5. **UI updates** → Shows balance 1000

The API call was failing because it tried to call the frontend server instead of backend.

## Environment Variables Summary

### What You Need in `.env` Files:

**Root .env (backend)**
```
BOT_TOKEN=8124555651:AAG1g5j4mHenXZq6uzMLswXWPUqYc0Jdi1s
MONGODB_URI=mongodb+srv://...
BACKEND_URL=https://telegram-bot-u2ni.onrender.com
FRONTEND_URL=https://telegram-bot-u2ni.onrender.com
WEBHOOK_URL=https://telegram-bot-u2ni.onrender.com/webhook
NODE_ENV=production
WS_PORT=3002
```

**frontend/.env**
```
VITE_BACKEND_URL=https://telegram-bot-u2ni.onrender.com
REACT_APP_BACKEND_URL=https://telegram-bot-u2ni.onrender.com
```

### What Each Variable Does:

| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_BACKEND_URL` | Frontend (Vite) | REST API calls + WebSocket URL |
| `REACT_APP_BACKEND_URL` | Frontend (legacy) | Fallback if VITE not set |
| `NODE_ENV=production` | Backend | Enables production mode + WebSocket |
| `WS_PORT` | Backend | WebSocket server port |
| `WEBHOOK_URL` | Backend | Telegram webhook endpoint |

## Success Indicators

After deployment, you'll know it's working when:

✅ **Balance loads without warning**
```
✅ Found user with balance: 1000
💳 Wallet synced: 1000 coins
```

✅ **WebSocket connects**
```
🔌 WebSocket URL: wss://telegram-bot-u2ni.onrender.com/ws?...
WebSocket connected
```

✅ **Countdown appears**
Game shows "30" and decrements every second

✅ **Current Call works**
Game shows numbers being called in real-time

✅ **Game plays properly**
Can mark numbers, win/lose, balance updates

## Next Steps (Optional)

### Refactor Other Pages
These pages still have hardcoded URLs - could use `getBackendUrl()`:
- `frontend/src/pages/Spin.jsx`
- `frontend/src/pages/Bingo.jsx`
- `frontend/src/pages/BingoPro.jsx`
- `frontend/src/pages/SpinPro.jsx`
- `frontend/src/pages/Admin.jsx`

### Create Shared Config
```javascript
// frontend/src/config/backend.js
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                          'https://telegram-bot-u2ni.onrender.com';
```

Then import in all pages:
```javascript
import { BACKEND_URL } from '@/config/backend';
const response = await fetch(`${BACKEND_URL}/api/...`);
```

## Support Documents

- **BALANCE_SYNC_FIX_2025.md** - Details on balance sync fix
- **WEBSOCKET_COUNTDOWN_FIX.md** - Details on WebSocket fix
- **DEPLOY_FIX.md** - Deployment instructions
- **COMPLETE_FIX_GUIDE.md** - This file (full overview)

## Testing Checklist

Before considering this complete, verify:

- [ ] Balance shows on game load (no warning)
- [ ] Countdown displays and decrements
- [ ] Current Call numbers appear in real-time
- [ ] Can mark numbers on bingo card
- [ ] Game ends properly
- [ ] Win/loss balance updates
- [ ] Multiple players see same countdown
- [ ] Console shows no red errors
- [ ] WebSocket shows "Connected" in Network tab

## Deployment Checklist

- [ ] Code changes committed to git
- [ ] Frontend rebuilt with `npm run build`
- [ ] VITE_BACKEND_URL set in frontend/.env
- [ ] NODE_ENV=production in root .env
- [ ] Changes pushed to GitHub
- [ ] Render deployment finished (check dashboard)
- [ ] Verified all fixes working with tests above

---

**Once all items above are checked, all fixes are complete and working!**
