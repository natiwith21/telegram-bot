# Separate Prize Pools Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT GAME SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

                         WebSocket Server
                    (websocket-server.js)
                              │
                 ┌────────────┼────────────┐
                 │            │            │
          Play 10 Room    Play 20 Room   Play 50 Room
     live_like_bingo_     live_like_bingo_   live_like_bingo_
           10_shared      20_shared          50_shared
                 │            │                 │
          ┌──────┴──────┐    │          ┌──────┴──────┐
          │             │    │          │             │
       Player A    Player B │       Player C    Player D
       Stake: 10   Stake: 10 │       Stake: 20   Stake: 20
                         │              
                    Player E
                    Stake: 20

              CRITICAL: SEPARATE POOLS
       
       Play 10 Pool:          Play 20 Pool:
       Total: 20 coins        Total: 40 coins
       (2 × 10)               (2 × 20)
       
       Winner: A              Winner: E
       Gets: 16 coins         Gets: 32 coins
       (20 × 0.80)            (40 × 0.80)
       
       House: 4 coins         House: 8 coins
       (20 × 0.20)            (40 × 0.20)
       
       NO MIXING OF POOLS!
```

## Data Flow - From Game to Balance Update

```
1. PLAYER CLAIMS BINGO
   │
   └─> WebSocket Server (websocket-server.js)
       ├─ Identifies room: live_like_bingo_10_shared
       ├─ Gets all players in THIS room only
       ├─ Calls calculatePrizePool()
       │  └─ Sums stakes: 50 coins
       │  └─ Winner share: 40 (80%)
       │  └─ House share: 10 (20%)
       └─ Broadcasts: live_bingo_claimed message
           {
             winner: 'PlayerA',
             totalPool: 50,
             winAmount: 40,
             playersInGame: 5,
             gameMode: '10'
           }

2. FRONTEND RECEIVES MESSAGE
   │
   └─> LikeBingo.jsx
       ├─ Case: 'live_bingo_claimed'
       ├─ Extracts pool data
       ├─ Calls handleGameWin(poolData)
       │  └─ poolData = {
       │      totalPoolCollected: 50,
       │      playerCount: 5,
       │      winAmount: 40
       │    }
       ├─ Shows alert: "Won 40 coins! Pool: 50"
       └─ Calls processGameResult(true, poolData)
           │
           └─> Sends API request:
               POST /api/like-bingo-play
               {
                 telegramId: 'PlayerA',
                 gameMode: '10',
                 stake: 10,
                 gameResult: true,
                 isWin: true,
                 totalPoolCollected: 50,
                 playerCount: 5,
                 winAmount: 40
               }

3. BACKEND PROCESSES RESULT
   │
   └─> bot.js (/api/like-bingo-play)
       ├─ Receives pool data
       ├─ Calculates: newBalance = 1000 - 10 + 40 = 1030
       ├─ Creates record: "Bingo 10: WIN - Pool: 50, Won: 40 (80%), Net: +30"
       ├─ Updates user.balance = 1030
       ├─ Updates user.gameHistory
       ├─ Saves to database
       └─ Returns response:
           {
             success: true,
             newBalance: 1030,
             winAmount: 40,
             netGain: 30,
             gameRecord: "Bingo 10: WIN - Pool: 50, Won: 40 (80%), Net: +30"
           }

4. FRONTEND UPDATES UI
   │
   └─> LikeBingo.jsx
       ├─ Receives API response
       ├─ Updates setUserBalance(1030)
       ├─ Shows notification: "Won 40 coins! Net gain: +30"
       └─ Refreshes balance after 1 second
