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
