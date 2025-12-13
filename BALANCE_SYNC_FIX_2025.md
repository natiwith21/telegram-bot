# Balance Sync Issue - Complete Fix

## Problem
The game UI shows: **"⚠️ Unable to sync balance with server. Using local data."** even with a great internet connection.

## Root Cause
The frontend was falling back to `window.location.origin` (the frontend URL) instead of the backend API URL when the environment variable `VITE_BACKEND_URL` was not set.

This caused API calls to:
- Try to hit the frontend server instead of the backend
- Fail with CORS errors or 404 responses
- Fall back to showing the warning message

## Solution Implemented

### 1. Fixed Backend URL Fallback (api.js)
**File:** `frontend/src/utils/api.js`

Changed fallback from `window.location.origin` to hardcoded production URL:
```javascript
// OLD (BROKEN):
const origin = window.location.origin;
return origin;

// NEW (FIXED):
const productionUrl = 'https://telegram-bot-u2ni.onrender.com';
return productionUrl;
```

### 2. Updated LikeBingo.jsx
**File:** `frontend/src/pages/LikeBingo.jsx`

Fixed all backend URL references to use proper fallback chain:
```javascript
const backendUrl = import.meta.env.VITE_BACKEND_URL || 
                  process.env.REACT_APP_BACKEND_URL ||
                  'https://telegram-bot-u2ni.onrender.com';
```

### 3. Created Frontend .env Example
**File:** `frontend/.env.example`

Created documentation showing how to configure environment variables.

## How to Complete the Fix

### Step 1: Update frontend/.env file
Make sure your frontend `.env` file contains:
```
VITE_BACKEND_URL=https://telegram-bot-u2ni.onrender.com
```

**OR** for local development with local backend:
```
VITE_BACKEND_URL=http://localhost:3001
```

### Step 2: Rebuild Frontend
```bash
cd frontend
npm install
npm run build
```

### Step 3: Redeploy to Render
Push changes to GitHub and Render will auto-deploy.

## What was Fixed

### Files Updated:
1. ✅ `frontend/src/utils/api.js` - Fixed fallback URL logic
2. ✅ `frontend/src/pages/LikeBingo.jsx` - Fixed multiple API calls
3. ✅ `frontend/.env.example` - Created environment variable documentation

### API Calls Now Work:
- ✅ User balance sync on game load
- ✅ Game result processing (win/loss)
- ✅ WebSocket data fallback

## Verification Checklist

After deploying, verify that:

1. **Game loads without warning**
   - Start the game and check console
   - Should see: "✅ Found user with balance" instead of warning

2. **Balance updates correctly**
   - Play a game
   - Win/lose coins should reflect in balance

3. **Console shows correct URL**
   - Open browser dev tools → Console
   - Should show: "🔗 Backend URL: https://telegram-bot-u2ni.onrender.com"
   - Should NOT show errors about CORS or 404

4. **Network requests succeed**
   - Open browser dev tools → Network tab
   - API calls to `/api/user/{id}` should return 200 status
   - Should see proper JSON response with balance data

## Additional Notes

### Why window.location.origin didn't work:
- When deployed on Render, frontend and backend are on same domain
- BUT `window.location.origin` returns the exact page being viewed
- When frontend loads from Render, it redirects to frontend's Render URL
- So API calls were hitting frontend server, not backend API

### Why the new solution works:
- Hardcoded production URL is explicit and reliable
- Falls back through: ENV variable → Hardcoded URL
- Works for both development (with proper .env) and production (hardcoded fallback)

## Next Steps (Optional Improvements)

1. **Use API utility in all pages**
   - Files like `Spin.jsx`, `Bingo.jsx`, etc. still hardcode URLs
   - Consider refactoring to use `getBackendUrl()` from `api.js`

2. **Update remaining pages**
   - `frontend/src/pages/SpinPro.jsx`
   - `frontend/src/pages/BingoPro.jsx`
   - `frontend/src/pages/Admin.jsx`
   - etc.

3. **Create a shared context**
   - Could create a React context for backend URL
   - Easier to update backend URL globally if needed

## Testing Commands

```bash
# Test from browser console
fetch('https://telegram-bot-u2ni.onrender.com/api/user/492994227')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))

# If you get JSON with user data → Backend is working
# If you get error → Check backend logs or MongoDB connection
```

## Support

If still seeing the warning after deploying:

1. Check browser console for actual error message
2. Verify backend is running: `https://telegram-bot-u2ni.onrender.com/health`
3. Check MongoDB connection in backend logs
4. Clear browser cache (Ctrl+Shift+Delete) and reload
