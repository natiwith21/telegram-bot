# Deploy Balance Sync Fix

## Quick Steps (5 minutes)

### 1. Verify the fix is in place
Files should be updated:
- ✅ `frontend/src/utils/api.js` 
- ✅ `frontend/src/pages/LikeBingo.jsx`
- ✅ `frontend/.env.example`

### 2. Ensure .env is configured
Your `.env` files should have:

**Root `.env`** (already has this):
```
BACKEND_URL=https://telegram-bot-u2ni.onrender.com
```

**frontend/.env** (ensure it has):
```
VITE_BACKEND_URL=https://telegram-bot-u2ni.onrender.com
```

### 3. Test locally (optional)
```bash
cd frontend
npm install
npm run dev
```

Visit game and check browser console:
- Should see: "✅ Using production URL fallback"
- Should NOT see: "⚠️ Unable to sync balance"

### 4. Deploy to GitHub and Render
```bash
git add .
git commit -m "Fix: Balance sync issue with correct backend URL fallback"
git push origin main
```

Render will auto-deploy in 2-3 minutes.

### 5. Verify in production
After Render deployment finishes:

1. Open the game: https://telegram-bot-u2ni.onrender.com/like-bingo
2. Open browser DevTools (F12)
3. Go to Console tab
4. You should see: "✅ Using production URL fallback"
5. Play a game and verify balance updates

## What the fix does

**Before (Broken):**
```
loadUserData() 
  → tries backend URL 
  → falls back to window.location.origin (WRONG - frontend URL)
  → API call fails 
  → shows "⚠️ Unable to sync balance"
```

**After (Fixed):**
```
loadUserData() 
  → uses import.meta.env.VITE_BACKEND_URL (if set)
  → falls back to hardcoded production URL (CORRECT)
  → API call succeeds 
  → balance syncs properly
```

## Troubleshooting

### Still seeing warning?
Check browser console for actual error:
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for red error messages
4. Search in that error message for clues

Common issues:
- **MongoDB connection error** → Check backend logs on Render
- **CORS error** → Backend needs to allow frontend domain
- **404 error** → API endpoint doesn't exist on backend

### Check backend health
Visit: `https://telegram-bot-u2ni.onrender.com/health`

Should see JSON response like:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected"
  }
}
```

### Check API endpoint
Visit: `https://telegram-bot-u2ni.onrender.com/api/user/492994227`

Should see JSON response with user data (not an error).

## Files Modified

### 1. frontend/src/utils/api.js
```javascript
// OLD - BROKEN:
const origin = window.location.origin;
return origin;

// NEW - FIXED:
const productionUrl = 'https://telegram-bot-u2ni.onrender.com';
return productionUrl;
```

### 2. frontend/src/pages/LikeBingo.jsx (3 places)
```javascript
// OLD - BROKEN:
const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;

// NEW - FIXED:
const backendUrl = import.meta.env.VITE_BACKEND_URL || 
                  process.env.REACT_APP_BACKEND_URL ||
                  'https://telegram-bot-u2ni.onrender.com';
```

## Success Indicators

After deployment, you'll know it's fixed when:

✅ **Console shows correct URL:**
```
🔗 Backend URL: https://telegram-bot-u2ni.onrender.com
📡 Full API URL: https://telegram-bot-u2ni.onrender.com/api/user/YOUR_ID
✅ Found user YOUR_NAME with balance: XXX
💳 Wallet synced: XXX coins, 0 bonus
```

✅ **No warning appears:**
Game loads cleanly without the yellow warning box

✅ **Balance updates:**
After winning/losing, balance changes immediately

✅ **Multiple syncs work:**
Balance auto-refreshes every 15 seconds without errors

## Next Steps (Optional)

Other pages with hardcoded URLs that could use same fix:
- `frontend/src/pages/Spin.jsx`
- `frontend/src/pages/Bingo.jsx`
- `frontend/src/pages/Admin.jsx`
- `frontend/src/pages/BingoPro.jsx`
- `frontend/src/pages/SpinPro.jsx`

Consider refactoring them to use `getBackendUrl()` from `api.js` for consistency.

## Support

If you have issues:
1. Check the BALANCE_SYNC_FIX_2025.md file for detailed explanation
2. Review browser console errors
3. Check Render backend logs
4. Verify MongoDB is connected
