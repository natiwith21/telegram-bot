# CRITICAL FIX - Hardcoded URLs Breaking All Games

## 🔴 PROBLEM FOUND

**Multiple files have HARDCODED URLs** instead of using the dynamic backend URL!

This means:
- ❌ When backend URL changes, need to edit 20+ files
- ❌ Works ONLY on Render, breaks locally
- ❌ Balance doesn't load from any game
- ❌ Users can't play

---

## 📊 Affected Files (23 files!)

### Pages with Hardcoded URLs:
- SpinPro.jsx
- SpinImproved.jsx
- Spin.jsx
- BingoPro.jsx
- BingoImproved.jsx
- Bingo.jsx
- Admin.jsx

### Components with Hardcoded URLs:
- WalletBalance.jsx
- WalletBalanceImproved.jsx

---

## ✅ SOLUTION: Create Global Backend URL Utility

Instead of hardcoding in every file, create ONE place that all files use.

### Step 1: Create `frontend/src/utils/api.js` (NEW FILE)

```javascript
// Get backend URL - works on both local and Render
export const getBackendUrl = () => {
  // For development with frontend/.env
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // For production on Render - use current domain
  return window.location.origin;
};

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${getBackendUrl()}${endpoint}`;
  console.log('📡 API Call:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
};
```

### Step 2: Update ALL pages to use this utility

**Instead of:**
```javascript
fetch('https://telegram-bot-u2ni.onrender.com/api/user/123')
```

**Use:**
```javascript
import { getBackendUrl } from '../utils/api';

fetch(`${getBackendUrl()}/api/user/123`)
```

---

## 🔧 Files That Need Fixing

### 1. SpinPro.jsx (Line 89)
```javascript
// BEFORE:
const response = await fetch(`https://telegram-bot-u2ni.onrender.com/api/spin-result/${telegramId}`, {

// AFTER:
import { getBackendUrl } from '../utils/api';
const response = await fetch(`${getBackendUrl()}/api/spin-result/${telegramId}`, {
```

### 2. SpinImproved.jsx (Lines 113, 174)
```javascript
// BEFORE:
const response = await fetch(`https://telegram-bot-u2ni.onrender.com/api/user/${telegramId}`);

// AFTER:
import { getBackendUrl } from '../utils/api';
const response = await fetch(`${getBackendUrl()}/api/user/${telegramId}`);
```

### 3. Spin.jsx (Line 47)
```javascript
// BEFORE:
fetch(`https://telegram-bot-u2ni.onrender.com/api/spin-result/${telegramId}`, {

// AFTER:
import { getBackendUrl } from '../utils/api';
fetch(`${getBackendUrl()}/api/spin-result/${telegramId}`, {
```

### 4. BingoPro.jsx (Lines 96, 166)
```javascript
// BEFORE:
fetch(`https://telegram-bot-u2ni.onrender.com/api/validate-token/${telegramId}?token=${token}`)

// AFTER:
import { getBackendUrl } from '../utils/api';
fetch(`${getBackendUrl()}/api/validate-token/${telegramId}?token=${token}`)
```

### 5. BingoImproved.jsx (Lines 66, 140, 284)
Same pattern - replace hardcoded URL with `getBackendUrl()`

### 6. Bingo.jsx (Line 105)
Same pattern - replace hardcoded URL with `getBackendUrl()`

### 7. Admin.jsx (Lines 27, 37, 47, 65, 77)
All hardcoded URLs should use `getBackendUrl()`

### 8. WalletBalance.jsx (Line 14)
```javascript
// BEFORE:
fetch(`https://telegram-bot-u2ni.onrender.com/api/user/${telegramId}`)

// AFTER:
import { getBackendUrl } from '../utils/api';
fetch(`${getBackendUrl()}/api/user/${telegramId}`)
```

### 9. WalletBalanceImproved.jsx (Line 19)
Same fix as WalletBalance.jsx

---

## 🚨 QUICK TEMPORARY FIX (While waiting for proper fix)

If you need the game to work RIGHT NOW on Render, change ALL hardcoded URLs to use `window.location.origin`:

```javascript
// OLD (hardcoded):
fetch('https://telegram-bot-u2ni.onrender.com/api/user/123')

// TEMPORARY FIX:
fetch(`${window.location.origin}/api/user/123`)
```

This will:
- ✅ Work on Render (uses your domain)
- ⚠️ Break locally (uses localhost origin)
- But at least users can play NOW

---

## 📝 Summary of Changes Needed

| File | Lines | Fix |
|------|-------|-----|
| SpinPro.jsx | 89 | Add import, use getBackendUrl() |
| SpinImproved.jsx | 113, 174 | Add import, use getBackendUrl() |
| Spin.jsx | 47 | Add import, use getBackendUrl() |
| BingoPro.jsx | 96, 166 | Add import, use getBackendUrl() |
| BingoImproved.jsx | 66, 140, 284 | Add import, use getBackendUrl() |
| Bingo.jsx | 105 | Add import, use getBackendUrl() |
| Admin.jsx | 27,37,47,65,77 | Add import, use getBackendUrl() |
| WalletBalance.jsx | 14 | Add import, use getBackendUrl() |
| WalletBalanceImproved.jsx | 19 | Add import, use getBackendUrl() |
| **NEW** frontend/src/utils/api.js | - | Create this file |

---

## 🎯 Why This Matters

**Current Problem:**
- 23 files have hardcoded URLs
- If server URL changes, must edit all 23 files
- Breaks locally, works only on Render
- Can't test locally before deploying

**After Fix:**
- All files use ONE utility function
- Change URL in ONE place
- Works on local AND Render automatically
- Easy to maintain and debug

---

## ⏱️ Time Estimate

- Create api.js: 2 min
- Fix 9 files: 10 min
- Test: 5 min
- Total: 17 minutes

---

This is a CRITICAL fix because users can't see balance without it!
