# Balance Sync Error Fix - "Unable to sync balance with server"

## 🔴 Problem Identified

When you play the game, you see: **"⚠️ Unable to sync balance with server. Using local data."**

This is happening because of **multiple issues**:

---

## 🔍 Root Causes Found

### Issue 1: Duplicate API Endpoints in server.js
**Location:** `server.js` has TWO `/api/user/:telegramId` endpoints:

1. **Line 53** (OLD - wrong format):
```javascript
app.get('/api/user/:telegramId', async (req, res) => {
  res.json({
    telegramId: user.telegramId,
    name: user.name,
    balance: user.balance,
    bonus: user.bonus
  });
});
```

2. **Line 280** (NEW - correct format):
```javascript
app.get('/api/user/:telegramId', async (req, res) => {
  res.json({
    success: true,
    user: {
      telegramId: user.telegramId,
      name: user.name,
      balance: user.balance || 0,
      bonus: user.bonus || 0,
      gameHistory: user.gameHistory || []
    }
  });
});
```

**Problem:** The first endpoint (line 53) takes precedence and returns the WRONG format. The frontend expects `{ success: true, user: {...} }` but gets `{ telegramId, name, balance, bonus }`.

### Issue 2: Frontend Environment Variable Not Set

The frontend tries to call:
```javascript
const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/user/${cleanTelegramId}`;
```

But `REACT_APP_BACKEND_URL` is not defined anywhere!

**Default fallback:** Vite/React might use `http://localhost:3001` or undefined, causing the request to fail.

### Issue 3: Missing WebSocket Connection in Game

The game uses WebSocket but if it fails, there's no fallback to HTTP endpoints for balance updates.

---

## ✅ Solution 1: Remove Duplicate Endpoint (CRITICAL)

### Step 1: Delete the OLD endpoint (Line 53-71)

Open `server.js` and **DELETE** this entire block:

