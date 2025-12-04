# Separate Prize Pool Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Mini App                        │
│  (LikeBingo.jsx - Frontend)                                 │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ User selects game level (10/20/50/100)
               ↓
       ┌───────────────┐
       │ WebSocket     │
       │ Connection    │
       └───────┬───────┘
               │
               ↓
┌──────────────────────────────────────────────────────────────────┐
│                   WebSocket Server                               │
│              (websocket-server.js)                               │
└──────────────────────────────────────────────────────────────────┘
               │
        ┌──────┴─────────────────────┐
        │                            │
        ↓                            ↓
    ┌────────────┐            ┌──────────────┐
    │ Game Rooms │            │ Game Sessions│
    │ (Players)  │            │ (Game State) │
    └────┬───────┘            └──────┬───────┘
         │                           │
         │ Separated by level ID      │ Separated by level ID
         ↓                           ↓
    ┌────────────────────────────────────────┐
    │  Level-Specific Room IDs                │
    ├────────────────────────────────────────┤
    │ live_like_bingo_10_shared   → Play 10  │
    │ live_like_bingo_20_shared   → Play 20  │
    │ live_like_bingo_50_shared   → Play 50  │
    │ live_like_bingo_100_shared  → Play 100 │
    └────────────────────────────────────────┘
         │
         ├─────────────┬─────────────┬─────────────┐
         ↓             ↓             ↓             ↓
    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
    │Play 10 │    │Play 20 │    │Play 50 │    │Play 100│
    │Game 1  │    │Game 1  │    │Game 1  │    │Game 1  │
    ├────────┤    ├────────┤    ├────────┤    ├────────┤
    │Players:│    │Players:│    │Players:│    │Players:│
    │8×10    │    │6×20    │    │4×50    │    │3×100   │
    │=80     │    │=120    │    │=200    │    │=300    │
    │coins   │    │coins   │    │coins   │    │coins   │
    └────┬───┘    └────┬───┘    └────┬───┘    └────┬───┘
         │             │             │             │
         ↓             ↓             ↓             ↓
    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
    │Prize   │    │Prize   │    │Prize   │    │Prize   │
    │Pool 80 │    │Pool 120│    │Pool 200│    │Pool 300│
    ├────────┤    ├────────┤    ├────────┤    ├────────┤
    │Winner: │    │Winner: │    │Winner: │    │Winner: │
    │64 (80%)│    │96 (80%)│    │160(80%)│    │240(80%)│
    ├────────┤    ├────────┤    ├────────┤    ├────────┤
    │House:  │    │House:  │    │House:  │    │House:  │
    │16 (20%)│    │24 (20%)│    │40 (20%)│    │60 (20%)│
    └────────┘    └────────┘    └────────┘    └────────┘
```

## Data Flow: Player Joins Game

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Play 50" button                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ LikeBingo.jsx receives │
        │ gameMode = "50"        │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ Send WebSocket message:│
        │ {                      │
        │   type: 'start...Game' │
        │   gameMode: "50",      │
        │   stake: 50            │
        │ }                      │
        └────────────┬───────────┘
                     │
                     ↓
        ┌──────────────────────────────┐
        │ websocket-server receives    │
        │ handleStartMultiplayerGame() │
        └────────────┬─────────────────┘
                     │
                     ↓
        ┌──────────────────────────────────────┐
        │ Compute room ID:                     │
        │ levelSpecificRoomId =                │
        │ `live_like_bingo_50_shared`          │
        └────────────┬───────────────────────┘
                     │
                     ↓
        ┌──────────────────────────────────────┐
        │ Check: Does room exist with state    │
        │ 'waiting' or 'playing'?              │
        │ (EXACT match on roomId)              │
        └────────────┬───────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
          YES                NO
            │                 │
            ↓                 ↓
     ┌────────────┐    ┌────────────────┐
     │ Add player │    │ Create new     │
     │ to existing│    │ game session   │
     │ game       │    │ for this level │
     │            │    │                │
     │ Pool now:  │    │ Pool now:      │
     │ 250 coins  │    │ 50 coins       │
     │ (5 players)│    │ (1 player)     │
     └────────────┘    └────────────────┘
```

## Data Flow: Player Claims Bingo

