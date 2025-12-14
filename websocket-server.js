const WebSocket = require('ws');
const http = require('http');
const url = require('url');
require('dotenv').config();

// Database and models (with error handling)
let GameSession, Payment, connectDB;
try {
  connectDB = require('./utils/db');
  GameSession = require('./models/GameSession');
  Payment = require('./models/Payment');
  console.log('✅ Database models loaded for WebSocket server');
} catch (error) {
  console.log('⚠️  Database models not available:', error.message);
  console.log('   WebSocket server will run with limited functionality');
}

// Connect to database (if available and not already connected)
if (connectDB && process.env.MONGODB_URI) {
  try {
    connectDB();
    console.log('🔗 WebSocket server connecting to database...');
  } catch (error) {
    console.log('⚠️  WebSocket database connection failed:', error.message);
  }
} else {
  console.log('⚠️  Database connection not available for WebSocket server');
}

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store active connections
const connections = new Map();
const gameRooms = new Map(); // For multiplayer Bingo rooms

// Multiplayer countdown management
const countdownRooms = new Map(); // Track countdowns for different rooms
const countdownIntervals = new Map(); // Track countdown intervals

// Global synchronized game sessions
const globalGameSessions = new Map(); // Track global game sessions
const liveGameSessions = new Map(); // Track live shared game sessions (immediate start)
const gameScheduler = {
  nextGameTime: null,
  currentGame: null,
  gameInterval: 5 * 60 * 1000, // 5 minutes between games
  gameTimer: null,
  countdownTimer: null
};

// Live game configuration
const LIVE_GAME_CONFIG = {
  waitTime: 30000, // 30 seconds wait for players before starting
  numberCallInterval: 3000, // 3 seconds between number calls
  maxNumbers: 75, // Maximum numbers to call (1-75 for Bingo)
  roomPrefix: 'live_like_bingo_'
};

// Connection handler
wss.on('connection', (ws, request) => {
  const query = url.parse(request.url, true).query;
  const telegramId = query.telegramId;
  const token = query.token;
  const roomId = query.roomId || 'default';
  
  console.log(`WebSocket connection from user ${telegramId}`);
  
  // Store connection
  if (telegramId) {
    connections.set(telegramId, { ws, token, roomId });
    
    // Add to game room for multiplayer Bingo
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, new Set());
    }
    gameRooms.get(roomId).add(telegramId);
  }
  
  // Send welcome message with current game info
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connected successfully',
    nextGameTime: gameScheduler.nextGameTime,
    currentGame: gameScheduler.currentGame ? {
      id: gameScheduler.currentGame.id,
      isActive: gameScheduler.currentGame.isActive,
      calledNumbers: gameScheduler.currentGame.calledNumbers,
      playersCount: gameScheduler.currentGame.players.size
    } : null
  }));
  
  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      await handleMessage(ws, telegramId, message);
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log(`WebSocket disconnected for user ${telegramId}`);
    connections.delete(telegramId);
    
    // Remove from game room
    if (gameRooms.has(roomId)) {
      gameRooms.get(roomId).delete(telegramId);
      if (gameRooms.get(roomId).size === 0) {
        gameRooms.delete(roomId);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle incoming messages
async function handleMessage(ws, telegramId, message) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    case 'check_payment_status':
      await checkPaymentStatus(ws, telegramId, message.gameMode);
      break;
      
    case 'join_bingo_room':
      await joinBingoRoom(ws, telegramId, message.roomId, message.token);
      break;
      
    case 'bingo_number_call':
      await handleBingoNumberCall(telegramId, message.roomId, message.number);
      break;
      
    case 'player_mark':
      await handlePlayerMark(telegramId, message.roomId, message.number);
      break;
      
    case 'bingo_win':
      await handleBingoWin(telegramId, message.roomId, message.pattern);
      break;
      
    case 'start_multiplayer_game':
      await handleStartMultiplayerGame(telegramId, message);
      break;
      
    case 'claim_bingo':
      await handleBingoClaim(telegramId, message);
      break;
    case 'game_limit_reached':
      await handleGameLimitReached(telegramId, message);
      break;
      
    case 'join_global_game':
      await handleJoinGlobalGame(ws, telegramId, message);
      break;
      
    case 'request_game_schedule':
      await handleRequestGameSchedule(ws, telegramId);
      break;
      
    case 'global_game_win':
      await handleGlobalGameWin(telegramId, message.gameId, message.winPattern);
      break;
      
    case 'start_live_game':
      await handleStartLiveGame(ws, telegramId, message);
      break;
      
    case 'join_live_game':
      await handleJoinLiveGame(ws, telegramId, message);
      break;
      
    case 'claim_live_bingo':
      await handleClaimLiveBingo(telegramId, message);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

// Check payment status
async function checkPaymentStatus(ws, telegramId, gameMode) {
  if (!Payment) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Payment system not available'
    }));
    return;
  }
  
  try {
    const payment = await Payment.findOne({
      telegramId,
      gameMode,
      status: { $in: ['pending', 'paid_waiting', 'verified', 'rejected'] }
    }).sort({ createdAt: -1 });
    
    if (payment) {
      ws.send(JSON.stringify({
        type: 'payment_status',
        status: payment.status,
        gameMode: payment.gameMode,
        amount: payment.amount,
        paymentId: payment._id.toString().substr(-8)
      }));
    }
  } catch (error) {
    console.error('Payment status check error:', error);
  }
}

// Join Bingo room (for multiplayer)
async function joinBingoRoom(ws, telegramId, roomId, token) {
  try {
    // Validate token
    const session = await GameSession.findOne({
      sessionToken: token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!session) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid session token'
      }));
      return;
    }
    
    // Add to room
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, new Set());
    }
    gameRooms.get(roomId).add(telegramId);
    
    // Notify room members
    broadcastToRoom(roomId, {
      type: 'player_joined',
      telegramId: telegramId,
      playersCount: gameRooms.get(roomId).size
    });
    
    ws.send(JSON.stringify({
      type: 'room_joined',
      roomId: roomId,
      playersCount: gameRooms.get(roomId).size
    }));
    
  } catch (error) {
    console.error('Join room error:', error);
  }
}

// Handle Bingo number call (for multiplayer)
async function handleBingoNumberCall(callerTelegramId, roomId, number) {
  broadcastToRoom(roomId, {
    type: 'bingo_number_called',
    number: number,
    caller: callerTelegramId
  });
}

// Handle player mark (for multiplayer awareness)
async function handlePlayerMark(telegramId, roomId, number) {
  // Also update the shared game session if it exists
  const sharedGame = liveGameSessions.get(roomId);
  if (sharedGame && sharedGame.players.has(telegramId)) {
    const player = sharedGame.players.get(telegramId);
    if (!player.markedNumbers) {
      player.markedNumbers = new Set();
    }
    player.markedNumbers.add(number);
  }
  
  broadcastToRoom(roomId, {
    type: 'player_marked',
    telegramId: telegramId,
    number: number
  }, [telegramId]); // Exclude the player who marked
}

