# Separate Prize Pools - Validation & Testing Checklist

## Pre-Deployment Validation

### Code Review Checklist

#### websocket-server.js Changes
- [ ] `calculatePrizePool()` function exists (lines 356-370)
  - [ ] Correctly sums only stakes from players in THAT game
  - [ ] Returns correct 80/20 split
  - [ ] No floating point errors
  - [ ] Handles edge cases (0 players, 1 player)

- [ ] `handleStartMultiplayerGame()` updated (lines 376-394)
  - [ ] Uses exact room ID match: `===` not `.includes()`
  - [ ] Room ID format: `${prefix}${gameMode}_shared`
  - [ ] Level-specific room creation works
  - [ ] Game merging only happens in same level

- [ ] `handleClaimLiveBingo()` updated (lines 1319-1421)
  - [ ] Uses level-specific room ID (line 1323)
  - [ ] Calls `calculatePrizePool()` (line 1359)
  - [ ] Winner record includes all pool fields (lines 1367-1374)
  - [ ] Console logs include game mode
  - [ ] Broadcast includes pool breakdown

- [ ] `endSharedGame()` updated (lines 1465-1515)
  - [ ] Calculates pool at game end (line 1479)
  - [ ] Broadcast includes gameMode (line 1482)
  - [ ] Broadcast includes all pool fields (lines 1487-1492)
  - [ ] Console logs are detailed
  - [ ] Next game creation works for same level

#### LikeBingo.jsx Changes
- [ ] Handler for `shared_game_ended` updated (lines 305-336)
  - [ ] Logs include game mode
  - [ ] Logs include pool breakdown
  - [ ] Comment explains 80/20 split
  - [ ] Game win/loss processing unchanged

### Functional Testing

#### Test 1: Room Isolation
```
SETUP:
  - 2 browser windows ready
  - Window 1 opens Play 10 game
  - Window 2 opens Play 50 game
  
TEST:
  [ ] Window 1 and Window 2 are in different games
  [ ] Window 1 doesn't see Window 2 players
  [ ] Window 2 doesn't see Window 1 players
  [ ] Different room IDs visible in logs
  
EXPECTED:
  ✓ Completely isolated games running in parallel
```

#### Test 2: Pool Calculation (Play 10)
```
SETUP:
  - Create Play 10 game
  - Have 5 different players join
  
VERIFICATION:
  [ ] Logs show: "Mode: 10"
  [ ] Pool should be 50 (5 × 10)
  [ ] One player wins
  [ ] Logs show: "Prize Pool: 50"
  [ ] Logs show: "Winner: 40 (80%)"
  [ ] Logs show: "House: 10 (20%)"
  
EXPECTED:
  ✓ 40 + 10 = 50 (exact split)
  ✓ Winner gets 80% of their level's pool
  ✓ House gets 20% of their level's pool
```

#### Test 3: Pool Calculation (Play 50)
```
SETUP:
  - Create Play 50 game
  - Have 6 different players join
  
VERIFICATION:
  [ ] Logs show: "Mode: 50"
  [ ] Pool should be 300 (6 × 50)
  [ ] One player wins
  [ ] Logs show: "Prize Pool: 300"
  [ ] Logs show: "Winner: 240 (80%)"
  [ ] Logs show: "House: 60 (20%)"
  
EXPECTED:
  ✓ 240 + 60 = 300 (exact split)
  ✓ Different pool than Play 10
  ✓ No influence from other game levels
```

#### Test 4: No Cross-Level Mixing
```
SETUP:
  - Play 10 game: 8 players (total stake: 80)
  - Play 100 game: 2 players (total stake: 200)
  
TEST 1 - Play 10 Winner:
  [ ] Winner should receive: 64 (80% of 80)
  [ ] NOT: 80% of (80 + 200) = 224
  [ ] House gets: 16 (20% of 80)
  [ ] NOT: 20% of (80 + 200) = 56
  
TEST 2 - Play 100 Winner:
  [ ] Winner should receive: 160 (80% of 200)
  [ ] NOT: 80% of (80 + 200) = 224
  [ ] House gets: 40 (20% of 200)
  [ ] NOT: 20% of (80 + 200) = 56
  
EXPECTED:
  ✓ Play 10 pool stays isolated (80 coins)
  ✓ Play 100 pool stays isolated (200 coins)
  ✓ No arithmetic showing combined pools
```

