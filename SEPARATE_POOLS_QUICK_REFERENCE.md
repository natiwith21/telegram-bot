# Separate Prize Pools - Quick Reference

## What Changed?

Your game now has **completely separate prize pools** for each level:

| Level | Stake | Pool per Player | Example (5 players) |
|-------|-------|-----------------|-------------------|
| Play 10 | 10 | 10 coins | 50 total → Winner gets 40 |
| Play 20 | 20 | 20 coins | 100 total → Winner gets 80 |
| Play 50 | 50 | 50 coins | 250 total → Winner gets 200 |
| Play 100 | 100 | 100 coins | 500 total → Winner gets 400 |

## How Winners Get Paid

**Formula:** `Winner Gets = Total Pool × 0.80`

- Total pool = number of players × stake per player
- Winner gets 80% of the pool
- House keeps 20% of the pool

## Example Scenarios

### Scenario 1: Play 10 with 3 Players
```
Player A joins: stakes 10
Player B joins: stakes 10
Player C joins: stakes 10
Total Pool: 30 coins

Player A claims Bingo first:
Winner amount: 30 × 0.80 = 24 coins
House keeps: 30 × 0.20 = 6 coins

Balance changes:
Player A: -10 (stake) + 24 (win) = +14 coins net gain
Player B: -10 (lost) = -10 coins net loss
Player C: -10 (lost) = -10 coins net loss
```

### Scenario 2: Single Player
```
You play Play 50 alone: stake 50
Total Pool: 50 coins

You claim Bingo:
Winner amount: 50 × 0.80 = 40 coins
House keeps: 50 × 0.20 = 10 coins

Balance change: -50 + 40 = -10 coins (you lose 10)
```

### Scenario 3: Many Players
```
10 players in Play 20:
Each stakes: 20
Total Pool: 200 coins

Winner gets: 200 × 0.80 = 160 coins
House gets: 200 × 0.20 = 40 coins

Balance changes:
Winner: -20 + 160 = +140 coins
Others: -20 each
```

## Pool Isolation

**Critical**: Pools are **completely separate** by game level.

```
Play 10 Room: live_like_bingo_10_shared
├─ Player A: 10 coins
├─ Player B: 10 coins
└─ Pool: 20 coins

Play 20 Room: live_like_bingo_20_shared
├─ Player C: 20 coins
├─ Player D: 20 coins
└─ Pool: 40 coins

NEVER mixed - each level is independent
```

## Key Rules

1. ✅ **First to claim wins** - Only first player gets the pool
2. ✅ **80/20 split** - Winner gets 80%, house gets 20%
3. ✅ **Separated by level** - Play 10 never mixes with Play 20
4. ✅ **Fair for all** - Single player = single player's stake as pool
5. ✅ **Recorded** - Game history shows exact pool amounts

## Game History Format

After a game, you'll see entries like:

```
✅ WIN: "Bingo 10: WIN - Pool: 50, Won: 40 (80%), Net: +30"
❌ LOSS: "Bingo 10: LOSS - Lost 10 coins"
✅ WIN: "Bingo 20: WIN - Pool: 100, Won: 80 (80%), Net: +60"
```

## FAQ

**Q: Why might I lose money even if I win?**
A: If only 1 player (you), the pool is 10 coins. You get 8 coins (80%), but paid 10 to play. Net loss = -2. More players = higher win amount.

**Q: Can Play 10 and Play 20 mix?**
A: No! Each level has its own separate room and pool. Completely isolated.

**Q: What happens if 2 people claim Bingo at the same time?**
A: The server decides who claimed first (milliseconds). Only first player wins.

**Q: Do I get house money?**
A: No, house keeps the 20% cut. You only get 80% of the pool.

**Q: What if game ends with no winner?**
A: If 20 numbers are called with no bingo, the game ends and money is returned proportionally based on game result processing.

## How to Maximize Winnings

1. **Play with others** - More players = bigger pool
2. **Be first** - Claim bingo immediately when you see your pattern
3. **Play higher levels** - Play 100 with many players = 400+ coin wins
4. **Track pools** - Watch for games with many players joining

## Behind the Scenes

### WebSocket (Server)
- Tracks players per level in separate rooms
- Calculates pool when someone claims bingo
- Broadcasts winner info with pool details

### Backend (API)
- Receives pool data from WebSocket
- Calculates: `newBalance = oldBalance - stake + (pool × 0.80)`
- Records exact amounts in game history

### Frontend (App)
- Sends pool data when processing results
- Shows win amount immediately after bingo claim
- Updates balance in real-time

## Technical Details (For Developers)

### Room ID Format
```javascript
`live_like_bingo_${gameMode}_shared`
// Examples:
'live_like_bingo_10_shared'
'live_like_bingo_20_shared'
'live_like_bingo_50_shared'
'live_like_bingo_100_shared'
```

### Pool Calculation
```javascript
function calculatePrizePool(game) {
  const totalStake = sum of all players' stakes;
  const winnerPool = Math.floor(totalStake * 0.80);
  const houseShare = totalStake - winnerPool;
  return { totalStake, winnerPool, houseShare };
}
```

### API Parameters (New)
```javascript
{
  totalPoolCollected: 50,     // Total from all players
  playerCount: 5,             // Number of players
  winAmount: 40               // 80% of pool (pre-calculated)
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Balance not updating | Wait 1-2 seconds, refresh page |
| Pool seems wrong | Reload game, verify player count |
| Lost when winning | You were 2nd to claim, or solo game |
| Different game levels mixed | Never happens - they're isolated |

## Support

If you see unexpected behavior:
1. Check game history for exact pool amounts
2. Verify which game level you're playing
3. Count actual players in game
4. Check server logs for detailed calculation info
