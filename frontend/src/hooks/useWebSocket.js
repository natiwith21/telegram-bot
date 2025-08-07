import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (telegramId, token, roomId = 'default') => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!telegramId) return;

    try {
      const wsUrl = `ws://localhost:3002?telegramId=${telegramId}&token=${token}&roomId=${roomId}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          console.log('WebSocket message received:', message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection failed');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect');
    }
  }, [telegramId, token, roomId]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close(1000, 'User disconnect');
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    lastMessage,
    connectionError,
    sendMessage,
    connect,
    disconnect
  };
};

// Hook specifically for payment status monitoring
export const usePaymentWebSocket = (telegramId, gameMode) => {
  const { isConnected, lastMessage, sendMessage } = useWebSocket(telegramId, null, 'payment');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  // Check payment status when connected
  useEffect(() => {
    if (isConnected && gameMode) {
      sendMessage({
        type: 'check_payment_status',
        gameMode: gameMode
      });
    }
  }, [isConnected, gameMode, sendMessage]);

  // Handle payment-related messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'payment_status':
        setPaymentStatus(lastMessage);
        break;
        
      case 'payment_verified':
        setPaymentVerified(true);
        setVerificationMessage(lastMessage.message);
        // Store session token for game access
        if (lastMessage.sessionToken) {
          sessionStorage.setItem('gameSessionToken', lastMessage.sessionToken);
        }
        break;
        
      case 'payment_rejected':
        setPaymentVerified(false);
        setVerificationMessage(lastMessage.message);
        break;
        
      default:
        break;
    }
  }, [lastMessage]);

  return {
    isConnected,
    paymentStatus,
    paymentVerified,
    verificationMessage,
    checkPaymentStatus: () => sendMessage({
      type: 'check_payment_status',
      gameMode: gameMode
    })
  };
};

// Hook for Bingo game real-time features
export const useBingoWebSocket = (telegramId, token, roomId = 'default') => {
  const { isConnected, lastMessage, sendMessage } = useWebSocket(telegramId, token, roomId);
  const [gameState, setGameState] = useState({
    players: [],
    calledNumbers: [],
    playerMarks: {},
    gameActive: false
  });

  // Join Bingo room when connected
  useEffect(() => {
    if (isConnected && token) {
      sendMessage({
        type: 'join_bingo_room',
        roomId: roomId,
        token: token
      });
    }
  }, [isConnected, token, roomId, sendMessage]);

  // Handle Bingo-related messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'room_joined':
        setGameState(prev => ({
          ...prev,
          playersCount: lastMessage.playersCount
        }));
        break;
        
      case 'player_joined':
        setGameState(prev => ({
          ...prev,
          playersCount: lastMessage.playersCount
        }));
        break;
        
      case 'bingo_number_called':
        setGameState(prev => ({
          ...prev,
          calledNumbers: [...prev.calledNumbers, lastMessage.number],
          gameActive: true
        }));
        break;
        
      case 'player_marked':
        setGameState(prev => ({
          ...prev,
          playerMarks: {
            ...prev.playerMarks,
            [lastMessage.telegramId]: [
              ...(prev.playerMarks[lastMessage.telegramId] || []),
              lastMessage.number
            ]
          }
        }));
        break;
        
      case 'bingo_win':
        setGameState(prev => ({
          ...prev,
          gameActive: false,
          winner: lastMessage.winner,
          winningPattern: lastMessage.pattern
        }));
        break;
        
      default:
        break;
    }
  }, [lastMessage]);

  const callNumber = (number) => {
    sendMessage({
      type: 'bingo_number_call',
      roomId: roomId,
      number: number
    });
  };

  const markNumber = (number) => {
    sendMessage({
      type: 'player_mark',
      roomId: roomId,
      number: number
    });
  };

  const announceWin = (pattern) => {
    sendMessage({
      type: 'bingo_win',
      roomId: roomId,
      pattern: pattern
    });
  };

  return {
    isConnected,
    gameState,
    callNumber,
    markNumber,
    announceWin
  };
};

// Hook for Global Synchronized Bingo Game
export const useGlobalBingoWebSocket = (telegramId, token, gameMode = 'demo') => {
  const { isConnected, lastMessage, sendMessage } = useWebSocket(telegramId, token, 'global_bingo');
  const [globalGameState, setGlobalGameState] = useState({
    currentGame: null,
    nextGameTime: null,
    timeUntilGame: null,
    isInGame: false,
    calledNumbers: [],
    gameActive: false,
    winners: [],
    playersCount: 0,
    countdown: null,
    gameSchedule: null
  });

  // Request game schedule when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage({
        type: 'request_game_schedule'
      });
    }
  }, [isConnected, sendMessage]);

  // Handle global game messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'connected':
        if (lastMessage.nextGameTime || lastMessage.currentGame) {
          setGlobalGameState(prev => ({
            ...prev,
            nextGameTime: lastMessage.nextGameTime,
            currentGame: lastMessage.currentGame,
            gameActive: lastMessage.currentGame?.isActive || false,
            calledNumbers: lastMessage.currentGame?.calledNumbers || [],
            playersCount: lastMessage.currentGame?.playersCount || 0
          }));
        }
        break;

      case 'game_schedule':
        setGlobalGameState(prev => ({
          ...prev,
          currentGame: lastMessage.currentGame,
          nextGameTime: lastMessage.nextGameTime,
          timeUntilNextGame: lastMessage.timeUntilNextGame,
          gameSchedule: lastMessage
        }));
        break;

      case 'next_game_scheduled':
        setGlobalGameState(prev => ({
          ...prev,
          nextGameTime: lastMessage.nextGameTime,
          timeUntilGame: lastMessage.timeUntilGame
        }));
        break;

      case 'next_game_update':
        setGlobalGameState(prev => ({
          ...prev,
          nextGameTime: lastMessage.nextGameTime,
          timeUntilGame: lastMessage.timeUntilGame
        }));
        break;

      case 'game_countdown':
        setGlobalGameState(prev => ({
          ...prev,
          countdown: lastMessage.countdown
        }));
        break;

      case 'global_game_started':
        setGlobalGameState(prev => ({
          ...prev,
          currentGame: {
            id: lastMessage.gameId,
            startTime: lastMessage.startTime,
            isActive: true
          },
          gameActive: true,
          calledNumbers: [],
          winners: [],
          countdown: null
        }));
        break;

      case 'global_game_joined':
        setGlobalGameState(prev => ({
          ...prev,
          isInGame: true,
          playersCount: lastMessage.playersCount,
          calledNumbers: lastMessage.calledNumbers,
          currentGame: {
            id: lastMessage.gameId,
            isActive: true
          },
          nextGameTime: lastMessage.nextGameTime,
          timeUntilGame: lastMessage.timeUntilNextGame
        }));
        break;

      case 'waiting_for_next_game':
        setGlobalGameState(prev => ({
          ...prev,
          isInGame: false,
          nextGameTime: lastMessage.nextGameTime,
          timeUntilGame: lastMessage.timeUntilGame
        }));
        break;

      case 'global_number_called':
        setGlobalGameState(prev => ({
          ...prev,
          calledNumbers: lastMessage.calledNumbers,
          lastCalledNumber: lastMessage.number
        }));
        break;

      case 'global_game_win':
        setGlobalGameState(prev => ({
          ...prev,
          winners: [...prev.winners, {
            telegramId: lastMessage.winner,
            name: lastMessage.winnerName,
            pattern: lastMessage.winPattern,
            position: lastMessage.position
          }]
        }));
        break;

      case 'global_game_ended':
        setGlobalGameState(prev => ({
          ...prev,
          gameActive: false,
          isInGame: false,
          currentGame: null,
          calledNumbers: [],
          winners: lastMessage.winners || prev.winners
        }));
        break;

      default:
        break;
    }
  }, [lastMessage]);

  const joinGlobalGame = () => {
    sendMessage({
      type: 'join_global_game',
      gameMode: gameMode,
      token: token
    });
  };

  const claimWin = (winPattern) => {
    if (globalGameState.currentGame) {
      sendMessage({
        type: 'global_game_win',
        gameId: globalGameState.currentGame.id,
        winPattern: winPattern
      });
    }
  };

  const requestGameSchedule = () => {
    sendMessage({
      type: 'request_game_schedule'
    });
  };

  return {
    isConnected,
    globalGameState,
    joinGlobalGame,
    claimWin,
    requestGameSchedule
  };
};