```
┌──────────────────────────────────────────┐
│ Player clicks "BINGO" button             │
└────────────────┬─────────────────────────┘
                 │
                 ↓
   ┌──────────────────────────┐
   │ LikeBingo.jsx sends:     │
   │ {                        │
   │   type: 'claim_live_... │
   │   gameMode: "50",       │
   │   winPattern: [...]     │
   │ }                       │
   └──────────────┬──────────┘
                  │
                  ↓
   ┌──────────────────────────────────────┐
   │ websocket-server receives            │
   │ handleClaimLiveBingo()               │
   └──────────────┬───────────────────────┘
                  │
                  ↓
   ┌──────────────────────────────────────┐
   │ Compute room ID:                     │
   │ roomId =                             │
   │ `live_like_bingo_50_shared`          │
   └──────────────┬───────────────────────┘
                  │
                  ↓
   ┌──────────────────────────────────────┐
   │ Get game from liveGameSessions       │
   │ Verify player is in this game        │
   │ Verify no other winner exists        │
   └──────────────┬───────────────────────┘
                  │
                  ↓
   ┌──────────────────────────────────────┐
   │ Call:                                │
   │ calculatePrizePool(sharedGame)       │
   │                                      │
   │ Returns: {                           │
   │   totalStake: 250                    │
   │   prizePool: 250                     │
   │   winnerPool: 200  (80% of pool)    │
   │   houseShare: 50   (20% of pool)    │
   │ }                                    │
   └──────────────┬───────────────────────┘
                  │
                  ↓
   ┌──────────────────────────────────────┐
   │ Create winner record:                │
   │ {                                    │
   │   telegramId: "...",                 │
   │   winAmount: 200,                    │
   │   totalPool: 250,                    │
   │   houseShare: 50,                    │
   │   playersInGame: 5                   │
   │ }                                    │
   └──────────────┬───────────────────────┘
                  │
                  ↓
   ┌──────────────────────────────────────┐
   │ Broadcast to all players in room:    │
   │ {                                    │
   │   type: 'live_bingo_claimed',       │
   │   winner: telegramId,                │
   │   gameMode: "50",     ← Level shown │
   │   winAmount: 200,                    │
   │   totalPool: 250,                    │
   │   houseShare: 50,                    │
   │   playersInGame: 5                   │
   │ }                                    │
   └──────────────┬───────────────────────┘
                  │
                  ↓
   ┌──────────────────────────────────────┐
   │ Frontend receives message            │
   │ Shows notification:                  │
   │ "Player X won! Pool: 250 coins"     │
   │ "Winner gets: 200 (80%)"            │
   │ "House gets: 50 (20%)"              │
   └──────────────────────────────────────┘
```

## Prize Pool Calculation

```
┌─────────────────────────────────────────┐
│ calculatePrizePool(sharedGame)          │
├─────────────────────────────────────────┤
│                                         │
│ Step 1: Sum all stakes from players    │
│ ─────────────────────────────────────   │
│ Players in this game:                  │
│   Player A: 50 coins                   │
│   Player B: 50 coins                   │
│   Player C: 50 coins                   │
│   Player D: 50 coins                   │
│   Player E: 50 coins                   │
│                                         │
│ totalStake = 50+50+50+50+50 = 250     │
│                                         │
│ Step 2: Full pool is all collected    │
│ ─────────────────────────────────────   │
│ prizePool = totalStake = 250           │
│                                         │
│ Step 3: Split 80/20                   │
│ ─────────────────────────────────────   │
│ winnerPool = floor(250 × 0.80)         │
│           = floor(200)                 │
│           = 200 coins                  │
│                                         │
│ houseShare = 250 - 200 = 50 coins     │
│                                         │
│ Step 4: Return distribution           │
│ ─────────────────────────────────────   │
│ return {                                │
│   totalStake: 250,                     │
│   prizePool: 250,                      │
│   winnerPool: 200,                     │
│   houseShare: 50                       │
│ }                                       │
│                                         │
└─────────────────────────────────────────┘
```

## Isolation Guarantee

```
┌─────────────────────────────────────────────────────────────┐
│         Multiple Concurrent Games (No Mixing)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │ Play 10 Game │  │ Play 50 Game │  │ Play 100 Game│       │
│ ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│ │ Room ID:     │  │ Room ID:     │  │ Room ID:     │       │
│ │ 10_shared    │  │ 50_shared    │  │ 100_shared   │       │
│ │              │  │              │  │              │       │
│ │ Players: 8   │  │ Players: 5   │  │ Players: 3   │       │
│ │ Stakes: 10   │  │ Stakes: 50   │  │ Stakes: 100  │       │
│ │ Pool: 80     │  │ Pool: 250    │  │ Pool: 300    │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│        │                  │                  │              │
│        │ INDEPENDENT       │ INDEPENDENT      │ INDEPENDENT │
│        │ CALCULATION       │ CALCULATION      │ CALCULATION │
│        ↓                  ↓                  ↓              │
│   Winner: 64         Winner: 200        Winner: 240        │
│   House: 16          House: 50          House: 60          │
│                                                              │
│ ✅ NO mixing between Play 10, Play 50, Play 100            │
│ ✅ Each level has its own prize pool calculation            │
│ ✅ Winners get 80% from their specific level only          │
│ ✅ House gets 20% from each level's pool                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Room ID Matching Logic

```
┌──────────────────────────────────────────────────────┐
│ Player Joins Game with gameMode = "50"               │
└────────────────┬─────────────────────────────────────┘
                 │
    ┌────────────┴──────────────┐
    │                           │
    ↓                           ↓