```

## Room Isolation Architecture

```
WebSocket Server
    │
    ├─ gameRooms Map
    │  ├─ 'live_like_bingo_10_shared' → Set(Player1, Player2, Player3)
    │  ├─ 'live_like_bingo_20_shared' → Set(Player4, Player5)
    │  ├─ 'live_like_bingo_50_shared' → Set(Player6)
    │  └─ 'live_like_bingo_100_shared' → Set(Player7, Player8, Player9)
    │
    ├─ liveGameSessions Map
    │  ├─ 'live_like_bingo_10_shared' → {
    │  │    players: {Player1: {stake: 10}, Player2: {stake: 10}},
    │  │    calledNumbers: [1, 5, 23, ...],
    │  │    poolData: {totalStake: 20, winnerPool: 16, houseShare: 4}
    │  │  }
    │  │
    │  ├─ 'live_like_bingo_20_shared' → {
    │  │    players: {Player4: {stake: 20}, Player5: {stake: 20}},
    │  │    calledNumbers: [3, 7, 42, ...],
    │  │    poolData: {totalStake: 40, winnerPool: 32, houseShare: 8}
    │  │  }
    │  │
    │  └─ (etc for other levels)
    │
    └─ connections Map
       ├─ Player1 → {ws: WebSocket, roomId: 'live_like_bingo_10_shared'}
       ├─ Player2 → {ws: WebSocket, roomId: 'live_like_bingo_10_shared'}
       ├─ Player4 → {ws: WebSocket, roomId: 'live_like_bingo_20_shared'}
       └─ (etc for all players)

KEY: Each room is COMPLETELY ISOLATED
     No data shared between rooms
     Each room tracks its own players and pool
```

## Prize Calculation Tree

```
GAME ENDS
  │
  ├─ GET GAME DATA
  │  ├─ gameMode = '10'
  │  ├─ players = [A(10), B(10), C(10), D(10), E(10)]
  │  ├─ totalStake = 50
  │  └─ winner = A
  │
  ├─ CALCULATE POOL
  │  ├─ totalStake = 50
  │  ├─ winnerPool = 50 × 0.80 = 40
  │  └─ houseShare = 50 × 0.20 = 10
  │
  ├─ SEND TO FRONTEND
  │  ├─ type: 'live_bingo_claimed'
  │  ├─ totalPool: 50
  │  ├─ winAmount: 40
  │  └─ playersInGame: 5
  │
  ├─ FRONTEND PROCESSES
  │  └─ Call API with pool data
  │
  └─ BACKEND UPDATES BALANCE
     ├─ Old: 1000
     ├─ Stake: -10
     ├─ Winnings: +40
     ├─ New: 1030
     └─ Record: "WIN - Pool: 50, Won: 40 (80%), Net: +30"
```

## State Transitions

```
PLAYER ACTION                    SERVER STATE              DATABASE UPDATE
─────────────                    ────────────              ───────────────

Player joins                     Room created              
live_like_bingo_10_shared        (if first player)         
         │
         ├─ Player 1 joins       Game state: 'waiting'
         │                       Players: {1}
         │
         ├─ Player 2 joins       Game state: 'waiting'
         │                       Players: {1, 2}
         │
         ├─ Countdown expires    Game state: 'playing'
         │                       Numbers called: []
         │
         ├─ Numbers called       Game state: 'playing'
         │ (during game)         Numbers called: [1,5,23,...]
         │
         ├─ Player 1 claims      Game state: 'finished'     User 1 balance
         │ BINGO                 Winner: Player 1           updated
         │                       poolData: {                gameHistory
         │                         totalStake: [P1 stake],  updated
         │                         winnerPool: [80%],
         │                         houseShare: [20%]
         │                       }
         │
         └─ New game            Game state: 'waiting'      (next iteration)
            created              Players: {}
```

## Message Flow Sequence

```
TIMELINE                    WEBSOCKET MESSAGE          FRONTEND ACTION
────────────────────────────────────────────────────────────────────

Game starts                                            Show game board
   │                                                   Show countdown
   │
Game playing                shared_number_called      Mark called numbers
   │                        (every 3 seconds)
   │
   │
Player marks                (internal tracking)       Update marked cells
multiple cells
   │
   │
Player sees bingo!          (checks locally)          Check if valid
   │                                                   
   │
