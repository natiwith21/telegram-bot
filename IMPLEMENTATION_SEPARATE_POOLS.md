# Separate Prize Pool Implementation - Complete Guide

## What Changed

### Backend Changes (websocket-server.js)

#### 1. New Prize Pool Calculation Function (Lines 356-370)
```javascript
function calculatePrizePool(sharedGame) {
  // Calculate total stake from all players in THIS specific game level
  const totalStake = Array.from(sharedGame.players.values())
    .reduce((sum, player) => sum + (player.stake || 0), 0);
  
  return {
    totalStake,           // Total collected from THIS level
    prizePool: totalStake,
    winnerPool: Math.floor(prizePool * 0.80),  // 80% to winner
    houseShare: prizePool - winnerPool          // 20% to house
  };
}
```

**Why:** Ensures that only money from players in that specific game level is used to calculate prizes.

#### 2. Level-Specific Room Isolation (Lines 376-394)
```javascript
// Before: Generic room for all levels
❌ const levelSpecificRoomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}`;

// After: Each level has its own room
✅ const levelSpecificRoomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}_shared`;

// Only match games from the SAME game level
if (sessionRoomId === levelSpecificRoomId && ...)
```

**Why:** Ensures Play 10, Play 20, Play 50, and Play 100 games never mix.

**Room Names:**
- `live_like_bingo_10_shared` - Only Play 10 games
- `live_like_bingo_20_shared` - Only Play 20 games
- `live_like_bingo_50_shared` - Only Play 50 games
- `live_like_bingo_100_shared` - Only Play 100 games

#### 3. Enhanced Winner Claim (Lines 1319-1381)
```javascript
// CRITICAL: Use level-specific room
const roomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}_shared`;

// CRITICAL: Calculate prize pool ONLY from THIS game level
const poolData = calculatePrizePool(liveGame);

// Store complete winner record with pool info
const winnerRecord = {
  telegramId: telegramId,
  winAmount: poolData.winnerPool,      // 80% of THIS level's pool
  totalPool: poolData.prizePool,       // All money from THIS level
  houseShare: poolData.houseShare,     // 20% to house
  playersInGame: liveGame.players.size // How many competed
};
```

**Why:** Tracks exactly how much each winner earned from their specific game level.

#### 4. Enhanced Winner Broadcast (Lines 1395-1421)
```javascript
broadcastToLiveGame(roomId, {
  type: 'live_bingo_claimed',
  gameMode: gameMode,              // ← NEW: Which level
  winAmount: poolData.winnerPool,  // ← NEW: 80% of pool
  totalPool: poolData.prizePool,   // ← NEW: Total pool
  houseShare: poolData.houseShare, // ← NEW: 20% for house
  playersInGame: liveGame.players.size  // ← NEW: Player count
});
```

**Console Output Example:**
```
🎉 FIRST BINGO CLAIMED by 123456789 (John) in Play 50
   💰 Prize Pool: 250 coins | Winner: 200 | House: 50
   👥 Players in game: 5
```

#### 5. Enhanced Game End (Lines 1465-1515)
```javascript
// Calculate final prize pool
const poolData = sharedGame.poolData || calculatePrizePool(sharedGame);

broadcastToLiveGame(roomId, {
  type: 'shared_game_ended',
  gameMode: sharedGame.gameMode,    // ← NEW: Which level
  totalCollected: poolData.totalStake,    // ← NEW
  prizePool: poolData.prizePool,          // ← NEW
  winnerAmount: poolData.winnerPool,      // ← NEW
  houseShare: poolData.houseShare         // ← NEW
});
```

**Console Output Example:**
```
🏁 Play 20 game ended. Reason: bingo_claimed, Winners: 1, Players: 7
   💰 Prize Pool Summary:
      Total Collected: 140 coins
      Winner Receives: 112 coins (80%)
      House Receives: 28 coins (20%)
```

### Frontend Changes (LikeBingo.jsx)

#### Enhanced Game End Handler (Lines 305-336)
```javascript
case 'shared_game_ended':
    console.log(`🏁 Play ${lastMessage.gameMode} game ended`);
    console.log(`   💰 Prize Pool: ${lastMessage.totalCollected} coins`);
    console.log(`   🏆 Winner gets: ${lastMessage.winnerAmount} coins (80%)`);
    console.log(`   🏦 House gets: ${lastMessage.houseShare} coins (20%)`);
    
    // Process game result with proper pool tracking
    if (!bingoWinner) {
        const playerWon = lastMessage.winners?.some(winner => winner.telegramId === telegramId);
        if (playerWon) {
            // Winner gets 80% of the pool collected from their game level
            await handleGameWin();
        } else {
            await handleGameLoss();
        }
    }
    break;
