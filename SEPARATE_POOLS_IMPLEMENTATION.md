# Separate Prize Pools Implementation Plan

## Overview
Implement separate prize pools for each game level (Play 10, Play 20, Play 50, Play 100) so that:
- Players joining Play 10 only contribute to the Play 10 pool
- Players joining Play 20 only contribute to the Play 20 pool
- Pool = (number of players × stake for that level)
- Winner gets 80% of their level's pool
- House gets 20% of their level's pool

## Key Changes Required

### 1. **WebSocket Server (websocket-server.js)**

#### Current Issues:
- Games use generic room IDs instead of level-specific ones
- All levels might share the same game session

#### Changes:
- Already has level-specific room creation: `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}_shared`
- Need to ensure pool calculations use ONLY players from that specific level
- Modify `calculatePrizePool()` to work correctly with level-specific games
- Ensure `startSharedGamePlay()` processes winners correctly per level

**Key functions to verify/update:**
1. `handleStartMultiplayerGame()` - already creates level-specific rooms ✓
2. `calculatePrizePool()` - already exists but verify it uses correct players
3. `startSharedGamePlay()` - handle game end and winner calculations
4. `handleClaimLiveBingo()` - process winner payouts

### 2. **Backend API (bot.js)**

#### Current Issue:
- `/api/like-bingo-play` endpoint doesn't track pool contributions per level
- Win calculations use fixed multipliers instead of actual pool amounts

#### Changes Needed:
```javascript
// OLD: Fixed multipliers
const winMultipliers = {
  '10': 2.5,   // 10 coins -> 25 coins
  '20': 3,     // 20 coins -> 60 coins
  '50': 3.5,   // 50 coins -> 175 coins
  '100': 4     // 100 coins -> 400 coins
};

// NEW: Calculate based on actual pool
// Example: 5 players × 10 coins = 50 total pool
// Winner gets: 50 × 0.80 = 40 coins
// House gets: 50 × 0.20 = 10 coins
```

**API Endpoint Updates:**
```javascript
POST /api/like-bingo-play
Body: {
  telegramId,
  gameMode,        // '10', '20', '50', '100'
  stake,          // Must match game level
  gameResult: true,
  isWin,
  totalPoolCollected,  // NEW: Total from all players in this level
  winnerCount,        // NEW: How many players were in the pool
  reason: 'game_win' | 'game_loss'
}
```

### 3. **Frontend (LikeBingo.jsx)**

#### Current Behavior:
- Already tracks gameMode correctly
- Already uses fixed win multipliers
- Needs to receive actual pool info from WebSocket

#### Changes Needed:
1. Display actual pool size when game starts
2. Calculate actual winner payout based on real pool
3. Update balance notification to show actual pool calculations

**Add to game end message:**
```javascript
// When game ends:
console.log(`💰 Prize Pool: ${totalCollected} coins`);
console.log(`🏆 Winner gets: ${totalCollected * 0.80} coins (80%)`);
console.log(`🏦 House gets: ${totalCollected * 0.20} coins (20%)`);
```

### 4. **Data Model Updates**

#### GameSession Model
Already tracks `gameMode` - no changes needed

#### Suggested New Model: GamePool
```javascript
const gamePoolSchema = new mongoose.Schema({
  gameMode: { type: String, required: true },      // '10', '20', '50', '100'
  roomId: { type: String, required: true },        // Level-specific room
  createdAt: { type: Date, default: Date.now },
  totalCollected: { type: Number, default: 0 },    // Sum of all player stakes
  playerCount: { type: Number, default: 0 },       // Number of players
  playerList: [{ telegramId: String, stake: Number }],  // Track each player
  winner: { type: String },                        // Winner's telegramId
  houseShare: { type: Number, default: 0 },       // 20% house cut
  status: { type: String, enum: ['waiting', 'active', 'ended'] }
});
```

## Implementation Steps

### Phase 1: Backend Setup (bot.js)
1. Modify the `/api/like-bingo-play` endpoint to accept actual pool data
2. Calculate payouts as: `winAmount = totalPoolCollected × 0.80`
3. Log all pool calculations for debugging