// Handle Bingo win announcement
async function handleBingoWin(telegramId, roomId, pattern) {
  broadcastToRoom(roomId, {
    type: 'bingo_win',
    winner: telegramId,
    pattern: pattern
  });
}

// Broadcast message to all players in a room
function broadcastToRoom(roomId, message, excludeUsers = []) {
  if (!gameRooms.has(roomId)) return;
  
  gameRooms.get(roomId).forEach(telegramId => {
    if (excludeUsers.includes(telegramId)) return;
    
    const connection = connections.get(telegramId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  });
}

// Send message to specific user
function sendToUser(telegramId, message) {
  const connection = connections.get(telegramId);
  if (connection && connection.ws.readyState === WebSocket.OPEN) {
    connection.ws.send(JSON.stringify(message));
  }
}

// Send payment verification notification
function notifyPaymentVerified(telegramId, gameMode, sessionToken) {
  sendToUser(telegramId, {
    type: 'payment_verified',
    gameMode: gameMode,
    sessionToken: sessionToken,
    message: `Your payment for Bingo ${gameMode} has been verified! You can now access the game.`
  });
}

// Send payment rejection notification
function notifyPaymentRejected(telegramId, gameMode, reason) {
  sendToUser(telegramId, {
    type: 'payment_rejected',
    gameMode: gameMode,
    reason: reason,
    message: `Your payment for Bingo ${gameMode} could not be verified.`
  });
}

// Admin notification for new payment
function notifyAdminsNewPayment(paymentData) {
  // In a real implementation, you'd have admin connections
  // For now, we'll export this function to be called from the bot
  console.log('New payment notification:', paymentData);
}

// Calculate prize pool for a game level - with validation
function calculatePrizePool(sharedGame, expectedGameMode = null) {
  // CRITICAL: Validate all players have matching game mode
  if (expectedGameMode) {
    for (const [playerId, player] of sharedGame.players.entries()) {
      if (player.gameMode !== expectedGameMode) {
        console.error(`⚠️  POOL VALIDATION ERROR: Player ${playerId} game mode (${player.gameMode}) doesn't match expected (${expectedGameMode})`);
      }
    }
  }
  
  // CRITICAL: Validate all stakes match the game mode
  const validStakes = { '10': 10, '20': 20, '50': 50, '100': 100, 'demo': 0 };
  const expectedStake = validStakes[sharedGame.gameMode];
  
  let totalStake = 0;
  for (const [playerId, player] of sharedGame.players.entries()) {
    const playerStake = player.stake || 0;
    
    // Check stake matches game mode
    if (playerStake !== expectedStake) {
      console.warn(`⚠️  STAKE VALIDATION: Player ${playerId} stake ${playerStake} doesn't match mode ${sharedGame.gameMode} (expected ${expectedStake})`);
      // Still count it but log it
    }
    totalStake += playerStake;
  }
  
  // Prize pool is 100% of what was collected from THIS level
  const prizePool = totalStake;
  const winnerPool = Math.floor(prizePool * 0.80);  // 80% to winner
  const houseShare = prizePool - winnerPool;        // 20% to house
  
  return {
    totalStake,
    prizePool,
    winnerPool,
    houseShare,
    playerCount: sharedGame.players.size
  };
}

// Handle multiplayer game start
async function handleStartMultiplayerGame(telegramId, message) {
  const { roomId = 'like-bingo-room', selectedNumbers, stake, token, gameMode } = message;
  
  try {
    console.log(`🎮 ${telegramId} starting/joining shared multiplayer game in room ${roomId} - Mode: ${gameMode}`);
    
    // CRITICAL: Use level-specific room to isolate game pools
    const levelSpecificRoomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}_shared`;
    
    // Add player to level-specific room
    if (!gameRooms.has(levelSpecificRoomId)) {
      gameRooms.set(levelSpecificRoomId, new Set());
    }
    gameRooms.get(levelSpecificRoomId).add(telegramId);
    
    // Check if there's already an active shared game session for THIS game level
    let sharedGame = null;
    for (const [sessionRoomId, session] of liveGameSessions.entries()) {
      // CRITICAL: Only match games from the SAME game level
      if (sessionRoomId === levelSpecificRoomId && (session.state === 'waiting' || session.state === 'playing')) {
        sharedGame = session;
        break;
      }
    }
    
    if (sharedGame) {
      // Join existing shared game session
      if (sharedGame.state === 'waiting') {
          // Game is in waiting state - join the waiting room
          sharedGame.players.set(telegramId, {
            selectedNumbers: selectedNumbers || [],
            markedNumbers: new Set(),
            hasWon: false,
            stake: stake,
            gameMode: gameMode  // CRITICAL: Store game mode for validation
          });
        
        const countdown = Math.max(0, Math.ceil((sharedGame.startTime - Date.now()) / 1000));
        
        // CRITICAL: Ensure all users see EXACT same countdown
        const serverTime = Date.now();
        const syncMessage = {
          countdown: countdown,
          serverTime: serverTime,
          startTime: sharedGame.startTime,
          playersCount: sharedGame.players.size
        };
        
        // Notify all players about new player joining with SYNCHRONIZED countdown
        broadcastToLiveGame(sharedGame.roomId, {
          type: 'player_joined_shared_waiting',
          telegramId: telegramId,
          ...syncMessage
        });
        
        sendToUser(telegramId, {
          type: 'joined_shared_waiting',
          gameId: sharedGame.id,
          roomId: sharedGame.roomId,
          ...syncMessage
        });
        
      } else if (sharedGame.state === 'playing') {
      // Game is already running - join mid-game
      sharedGame.players.set(telegramId, {
      selectedNumbers: selectedNumbers || [],
      markedNumbers: new Set(),
      hasWon: false,
      stake: stake,
      gameMode: gameMode  // CRITICAL: Store game mode for validation
      });
      
      // Calculate next game countdown (estimate time until current game ends)
      const estimatedGameDuration = 20 * 3000; // 20 numbers * 3 seconds each
      const gameElapsed = Date.now() - (sharedGame.startTime - 30000); // Subtract waiting time
      const nextGameTime = Math.max(0, estimatedGameDuration - gameElapsed) + 60000; // Add 1 minute buffer
      const nextGameCountdown = Math.ceil(nextGameTime / 1000);
      
      // CRITICAL: Send all marked numbers from all players so late joiner sees same board state
      const allMarkedNumbers = {};
      sharedGame.players.forEach((player, playerId) => {
      if (player.markedNumbers && player.markedNumbers.size > 0) {
        allMarkedNumbers[playerId] = Array.from(player.markedNumbers);
      }
      });
      
      sendToUser(telegramId, {
        type: 'joined_shared_mid_game',
        gameId: sharedGame.id,
        roomId: sharedGame.roomId,
      calledNumbers: sharedGame.calledNumbers,
      currentCall: sharedGame.currentCall,
      playersCount: sharedGame.players.size,
        nextGameCountdown: 'wait', // Show "wait" for late joiners
          allMarkedNumbers: allMarkedNumbers, // CRITICAL: Send all marked numbers from all players
           serverTime: Date.now() // For client-side synchronization
         });
         
         // Notify other players
         broadcastToLiveGame(sharedGame.roomId, {
           type: 'player_joined_shared_mid_game',
           telegramId: telegramId,
           playersCount: sharedGame.players.size
         }, [telegramId]);
       }
    } else {
      // Create new shared game session
      const gameId = `shared_${gameMode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newRoomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}_shared`;
      const startTime = Date.now() + LIVE_GAME_CONFIG.waitTime;
      
      const newSharedGame = {
        id: gameId,
        roomId: newRoomId,
        gameMode: gameMode,
        state: 'waiting',
        players: new Map([[telegramId, {
          selectedNumbers: selectedNumbers || [],
          markedNumbers: new Set(),
          hasWon: false,
          stake: stake,
          gameMode: gameMode  // CRITICAL: Store game mode for validation
        }]]),
        calledNumbers: [],
        currentCall: null,
        startTime: startTime,
        creator: telegramId,
        numberCallTimer: null,
        countdownTimer: null,
        winners: [],
        isSharedSession: true
      };
      
      liveGameSessions.set(newRoomId, newSharedGame);
      
      // Add to game rooms
      if (!gameRooms.has(newRoomId)) {
        gameRooms.set(newRoomId, new Set());
      }
      gameRooms.get(newRoomId).add(telegramId);
      
      // Start countdown timer with proper synchronization
      console.log(`⏰ Starting countdown timer for room ${newRoomId}. Will wait ${LIVE_GAME_CONFIG.waitTime / 1000} seconds`);
      
      const countdownTimer = setInterval(() => {
        const currentTime = Date.now();
        const timeLeft = Math.max(0, Math.floor((startTime - currentTime) / 1000));
        
        console.log(`⏱️ Countdown tick: ${timeLeft}s remaining (elapsed: ${Math.floor((currentTime - (startTime - LIVE_GAME_CONFIG.waitTime)) / 1000)}s)`);
        
        if (timeLeft <= 0) {
          clearInterval(countdownTimer);
          newSharedGame.countdownTimer = null;
          console.log(`⏰ Countdown finished for room ${newRoomId}. Starting game in 1 second...`);
          
          // CRITICAL: Add buffer time to ensure all clients are synchronized
          setTimeout(() => startSharedGamePlay(newRoomId), 1000);
        } else {
          // Broadcast synchronized countdown with server timestamp
          // Send to ALL players in the room
          broadcastToLiveGame(newRoomId, {
            type: 'shared_game_countdown',
            countdown: timeLeft,
            serverTime: currentTime,
            startTime: startTime,
            playersCount: newSharedGame.players.size,
            gameId: newSharedGame.id
          });
        }
      }, 1000);
      
      newSharedGame.countdownTimer = countdownTimer;
      console.log(`✅ Countdown interval started, broadcasting every 1 second`);
      
      // Notify creator with server time for sync
      sendToUser(telegramId, {
        type: 'shared_game_created',
        gameId: gameId,
        roomId: newRoomId,
        countdown: Math.ceil(LIVE_GAME_CONFIG.waitTime / 1000),
        serverTime: Date.now(),
        startTime: startTime,
        playersCount: 1
      });
      
      console.log(`✅ Shared game ${gameId} created in room ${newRoomId}`);
    }
    
  } catch (error) {
    console.error('Shared multiplayer game start error:', error);
    sendToUser(telegramId, {
      type: 'error',
      message: 'Failed to start shared multiplayer game'
    });
  }
}

// Handle Bingo claim
async function handleBingoClaim(telegramId, message) {
  const { roomId = 'like-bingo-room' } = message;
  
  try {
    // Check if game is active
    if (!gameRooms.has(roomId)) {
      sendToUser(telegramId, {
        type: 'error',
        message: 'No active game found'
      });
      return;
    }
    
    // Check if this is the first claim
    if (countdownIntervals.has(roomId)) {
      // Game is still running, this is a valid claim
      
      // Stop the game
      const interval = countdownIntervals.get(roomId);
      if (interval) {
        clearTimeout(interval);
        countdownIntervals.delete(roomId);
      }
      
      // Get user info for winner announcement
      let winnerName = 'Unknown Player';
      try {
        const User = require('./models/User');
        const user = await User.findOne({ telegramId });
        if (user) {
          winnerName = user.name;
        }
      } catch (error) {
        console.log('Could not fetch user name:', error.message);
      }
      
      // Notify all players about the winner
      broadcastToRoom(roomId, {
        type: 'bingo_claimed',
        winner: telegramId,
        winnerName: winnerName,
        message: `${winnerName} claimed Bingo first!`
      });
      
      console.log(`🎉 Bingo claimed by ${telegramId} (${winnerName})`);
      
    } else {
      // Game already ended
      sendToUser(telegramId, {
        type: 'error',
        message: 'Game has already ended'
      });
    }
    
  } catch (error) {
    console.error('Bingo claim error:', error);
    sendToUser(telegramId, {
      type: 'error',
      message: 'Failed to process Bingo claim'
    });
  }
}

// Handle game limit reached (20 numbers called)
async function handleGameLimitReached(telegramId, message) {
  const { roomId = 'like-bingo-room' } = message;
  
  try {
    // Check if game is active
    if (!gameRooms.has(roomId)) {
      sendToUser(telegramId, {
        type: 'error',
        message: 'No active game found'
      });
      return;
    }
    
    // Stop any active game timers
    if (countdownIntervals.has(roomId)) {
      const interval = countdownIntervals.get(roomId);
      if (interval) {
        clearTimeout(interval);
        countdownIntervals.delete(roomId);
      }
    }
    
    // Notify all players that game ended due to 20-number limit
    broadcastToRoom(roomId, {
      type: 'game_end',
      reason: 'limit_reached',
      message: 'Game ended - All 20 numbers have been called!'
    });
    
    console.log(`🎯 Game limit reached in room ${roomId} - 20 numbers called`);
    
  } catch (error) {
    console.error('Game limit reached error:', error);
    sendToUser(telegramId, {
      type: 'error',
      message: 'Failed to process game end'
    });
  }
}

// Global synchronized game functions
async function initializeGameScheduler() {
  // Schedule next game
  scheduleNextGame();
  console.log('🎯 Global Bingo Game Scheduler initialized');
  
  // Send periodic updates about next game time to all connected players
  setInterval(() => {
    if (gameScheduler.nextGameTime && !gameScheduler.currentGame?.isActive) {
      broadcastToAllUsers({
        type: 'next_game_update',
        nextGameTime: gameScheduler.nextGameTime,
        timeUntilGame: gameScheduler.nextGameTime - Date.now()
      });
    }
  }, 10000); // Update every 10 seconds
}

function scheduleNextGame() {
  const now = Date.now();
  gameScheduler.nextGameTime = now + gameScheduler.gameInterval;
  
  // Clear existing timers
  if (gameScheduler.gameTimer) clearTimeout(gameScheduler.gameTimer);
  if (gameScheduler.countdownTimer) clearInterval(gameScheduler.countdownTimer);
  
  // Start countdown 30 seconds before game
  const countdownStart = gameScheduler.nextGameTime - 30000;
  const timeUntilCountdown = countdownStart - now;
  
  if (timeUntilCountdown > 0) {
    gameScheduler.gameTimer = setTimeout(() => {
      startGameCountdown();
    }, timeUntilCountdown);
  } else {
    // Start countdown immediately if we're within 30 seconds
    startGameCountdown();
  }
  
  // Broadcast next game time to all connected players
  broadcastToAllUsers({
    type: 'next_game_scheduled',
    nextGameTime: gameScheduler.nextGameTime,
    timeUntilGame: gameScheduler.nextGameTime - now
  });
}

function startGameCountdown() {
  let countdown = 30;
  
  gameScheduler.countdownTimer = setInterval(() => {
    broadcastToAllUsers({
      type: 'game_countdown',
      countdown: countdown,
      message: `Global Bingo Game starting in ${countdown} seconds!`
    });
    
    countdown--;
    
    if (countdown < 0) {
      clearInterval(gameScheduler.countdownTimer);
      startGlobalGame();
    }
  }, 1000);
}

function startGlobalGame() {
  const gameId = `global_${Date.now()}`;
  const gameSession = {
    id: gameId,
    startTime: Date.now(),
    players: new Set(),
    calledNumbers: [],
    isActive: true,
    winners: [],
    gameType: 'bingo'
  };
  
  globalGameSessions.set(gameId, gameSession);
  gameScheduler.currentGame = gameSession;
  
  // Broadcast game start to all users
  broadcastToAllUsers({
    type: 'global_game_started',
    gameId: gameId,
    startTime: gameSession.startTime,
    message: 'Global Bingo Game has started! Join now!'
  });
  
  // Start number calling every 3 seconds
  startNumberCalling(gameId);
  
  // Schedule next game immediately
  scheduleNextGame();
  
  console.log(`🎯 Global Bingo Game ${gameId} started`);
}

function startNumberCalling(gameId) {
  const session = globalGameSessions.get(gameId);
  if (!session || !session.isActive) return;
  
  const availableNumbers = [];
  for (let i = 1; i <= 75; i++) {
    if (!session.calledNumbers.includes(i)) {
      availableNumbers.push(i);
    }
  }
  
  if (availableNumbers.length === 0) {
    endGlobalGame(gameId, 'all_numbers_called');
    return;
  }
  
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  const calledNumber = availableNumbers[randomIndex];
  session.calledNumbers.push(calledNumber);
  
  // Broadcast called number to all players in this game
  broadcastToAllUsers({
    type: 'global_number_called',
    gameId: gameId,
    number: calledNumber,
    calledNumbers: session.calledNumbers,
    totalCalled: session.calledNumbers.length
  });
  
  // Continue calling numbers every 3 seconds
  setTimeout(() => {
    if (session.isActive && session.calledNumbers.length < 75) {
      startNumberCalling(gameId);
    }
  }, 3000);
}

function endGlobalGame(gameId, reason = 'completed') {
  const session = globalGameSessions.get(gameId);
  if (!session) return;
  
  session.isActive = false;
  
  broadcastToAllUsers({
    type: 'global_game_ended',
    gameId: gameId,
    reason: reason,
    winners: Array.from(session.winners),
    totalPlayers: session.players.size,
    calledNumbers: session.calledNumbers
  });
  
  console.log(`🎯 Global Bingo Game ${gameId} ended. Reason: ${reason}`);
  
  // Clean up after 5 minutes
  setTimeout(() => {
    globalGameSessions.delete(gameId);
    if (gameScheduler.currentGame?.id === gameId) {
      gameScheduler.currentGame = null;
    }
  }, 5 * 60 * 1000);
}

async function handleJoinGlobalGame(ws, telegramId, message) {
  const { gameMode, token } = message;
  
  // Validate session for paid games
  if (gameMode !== 'demo' && token) {
    try {
      const session = await GameSession.findOne({
        sessionToken: token,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid session token'
        }));
        return;
      }
    } catch (error) {
      console.error('Session validation error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Session validation failed'
      }));
      return;
    }
  }
  
  // Add player to current global game or notify about next game
  if (gameScheduler.currentGame && gameScheduler.currentGame.isActive) {
    gameScheduler.currentGame.players.add(telegramId);
    
    ws.send(JSON.stringify({
      type: 'global_game_joined',
      gameId: gameScheduler.currentGame.id,
      playersCount: gameScheduler.currentGame.players.size,
      calledNumbers: gameScheduler.currentGame.calledNumbers,
      gameMode: gameMode,
      nextGameTime: gameScheduler.nextGameTime,
      timeUntilNextGame: gameScheduler.nextGameTime ? gameScheduler.nextGameTime - Date.now() : null
    }));
  } else {
    // No active game, send info about next game
    ws.send(JSON.stringify({
      type: 'waiting_for_next_game',
      nextGameTime: gameScheduler.nextGameTime,
      timeUntilGame: gameScheduler.nextGameTime ? gameScheduler.nextGameTime - Date.now() : null,
      gameMode: gameMode
    }));
  }
}

async function handleRequestGameSchedule(ws, telegramId) {
  const now = Date.now();
  const response = {
    type: 'game_schedule',
    currentGame: gameScheduler.currentGame ? {
      id: gameScheduler.currentGame.id,
      isActive: gameScheduler.currentGame.isActive,
      playersCount: gameScheduler.currentGame.players.size,
      calledNumbers: gameScheduler.currentGame.calledNumbers,
      startTime: gameScheduler.currentGame.startTime
    } : null,
    nextGameTime: gameScheduler.nextGameTime,
    timeUntilNextGame: gameScheduler.nextGameTime ? gameScheduler.nextGameTime - now : null,
    gameInterval: gameScheduler.gameInterval
  };
  
  ws.send(JSON.stringify(response));
}

function broadcastToAllUsers(message) {
  connections.forEach((connection, telegramId) => {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  });
}

// Handle global game win claim
async function handleGlobalGameWin(telegramId, gameId, winPattern) {
  const session = globalGameSessions.get(gameId);
  if (!session || !session.isActive) {
    sendToUser(telegramId, {
      type: 'error',
      message: 'Game not active'
    });
    return;
  }
  
  // Add to winners if not already there
  if (!session.winners.includes(telegramId)) {
    session.winners.push(telegramId);
    
    // Get user name
    let winnerName = 'Unknown Player';
    try {
      const User = require('./models/User');
      const user = await User.findOne({ telegramId });
      if (user) {
        winnerName = user.name;
      }
    } catch (error) {
      console.log('Could not fetch user name:', error.message);
    }
    
    // Broadcast win to all users
    broadcastToAllUsers({
      type: 'global_game_win',
      gameId: gameId,
      winner: telegramId,
      winnerName: winnerName,
      winPattern: winPattern,
      position: session.winners.length
    });
    
    console.log(`🎉 Global game win by ${telegramId} (${winnerName}) - Position: ${session.winners.length}`);
  }
}

// ==================== LIVE SHARED GAME FUNCTIONS ====================

// Handle starting a new live shared game
async function handleStartLiveGame(ws, telegramId, message) {
  const { gameMode, stake, token } = message;
  const roomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}`;
  
  try {
    console.log(`🎮 Starting live game for ${telegramId} in room ${roomId}`);
    
    // Check if there's already an active game in this room
    if (liveGameSessions.has(roomId)) {
      const existingGame = liveGameSessions.get(roomId);
      if (existingGame.state === 'playing') {
        // Join existing game instead
        await handleJoinLiveGame(ws, telegramId, message);
        return;
      } else if (existingGame.state === 'waiting') {
        // Join the waiting room
        existingGame.players.set(telegramId, {
          selectedNumbers: [],
          markedNumbers: new Set(),
          hasWon: false,
          stake: stake
        });
        
        // Notify all players about new player
        broadcastToLiveGame(roomId, {
          type: 'player_joined_waiting',
          telegramId: telegramId,
          playersCount: existingGame.players.size,
          countdown: Math.ceil((existingGame.startTime - Date.now()) / 1000)
        });
        
        ws.send(JSON.stringify({
          type: 'joined_waiting_room',
          roomId: roomId,
          playersCount: existingGame.players.size,
          countdown: Math.ceil((existingGame.startTime - Date.now()) / 1000)
        }));
        return;
      }
    }
    
    // Create new live game session
    const gameId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now() + LIVE_GAME_CONFIG.waitTime;
    
    const liveGame = {
      id: gameId,
      roomId: roomId,
      gameMode: gameMode,
      state: 'waiting', // 'waiting', 'playing', 'finished'
      players: new Map([[telegramId, {
        selectedNumbers: [],
        markedNumbers: new Set(),
        hasWon: false,
        stake: stake
      }]]),
      calledNumbers: [],
      currentCall: null,
      startTime: startTime,
      creator: telegramId,
      numberCallTimer: null,
      winners: []
    };
    
    liveGameSessions.set(roomId, liveGame);
    
    // Add players to room
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, new Set());
    }
    gameRooms.get(roomId).add(telegramId);
    
    // Start countdown timer
    const countdownTimer = setInterval(() => {
      const timeLeft = Math.ceil((startTime - Date.now()) / 1000);
      
      if (timeLeft <= 0) {
        clearInterval(countdownTimer);
        startLiveGamePlay(roomId);
      } else {
        broadcastToLiveGame(roomId, {
          type: 'game_countdown',
          countdown: timeLeft,
          playersCount: liveGame.players.size
        });
      }
    }, 1000);
    
    liveGame.countdownTimer = countdownTimer;
    
    // Notify creator
    ws.send(JSON.stringify({
      type: 'live_game_created',
      gameId: gameId,
      roomId: roomId,
      countdown: Math.ceil(LIVE_GAME_CONFIG.waitTime / 1000),
      playersCount: 1
    }));
    
    console.log(`✅ Live game ${gameId} created in room ${roomId}`);
    
  } catch (error) {
    console.error('Error starting live game:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to start live game'
    }));
  }
}

