# WebSocket & Multiplayer Game Issues - Analysis & Solutions

## Issues Identified

### 1. **Device Gets Stuck During Multiplayer**
**Problem:**
- When multiple players connect from different devices, one device gets stuck/unresponsive
- Game state not synchronizing properly between clients

**Root Causes:**
- Connection state handling in `useWebSocket.js` - reconnection attempts may be conflicting
- No heartbeat mechanism to detect stale connections
- Race conditions when handling multiple WebSocket messages simultaneously

**Solution:**
```javascript
// In useWebSocket.js - improve connection stability
// Add better error recovery and connection validation
- Implement exponential backoff more aggressively
- Add connection health checks
- Validate connection state before sending critical game messages
```

---

### 2. **Game Not Synchronized Across Users**
**Problem:**
- Different players see different numbers or game states
- Numbers appearing at different times on different devices

**Root Causes:**
- Client-side number drawing in demo mode (line 726 in LikeBingo.jsx) - each client draws independently
- No server-side source of truth for number calling in demo/local games
- Using `Date.now()` locally instead of server time

**Solution:**
- Remove local number drawing
- All games (even single-player) should get numbers from server
- Use server timestamp for all game events

---

### 3. **Only First Player to Click Bingo Should Win**
**Problem:**
- Multiple players may receive win confirmation
- Race condition in claim_bingo handling

**Root Causes:**
- `handleBingoClaim` (websocket-server.js line 158-160) broadcasts to all players without checking who claimed first
- No winner lock mechanism
- Game state doesn't prevent multiple simultaneous claims

**Solution:**
```javascript
// In websocket-server.js - improve bingo claim handling
if (sharedGame.winners.length > 0) {
  // Game already has a winner, reject claim
  sendToUser(telegramId, { type: 'error', message: 'Someone already won' });
  return;
}
```

---

### 4. **Numbers Stacking in UI**
**Problem:**
- Called numbers pile up instead of showing cleanly
- Current Call display stacking with countdown

**Root Causes:**
- The `renderCalledNumbersGrid()` function accumulates all numbers
- Layout not clearing previous state properly
- No max-height constraint on number displays

**Solutions:**
1. Limit displayed numbers to last 25
2. Clear state on game reset
3. Implement scrolling for number history

---

## Recommended Fixes (Priority Order)

### Priority 1: Fix Game Synchronization
```javascript
// websocket-server.js - Improve shared number calling
function startSharedNumberCalling(roomId) {
  const sharedGame = liveGameSessions.get(roomId);
  if (!sharedGame || sharedGame.state !== 'playing') return;

  // Generate random number ONCE on server
  const availableNumbers = [];
  for (let i = 1; i <= 75; i++) {
    if (!sharedGame.calledNumbers.includes(i)) {
      availableNumbers.push(i);
    }
  }

  if (availableNumbers.length === 0) {
    endSharedGame(roomId, 'all_numbers_called');
    return;
  }

  // Call only once per interval - ALL clients see same number
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  const calledNumber = availableNumbers[randomIndex];
  
  sharedGame.calledNumbers.push(calledNumber);
  sharedGame.currentCall = calledNumber;

  // Broadcast with server timestamp
  const broadcastTime = Date.now();
  broadcastToLiveGame(roomId, {
    type: 'shared_number_called',
    number: calledNumber,
    calledNumbers: sharedGame.calledNumbers,
    totalCalled: sharedGame.calledNumbers.length,
    currentCall: calledNumber,
    serverTime: broadcastTime,  // Add this
    isSharedSession: true
  });

  console.log(`📢 Shared game ${roomId}: Called ${calledNumber} at ${broadcastTime}`);

  // Schedule next call
  if (sharedGame.calledNumbers.length < 75) {
    sharedGame.numberCallTimer = setTimeout(() => {
      if (sharedGame.state === 'playing') {
        startSharedNumberCalling(roomId);
      }
    }, 3000);  // Fixed 3 second interval
  }
}
```

### Priority 2: Fix Bingo Claim Race Condition
```javascript
// websocket-server.js - Prevent multiple winners
async function handleBingoClaim(telegramId, message) {
  const { roomId, gameMode } = message;
  const sharedGame = liveGameSessions.get(roomId);

  if (!sharedGame) {
    sendToUser(telegramId, {
      type: 'error',
      message: 'Game not found'
    });
    return;
  }

  // CRITICAL: Check if someone already won
  if (sharedGame.winners.length > 0) {
    sendToUser(telegramId, {
      type: 'bingo_claimed',
      winner: sharedGame.winners[0].telegramId,
      message: 'Someone else already won'
    });
    return;
  }

  // Lock the game - set winner immediately
  sharedGame.winners.push({
    telegramId: telegramId,
    claimTime: Date.now(),
    position: 1
  });

  // Broadcast to everyone
  broadcastToLiveGame(roomId, {
    type: 'bingo_claimed',
    winner: telegramId,
    winnerName: 'Winner',
    isFirstToWin: true
  });

  // End game immediately
  endSharedGame(roomId, 'bingo_claimed');
}
```

### Priority 3: Fix UI Number Stacking
```javascript
// In LikeBingo.jsx - renderCalledNumbersGrid
const renderCalledNumbersGrid = () => {
  // Only show last 25 called numbers (5x5 grid)
  const gridNumbers = Array(25).fill(null);
  
  // Get most recent 25 numbers (not all)
  const recentNumbers = drawnNumbers.slice(-25);
  recentNumbers.forEach((num, index) => {
    gridNumbers[index] = num;
  });

  return gridNumbers.map((num, index) => (
    <div
      key={index}
      style={{
        ...styles.calledNumberCell,
        backgroundColor: num ? '#1a2a4a' : '#1a1a2a',
        color: num ? '#fff' : '#555'
      }}
    >
      {num || '-'}
    </div>
  ));
};
```

### Priority 4: Improve Connection Stability
```javascript
// useWebSocket.js - Better connection management
const connect = useCallback(() => {
  if (!telegramId) return;

  try {
    const wsUrl = process.env.NODE_ENV === 'production'
      ? `wss://telegram-bot-u2ni.onrender.com/ws?telegramId=${telegramId}&token=${token}&roomId=${roomId}`
      : `ws://localhost:3002?telegramId=${telegramId}&token=${token}&roomId=${roomId}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      
      // Send validation message
      ws.current.send(JSON.stringify({
        type: 'client_ready',
        clientTime: Date.now()
      }));
    };

    // ... rest of handlers ...
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    setConnectionError('Connection failed');
  }
}, [telegramId, token, roomId]);
```

---

## Testing Checklist

- [ ] Single device: Play demo game, numbers should call properly
- [ ] Two devices: Connect both, click Start Game, verify both see same numbers
- [ ] Winner claim: Only first to click BINGO should win, others should see winner message
- [ ] Number display: Numbers should not stack, only show relevant info
- [ ] Disconnect/Reconnect: Device disconnects and reconnects mid-game
- [ ] Multiple games: Play back-to-back games, verify state resets properly

---

## Server Logs to Monitor

When testing multiplayer, watch for:
```
✅ WebSocket connected
📡 Broadcasted to X players
📢 Shared game called number X
🏁 Shared game ended
⚠️ Connection error patterns
```

If you see "Broadcasted to 0 players", the connection is broken.
