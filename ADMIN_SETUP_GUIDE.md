# 🛡️ Admin Setup Guide

## ❌ The Problem
You added usernames to your .env file:
```env
ADMIN_ID_1=@nati280
ADMIN_ID_2=@Yishak_S
```

**This won't work!** Telegram bots require numeric User IDs, not usernames.

## ✅ The Solution

### Step 1: Get Your Telegram User ID

1. **Start your bot** (run `node bot.js`)
2. **Send this command** to your bot in Telegram:
   ```
   /getid
   ```
3. **Copy the numeric User ID** (it will look like `123456789`)

### Step 2: Update Your .env File

Replace the usernames with the numeric IDs:

```env
# ❌ Wrong (usernames)
ADMIN_ID_1=@nati280
ADMIN_ID_2=@Yishak_S

# ✅ Correct (numeric IDs)
ADMIN_ID_1=123456789
ADMIN_ID_2=987654321
```

### Step 3: Test Admin Access

1. **Restart your bot** after updating .env
2. **Send this command** to test:
   ```
   /admintest
   ```
3. **You should see**: "✅ ADMIN ACCESS"

## 🔍 How to Get Each Admin's ID

### For @nati280:
1. Ask them to start your bot
2. Have them send `/getid` to the bot
3. Copy their numeric User ID
4. Add it as `ADMIN_ID_1=their_numeric_id`

### For @Yishak_S:
1. Ask them to start your bot  
2. Have them send `/getid` to the bot
3. Copy their numeric User ID
4. Add it as `ADMIN_ID_2=their_numeric_id`

## 🛠️ Complete Example

Your .env file should look like this:
```env
BOT_TOKEN=your_bot_token_here
WEB_APP_URL=http://localhost:3000
ADMIN_ID_1=123456789
ADMIN_ID_2=987654321
WS_PORT=3002
```

## ✅ Verification Steps

1. **Check bot startup logs** - should show:
   ```
   ✅ 2 admin(s) configured: [123456789, 987654321]
   ```

2. **Test with /admintest** - should show:
   ```
   Admin Status: ✅ ADMIN ACCESS
   ```

3. **Test payment verification** - admins should receive payment notifications

## 🚨 Common Mistakes

- ❌ Using usernames (@username)
- ❌ Including quotes around the ID
- ❌ Forgetting to restart the bot after changing .env
- ❌ Using User ID from a different platform

## 📞 Need Help?

If you're still having issues:
1. Send `/getid` to get your correct User ID
2. Send `/admintest` to verify admin access
3. Check the bot console logs for error messages