```javascript
// ❌ DELETE THIS (Lines 53-71)
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = await User.findOne({ telegramId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      telegramId: user.telegramId,
      name: user.name,
      balance: user.balance,
      bonus: user.bonus
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

After deletion, only the NEW endpoint at line 280 will respond.

---

## ✅ Solution 2: Set Backend URL in Frontend

### Step 1: Create `.env` file in `frontend/` folder

Create: `frontend/.env`

```bash
VITE_BACKEND_URL=http://localhost:3001
```

### Step 2: Update LikeBingo.jsx to use it

**In `frontend/src/pages/LikeBingo.jsx` line 554, change:**

```javascript
// BEFORE (broken):
const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/user/${cleanTelegramId}`;

// AFTER (fixed):
const apiUrl = `${process.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/user/${cleanTelegramId}`;
```

---

## ✅ Solution 3: Improve Error Handling

Add proper error logging in frontend. Update lines 554-560 of `LikeBingo.jsx`:

```javascript
// Add before fetch
console.log('🔗 Backend URL:', process.env.VITE_BACKEND_URL || 'http://localhost:3001');

try {
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const apiUrl = `${backendUrl}/api/user/${cleanTelegramId}`;
    console.log('📡 Full API URL:', apiUrl);
    console.log('🚀 Making fetch request...');

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    // ... rest of code
```

---

## 🔧 Step-by-Step Fix Instructions

### Step 1: Fix server.js (Remove Duplicate)

1. Open `server.js`
2. Go to line 53
3. Delete lines 53-71 (the first GET /api/user endpoint)
4. Save file
5. Restart bot: `npm start`

### Step 2: Setup Frontend Environment

1. Create file: `frontend/.env`
2. Add this line:
```
VITE_BACKEND_URL=http://localhost:3001
```
3. Save file

### Step 3: Update Frontend Code

1. Open `frontend/src/pages/LikeBingo.jsx`
2. Find line 554
3. Change it from:
```javascript
const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/user/${cleanTelegramId}`;
```
4. To:
```javascript
const apiUrl = `${process.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/user/${cleanTelegramId}`;
```
5. Save file

### Step 4: Test

1. Stop frontend: Ctrl+C
2. Stop bot: Ctrl+C
3. Restart bot: `npm start` (in terminal 1)
4. Restart frontend: `npm run frontend` (in terminal 2)
5. Test the game:
   - Send `/play` in Telegram
   - Game should now sync balance correctly
   - You should NOT see the warning message

---

## 🧪 Verification Steps

After applying fixes:

1. **Check console logs** (browser F12):
   ```
   ✅ Should see: "🔗 Backend URL: http://localhost:3001"
   ✅ Should see: "📡 Full API URL: http://localhost:3001/api/user/YOUR_ID"
   ✅ Should see: "💰 Setting balance: XXX, bonus: XXX"
   ❌ Should NOT see: "❌ Failed to load user data"
   ```

2. **Check server logs**:
   ```
   ✅ Should see API server running on port 3001
   ✅ Should see GET requests to /api/user/...
   ```

3. **Test in Telegram**:
   - Open bot
   - Send `/play`
   - Check balance shows correctly
   - Play a game
   - Balance should update after win/loss

---

## 📋 Complete File Changes

### File 1: server.js
**What to change:** Delete lines 53-71

**Before:**
```
Line 53: app.get('/api/user/:telegramId', async...  ← DELETE THIS BLOCK
Line 54-71: ... code ...
Line 72: // Bingo win endpoint
Line 280: app.get('/api/user/:telegramId', async...  ← KEEP THIS BLOCK
```

**After:**
```
Line 53: // Bingo win endpoint
Line 74: app.post('/api/bingo-win/:telegramId'...
Line 200: app.get('/api/user/:telegramId', async...  ← NOW THIS IS FIRST
```

### File 2: frontend/.env (CREATE NEW FILE)
```
VITE_BACKEND_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002
```

### File 3: frontend/src/pages/LikeBingo.jsx
**Line 554 - Change from:**
```javascript
const apiUrl = `${process.env.REACT_APP_BACKEND_URL}/api/user/${cleanTelegramId}`;
```

**To:**
```javascript
const apiUrl = `${process.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/user/${cleanTelegramId}`;
```

---

## 🔍 Debugging Checklist

After fix, check these:

- [ ] server.js has only ONE `/api/user/:telegramId` endpoint
- [ ] `frontend/.env` exists with VITE_BACKEND_URL
- [ ] LikeBingo.jsx uses VITE_BACKEND_URL
- [ ] npm start shows "API Server running on port 3001"
- [ ] npm run frontend starts without errors
- [ ] Browser console shows no fetch errors
- [ ] Balance loads when opening game
- [ ] Game plays without "unable to sync" warning

---

## 🎯 Why These Problems Happened

1. **Duplicate endpoints:** Old code wasn't removed when new endpoint was added
2. **Wrong response format:** First endpoint returns different JSON structure
3. **Missing env vars:** Frontend has no way to know server URL
4. **No fallback:** When fetch fails, there's no retry logic

---

## 💡 Additional Improvements (Optional)

If you want even better error handling, also add:

### In frontend/src/pages/LikeBingo.jsx, around line 608:

```javascript
} catch (error) {
    console.error('❌ Failed to load user data:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // IMPROVED: Retry once on failure
    if (!retryCount) {
        console.log('🔄 Retrying fetch...');
        setTimeout(() => {
            retryCount = true;
            loadUserData();
        }, 1000);
        return;
    }
    
    // Show user-friendly error message
    showBalanceNotification('⚠️ Unable to sync balance with server. Using local data.', 'warning');
    
    // ... rest
}
```

---

## 📞 If It Still Doesn't Work

### Check these things:

1. **Is the server running?**
   ```bash
   npm start  # You should see: "API Server running on port 3001"
   ```

2. **Is the port correct?**
   - Backend uses PORT=3001 (in .env)
   - Check .env has correct PORT

3. **Can you reach the API manually?**
   ```bash
   curl http://localhost:3001/api/user/5888330255
   ```
   Should return JSON with balance and bonus

4. **Check firewall:**
   - Port 3001 might be blocked
   - Disable firewall or whitelist port 3001

5. **Check MongoDB:**
   - MongoDB connection might be failing
   - Check MONGODB_URI in .env

---

## ✅ Summary

**The main problem:** Server has duplicate endpoints returning different formats.

**The quick fix:**
1. Delete old endpoint from line 53-71 in server.js
2. Create `frontend/.env` with backend URL
3. Update LikeBingo.jsx to use environment variable

**Time to fix:** 5 minutes

**Result:** Balance will sync correctly, no more warnings!

---

**Test after fixing and let me know if it works!**