Player clicks                                         Call WebSocket:
"CLAIM BINGO"               ──► claim_bingo          claim_bingo message
   │                            (to server)
   │
Server validates            ◄── live_bingo_claimed   Receive: winner,
& calculates pool               + pool data           pool, winAmount
   │
   │
Server broadcasts            ──► live_bingo_claimed  Show result alert
to all players                   (to all)             Extract pool data
   │
   │
Frontend sends              ──► POST /api/            Calculate net gain
to backend                      like-bingo-play
                                (with pool data)
   │
Backend updates             ◄── Success response      Update balance
balance                         (new balance)         Show notification
   │
   │
Game ends                   ──► shared_game_ended     Reset game state
                               (to all)
   │
   │
Next game                   ──► next_shared_game_     Show next game
sequence                        countdown             countdown
starts
```

## Database Schema Impact

```
User Model (No structural change)
├─ balance: Number (updated correctly)
└─ gameHistory: [String]
   └─ New format includes pool amounts:
      "Bingo 10: WIN - Pool: 50, Won: 40 (80%), Net: +30"
      ├─ Pool amount
      ├─ Actual winnings
      ├─ 80/20 split shown
      └─ Net gain/loss

GameSession Model (No change needed)
├─ gameMode: String ('10', '20', '50', '100')
└─ (other fields unchanged)

NEW: In-memory tracking (WebSocket)
├─ liveGameSessions Map
│  └─ Per game: players, calledNumbers, poolData, winners
└─ gameRooms Map
   └─ Per room: connected player IDs
```

## Scaling Considerations

```
CURRENT SYSTEM
  Single server, single WebSocket
  
  Capacity per level: ~1000 concurrent players per room
  Each room is independent
  
SCALING PATH (if needed)
  Multiple servers:
  ├─ Connect WebSocket to Redis Pub/Sub
  ├─ Each level gets own channel:
  │  ├─ channel:bingo:10
  │  ├─ channel:bingo:20
  │  ├─ channel:bingo:50
  │  └─ channel:bingo:100
  ├─ Room isolation maintained
  └─ No pool mixing possible
```

## Security Considerations

```
POOL ISOLATION ENFORCED BY:
1. Server-side room validation
   ├─ Players matched to correct room only
   ├─ No cross-room payment acceptance
   └─ Room ID includes gameMode

2. Server-side calculation
   ├─ Winner amount calculated on server
   ├─ Client cannot modify pool share
   ├─ API validates incoming pool data
   └─ Backend recalculates if needed

3. Database integrity
   ├─ Balance updates atomic
   ├─ Game history immutable
   ├─ No fund transfers between levels
   └─ Audit trail via gameHistory

4. Validation
   ├─ Verify player in correct room
   ├─ Verify stake matches gameMode
   ├─ Verify pool calculation matches
   ├─ Verify 80/20 split correct
   └─ Verify winner is first claimer
```

## Error Handling Flow

```
ERROR SCENARIO: Invalid pool data received

API receives:
  totalPoolCollected: 100  ← BUT gameMode is '10'!
  playersInGame: 2
  
Backend logic:
  ├─ Check: 100 coins / 2 players = 50 per player
  ├─ Expected for '10' mode: max 10 per player
  ├─ MISMATCH DETECTED ✓
  └─ Options:
     ├─ Log warning
     ├─ Use fallback multiplier
     └─ Continue safely

Safe degradation:
  ├─ Use stake-based multiplier instead
  ├─ User still gets accurate payout
  ├─ Logging captures discrepancy
  └─ System recovers gracefully
```

## Summary

The separate pools system ensures:

✅ **Complete isolation** between game levels  
✅ **Accurate calculations** on server side  
✅ **Fair distribution** (80/20 split)  
✅ **No mixing** of funds between levels  
✅ **First-to-win** mechanism  
✅ **Detailed audit trail** in game history  
✅ **Graceful degradation** if data missing  
✅ **Security** through server-side validation  
