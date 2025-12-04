# Separate Prize Pools - Quick Start Guide

## TL;DR - What Was Changed

**Problem:** Players from different game levels (10, 20, 50, 100) could theoretically win money from players at other levels.

**Solution:** Each game level now has its own isolated prize pool.

## The Formula

```
Play 10:  10 coins entry × 8 players = 80 coin pool
          Winner gets: 64 coins (80%)
          House gets: 16 coins (20%)

Play 50:  50 coins entry × 5 players = 250 coin pool
          Winner gets: 200 coins (80%)
          House gets: 50 coins (20%)
```

**KEY:** Play 10 pool and Play 50 pool are COMPLETELY SEPARATE.

## What Each File Does

### websocket-server.js

**New Function: `calculatePrizePool(sharedGame)`**
- Adds up stakes from players in that game level
- Splits 80% to winner, 20% to house
- Called when someone wins or game ends

**Level-Specific Rooms**
```
❌ Before: All games in "like-bingo-room"
✅ After: 
   - Play 10 → "live_like_bingo_10_shared"
   - Play 20 → "live_like_bingo_20_shared"
   - Play 50 → "live_like_bingo_50_shared"
   - Play 100 → "live_like_bingo_100_shared"
```

**Winner Claim Tracking**
- Stores exact winnings for each player
- Tracks how many players competed
- Logs pool breakdown for each win

**Game End Reports**
- Shows total collected from that level
- Shows winner amount (80%)
- Shows house amount (20%)

### LikeBingo.jsx

**Console Logging**
- Displays which game level ended
- Shows prize pool breakdown
- Makes debugging easier

**Game Win/Loss Handling**
- Winner gets 80% of THEIR level's pool
- Loser pays only THEIR level's stake
- No cross-level financial mixing

## Live Example

**Moment 1: Two games start simultaneously**
```
Play 10 Game 1:
  └─ Player A, B, C join (10 coins each)
  └─ Pool: 30 coins

Play 50 Game 1:
  └─ Player X, Y join (50 coins each)
  └─ Pool: 100 coins
```

**Moment 2: Player B wins Play 10**
```
Play 10 Game 1 ENDS:
  ├─ Total Collected: 30 coins
  ├─ Player B Wins: 24 coins (80%)
  └─ House Gets: 6 coins (20%)

Play 50 Game 1:
  └─ Still Running... (100 coins at stake)
```

**Moment 3: Player X wins Play 50**
```
Play 50 Game 1 ENDS:
  ├─ Total Collected: 100 coins
  ├─ Player X Wins: 80 coins (80%)
  └─ House Gets: 20 coins (20%)
```

**Final Result:**
- Player B earned 24 coins (from Play 10 players)
- Player X earned 80 coins (from Play 50 players)
- House earned: 6 + 20 = 26 coins
- No mixing between levels occurred

## How to Verify It Works

### Test Case 1: Pool Isolation
```
1. Open two browser windows
2. Window 1: Join Play 10 game
3. Window 2: Join Play 50 game
4. Verify they're in different games
5. Win one game, verify other continues
```

### Test Case 2: Prize Calculation
```
1. Play 10 game with 12 players
   - Expected pool: 120 coins
   - Expected winner gets: 96 coins

2. Check console logs show:
   "Total Collected: 120 coins"
   "Winner Receives: 96 coins (80%)"
   "House Receives: 24 coins (20%)"
```

### Test Case 3: No Cross-Level Mixing
```
1. Start Play 10 with 5 players
2. Start Play 100 with 2 players
3. Win Play 10 game
4. Verify winner got: 8 coins (80% of 10×5=50)
5. Verify house got: 2 coins (20% of 10×5=50)
6. NOT: (80% of 10×5 + 100×2) = Mixing pools
```

## Console Output Examples

### When Game Starts
```
🎮 telegramId starting/joining shared multiplayer game - Mode: 50
```

### When Someone Wins
```
🎉 FIRST BINGO CLAIMED by 123456789 (John) in Play 50
   💰 Prize Pool: 250 coins | Winner: 200 | House: 50
   👥 Players in game: 5
```

### When Game Ends
```
🏁 Play 50 game ended. Reason: bingo_claimed, Winners: 1, Players: 5
   💰 Prize Pool Summary:
      Total Collected: 250 coins
      Winner Receives: 200 coins (80%)
      House Receives: 50 coins (20%)
```

## The 80/20 Split

Why 80/20?
- **80% to Winner**: Incentivizes playing
- **20% to House**: Sustains business operations

Examples:
```
Play 10:   10 coins × 10 players = 100 coins total
           Winner: 80 coins | House: 20 coins

Play 20:   20 coins × 8 players = 160 coins total
           Winner: 128 coins | House: 32 coins

Play 50:   50 coins × 6 players = 300 coins total
           Winner: 240 coins | House: 60 coins

Play 100:  100 coins × 4 players = 400 coins total
           Winner: 320 coins | House: 80 coins
```

## Key Code Changes

**Before:**
```javascript
// Could mix levels
if (sessionRoomId.includes(gameMode) && ...)
```

**After:**
```javascript
// Must be EXACT same level
if (sessionRoomId === levelSpecificRoomId && ...)
```

**Before:**
```javascript
// No pool tracking
broadcastToLiveGame(roomId, {
  type: 'live_bingo_claimed',
  winner: telegramId
});
```

**After:**
```javascript
// Full pool transparency
broadcastToLiveGame(roomId, {
  type: 'live_bingo_claimed',
  winner: telegramId,
  gameMode: gameMode,
  winAmount: poolData.winnerPool,
  totalPool: poolData.prizePool,
  houseShare: poolData.houseShare,
  playersInGame: liveGame.players.size
});
```

## Troubleshooting

### Issue: Players from different levels see each other
**Solution:** Check that room IDs use `gameMode` correctly
```javascript
// Should be:
`live_like_bingo_${gameMode}_shared`
// Not:
`like-bingo-room`
```

### Issue: Prize calculations are wrong
**Solution:** Check `calculatePrizePool()` function
```javascript
// Should sum stakes only from players in THAT game
const totalStake = Array.from(sharedGame.players.values())
  .reduce((sum, player) => sum + (player.stake || 0), 0);
```

### Issue: House revenue not tracked
**Solution:** Ensure poolData is calculated in endSharedGame
```javascript
const poolData = sharedGame.poolData || calculatePrizePool(sharedGame);
// Then use poolData.houseShare
```

## What's NOT Changed

- ✅ Game mechanics (still first-to-Bingo wins)
- ✅ Player experience (still plays same way)
- ✅ UI/UX (no interface changes)
- ✅ Entry process (still choose mode 10/20/50/100)
- ✅ Win multipliers (still 2.5x, 3x, 3.5x, 4x)

## What IS Changed

- ✅ Pools are now level-specific
- ✅ Winner gets 80% of their level's pool
- ✅ House gets 20% of their level's pool
- ✅ Complete transparency in earnings
- ✅ No cross-level financial mixing
