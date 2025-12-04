# Separate Prize Pool System by Game Level

## Overview

This system ensures that each game level (Play 10, Play 20, Play 50, Play 100) has its own completely separate prize pool, preventing players from different levels from competing for the same money.

## Architecture

### Game Session Structure

```javascript
{
  id: "shared_10_timestamp_random",
  roomId: "live_like_bingo_10_shared",    // Level-specific room
  gameMode: "10",                          // Track mode
  state: "waiting" | "playing" | "finished",
  players: Map<telegramId, PlayerData>,
  totalStake: 120,                         // Sum of all stakes (12 players × 10 coins)
  prizePool: 120,                          // Pool to distribute
  winnerPool: 96,                          // 80% to winner
  houseShare: 24,                          // 20% to house
  calledNumbers: [],
  currentCall: null,
  startTime: timestamp,
  winners: [],
  isSharedSession: true
}
```

### Player Data Structure

```javascript
{
  stake: 10,                       // What this player paid
  selectedNumbers: [],
  markedNumbers: new Set(),
  hasWon: false
}
```

## Implementation Details

### 1. Level-Specific Rooms

Each game level has its own dedicated room:
```javascript
const LIVE_GAME_CONFIG = {
  roomPrefix: 'live_like_bingo_',
  gameMode: '10' | '20' | '50' | '100'
};

// Room names:
// live_like_bingo_10_shared
// live_like_bingo_20_shared
// live_like_bingo_50_shared
// live_like_bingo_100_shared
```

Players joining Play 10 only join the `10_shared` room.
Players joining Play 20 only join the `20_shared` room.

### 2. Prize Pool Calculation

When a game ends, calculate the prize pool:

```javascript
function calculatePrizePool(sharedGame) {
  // Total money collected from all players in this game level
  const totalStake = Array.from(sharedGame.players.values())
    .reduce((sum, player) => sum + player.stake, 0);
  
  // Prize pool is 100% of what was collected from THIS level
  const prizePool = totalStake;
  const winnerPool = Math.floor(prizePool * 0.80);  // 80% to winner
  const houseShare = prizePool - winnerPool;        // 20% to house
  
  return {
    totalStake,
    prizePool,
    winnerPool,
    houseShare
  };
}
```

### 3. Winner Selection Logic

When a player claims Bingo:

1. Check if they are in the active game session
2. Check if they are the first to claim in that session
3. Verify their marked cells form a winning pattern
4. Award them 80% of THAT level's collected pool
5. Track the house share (20%)

```javascript
function claimBingo(telegramId, gameMode) {
  const roomId = `live_like_bingo_${gameMode}_shared`;
  const sharedGame = liveGameSessions.get(roomId);
  
  if (!sharedGame || !sharedGame.players.has(telegramId)) {
    return { success: false, reason: 'Not in this game' };
  }
  
  if (sharedGame.winners.length > 0) {
    return { success: false, reason: 'Someone already won' };
  }
  
  // Calculate pool from THIS game level only
  const { winnerPool } = calculatePrizePool(sharedGame);
  
  // Award winner
  const winner = {
    telegramId,
    winAmount: winnerPool,
    prizePool: sharedGame.prizePool,
    houseShare: sharedGame.houseShare
  };
  
  sharedGame.winners.push(winner);
  return { success: true, winner };
}
```

### 4. Prize Distribution

When game ends:

```javascript
async function endSharedGame(roomId) {
  const sharedGame = liveGameSessions.get(roomId);
  const { winnerPool, houseShare } = calculatePrizePool(sharedGame);
  
  // Only pay the winner from THIS level's pool
  if (sharedGame.winners.length > 0) {
    const winner = sharedGame.winners[0];
    
    // Update winner's balance with winnerPool (80% of collected)
    await updateUserBalance(winner.telegramId, winnerPool);
    
    // Track house share (20%) for admin
    await recordHouseShare(sharedGame.gameMode, houseShare);
  }
  
  // Return to players: final pool amounts
  broadcastToLiveGame(roomId, {
    type: 'game_ended',
    totalCollected: sharedGame.prizePool,
    winnerAmount: winnerPool,
    houseShare: houseShare,
    gameMode: sharedGame.gameMode
  });
}
```