#### Test 5: Multiple Concurrent Games Same Level
```
SETUP:
  - Play 50 Game A: 4 players (200 coin pool)
  - Play 50 Game B: 6 players (300 coin pool)
  - Different timing/progression
  
TEST:
  [ ] Game A and B are in same room ID
  [ ] Game A pool = 200 (4 × 50)
  [ ] Game B pool = 300 (6 × 50)
  [ ] Game A winner gets 160
  [ ] Game B winner gets 240
  [ ] No cross-game mixing
  
EXPECTED:
  ✓ Multiple games can queue in same level room
  ✓ Each game maintains own pool calculation
  ✓ No player from Game A appears in Game B
```

#### Test 6: Consecutive Games
```
SETUP:
  - Play 20 Game 1 completes
  - Play 20 Game 2 starts immediately
  - Same room ID
  
TEST:
  [ ] Game 1 pool = their specific amount
  [ ] Game 1 completes normally
  [ ] System creates Game 2 in same room
  [ ] Game 2 has fresh player pool
  [ ] Game 2 pool isolated from Game 1
  [ ] Logs clearly show Game 1 then Game 2
  
EXPECTED:
  ✓ Games can run back-to-back in same room
  ✓ Each game's pool is independent
  ✓ No carryover between games
```

### Console Log Verification

#### Expected Output: Player Joins
```
[Expected]
🎮 [telegramId] starting/joining shared multiplayer game - Mode: 50

[Check]
✓ Includes "Mode: 50" (not just generic message)
✓ Shows which level is being joined
```

#### Expected Output: Player Wins
```
[Expected]
🎉 FIRST BINGO CLAIMED by [id] ([name]) in Play 50
   💰 Prize Pool: 250 coins | Winner: 200 | House: 50
   👥 Players in game: 5

[Check]
✓ Shows "in Play 50" (level specified)
✓ Shows "Prize Pool: 250" (exact amount)
✓ Shows "Winner: 200" (80% calculation)
✓ Shows "House: 50" (20% calculation)
✓ Shows "Players in game: 5" (competitor count)
✓ Math checks: 200 + 50 = 250 ✓
```

#### Expected Output: Game Ends
```
[Expected]
🏁 Play 50 game ended. Reason: bingo_claimed, Winners: 1, Players: 5
   💰 Prize Pool Summary:
      Total Collected: 250 coins
      Winner Receives: 200 coins (80%)
      House Receives: 50 coins (20%)

[Check]
✓ Shows "Play 50" (level specified)
✓ Shows "Total Collected: 250"
✓ Shows "Winner Receives: 200 (80%)"
✓ Shows "House Receives: 50 (20%)"
✓ Math checks: 200 + 50 = 250 ✓
✓ Percentage checks: 200/250 = 0.80 ✓
```

### Edge Cases

#### Edge Case 1: Single Player Game
```
SETUP:
  - One player joins Play 10
  - Time passes, game ends
  
TEST:
  [ ] Pool size = 10 (1 × 10)
  [ ] Winner gets 8 (80% of 10)
  [ ] House gets 2 (20% of 10)
  [ ] No errors in console
  
EXPECTED:
  ✓ System handles edge case gracefully
  ✓ Math works: 8 + 2 = 10 ✓
```

