import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useBingoWebSocket, usePaymentWebSocket } from '../hooks/useWebSocket';

const BingoImproved = () => {
  const { telegramId } = useTelegram();
  const [searchParams] = useSearchParams();
  const gameMode = searchParams.get('mode') || 'demo';
  const token = searchParams.get('token');
  
  // Game State
  const [grid, setGrid] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [markedNumbers, setMarkedNumbers] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [betPlaced, setBetPlaced] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [gameStats, setGameStats] = useState({
    totalNumbers: 75,
    numbersLeft: 75,
    timeElapsed: 0
  });
  const [sessionData, setSessionData] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [gamesRemaining, setGamesRemaining] = useState(0);

  // WebSocket connections
  const { 
    isConnected: isBingoConnected, 
    gameState, 
    callNumber: wsCallNumber, 
    markNumber: wsMarkNumber, 
    announceWin: wsAnnounceWin 
  } = useBingoWebSocket(telegramId, token, `bingo_${gameMode}`);
  
  const { 
    paymentVerified, 
    verificationMessage 
  } = usePaymentWebSocket(telegramId, gameMode);

  // Game Configuration
  const gameConfig = {
    '10': { bet: 10, multiplier: 2.5, color: 'emerald' },
    '20': { bet: 20, multiplier: 3, color: 'blue' },
    '50': { bet: 50, multiplier: 3.5, color: 'purple' },
    '100': { bet: 100, multiplier: 4, color: 'pink' },
    'demo': { bet: 0, multiplier: 0, color: 'gray' }
  };

  const config = gameConfig[gameMode] || gameConfig.demo;

  // Validate token and get session data
  const validateToken = async () => {
    if (!token || !telegramId) {
      setTokenError('No access token provided. Please start from Telegram bot.');
      return false;
    }

    try {
      const response = await fetch(`https://telegram-bot-u2ni.onrender.com/api/validate-token/${telegramId}?token=${token}`);
      const data = await response.json();
      
      if (data.success) {
        setSessionData(data);
        setGamesRemaining(data.gamesRemaining);
        return true;
      } else {
        setTokenError(data.error || 'Invalid access token');
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenError('Connection error. Please try again.');
      return false;
    }
  };

  // Initialize 5x5 Bingo Grid (more traditional)
  const initializeGrid = useCallback(() => {
    const grid = [];
    const ranges = [
      [1, 15],   // B column
      [16, 30],  // I column  
      [31, 45],  // N column
      [46, 60],  // G column
      [61, 75]   // O column
    ];

    for (let row = 0; row < 5; row++) {
      const gridRow = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
          // Free space in center
          gridRow.push('FREE');
        } else {
          const [min, max] = ranges[col];
          let num;
          do {
            num = Math.floor(Math.random() * (max - min + 1)) + min;
          } while (grid.flat().includes(num));
          gridRow.push(num);
        }
      }
      grid.push(gridRow);
    }
    
    setGrid(grid);
    setMarkedNumbers(new Set(['FREE'])); // Free space is always marked
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameResult(null);
    setGameEnded(false);
    setGameStats({
      totalNumbers: 75,
      numbersLeft: 75,
      timeElapsed: 0
    });
  }, []);

  // Place bet and start game
  const placeBet = async () => {
    if (gameMode === 'demo') {
      setBetPlaced(true);
      return;
    }

    // Validate token first
    const isValidToken = await validateToken();
    if (!isValidToken) {
      return;
    }

    try {
      const response = await fetch(`https://telegram-bot-u2ni.onrender.com/api/bingo-bet/${telegramId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameMode, token })
      });

      const data = await response.json();
      if (data.success) {
        setBetPlaced(true);
        setUserBalance(data.newBalance);
        setGamesRemaining(data.gamesRemaining);
      } else {
        alert(data.error || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Bet error:', error);
      alert('Connection error. Please try again.');
    }
  };

  // Call next number
  const callNumber = useCallback(() => {
    const availableNumbers = [];
    for (let i = 1; i <= 75; i++) {
      if (!calledNumbers.includes(i)) {
        availableNumbers.push(i);
      }
    }

    if (availableNumbers.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    setCurrentNumber(newNumber);
    setCalledNumbers(prev => [...prev, newNumber]);
    setGameStats(prev => ({
      ...prev,
      numbersLeft: availableNumbers.length - 1
    }));

    // Broadcast number to other players via WebSocket
    if (isBingoConnected) {
      wsCallNumber(newNumber);
    }

    return newNumber;
  }, [calledNumbers, isBingoConnected, wsCallNumber]);

  // Check for winning patterns
  const checkWin = useCallback(() => {
    if (!grid.length) return null;

    const isMarked = (row, col) => {
      const value = grid[row][col];
      return value === 'FREE' || markedNumbers.has(value);
    };

    // Check rows
    for (let row = 0; row < 5; row++) {
      if (Array.from({ length: 5 }, (_, col) => isMarked(row, col)).every(Boolean)) {
        return { type: 'row', index: row, pattern: 'Horizontal Line' };
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      if (Array.from({ length: 5 }, (_, row) => isMarked(row, col)).every(Boolean)) {
        return { type: 'column', index: col, pattern: 'Vertical Line' };
      }
    }

    // Check diagonals
    if (Array.from({ length: 5 }, (_, i) => isMarked(i, i)).every(Boolean)) {
      return { type: 'diagonal', index: 0, pattern: 'Diagonal (Top-Left to Bottom-Right)' };
    }

    if (Array.from({ length: 5 }, (_, i) => isMarked(i, 4 - i)).every(Boolean)) {
      return { type: 'diagonal', index: 1, pattern: 'Diagonal (Top-Right to Bottom-Left)' };
    }

    // Check four corners
    if ([
      isMarked(0, 0), isMarked(0, 4), 
      isMarked(4, 0), isMarked(4, 4)
    ].every(Boolean)) {
      return { type: 'corners', pattern: 'Four Corners' };
    }

    // Check full house
    const allMarked = grid.every((row, rowIndex) => 
      row.every((cell, colIndex) => isMarked(rowIndex, colIndex))
    );
    if (allMarked) {
      return { type: 'fullhouse', pattern: 'Full House' };
    }

    return null;
  }, [grid, markedNumbers]);

  // Handle number marking
  const markNumber = (number) => {
    if (calledNumbers.includes(number) && !markedNumbers.has(number)) {
      setMarkedNumbers(prev => new Set([...prev, number]));
      
      // Broadcast mark to other players via WebSocket
      if (isBingoConnected) {
        wsMarkNumber(number);
      }
    }
  };

  // Auto-mark numbers when called
  useEffect(() => {
    if (currentNumber && autoPlay) {
      const timer = setTimeout(() => {
        markNumber(currentNumber);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentNumber, autoPlay]);

  // Check for win after each mark
  useEffect(() => {
    const winResult = checkWin();
    if (winResult && !gameEnded) {
      setGameEnded(true);
      setIsPlaying(false);
      
      const winAmount = config.bet * config.multiplier;
      setGameResult({
        won: true,
        pattern: winResult.pattern,
        amount: winAmount,
        multiplier: config.multiplier
      });

      // Announce win to other players via WebSocket
      if (isBingoConnected) {
        wsAnnounceWin(winResult.pattern);
      }

      // Award winnings
      if (telegramId && gameMode !== 'demo' && token) {
        fetch(`https://telegram-bot-u2ni.onrender.com/api/bingo-win/${telegramId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            amount: winAmount,
            gameMode: gameMode,
            pattern: winResult.pattern,
            token: token
          })
        }).then(response => response.json())
        .then(data => {
          if (data.success) {
            setGamesRemaining(data.gamesRemaining);
          }
        });
      }
    }
  }, [markedNumbers, gameEnded, config, telegramId, gameMode, checkWin, isBingoConnected, wsAnnounceWin]);

  // Game loop
  useEffect(() => {
    if (isPlaying && !gameEnded) {
      const interval = setInterval(() => {
        const newNumber = callNumber();
        if (!newNumber) {
          setIsPlaying(false);
          setGameEnded(true);
          setGameResult({ won: false, pattern: 'No Win', amount: 0 });
        }
      }, 2500);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, gameEnded, callNumber]);

  // Timer
  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setGameStats(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPlaying]);

  // Initialize on mount and validate token
  useEffect(() => {
    initializeGrid();
    
    // For paid games, validate token on mount
    if (gameMode !== 'demo') {
      validateToken();
    }
  }, [initializeGrid, gameMode]);

  // Handle real-time payment verification
  useEffect(() => {
    if (paymentVerified && verificationMessage) {
      // Show success notification
      alert(`🎉 ${verificationMessage}`);
      
      // Refresh page with new token if available
      const newToken = sessionStorage.getItem('gameSessionToken');
      if (newToken) {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('token', newToken);
        window.location.href = currentUrl.toString();
      }
    }
  }, [paymentVerified, verificationMessage]);

  // Handle real-time game events from other players
  useEffect(() => {
    if (gameState.winner && gameState.winner !== telegramId) {
      // Show notification when another player wins
      setGameResult({
        won: false,
        pattern: gameState.winningPattern,
        amount: 0,
        otherPlayerWon: true,
        winner: gameState.winner
      });
      setGameEnded(true);
      setIsPlaying(false);
    }
  }, [gameState.winner, gameState.winningPattern, telegramId]);

  const startGame = async () => {
    if (!betPlaced) {
      await placeBet();
      if (!betPlaced) return;
    }
    setIsPlaying(true);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setBetPlaced(false);
    initializeGrid();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getColumnLetter = (colIndex) => ['B', 'I', 'N', 'G', 'O'][colIndex];

  // Show token error if exists
  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur rounded-2xl p-8 shadow-2xl text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-700 mb-6">{tokenError}</p>
          <Link 
            to="/menu" 
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            ← Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <h1 className={`text-4xl font-bold text-${config.color}-800 mb-2`}>
            🎯 BINGO {gameMode.toUpperCase()}
          </h1>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-600">
            {gameMode !== 'demo' && (
              <>
                <span>Games Remaining: {gamesRemaining}</span>
                <span>•</span>
              </>
            )}
            <span>Bet: {config.bet} coins</span>
            <span>•</span>
            <span>Win: {config.bet * config.multiplier} coins</span>
            <span>•</span>
            <span>Time: {formatTime(gameStats.timeElapsed)}</span>
          </div>
        </motion.div>

        {/* Game Stats */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="grid grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center shadow-lg">
            <div className="text-2xl font-bold text-emerald-600">{calledNumbers.length}</div>
            <div className="text-xs text-gray-600">Numbers Called</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center shadow-lg">
            <div className="text-2xl font-bold text-blue-600">{gameStats.numbersLeft}</div>
            <div className="text-xs text-gray-600">Numbers Left</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center shadow-lg">
            <div className="text-2xl font-bold text-purple-600">{markedNumbers.size - 1}</div>
            <div className="text-xs text-gray-600">Marked</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center shadow-lg">
            <div className={`text-lg font-bold ${isBingoConnected ? 'text-green-600' : 'text-gray-400'}`}>
              {gameState.playersCount || 1}
            </div>
            <div className="text-xs text-gray-600">
              {isBingoConnected ? 'Players Online' : 'Offline Mode'}
            </div>
          </div>
        </motion.div>

        {/* Current Number Display */}
        <AnimatePresence>
          {currentNumber && (
            <motion.div
              key={currentNumber}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="text-center mb-6"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-2xl">
                <span className="text-3xl font-bold text-white">{currentNumber}</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-700">
                {getColumnLetter(Math.floor((currentNumber - 1) / 15))}-{currentNumber}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bingo Grid */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-2xl mb-6"
        >
          {/* Column Headers */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
              <div key={letter} className={`text-center font-bold text-2xl text-${config.color}-600`}>
                {letter}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-2">
            {grid.map((row, rowIndex) => 
              row.map((cell, colIndex) => {
                const isMarked = cell === 'FREE' || markedNumbers.has(cell);
                const isCalled = cell === 'FREE' || calledNumbers.includes(cell);
                const isFree = cell === 'FREE';
                
                return (
                  <motion.button
                    key={`${rowIndex}-${colIndex}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => !isFree && markNumber(cell)}
                    className={`
                      aspect-square rounded-xl font-bold text-lg shadow-lg transition-all duration-300
                      ${isFree 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
                        : isMarked
                          ? `bg-gradient-to-br from-${config.color}-500 to-${config.color}-600 text-white shadow-2xl transform scale-110`
                          : isCalled
                            ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${!isFree && isCalled && !isMarked ? 'animate-pulse' : ''}
                    `}
                    disabled={!isCalled || isMarked}
                  >
                    {isFree ? '★' : cell}
                  </motion.button>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Game Result */}
        <AnimatePresence>
          {gameResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`text-center p-6 rounded-2xl mb-6 shadow-2xl ${
                gameResult.won 
                  ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-300' 
                  : 'bg-gradient-to-br from-red-100 to-pink-100 border-2 border-red-300'
              }`}
            >
              <div className="text-4xl mb-2">
                {gameResult.won ? '🎉' : gameResult.otherPlayerWon ? '👑' : '😢'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {gameResult.won ? 'BINGO!' : gameResult.otherPlayerWon ? 'Player Won!' : 'Game Over'}
              </h3>
              <p className="text-lg mb-2">{gameResult.pattern}</p>
              {gameResult.won && (
                <p className="text-xl font-bold text-green-600">
                  Won {gameResult.amount} coins! ({gameResult.multiplier}x multiplier)
                </p>
              )}
              {gameResult.otherPlayerWon && (
                <p className="text-lg text-blue-600">
                  Another player achieved {gameResult.pattern}! Better luck next time.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          {!isPlaying && !gameEnded && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className={`px-8 py-3 bg-gradient-to-r from-${config.color}-500 to-${config.color}-600 text-white font-bold rounded-xl shadow-lg`}
            >
              {betPlaced ? 'Start Game' : `Place Bet (${config.bet} coins)`}
            </motion.button>
          )}
          
          {(gameEnded || isPlaying) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold rounded-xl shadow-lg"
            >
              New Game
            </motion.button>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoplay"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoplay" className="text-sm text-gray-600">Auto Mark</label>
          </div>

          <Link 
            to="/menu" 
            className="px-6 py-3 bg-white/80 backdrop-blur text-gray-700 font-semibold rounded-xl shadow-lg hover:bg-white/90 transition-all"
          >
            ← Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BingoImproved;
