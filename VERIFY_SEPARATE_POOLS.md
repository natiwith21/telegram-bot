# Verify Separate Prize Pools Implementation

## Pre-Deployment Checklist

- [ ] Code changes reviewed
- [ ] No syntax errors
- [ ] Dependencies not changed
- [ ] Backward compatibility tested
- [ ] Console logs added for debugging

## Files Changed

### ✅ bot.js
**Location**: `/api/like-bingo-play` endpoint (line ~730)

**What changed**:
- Added `totalPoolCollected`, `playerCount`, `winAmount` parameters
- Updated win calculation to use actual pool when available
- Added fallback to multipliers if pool data missing
- Enhanced logging with pool details

**To verify**:
```bash
# Check endpoint accepts new parameters
grep -n "totalPoolCollected" bot.js
grep -n "playerCount" bot.js
grep -n "WIN FROM ACTUAL POOL" bot.js
```

### ✅ frontend/src/pages/LikeBingo.jsx
**Location**: Multiple locations in component

**What changed**:
- `bingo_claimed` handler: Pass pool data to handleGameWin
- `shared_game_ended` handler: Package pool data
- `processGameResult`: Send pool data to API
- `handleGameWin`: Accept pool data parameter
- `handleGameLoss`: Accept pool data parameter

**To verify**:
```bash
# Check frontend sends pool data
grep -n "totalPoolCollected:" frontend/src/pages/LikeBingo.jsx
grep -n "playerCount:" frontend/src/pages/LikeBingo.jsx
grep -n "const poolData" frontend/src/pages/LikeBingo.jsx
```

### ✅ websocket-server.js
**Location**: No changes needed - logic already in place

**Already has**:
- `calculatePrizePool()` function (line ~356)
- Level-specific room IDs (line ~383, 1324)
- Pool data in game end messages (line ~1495-1498)
- Winner amount calculation (line ~1372)

**To verify**:
```bash
# Verify existing pool logic
grep -n "calculatePrizePool" websocket-server.js
grep -n "winnerPool = Math.floor" websocket-server.js
grep -n "houseShare" websocket-server.js
```

## Manual Testing

### Test 1: Verify Separate Rooms

**Setup**:
1. Open browser dev console
2. Start a Play 10 game
3. In another window, start a Play 20 game

**Verify in logs**:
```
WebSocket: 🎮 Starting shared game play in room live_like_bingo_10_shared
WebSocket: 🎮 Starting shared game play in room live_like_bingo_20_shared
```

**Expected**: Two different room IDs, never the same.

### Test 2: Verify Pool Calculation

**Setup**:
1. Start Play 10 game with 3 players (stake 10 each)
2. First player claims bingo

**Check WebSocket logs**:
```
🎉 FIRST BINGO CLAIMED by [ID] (Name) in Play 10
   💰 Prize Pool: 30 coins | Winner: 24 | House: 6
   👥 Players in game: 3
```

**Expected**: 
- Total: 30 (3 × 10)
- Winner: 24 (30 × 0.80)
- House: 6 (30 × 0.20)

### Test 3: Verify Backend Calculation

**Setup**:
1. Complete the game from Test 2
2. Wait for balance update
3. Check backend logs

**Check bot.js logs**:
```
🏆 WIN FROM ACTUAL POOL:
   Total Pool Collected: 30 coins
   Winner Share (80%): 24 coins
   House Share (20%): 6 coins
   Players in Game: 3
   Calculation: [oldBalance] - 10 + 24 = [newBalance]
   Net Gain: +14
```

**Expected**: Exact 80/20 split

### Test 4: Verify Game History

**Setup**:
1. Complete multiple games (Play 10, Play 20, Play 50)
2. Check game history in profile

**Expected format**:
```
✅ Bingo 10: WIN - Pool: 30, Won: 24 (80%), Net: +14
❌ Bingo 20: LOSS - Lost 20 coins
✅ Bingo 50: WIN - Pool: 100, Won: 80 (80%), Net: +60
```

**Verify**: Each entry shows actual pool amounts, not just multipliers

### Test 5: Verify Frontend Pool Display

**Setup**:
1. Win a game
2. Check alert message

**Expected alert**:
```
🎉 Congratulations! You won the Bingo game!

💰 Pool: 30 coins
🏆 You won: 24 coins (80%)
```

### Test 6: Verify API Response

**Setup**:
1. Open network tab in dev tools
2. Play and win a game
3. Find POST to `/api/like-bingo-play`

**Expected request body**:
```json
{
  "telegramId": "12345",
  "gameMode": "10",
  "stake": 10,
  "gameResult": true,
  "isWin": true,
  "totalPoolCollected": 30,
  "playerCount": 3,
  "winAmount": 24
}
```

**Expected response**:
```json
{
  "success": true,
  "newBalance": 1024,
  "winAmount": 24,
  "netGain": 14,
  "gameRecord": "Bingo 10: WIN - Pool: 30, Won: 24 (80%), Net: +14",
  "totalPoolCollected": 30,
  "playerCount": 3
}
```

### Test 7: Verify No Pool Mixing