```

## How It Works - Step by Step

### Scenario: 3 Concurrent Games

```
Time 0:00
   [Play 10 Room]     [Play 20 Room]     [Play 50 Room]
   - Player A         - Player X          - Player P
   - Player B         - Player Y          - Player Q
   - Player C         - Player Z

Time 0:30
   [Play 10 Room]     [Play 20 Room]     [Play 50 Room]
   Players: 6         Players: 5         Players: 3
   Pool: 60 coins     Pool: 100 coins    Pool: 150 coins

Time 2:00
   Play 10 Winner: Player B
   ├─ Total Pool: 60 coins
   ├─ Winner Gets: 48 coins (80%)
   └─ House Gets: 12 coins (20%)
   
   Play 20 Still Playing...
   
   Play 50 Still Playing...

Time 3:00
   Play 20 Winner: Player Y
   ├─ Total Pool: 100 coins
   ├─ Winner Gets: 80 coins (80%)
   └─ House Gets: 20 coins (20%)
   
   Play 50 Still Playing...

Time 4:00
   Play 50 Winner: Player Q
   ├─ Total Pool: 150 coins
   ├─ Winner Gets: 120 coins (80%)
   └─ House Gets: 30 coins (20%)
```

### Key Points

1. **Isolation Guarantee**
   - Play 10 players = Play 10 pool only
   - Play 20 players = Play 20 pool only
   - No cross-contamination

2. **Prize Calculation**
   - All collected stakes go into the prize pool
   - Winner gets 80% of THEIR level's pool
   - House keeps 20% of THEIR level's pool

3. **Fairness**
   - First player to claim Bingo wins
   - Prize is based on how many joined THEIR level
   - More players = bigger pool for winner

## Database/Payment Integration

When a player wins, the backend should:

```javascript
// 1. Get winner's current balance
const user = await User.findOne({ telegramId });
const currentBalance = user.balance;

// 2. Calculate win amount from the poolData
const winAmount = poolData.winnerPool;  // 80% of their level's pool

// 3. Update balance
const newBalance = currentBalance + winAmount;
await User.updateOne({ telegramId }, { balance: newBalance });

// 4. Record in game history
await GameHistory.create({
  telegramId,
  gameMode: sharedGame.gameMode,
  gameType: 'shared_bingo',
  stake: playerData.stake,
  result: 'WIN',
  winAmount: winAmount,
  poolSize: poolData.prizePool,
  playersInGame: sharedGame.players.size,
  timestamp: new Date()
});

// 5. Track house revenue
await HouseRevenue.create({
  gameMode: sharedGame.gameMode,
  amount: poolData.houseShare,
  playerCount: sharedGame.players.size,
  totalPoolSize: poolData.prizePool,
  timestamp: new Date()
});
```

## Admin Dashboard Metrics

Track per-level statistics:

```javascript
{
  'Play 10': {
    totalGames: 156,
    totalPlayers: 1250,
    averagePlayersPerGame: 8,
    totalCollected: 12500,  // All stakes from Play 10
    totalHouseRevenue: 2500, // 20% of Play 10 pools
    topWinner: { name: 'John', wins: 23, totalEarned: 1840 }
  },
  'Play 20': {
    totalGames: 89,
    totalPlayers: 623,
    averagePlayersPerGame: 7,
    totalCollected: 12460,
    totalHouseRevenue: 2492,
    topWinner: { name: 'Jane', wins: 15, totalEarned: 2400 }
  },
  // ... etc for 50 and 100
}
```

## Testing Checklist

- [ ] Start Play 10 game with 5 players
- [ ] Start Play 50 game with 3 players (same time)
- [ ] Verify Play 10 pool = 50 coins
- [ ] Verify Play 50 pool = 150 coins
- [ ] Win Play 10 game, check winner gets 40 coins (80% of 50)
- [ ] Verify Play 50 still running independently
- [ ] Win Play 50 game, check winner gets 120 coins (80% of 150)
- [ ] Check logs show correct game mode in console output
- [ ] Verify no players from Play 10 can join Play 50 pool

## Migration from Old System

If updating from old pooled system:

1. **Archive old game sessions** - Mark them as 'legacy'
2. **No data loss** - All historical games still tracked
3. **Clean separation** - New games use isolated pools
4. **Gradual rollout** - Can run both systems briefly if needed

## Security Considerations

1. **Pool Isolation**
   - Use room IDs as security boundary
   - Never allow cross-level player mixing
   - Server enforces separation

2. **Winner Validation**
   - Verify player is in correct room
   - Check Bingo pattern matches game rules
   - Atomic claim (first wins, others rejected)

3. **Prize Distribution**
   - Calculate from server, not client
   - Use exact 80/20 split (no floating point errors)
   - Log all transactions

4. **Audit Trail**
   - Record who won
   - Record exact pool amounts
   - Record house share
   - Record all players involved
