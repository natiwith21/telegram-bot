# Multiplayer Bingo Synchronization Fixes

## Problem
All users in a multiplayer Bingo game need to see identical game state:
1. **Same countdown timer** - All players see the exact same countdown
2. **Same current call number** - The called number is displayed in sync across all clients
3. **Same marked numbers** - When one player marks a number, all players see that mark

## Solution Implemented

### 1. **Server-Side Changes (websocket-server.js)**

#### A. Enhanced `handlePlayerMark()` function
- Now tracks marked numbers in the shared game session for each player
- Ensures marked numbers persist when new players join mid-game

```javascript
// Update shared game session when player marks a number
const sharedGame = liveGameSessions.get(roomId);
if (sharedGame && sharedGame.players.has(telegramId)) {
    const player = sharedGame.players.get(telegramId);
    if (!player.markedNumbers) {
        player.markedNumbers = new Set();
    }
    player.markedNumbers.add(number);
}
```

#### B. Updated `joined_shared_mid_game` handler
- Sends all marked numbers from all players to late joiners
- Ensures late joiners see the exact same board state as existing players

```javascript
// Send all marked numbers from all players
const allMarkedNumbers = {};
sharedGame.players.forEach((player, playerId) => {
    if (player.markedNumbers && player.markedNumbers.size > 0) {
        allMarkedNumbers[playerId] = Array.from(player.markedNumbers);
    }
});

sendToUser(telegramId, {
    type: 'joined_shared_mid_game',
    allMarkedNumbers: allMarkedNumbers, // CRITICAL
    serverTime: Date.now() // For sync
});
```

### 2. **Frontend Changes (LikeBingo.jsx)**

#### A. Enhanced Countdown Synchronization
- Added a dedicated countdown interval that ticks down every second
- Prevents countdown from getting out of sync between server broadcasts

```javascript
// Countdown timer for synchronized display (ticks down every second)
useEffect(() => {
    if (!multiplayerCountdown || multiplayerCountdown <= 0) {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        return;
    }

    countdownIntervalRef.current = setInterval(() => {
        setMultiplayerCountdown(prev => Math.max(0, (prev || 0) - 1));
    }, 1000);

    return () => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    };
}, [multiplayerCountdown]);
```

#### B. Handle Mid-Game Sync
- When a player joins mid-game, sync all previously marked numbers from other players

```javascript
case 'joined_shared_mid_game':
    // Sync all marked numbers from other players
    if (lastMessage.allMarkedNumbers) {
        const allMarked = new Set();
        Object.values(lastMessage.allMarkedNumbers).forEach(numbers => {
            numbers.forEach(num => allMarked.add(num));
        });
        setMarkedCells(allMarked);
        console.log(`✅ Synced marked numbers: ${allMarked.size}`);
    }
    break;
```

#### C. Real-Time Mark Broadcasting
- Modified `handleBingoCardClick()` to broadcast marks to all players

```javascript
const handleBingoCardClick = (rowIndex, colIndex, number) => {
    const cellKey = `${rowIndex}-${colIndex}`;

    setMarkedCells(prev => {
        const newMarked = new Set(prev);
        if (newMarked.has(cellKey)) {
            newMarked.delete(cellKey);
        } else {
            newMarked.add(cellKey);
        }
        
        // CRITICAL: Broadcast marked cell to all players
        if (isConnected && sendMessage) {
            sendMessage({
                type: 'player_mark',
                number: cellKey,
                roomId: 'like-bingo-room',
                telegramId: telegramId
            });
        }
        
        return newMarked;
    });
};
```

#### D. Receive and Sync Player Marks
- Added handler for `player_marked` WebSocket messages

```javascript
case 'player_marked':
    // Sync marked cells from other players in real-time
    if (lastMessage.telegramId !== telegramId) {
        console.log(`👤 Player marked cell: ${lastMessage.number}`);
        setMarkedCells(prev => {
            const updated = new Set(prev);
            updated.add(lastMessage.number);
            return updated;
        });
    }
    break;
```

## How It Works

### Countdown Sync Flow
1. Server sends `shared_game_countdown` with `serverTime`
2. Client adjusts for network delay and sets `multiplayerCountdown`
3. Local interval ticks down every 1 second
4. Server continues to send updated countdowns to resync if drift occurs
5. All players see identical countdown numbers

### Current Call Sync Flow
1. Server generates random number
2. Broadcasts `shared_number_called` with `number` and `calledNumbers` array
3. All players receive same array (source of truth from server)
4. Display updated immediately

### Marked Numbers Sync Flow
1. Player clicks a cell
2. Frontend broadcasts `player_mark` message with cell key
3. Server stores mark in shared game session
4. Server broadcasts `player_marked` to all OTHER players
5. All players receive update and mark the cell
6. When new player joins, server sends `allMarkedNumbers` snapshot

## Testing Checklist

- [ ] Open game in 2+ browser windows
- [ ] Verify countdown shows same number in all windows
- [ ] Verify current call number appears instantly in all windows
- [ ] Click a number in one window, verify it marks in all other windows
- [ ] Join mid-game and verify marked numbers appear instantly
- [ ] Test with network delay simulation (Dev Tools > Network > Throttling)

## Server Timestamps

All critical messages now include `serverTime` for client-side drift detection:
- `shared_game_countdown` - includes serverTime for accurate network delay calculation
- `shared_game_will_start` - includes startTime for synchronized game start
- `shared_number_called` - includes serverTime for audit trail
- `joined_shared_mid_game` - includes serverTime for late joiner sync

## Performance Considerations

- Countdown interval only runs when `multiplayerCountdown > 0`
- Marked cells use Sets for O(1) lookup
- Server-side marked numbers tracking uses Maps for efficient player lookup
- Network messages are minimal (only cell keys, not full board)
