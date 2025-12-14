# Deployment Checklist - Security Fixes

## Pre-Deployment (5 minutes)

- [ ] Read `FIXES_SUMMARY.txt` completely
- [ ] Understand the 4 critical fixes applied
- [ ] Verify you have both modified files:
  - [ ] `websocket-server.js` (updated)
  - [ ] `bot.js` (updated)
- [ ] Backup current production code:
  ```bash
  git commit -m "Backup before security fixes - $(date)"
  ```
- [ ] Review the changes:
  - [ ] `websocket-server.js` has `creditHouseShare` function
  - [ ] `websocket-server.js` has enhanced `calculatePrizePool`
  - [ ] `bot.js` has `serverCalculatedPool` validation

## Deployment (5 minutes)

- [ ] Stop current bot/server safely
- [ ] Deploy updated files
- [ ] Start bot and server
- [ ] Check startup logs for:
  - [ ] "✅ WebSocket server running"
  - [ ] "✅ Bot launched successfully"
  - [ ] No error messages about missing functions

## Immediate Testing (15 minutes)

### Test 1: Normal Game Flow
- [ ] Create 2 test accounts (User A, User B)
- [ ] User A joins Play 20
- [ ] User B joins Play 20 (same level)
- [ ] Wait for game to start
- [ ] Both see same called numbers
- [ ] User A clicks Bingo first
- [ ] Check log: "🎉 FIRST BINGO CLAIMED by [UserA] in Play 20"
- [ ] User A: Balance increased by ~80% of pool (160 for 200 pool) ✓
- [ ] User B: Balance decreased by 20 (their stake) ✓
- [ ] Admin: Balance increased by ~20 coins (in game history) ✓

### Test 2: Race Condition Prevention
- [ ] Create 4 test accounts (A, B, C, D)
- [ ] All join Play 50
- [ ] Tell all to click Bingo at exact same time (use coordinated timer)
- [ ] Check log: Only ONE "🎉 FIRST BINGO CLAIMED"
- [ ] Check log: 3x "Someone else already won" messages
- [ ] Only 1 winner received winnings ✓

### Test 3: Wrong Game Level Attempt
- [ ] Create 2 accounts
- [ ] Account A joins Play 20, Account B joins Play 50
- [ ] Try to manipulate client to put both in same game (if possible)
- [ ] Check log: "🚨 SECURITY: Player XXX attempted to claim Bingo in wrong level!"
- [ ] Game correctly rejects ✓

### Test 4: House Share Credit
- [ ] After each test game, check admin account
- [ ] Admin balance should increase
- [ ] Check game history: Should show "House Share: Play XX +YYY coins (20%)"
- [ ] Verify amount = 20% of that game's pool ✓

## Log Verification (5 minutes)

Scan logs for the following:

### ✅ SHOULD SEE (Normal Operation)
```
✅ Credited admin 123456789 with 40 coins (20% house share from Play 50)
🏆 WIN FROM VALIDATED WEBSOCKET POOL:
   Total Pool Collected: 200 coins
   Server Calculated Pool: 200 coins
   Winner Share (80%): 160 coins
🎉 FIRST BINGO CLAIMED by 987654321 (Player Name) in Play 20
```

### ⚠️ MAY SEE (During Testing)
```
⚠️  STAKE VALIDATION: Player XXX stake 10 doesn't match mode 50
⚠️  POOL VALIDATION ERROR: Player XXX game mode doesn't match expected
```
(These are normal during testing and should disappear with normal players)

### 🚨 SHOULD NOT SEE (Alert If Appears)
```
🚨 SECURITY: Player XXX attempted to claim Bingo in wrong game level!
❌ Error crediting house share
```
(If you see these with normal player behavior, contact support)

## Post-Deployment Monitoring (24 hours)

Daily Tasks:
- [ ] Check admin accounts - balances should be increasing
- [ ] Search logs for "SECURITY" messages (should be 0)
- [ ] Search logs for "Error crediting house share" (should be 0)
- [ ] Verify no crash or restart messages
- [ ] Check database - house share records in game_history

Weekly Tasks:
- [ ] Review all "⚠️ STAKE VALIDATION" entries - should be rare/none
- [ ] Review all "⚠️ POOL MISMATCH" entries - should be rare/none
- [ ] Calculate total house payments vs expected (sum of 20% from all games)
- [ ] Verify admin wallets match the payments

## Rollback Plan (If Issues)

If you encounter critical errors:

```bash
# Quick rollback
git revert HEAD
git push

# Or restore from backup
git checkout [backup-commit-hash]
```

The fixes are **fully backward compatible** - no data will be lost or corrupted if you rollback.

## Success Criteria ✅

Your deployment is **successful** when:

1. ✅ Bingo games work exactly as before (no UI changes)
2. ✅ Each game correctly identifies 1 winner
3. ✅ Admin wallets automatically receive 20% of pools
4. ✅ Game history shows "House Share" entries for admins
5. ✅ No crash logs or error messages
6. ✅ "Credited admin" appears in logs after each game
7. ✅ Stake validation occurs without breaking games
8. ✅ Pool calculations match expected amounts

## Support

If you encounter issues:

1. Check logs for error messages
2. Review the 4 fixes in `FIXES_SUMMARY.txt`
3. Verify both `websocket-server.js` and `bot.js` are updated
4. Test with single game first, then multiple concurrent games
5. Contact support with full error message from logs

## Key Reminders

- ✅ No UI changes - user experience identical
- ✅ No breaking changes - fully backward compatible
- ✅ No database migration needed
- ✅ No downtime required (you can deploy safely)
- ✅ Easy rollback if needed

---

**Timeline: Deploy → Test (15 min) → Monitor (24 hr) → Normal Operation**