**Setup**:
1. Start Play 10 with Player A (joins live_like_bingo_10_shared)
2. Start Play 20 with Player B (joins live_like_bingo_20_shared)
3. Both stake their respective amounts
4. Both win

**Verify in logs**:
```
Play 10 room: Total Pool = 10 (1 player × 10)
Play 20 room: Total Pool = 20 (1 player × 20)

Player A: -10 + 8 = -2 (from 10-coin pool)
Player B: -20 + 16 = -4 (from 20-coin pool)
```

**Expected**: Completely separate calculations, no mixing

### Test 8: Verify Single Player

**Setup**:
1. Start Play 10 alone
2. Claim bingo
3. Check results

**Expected**:
```
Pool: 10 coins (1 × 10)
Winner gets: 10 × 0.80 = 8 coins
House gets: 10 × 0.20 = 2 coins
Net change: -10 + 8 = -2 coins (loss)
```

## Automated Verification

### Check for Key Strings

```bash
# Verify separate pools code is in place
echo "=== Checking bot.js changes ==="
grep -c "totalPoolCollected" bot.js && echo "✓ API accepts pool data"
grep -c "WIN FROM ACTUAL POOL" bot.js && echo "✓ Actual pool calculation exists"

echo "=== Checking frontend changes ==="
grep -c "totalPoolCollected:" frontend/src/pages/LikeBingo.jsx && echo "✓ Frontend sends pool data"
grep -c "const poolData" frontend/src/pages/LikeBingo.jsx && echo "✓ Frontend packages pool data"

echo "=== Checking websocket logic ==="
grep -c "calculatePrizePool" websocket-server.js && echo "✓ Pool calculation function exists"
grep -c "houseShare" websocket-server.js && echo "✓ House share calculation exists"
```

## Production Deployment Steps

1. **Backup current bot.js and LikeBingo.jsx**
   ```bash
   cp bot.js bot.js.backup
   cp frontend/src/pages/LikeBingo.jsx frontend/src/pages/LikeBingo.jsx.backup
   ```

2. **Deploy changes**
   ```bash
   git add bot.js frontend/src/pages/LikeBingo.jsx
   git commit -m "Implement separate prize pools per game level"
   git push
   ```

3. **Restart backend**
   ```bash
   # If using npm
   npm restart
   
   # If using node directly
   pkill -f "node bot.js"
   node bot.js
   ```

4. **Rebuild frontend** (if applicable)
   ```bash
   cd frontend
   npm run build
   ```

5. **Monitor logs**
   ```bash
   # Watch for pool calculation logs
   tail -f logs/bot.log | grep "POOL\|WIN FROM\|Prize Pool"
   ```

## Rollback Procedure

If issues occur:

1. **Stop the bot**
   ```bash
   pkill -f "node bot.js"
   ```

2. **Restore backup**
   ```bash
   cp bot.js.backup bot.js
   cp frontend/src/pages/LikeBingo.jsx.backup frontend/src/pages/LikeBingo.jsx
   ```

3. **Restart bot**
   ```bash
   node bot.js
   ```

## Monitoring Checklist

After deployment, monitor:

- [ ] API logs show pool data being sent
- [ ] WebSocket logs show correct room separation
- [ ] Balance updates are accurate
- [ ] Game history shows pool amounts
- [ ] No errors in console
- [ ] No database issues
- [ ] Response times acceptable

### Queries to Track

**MongoDB queries** (if available):
```javascript
// Check game records
db.users.find({ gameHistory: { $regex: "Pool:" } }).limit(5)

// Check for any calculation errors
db.users.find({ balance: { $lt: 0 } })
```

## Common Issues & Solutions

| Issue | Check | Solution |
|-------|-------|----------|
| Balance not updating | API response | Verify totalPoolCollected is sent |
| Wrong pool amount | WebSocket logs | Verify calculatePrizePool is called |
| Games mixing levels | Room IDs | Verify format: `live_like_bingo_XX_shared` |
| Game history wrong | Database | Check gameHistory format in User model |
| API errors | Network tab | Verify parameter names match |

## Success Indicators

✅ All tests pass
✅ Game history shows pool amounts (not multipliers)
✅ Balance changes match formula: `-stake + (pool × 0.80)`
✅ No cross-level pool mixing
✅ Console shows expected log messages
✅ API responses include pool data echo

## Documentation

- ✅ SEPARATE_POOLS_IMPLEMENTATION.md - Full implementation details
- ✅ SEPARATE_POOLS_COMPLETED.md - What was changed and how it works
- ✅ SEPARATE_POOLS_QUICK_REFERENCE.md - Quick guide for users
- ✅ VERIFY_SEPARATE_POOLS.md - This file (testing & verification)

## Questions?

Review these files in order:
1. SEPARATE_POOLS_QUICK_REFERENCE.md - Understand what changed
2. SEPARATE_POOLS_COMPLETED.md - How each piece works
3. SEPARATE_POOLS_IMPLEMENTATION.md - Why each decision was made
4. VERIFY_SEPARATE_POOLS.md - How to verify it's working (this file)