#### Edge Case 2: Large Player Count
```
SETUP:
  - 50 players in Play 50 game
  
TEST:
  [ ] Pool size = 2500 (50 × 50)
  [ ] Winner gets 2000 (80%)
  [ ] House gets 500 (20%)
  [ ] No performance issues
  [ ] Calculations are accurate
  
EXPECTED:
  ✓ Scales properly to many players
  ✓ Math works: 2000 + 500 = 2500 ✓
```

#### Edge Case 3: Very Large Pool
```
SETUP:
  - 100 players in Play 100 game
  
TEST:
  [ ] Pool size = 10,000 (100 × 100)
  [ ] Winner gets 8,000 (80%)
  [ ] House gets 2,000 (20%)
  [ ] No floating point errors
  
EXPECTED:
  ✓ Handles large numbers correctly
  ✓ Math works: 8000 + 2000 = 10000 ✓
```

#### Edge Case 4: Floating Point Amounts
```
SETUP:
  - 3 players in Play 33 game
  - Pool = 99, should split 79.2 / 19.8
  
TEST:
  [ ] Code uses Math.floor() for winner amount
  [ ] Winner gets: floor(99 × 0.80) = 79
  [ ] House gets: 99 - 79 = 20
  [ ] No floating point in final amounts
  
EXPECTED:
  ✓ All amounts are integers
  ✓ Math works: 79 + 20 = 99 ✓
  ✓ House gets remainder (not exactly 20%)
```

## Deployment Checklist

### Pre-Deployment
- [ ] All code changes reviewed
- [ ] All local tests pass
- [ ] Console shows correct logs
- [ ] No errors in browser console
- [ ] All edge cases handled
- [ ] Git changes committed
- [ ] Change log updated

### Deployment
- [ ] Backup current production code
- [ ] Deploy websocket-server.js changes
- [ ] Deploy frontend changes
- [ ] Verify WebSocket connections work
- [ ] Monitor error logs
- [ ] Test basic game flow

### Post-Deployment (First Hour)
- [ ] Monitor console logs for errors
- [ ] Test Play 10 game joining
- [ ] Test Play 50 game joining
- [ ] Test Play 100 game joining
- [ ] Verify room isolation in logs
- [ ] Verify pool calculations correct
- [ ] Check that games complete normally

### Post-Deployment (First Day)
- [ ] Real players joining games
- [ ] Pool isolation holding
- [ ] Console logs clear and accurate
- [ ] No errors in logs
- [ ] Games completing successfully
- [ ] Winners receiving correct amounts

### Post-Deployment (First Week)
- [ ] Revenue tracking per level
- [ ] Player feedback on fairness
- [ ] No reported issues
- [ ] All metrics normal
- [ ] Performance acceptable
- [ ] Ready to mark as stable

## Rollback Procedure

If issues found:
1. [ ] Identified problem
2. [ ] Documented error
3. [ ] Reverted websocket-server.js
4. [ ] Reverted LikeBingo.jsx
5. [ ] Verified old system works
6. [ ] Checked game logs
7. [ ] Reported findings
8. [ ] Created fix plan

## Success Criteria

**System is working correctly when:**
- ✅ Play 10 games only contain Play 10 players
- ✅ Play 50 games only contain Play 50 players
- ✅ No cross-level player mixing
- ✅ Winners receive exactly 80% of their level's pool
- ✅ House receives exactly 20% of their level's pool
- ✅ Console logs show level-specific information
- ✅ All pool calculations mathematically correct
- ✅ No errors in browser or server logs
- ✅ Multiple concurrent games work independently
- ✅ Games can queue in same level
- ✅ Edge cases handled gracefully
- ✅ Performance acceptable with many players

## Documentation Checklist

- [x] SEPARATE_PRIZE_POOLS.md created (system design)
- [x] IMPLEMENTATION_SEPARATE_POOLS.md created (implementation details)
- [x] SEPARATE_POOLS_QUICK_START.md created (quick reference)
- [x] POOL_ARCHITECTURE.md created (diagrams and flows)
- [x] CHANGELOG_SEPARATE_POOLS.md created (detailed changes)
- [x] This validation document created