## Payment Flow

### What Players See

**Play 10 Game:**
- Entry cost: 10 coins
- If 12 players join:
  - Total pool: 120 coins
  - Winner gets: 96 coins (80%)
  - House gets: 24 coins (20%)
  - Net win for winner: +86 coins

**Play 100 Game:**
- Entry cost: 100 coins
- If 5 players join:
  - Total pool: 500 coins
  - Winner gets: 400 coins (80%)
  - House gets: 100 coins (20%)
  - Net win for winner: +300 coins

### Isolation Guarantee

```javascript
// NEVER happens: pooling across levels
❌ Play 10 winner wins money from Play 20 players
❌ Play 50 winner competes with Play 100 players
❌ Pools are combined across levels

// ONLY this happens: isolated pools
✅ Play 10 pool = Play 10 players only
✅ Play 20 pool = Play 20 players only
✅ Play 50 pool = Play 50 players only
✅ Play 100 pool = Play 100 players only
```

## Database Changes

### GameSession Schema Update

```javascript
{
  sessionToken: String,
  gameMode: String,              // NEW: '10', '20', '50', '100'
  roomId: String,                // NEW: Level-specific room
  totalStake: Number,            // NEW: Sum of all stakes
  prizePool: Number,             // NEW: Total pool for distribution
  winnerStake: Number,           // NEW: 80% of pool
  houseShare: Number,            // NEW: 20% of pool
  playersCount: Number,          // NEW: How many joined this level
  isActive: Boolean,
  winners: [                      // NEW: Track winners per level
    {
      telegramId: Number,
      winAmount: Number,
      timestamp: Date
    }
  ],
  createdAt: Date,
  expiresAt: Date
}
```

## Frontend Display

### Show Prize Pool Info

```javascript
// In LikeBingo.jsx
<div style={styles.prizePoolDisplay}>
  <div>Game Level: Play {gameMode}</div>
  <div>Players in Pool: {playersCount}</div>
  <div>Total Pool: {totalStake} coins</div>
  <div>Winner Gets: {Math.floor(totalStake * 0.80)} coins</div>
  <div>Your Stake: {stake} coins</div>
</div>
```

## Testing Scenarios

### Scenario 1: Separate Pools
```
Play 10: 12 players × 10 = 120 coins pool
Play 20: 5 players × 20 = 100 coins pool
Play 50: 3 players × 50 = 150 coins pool

Play 10 winner gets: 96 coins (80% of 120)
Play 20 winner gets: 80 coins (80% of 100)
Play 50 winner gets: 120 coins (80% of 150)
```

### Scenario 2: Different Winner Scenarios
```
If Play 10 has 1 player:
- No competition needed, but still applies 80/20 split
- Player gets 8 coins back (80% of 10)
- House keeps 2 coins (20% of 10)

If Play 100 has 10 players:
- Total pool: 1000 coins
- Winner gets: 800 coins
- House gets: 200 coins
```

### Scenario 3: No Cross-Level Mixing
```
User A joins Play 10 game 1 → competes with Play 10 players only
User A joins Play 50 game 1 → competes with Play 50 players only
User B joins Play 10 game 1 → same game as User A

Play 10 and Play 50 are NEVER mixed
```

## Admin Dashboard Updates

Show separate stats for each level:
```
Play 10:
- Total Revenue: 240 coins (20% × 12 games of 100 coins each)
- Players This Week: 145
- Average Players/Game: 12

Play 20:
- Total Revenue: 80 coins
- Players This Week: 42
- Average Players/Game: 7

(etc for 50 and 100)
```

## Benefits

1. **Fair Competition** - Players only compete with same-stake players
2. **Transparent Pools** - Clear prize calculations per level
3. **Business Model** - 20% house share scales with stakes
4. **Player Trust** - No hidden pooling across levels
5. **Revenue Tracking** - Easy to see profit per level
6. **Scalability** - Can easily add new levels (Play 200, Play 500)