// Handle joining an existing live game
async function handleJoinLiveGame(ws, telegramId, message) {
  const { gameMode, stake, token } = message;
  const roomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}`;
  
  try {
    console.log(`🎯 ${telegramId} joining live game in room ${roomId}`);
    
    const liveGame = liveGameSessions.get(roomId);
    
    if (!liveGame) {
      ws.send(JSON.stringify({
        type: 'no_live_game',
        message: 'No active live game found. Start a new one!',
        countdown: null
      }));
      return;
    }
    
    // Add player to game room
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, new Set());
    }
    gameRooms.get(roomId).add(telegramId);
    
    if (liveGame.state === 'waiting') {
      // Join waiting room
      liveGame.players.set(telegramId, {
        selectedNumbers: [],
        markedNumbers: new Set(),
        hasWon: false,
        stake: stake
      });
      
      const countdown = Math.ceil((liveGame.startTime - Date.now()) / 1000);
      
      // Notify all players
      broadcastToLiveGame(roomId, {
        type: 'player_joined_waiting',
        telegramId: telegramId,
        playersCount: liveGame.players.size,
        countdown: countdown
      });
      
      ws.send(JSON.stringify({
        type: 'joined_waiting_room',
        roomId: roomId,
        playersCount: liveGame.players.size,
        countdown: countdown
      }));
      
    } else if (liveGame.state === 'playing') {
      // Join game in progress
      liveGame.players.set(telegramId, {
        selectedNumbers: [],
        markedNumbers: new Set(),
        hasWon: false,
        stake: stake
      });
      
      // Calculate time until next game (since this game is already running)
      const nextGameTime = Date.now() + 5 * 60 * 1000; // Estimate 5 minutes
      
      ws.send(JSON.stringify({
        type: 'joined_mid_game',
        roomId: roomId,
        playersCount: liveGame.players.size,
        calledNumbers: liveGame.calledNumbers,
        currentCall: liveGame.currentCall,
        nextGameCountdown: Math.ceil((nextGameTime - Date.now()) / 1000)
      }));
      
      // Notify other players
      broadcastToLiveGame(roomId, {
        type: 'player_joined_mid_game',
        telegramId: telegramId,
        playersCount: liveGame.players.size
      }, [telegramId]);
      
    } else {
      ws.send(JSON.stringify({
        type: 'game_finished',
        message: 'Game has already finished'
      }));
    }
    
  } catch (error) {
    console.error('Error joining live game:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join live game'
    }));
  }
}

// Start the actual live game play
function startLiveGamePlay(roomId) {
  const liveGame = liveGameSessions.get(roomId);
  if (!liveGame) return;
  
  console.log(`🎯 Starting live game play in room ${roomId} with ${liveGame.players.size} players`);
  
  liveGame.state = 'playing';
  liveGame.calledNumbers = [];
  liveGame.currentCall = null;
  
  // Notify all players that game is starting
  broadcastToLiveGame(roomId, {
    type: 'live_game_started',
    gameId: liveGame.id,
    playersCount: liveGame.players.size
  });
  
  // Start calling numbers
  startLiveNumberCalling(roomId);
}

// Start shared game play (same as live game but with shared session flag)
function startSharedGamePlay(roomId) {
  const sharedGame = liveGameSessions.get(roomId);
  if (!sharedGame) return;
  
  console.log(`🎯 Starting shared game play in room ${roomId} with ${sharedGame.players.size} players`);
  
  // CRITICAL: Set exact start time for all players
  const gameStartTime = Date.now() + 3000; // 3 second buffer for synchronization
  sharedGame.actualStartTime = gameStartTime;
  
  // First, notify all players game will start with exact timestamp
  broadcastToLiveGame(roomId, {
    type: 'shared_game_will_start',
    gameId: sharedGame.id,
    startTime: gameStartTime,
    countdown: 3,
    playersCount: sharedGame.players.size,
    serverTime: Date.now()
  });
  
  // Start actual gameplay after exact delay
  setTimeout(() => {
    sharedGame.state = 'playing';
    sharedGame.calledNumbers = [];
    sharedGame.currentCall = null;
    
    // Notify all players that shared game is starting NOW
    broadcastToLiveGame(roomId, {
      type: 'shared_game_started',
      gameId: sharedGame.id,
      exactStartTime: Date.now(),
      playersCount: sharedGame.players.size,
      isSharedSession: true
    });
    
    // Start calling numbers for shared session
    startSharedNumberCalling(roomId);
  }, 3000);
}

// Handle number calling for live games
function startLiveNumberCalling(roomId) {
  const liveGame = liveGameSessions.get(roomId);
  if (!liveGame || liveGame.state !== 'playing') return;
  
  // Generate available numbers (1-75)
  const availableNumbers = [];
  for (let i = 1; i <= LIVE_GAME_CONFIG.maxNumbers; i++) {
    if (!liveGame.calledNumbers.includes(i)) {
      availableNumbers.push(i);
    }
  }
  
  if (availableNumbers.length === 0) {
    endLiveGame(roomId, 'all_numbers_called');
    return;
  }
  
  // Call random number
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  const calledNumber = availableNumbers[randomIndex];
  
  liveGame.calledNumbers.push(calledNumber);
  liveGame.currentCall = calledNumber;
  
  // Broadcast to all players
  broadcastToLiveGame(roomId, {
    type: 'live_number_called',
    number: calledNumber,
    calledNumbers: liveGame.calledNumbers,
    totalCalled: liveGame.calledNumbers.length
  });
  
  console.log(`📢 Live game ${roomId}: Called number ${calledNumber} (${liveGame.calledNumbers.length}/75)`);
  
  // Schedule next number call
  liveGame.numberCallTimer = setTimeout(() => {
    if (liveGame.state === 'playing') {
      startLiveNumberCalling(roomId);
    }
  }, LIVE_GAME_CONFIG.numberCallInterval);
}

// Handle number calling for shared games (identical results for all players)
function startSharedNumberCalling(roomId) {
const sharedGame = liveGameSessions.get(roomId);
if (!sharedGame || sharedGame.state !== 'playing') return;

// Generate available numbers (1-75)
const availableNumbers = [];
for (let i = 1; i <= LIVE_GAME_CONFIG.maxNumbers; i++) {
if (!sharedGame.calledNumbers.includes(i)) {
availableNumbers.push(i);
}
}

if (availableNumbers.length === 0 || sharedGame.calledNumbers.length >= 20) {
endSharedGame(roomId, 'all_numbers_called');
return;
}

// Call random number - this will be the SAME for all players in the shared session
const randomIndex = Math.floor(Math.random() * availableNumbers.length);
const calledNumber = availableNumbers[randomIndex];

sharedGame.calledNumbers.push(calledNumber);
sharedGame.currentCall = calledNumber;

// Get exact server time for synchronization
const serverTime = Date.now();

// Broadcast to all players - they all see the same number at the same time
// Include server time for client-side synchronization
broadcastToLiveGame(roomId, {
type: 'shared_number_called',
number: calledNumber,
  calledNumbers: sharedGame.calledNumbers,
    totalCalled: sharedGame.calledNumbers.length,
  currentCall: calledNumber,
    serverTime: serverTime,  // CRITICAL: Server timestamp for sync
  isSharedSession: true
});

console.log(`📢 Shared game ${roomId}: Called number ${calledNumber} (${sharedGame.calledNumbers.length}/20) for ${sharedGame.players.size} players at ${serverTime}`);

// Schedule next number call (limit to 20 numbers)
// Use consistent 3-second interval from server
if (sharedGame.calledNumbers.length < 20) {
  sharedGame.numberCallTimer = setTimeout(() => {
    if (sharedGame.state === 'playing') {
      startSharedNumberCalling(roomId);
    }
  }, 3000);  // Fixed interval - no variation
} else {
  // CRITICAL: After 20 numbers called, give players 3 seconds to claim Bingo
  // This prevents race condition where Bingo click arrives just after game ends
  console.log(`⏰ 20 numbers called - giving 3 second grace period for Bingo claims in ${roomId}`);
  sharedGame.state = 'finishing';  // Transition state - still accept Bingo claims but no more numbers
  
  sharedGame.numberCallTimer = setTimeout(() => {
    // If no one has claimed Bingo in the grace period, end the game
    if (sharedGame.state === 'finishing') {
      console.log(`🏁 Grace period expired - ending game ${roomId}`);
      endSharedGame(roomId, 'number_limit_reached');
    }
  }, 3000);  // 3 second grace period
  }
  }

  // CRITICAL: Validate Bingo pattern server-side
function validateBingoPattern(markedCells, bingoCard) {
  // markedCells: array of cell coordinates like ['0-0', '0-1', '0-2', '0-3', '0-4']
  // bingoCard: 2D array of numbers on the player's card
  
  if (!markedCells || !bingoCard) {
    return false;
  }
  
  // Convert array to Set for O(1) lookup
  const marked = new Set(markedCells);
  
  const winPatterns = [];
  
  // Check all ROWS
  for (let row = 0; row < 5; row++) {
    const rowPattern = [];
    for (let col = 0; col < 5; col++) {
      rowPattern.push(`${row}-${col}`);
    }
    winPatterns.push({ type: 'row', pattern: rowPattern });
  }
  
  // Check all COLUMNS
  for (let col = 0; col < 5; col++) {
    const colPattern = [];
    for (let row = 0; row < 5; row++) {
      colPattern.push(`${row}-${col}`);
    }
    winPatterns.push({ type: 'column', pattern: colPattern });
  }
  
  // Check DIAGONALS
  winPatterns.push({ 
    type: 'diagonal_tlbr', 
    pattern: ['0-0', '1-1', '2-2', '3-3', '4-4']  // Top-left to bottom-right
  });
  
  winPatterns.push({ 
    type: 'diagonal_trbl', 
    pattern: ['0-4', '1-3', '2-2', '3-1', '4-0']  // Top-right to bottom-left
  });
  
  // Check if any pattern is completely marked
  for (const { type, pattern } of winPatterns) {
    if (pattern.every(cell => marked.has(cell))) {
      console.log(`✅ VALID PATTERN DETECTED: ${type} - Player has valid Bingo!`);
      return true;  // Valid pattern found
    }
  }
  
  // No valid pattern found
  console.warn(`⚠️  PATTERN VALIDATION FAILED: Player's marked cells do not form a valid Bingo pattern`);
  return false;
}