┌──────────────┐         ┌──────────────┐
│ Compute      │         │ Search in    │
│ expected     │         │ existing     │
│ room ID:     │         │ sessions:    │
│              │         │              │
│ = `live_like │         │ for (each    │
│ _bingo_      │         │  sessionId)  │
│ 50_shared`   │         │  {           │
└────────────┬─┘         │   if (...) { │
             │           │   match?     │
             │           │   }          │
             └─────┬─────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   FOUND                   NOT FOUND
        │                     │
        ↓                     ↓
   ┌─────────┐         ┌──────────────┐
   │ Join    │         │ Create new   │
   │ existing│         │ game in that │
   │ game    │         │ room ID      │
   │ (if     │         │              │
   │ waiting)│         │ Save as:     │
   │         │         │ liveGameSes- │
   │         │         │ sions.set(   │
   │         │         │ roomId,      │
   │         │         │ gameObject)  │
   └─────────┘         └──────────────┘
```

## Database Tracking (Optional)

```
┌─────────────────────────────────────────┐
│ GameSession Collection                  │
├─────────────────────────────────────────┤
│ {                                       │
│   _id: ObjectId,                        │
│   gameMode: "50",  ← NEW: Level ID     │
│   gameId: "shared_50_...",              │
│   roomId: "live_like_bingo_50_shared",  │
│   players: [                            │
│     {                                   │
│       telegramId: "123",                │
│       stake: 50                         │
│     },                                  │
│     // ... more players                 │
│   ],                                    │
│   totalStake: 250,     ← NEW: Total    │
│   prizePool: 250,      ← NEW: Pool     │
│   winnerStake: 200,    ← NEW: Winner   │
│   houseShare: 50,      ← NEW: House    │
│   winner: {                             │
│     telegramId: "456",                  │
│     winAmount: 200,                     │
│     timestamp: Date                     │
│   },                                    │
│   state: "finished",                    │
│   createdAt: Date,                      │
│   endedAt: Date                         │
│ }                                       │
└─────────────────────────────────────────┘
```

## Performance Characteristics

```
┌────────────────────────────────────────┐
│ Complexity Analysis                    │
├────────────────────────────────────────┤
│                                        │
│ Player Join:                           │
│   - Find room: O(1) using Map          │
│   - Add player: O(1) Set operation     │
│   - Total: O(1)                        │
│                                        │
│ Calculate Prize:                       │
│   - Sum stakes: O(n) where n = players│
│   - Calculate split: O(1)              │
│   - Total: O(n)                        │
│                                        │
│ Broadcast Win:                         │
│   - Send to all in room: O(n)          │
│   - Update database: O(1)              │
│   - Total: O(n)                        │
│                                        │
│ Memory (per active game):              │
│   - Game object: ~1KB                  │
│   - Per player: ~100 bytes             │
│   - 100 players: ~11KB                 │
│                                        │
└────────────────────────────────────────┘
```

## Key Invariants

```
┌─────────────────────────────────────────────────────────┐
│ System Invariants (Must Always Be True)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Room Isolation:                                     │
│    └─ Game in room X only contains players joined to X  │
│                                                         │
│ 2. Prize Calculation:                                  │
│    └─ winnerAmount + houseShare = totalCollected       │
│                                                         │
│ 3. Distribution:                                       │
│    └─ winnerAmount = 80% of totalCollected (floor)     │
│    └─ houseShare = 20% of totalCollected (remainder)   │
│                                                         │
│ 4. First-Win Rule:                                     │
│    └─ Only first claimant becomes winner               │
│    └─ Others are rejected                              │
│                                                         │
│ 5. Level Separation:                                   │
│    └─ Play 10 pool ≠ Play 20 pool                      │
│    └─ Play 50 pool ≠ Play 100 pool                     │
│    └─ No cross-level financial interactions            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