### Phase 2: WebSocket Enhancement (websocket-server.js)
1. Verify `calculatePrizePool()` correctly sums stakes from level-specific players
2. Modify `startSharedGamePlay()` to:
   - Get the actual prize pool from `calculatePrizePool()`
   - Send pool info to all players when game starts
   - Send pool info to winner when they claim bingo

3. Modify winner handling to:
   - Include `totalPoolCollected` in the game end message
   - Include `winnerAmount` (80% of pool)
   - Include `houseShare` (20% of pool)

### Phase 3: Frontend Update (LikeBingo.jsx)
1. When receiving `shared_game_started`, display the pool info
2. When receiving `shared_game_ended`, show actual calculations
3. Update balance notifications with real pool amounts

### Phase 4: Testing
1. Test with different player counts per level
2. Verify no cross-level pool mixing
3. Verify 80/20 split is accurate
4. Test with edge cases (1 player, many players)

## Example Flow

### Scenario: Play 10 Game
1. **Player A joins Play 10** (Room: `live_like_bingo_10_shared`)
   - Contributes: 10 coins

2. **Player B joins Play 10** (Same room)
   - Contributes: 10 coins
   - **Total Pool**: 20 coins

3. **Player C joins Play 20** (Room: `live_like_bingo_20_shared`)
   - Contributes: 20 coins
   - Pool: 20 coins (separate from Play 10)

4. **Player A claims Bingo** in Play 10
   - Pool collected: 20 coins
   - Winner (A) gets: 20 × 0.80 = 16 coins
   - House gets: 20 × 0.20 = 4 coins
   - A's balance: -10 (stake) + 16 (winnings) = +6 net gain

5. **Player C wins Play 20** automatically (only player)
   - Pool collected: 20 coins
   - Winner (C) gets: 20 × 0.80 = 16 coins
   - House gets: 20 × 0.20 = 4 coins
   - C's balance: -20 (stake) + 16 (winnings) = -4 net loss

## Critical Implementation Details

### Room ID Pattern
```javascript
// MUST use this exact format for level separation:
const roomId = `live_like_bingo_${gameMode}_shared`;
// Examples:
// 'live_like_bingo_10_shared'
// 'live_like_bingo_20_shared'
// 'live_like_bingo_50_shared'
// 'live_like_bingo_100_shared'
```

### Prize Calculation Formula
```javascript
function calculatePrizeForLevel(gameMode, playerCount, stakePerPlayer) {
  const totalPool = playerCount * stakePerPlayer;
  const winnerAmount = Math.floor(totalPool * 0.80);
  const houseAmount = totalPool - winnerAmount;
  
  return {
    totalPool,
    winnerAmount,
    houseAmount,
    winPercentage: 0.80,
    housePercentage: 0.20
  };
}
```

### WebSocket Messages
```javascript
// When game starts - notify players of pool size
{
  type: 'shared_game_started',
  gameMode: '10',
  roomId: 'live_like_bingo_10_shared',
  totalPoolCollected: 50,
  playerCount: 5,
  stakePerPlayer: 10
}

// When game ends - show pool distribution
{
  type: 'shared_game_ended',
  gameMode: '10',
  totalCollected: 50,
  winnerAmount: 40,      // 80% of pool
  houseShare: 10,        // 20% of pool
  winners: [{ telegramId: 'xxx', amount: 40 }]
}
```

## Files to Modify

1. **websocket-server.js**
   - `calculatePrizePool()` - Verify logic
   - `startSharedGamePlay()` - Add pool data to messages
   - `handleClaimLiveBingo()` - Add pool calculations
   - Any winner processing functions

2. **bot.js**
   - `/api/like-bingo-play` endpoint - Accept pool data, calculate payouts
   - BINGO_CONFIG - Can reference for stake amounts

3. **LikeBingo.jsx**
   - WebSocket message handlers for game end
   - Balance notification display
   - Pool information display

4. **models/GameSession.js** (Optional)
   - May add `totalCollected` and `playerCount` fields

## Success Criteria

✓ Each game level has completely separate prize pools  
✓ No cross-level mixing of funds  
✓ Winner receives exactly 80% of their level's pool  
✓ House receives exactly 20% of their level's pool  
✓ Player balances are updated correctly  
✓ Game history shows accurate pool amounts  
✓ Works with 1 player (1 × stake = pool)  
✓ Works with multiple players  