// Handle Bingo claim in live game
   async function handleClaimLiveBingo(telegramId, message) {
   const { gameMode, winPattern } = message;
   // CRITICAL: Use level-specific room to ensure prize pool isolation
   const roomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}_shared`;
   
   try {
      const liveGame = liveGameSessions.get(roomId);
      
      // CRITICAL: Accept Bingo claims during 'playing' state OR during 'finishing' grace period
      if (!liveGame || (liveGame.state !== 'playing' && liveGame.state !== 'finishing')) {
        sendToUser(telegramId, {
          type: 'error',
          message: 'No active live game found for this level'
        });
        return;
      }
     
     const player = liveGame.players.get(telegramId);
     if (!player) {
       sendToUser(telegramId, {
         type: 'error',
         message: 'You are not in this game'
       });
       return;
     }
     
     // CRITICAL: ATOMIC RACE CONDITION FIX
     // Check if game already has a winner - if yes, reject immediately
     if (liveGame.winners.length > 0) {
       const firstWinner = liveGame.winners[0];
       sendToUser(telegramId, {
         type: 'bingo_claimed',
         winner: firstWinner.telegramId,
         message: 'Someone else already won',
         isFirstToWin: false,
         gameMode: gameMode
       });
       return;
     }
     
     // CRITICAL: Validate player is from same game level
     if (player.gameMode && player.gameMode !== gameMode) {
       console.error(`🚨 SECURITY: Player ${telegramId} attempted to claim Bingo in wrong game level! Expected ${gameMode}, got ${player.gameMode}`);
       sendToUser(telegramId, {
         type: 'error',
         message: 'Invalid game level claim'
       });
       return;
     }
     
     // CRITICAL: Validate Bingo pattern server-side - MUST HAVE VALID PATTERN TO WIN
     const hasValidPattern = validateBingoPattern(message.markedCells, message.bingoCard);
     if (!hasValidPattern) {
       console.error(`🚨 SECURITY: Player ${telegramId} attempted to claim Bingo WITHOUT valid pattern!`);
       sendToUser(telegramId, {
         type: 'error',
         message: 'Invalid Bingo! You do not have a valid pattern.'
       });
       return;  // REJECT - no valid pattern found
     }
     
     // CRITICAL: Calculate prize pool ONLY from THIS game level
     const poolData = calculatePrizePool(liveGame, gameMode);
     
     // CRITICAL: Claim win with server-side timestamp (cannot be spoofed by client)
     const claimTime = Date.now();
     player.hasWon = true;
    
    const winnerRecord = {
      telegramId: telegramId,
      position: 1,  // Always position 1 since they're first
      winPattern: winPattern,
      claimTime: claimTime,
      isFirstToWin: true,
      winAmount: poolData.winnerPool,      // 80% of THIS level's pool
      totalPool: poolData.prizePool,       // All money from THIS level
      houseShare: poolData.houseShare,     // 20% to house
      playersInGame: liveGame.players.size // How many competed
    };
    
    liveGame.winners.push(winnerRecord);
    
    // Store pool info on game object for end-game reporting
    liveGame.poolData = poolData;
    
    // Get user name
    let winnerName = 'Player';
    try {
      const User = require('./models/User');
      const user = await User.findOne({ telegramId });
      if (user) {
        winnerName = user.name || 'Player';
      }
    } catch (error) {
      console.log('Could not fetch user name:', error.message);
    }
    
    // Broadcast win to all players with CRITICAL flag and prize pool info
    broadcastToLiveGame(roomId, {
      type: 'live_bingo_claimed',
      winner: telegramId,
      winnerName: winnerName,
      position: 1,  // Only first winner
      winPattern: winPattern,
      claimTime: claimTime,
      isFirstToWin: true,
      serverTime: claimTime,  // For audit trail
      gameMode: gameMode,     // CRITICAL: Show which level won
      winAmount: poolData.winnerPool,      // 80% of THIS level's pool
      totalPool: poolData.prizePool,       // All money collected
      houseShare: poolData.houseShare,     // 20% to house
      playersInGame: liveGame.players.size // How many competed
    });
    
    console.log(`🎉 FIRST BINGO CLAIMED by ${telegramId} (${winnerName}) in Play ${gameMode}`);
    console.log(`   💰 Prize Pool: ${poolData.prizePool} coins | Winner: ${poolData.winnerPool} | House: ${poolData.houseShare}`);
    console.log(`   👥 Players in game: ${liveGame.players.size}`);
    
    // End game immediately when first player claims bingo
    console.log(`🏁 Ending Play ${gameMode} game - first BINGO claimed by ${winnerName}`);
    
    // CRITICAL: Clear the grace period timer if it exists
    if (liveGame.numberCallTimer) {
      clearTimeout(liveGame.numberCallTimer);
      liveGame.numberCallTimer = null;
    }
    
    endLiveGame(roomId, 'bingo_claimed');
    
  } catch (error) {
    console.error('Error handling live Bingo claim:', error);
    sendToUser(telegramId, {
      type: 'error',
      message: 'Failed to process Bingo claim'
    });
  }
}

// End live game
function endLiveGame(roomId, reason = 'completed') {
  const liveGame = liveGameSessions.get(roomId);
  if (!liveGame) return;
  
  liveGame.state = 'finished';
  
  // Clear timers
  if (liveGame.numberCallTimer) {
    clearTimeout(liveGame.numberCallTimer);
  }
  if (liveGame.countdownTimer) {
    clearInterval(liveGame.countdownTimer);
  }
  
  // Broadcast game end
  broadcastToLiveGame(roomId, {
    type: 'live_game_ended',
    gameId: liveGame.id,
    reason: reason,
    winners: liveGame.winners,
    totalPlayers: liveGame.players.size,
    totalNumbersCalled: liveGame.calledNumbers.length
  });
  
  console.log(`🏁 Live game ${roomId} ended. Reason: ${reason}, Winners: ${liveGame.winners.length}`);
  
  // Clean up after 2 minutes
  setTimeout(() => {
    liveGameSessions.delete(roomId);
    if (gameRooms.has(roomId)) {
      gameRooms.delete(roomId);
    }
  }, 2 * 60 * 1000);
}

// Credit house share to admin wallet
async function creditHouseShare(gameMode, houseAmount) {
  try {
    // Import User model
    const User = require('./models/User');
    
    // Get admin IDs from environment
    const adminIds = [
      process.env.ADMIN_ID_1,
      process.env.ADMIN_ID_2,
      process.env.ADMIN_ID_3
    ].filter(id => id && id.trim() !== '');
    
    if (adminIds.length === 0) {
      console.warn(`⚠️  No admin IDs configured - house share of ${houseAmount} for Play ${gameMode} cannot be credited`);
      return;
    }
    
    // Distribute house share equally among admins
    const sharePerAdmin = Math.floor(houseAmount / adminIds.length);
    const remainder = houseAmount % adminIds.length;
    
    for (let i = 0; i < adminIds.length; i++) {
      const adminId = adminIds[i];
      const adminShare = sharePerAdmin + (i === 0 ? remainder : 0); // Give remainder to first admin
      
      const admin = await User.findOne({ telegramId: adminId });
      if (admin) {
        admin.balance = (admin.balance || 0) + adminShare;
        admin.gameHistory = admin.gameHistory || [];
        admin.gameHistory.push(`House Share: Play ${gameMode} +${adminShare} coins (20% of pool)`);
        
        // Keep only last 20 records
        if (admin.gameHistory.length > 20) {
          admin.gameHistory = admin.gameHistory.slice(-20);
        }
        
        await admin.save();
        console.log(`✅ Credited admin ${adminId} with ${adminShare} coins (20% house share from Play ${gameMode})`);
      } else {
        console.warn(`⚠️  Admin user ${adminId} not found - cannot credit house share`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error crediting house share: ${error.message}`);
  }
}

