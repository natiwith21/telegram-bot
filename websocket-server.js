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
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connected successfully'
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

// Export functions for external use
module.exports = {
  notifyPaymentVerified,
  notifyPaymentRejected,
  notifyAdminsNewPayment,
  sendToUser,
  broadcastToRoom,
  connections,
  gameRooms,
  startServer: () => {
    const PORT = process.env.WS_PORT || 3002;
    server.listen(PORT, () => {
      console.log(`🚀 WebSocket server running on port ${PORT}`);
    });
  }
};
