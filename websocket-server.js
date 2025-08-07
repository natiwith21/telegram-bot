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

// Connect to database (if available)
if (connectDB) {
  connectDB();
} else {
  console.log('⚠️  Database connection not available');
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
const gameScheduler = {
  nextGameTime: null,
  currentGame: null,
  gameInterval: 5 * 60 * 1000, // 5 minutes between games
  gameTimer: null,
  countdownTimer: null
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

// Handle multiplayer game start
async function handleStartMultiplayerGame(telegramId, message) {
  const { roomId = 'like-bingo-room', selectedNumbers, stake, token } = message;
  
  try {
    // Add player to room if not already there
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, new Set());
    }
    gameRooms.get(roomId).add(telegramId);
    
    // Check if game is already running for this room
    if (countdownIntervals.has(roomId)) {
      // Game already running, just acknowledge
      sendToUser(telegramId, {
        type: 'game_join_success',
        message: 'Joined existing game'
      });
      return;
    }
    
    // Start game immediately (no countdown)
    // Notify all players in room that game is starting
    broadcastToRoom(roomId, {
      type: 'game_start',
      playersCount: gameRooms.get(roomId).size
    });
    
    // Start game timer (5 minutes) - but game will end when 20 numbers are called
    setTimeout(() => {
      broadcastToRoom(roomId, {
        type: 'game_end',
        message: 'Game time expired'
      });
    }, 5 * 60 * 1000); // 5 minutes
    
    // Acknowledge to the player who started the game
    sendToUser(telegramId, {
      type: 'game_start_initiated',
      playersCount: gameRooms.get(roomId).size
    });
    
  } catch (error) {
    console.error('Multiplayer game start error:', error);
    sendToUser(telegramId, {
      type: 'error',
      message: 'Failed to start multiplayer game'
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

// Export functions for external use
module.exports = {
  notifyPaymentVerified,
  notifyPaymentRejected,
  notifyAdminsNewPayment,
  sendToUser,
  broadcastToRoom,
  broadcastToAllUsers,
  handleGlobalGameWin,
  connections,
  gameRooms,
  globalGameSessions,
  gameScheduler,
  startServer: () => {
    const PORT = process.env.WS_PORT || 3002;
    server.listen(PORT, () => {
      console.log(`🚀 WebSocket server running on port ${PORT}`);
      // Initialize game scheduler
      initializeGameScheduler();
    });
  }
};