// End shared game
function endSharedGame(roomId, reason = 'completed') {
  const sharedGame = liveGameSessions.get(roomId);
  if (!sharedGame) return;
  
  sharedGame.state = 'finished';
  
  // Clear timers
  if (sharedGame.numberCallTimer) {
    clearTimeout(sharedGame.numberCallTimer);
  }
  if (sharedGame.countdownTimer) {
    clearInterval(sharedGame.countdownTimer);
  }
  
  // CRITICAL: Calculate final prize pool for THIS game level
  const poolData = sharedGame.poolData || calculatePrizePool(sharedGame, sharedGame.gameMode);
  
  // Broadcast shared game end with separate prize pool data
  broadcastToLiveGame(roomId, {
    type: 'shared_game_ended',
    gameId: sharedGame.id,
    gameMode: sharedGame.gameMode,  // CRITICAL: Show which level
    reason: reason,
    winners: sharedGame.winners,
    totalPlayers: sharedGame.players.size,
    totalNumbersCalled: sharedGame.calledNumbers.length,
    calledNumbers: sharedGame.calledNumbers,
    isSharedSession: true,
    // CRITICAL: Separate prize pool data
    totalCollected: poolData.totalStake,
    prizePool: poolData.prizePool,
    winnerAmount: poolData.winnerPool,
    houseShare: poolData.houseShare
  });
  
  console.log(`🏁 Play ${sharedGame.gameMode} game ended. Reason: ${reason}, Winners: ${sharedGame.winners.length}, Players: ${sharedGame.players.size}`);
  console.log(`   💰 Prize Pool Summary:`);
  console.log(`      Total Collected: ${poolData.totalStake} coins`);
  console.log(`      Winner Receives: ${poolData.winnerPool} coins (80%)`);
  console.log(`      House Receives: ${poolData.houseShare} coins (20%)`);
  
  // CRITICAL: Credit house share to admin wallets
  if (poolData.houseShare > 0) {
    creditHouseShare(sharedGame.gameMode, poolData.houseShare);
  }
  
  // Schedule next shared game immediately for the same game mode
  setTimeout(() => {
    console.log(`⏰ Creating next Play ${sharedGame.gameMode} game`);
    createNextSharedGame(sharedGame.gameMode);
  }, 2000); // Wait 2 seconds before creating next game
  
  // Clean up after 2 minutes
  setTimeout(() => {
    liveGameSessions.delete(roomId);
    if (gameRooms.has(roomId)) {
      gameRooms.delete(roomId);
    }
  }, 2 * 60 * 1000);
}

// Create next shared game session
function createNextSharedGame(gameMode) {
  const roomId = `${LIVE_GAME_CONFIG.roomPrefix}${gameMode}_shared`;
  
  // Check if next game already exists
  if (liveGameSessions.has(roomId)) {
    console.log(`⚠️  Next shared game for ${gameMode} already exists`);
    return;
  }
  
  const gameId = `shared_${gameMode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now() + 60000; // 60 seconds countdown for next game
  
  const nextSharedGame = {
    id: gameId,
    roomId: roomId,
    gameMode: gameMode,
    state: 'waiting',
    players: new Map(),
    calledNumbers: [],
    currentCall: null,
    startTime: startTime,
    creator: 'system',
    numberCallTimer: null,
    countdownTimer: null,
    winners: [],
    isSharedSession: true
  };
  
  liveGameSessions.set(roomId, nextSharedGame);
  
  // Start countdown timer for next game
  const countdownTimer = setInterval(() => {
    const timeLeft = Math.ceil((startTime - Date.now()) / 1000);
    
    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      if (nextSharedGame.players.size > 0) {
        startSharedGamePlay(roomId);
      } else {
        // No players, restart countdown
        createNextSharedGame(gameMode);
      }
    } else {
      // Broadcast countdown to anyone interested
      broadcastToLiveGame(roomId, {
        type: 'next_shared_game_countdown',
        countdown: timeLeft,
        gameId: gameId,
        playersCount: nextSharedGame.players.size
      });
    }
  }, 1000);
  
  nextSharedGame.countdownTimer = countdownTimer;
  
  console.log(`⏰ Next shared game ${gameId} scheduled for mode ${gameMode} in 60 seconds`);
}

// Broadcast to all players in live game with error handling
function broadcastToLiveGame(roomId, message, excludeUsers = []) {
  if (!gameRooms.has(roomId)) return;
  
  let broadcastCount = 0;
  gameRooms.get(roomId).forEach(telegramId => {
    if (excludeUsers.includes(telegramId)) return;
    
    const connection = connections.get(telegramId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
        broadcastCount++;
      } catch (error) {
        console.error(`Failed to send message to user ${telegramId}:`, error.message);
        // Remove dead connection
        connections.delete(telegramId);
        gameRooms.get(roomId).delete(telegramId);
      }
    } else {
      // Clean up dead connection
      if (connection) {
        connections.delete(telegramId);
      }
      gameRooms.get(roomId).delete(telegramId);
    }
  });
  
  console.log(`📡 Broadcasted to ${broadcastCount} players in room ${roomId}`);
}

// Export functions for external use
module.exports = {
  notifyPaymentVerified,
  notifyPaymentRejected,
  notifyAdminsNewPayment,
  sendToUser,
  broadcastToRoom,
  broadcastToAllUsers,
  broadcastToLiveGame,
  handleGlobalGameWin,
  handleStartLiveGame,
  handleJoinLiveGame,
  handleClaimLiveBingo,
  endLiveGame,
  connections,
  gameRooms,
  globalGameSessions,
  liveGameSessions,
  gameScheduler,
  startServer: (existingServer = null) => {
    const PORT = process.env.WS_PORT || 3002;
    
    if (existingServer) {
      // Use existing HTTP server in production
      const wsServer = new (require('ws').Server)({ server: existingServer, path: '/ws' });
      console.log(`🚀 WebSocket server attached to main server at /ws`);
      
      // Copy connection handlers to the new WebSocket server
      wsServer.on('connection', (ws, request) => {
        wss.emit('connection', ws, request);
      });
      
      try {
        initializeGameScheduler();
        console.log('✅ WebSocket game scheduler initialized');
      } catch (schedError) {
        console.log('⚠️  Game scheduler initialization failed:', schedError.message);
      }
      
      return wsServer;
    } else {
      // Standalone server for development
      try {
        server.listen(PORT, () => {
          console.log(`🚀 WebSocket server running on port ${PORT}`);
          try {
            initializeGameScheduler();
            console.log('✅ WebSocket game scheduler initialized');
          } catch (schedError) {
            console.log('⚠️  Game scheduler initialization failed:', schedError.message);
          }
        });
      } catch (error) {
        console.log('⚠️  WebSocket server failed to start:', error.message);
      }
    }
  }
};
