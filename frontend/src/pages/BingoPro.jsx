import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useBingoWebSocket, usePaymentWebSocket, useGlobalBingoWebSocket } from '../hooks/useWebSocket';

const BingoPro = () => {
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [nextGameCountdown, setNextGameCountdown] = useState(0);

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

  // Global synchronized game WebSocket
  const {
    isConnected: isGlobalConnected,
    globalGameState,
    joinGlobalGame,
    claimWin,
    requestGameSchedule
  } = useGlobalBingoWebSocket(telegramId, token, gameMode);

  // Enhanced Game Configuration with professional themes
  const gameConfig = {
    'demo': { bet: 0, multiplier: 0, color: 'slate', theme: 'demo', gradient: 'from-slate-900 via-gray-900 to-zinc-900' },
    '10': { bet: 10, multiplier: 2.5, color: 'emerald', theme: 'starter', gradient: 'from-emerald-900 via-teal-900 to-green-900' },
    '20': { bet: 20, multiplier: 3, color: 'blue', theme: 'balanced', gradient: 'from-blue-900 via-indigo-900 to-purple-900' },
    '50': { bet: 50, multiplier: 3.5, color: 'purple', theme: 'premium', gradient: 'from-purple-900 via-violet-900 to-indigo-900' },
    '100': { bet: 100, multiplier: 4, color: 'pink', theme: 'vip', gradient: 'from-pink-900 via-rose-900 to-red-900' }
  };

  const config = gameConfig[gameMode] || gameConfig.demo;

  // Sound effects
  const playSound = (type) => {
    if (!soundEnabled) return;
    const audio = new Audio();
    switch(type) {
      case 'number':
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBz2a2;';
        break;
      case 'mark':
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBz2a2;';
        break;
      case 'win':
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBz2a2;';
        break;
    }
    audio.play().catch(() => {}); // Ignore errors
  };

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

  // Initialize 5x5 Bingo Grid with enhanced randomization
  const initializeGrid = useCallback(() => {
    const ranges = [
      [1, 15],   // B
      [16, 30],  // I
      [31, 45],  // N
      [46, 60],  // G
      [61, 75]   // O
    ];
    
    const grid = [];
    for (let row = 0; row < 5; row++) {
      const gridRow = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
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
    setMarkedNumbers(new Set(['FREE']));
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

    const isValidToken = await validateToken();
    if (!isValidToken) return;

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

  // Enhanced number calling with animation
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

    playSound('number');

    if (isBingoConnected) {
      wsCallNumber(newNumber);
    }

    return newNumber;
  }, [calledNumbers, isBingoConnected, wsCallNumber, soundEnabled]);

  // Enhanced win checking with more patterns
  const checkWin = useCallback(() => {
    if (!grid.length) return null;

    const isMarked = (row, col) => {
      const value = grid[row][col];
      return value === 'FREE' || markedNumbers.has(value);
    };

    // Check rows
    for (let row = 0; row < 5; row++) {
      if (Array.from({ length: 5 }, (_, col) => isMarked(row, col)).every(Boolean)) {
        return { type: 'row', index: row, pattern: 'Horizontal Line', multiplier: 1 };
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      if (Array.from({ length: 5 }, (_, row) => isMarked(row, col)).every(Boolean)) {
        return { type: 'column', index: col, pattern: 'Vertical Line', multiplier: 1 };
      }
    }

    // Check diagonals
    if (Array.from({ length: 5 }, (_, i) => isMarked(i, i)).every(Boolean)) {
      return { type: 'diagonal', index: 0, pattern: 'Diagonal', multiplier: 1.2 };
    }

    if (Array.from({ length: 5 }, (_, i) => isMarked(i, 4 - i)).every(Boolean)) {
      return { type: 'diagonal', index: 1, pattern: 'Diagonal', multiplier: 1.2 };
    }

    // Check four corners
    if ([
      isMarked(0, 0), isMarked(0, 4),
      isMarked(4, 0), isMarked(4, 4)
    ].every(Boolean)) {
      return { type: 'corners', pattern: 'Four Corners', multiplier: 1.5 };
    }

    // Check full house
    const allMarked = grid.every((row, rowIndex) =>
      row.every((cell, colIndex) => isMarked(rowIndex, colIndex))
    );
    if (allMarked) {
      return { type: 'fullhouse', pattern: 'Full House', multiplier: 2 };
    }

    return null;
  }, [grid, markedNumbers]);

  // Enhanced number marking with animations
  const markNumber = (number) => {
    if (calledNumbers.includes(number) && !markedNumbers.has(number)) {
      setMarkedNumbers(prev => new Set([...prev, number]));
      playSound('mark');
      
      if (isBingoConnected) {
        wsMarkNumber(number);
      }
    }
  };

  // Auto-play logic
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
      const winAmount = Math.floor(config.bet * config.multiplier * winResult.multiplier);
      setGameResult({ 
        won: true, 
        pattern: winResult.pattern, 
        amount: winAmount,
        type: winResult.type 
      });
      setGameEnded(true);
      setIsPlaying(false);
      playSound('win');
      
      // Use global game win claim if connected to global game
      if (isGlobalConnected && globalGameState.gameActive) {
        claimWin(winResult.pattern);
      } else if (isBingoConnected) {
        wsAnnounceWin(winResult.pattern);
      }
    }
  }, [markedNumbers, checkWin, gameEnded, config, isBingoConnected, wsAnnounceWin, isGlobalConnected, globalGameState.gameActive, claimWin, soundEnabled]);

  // Game loop with enhanced timing - disabled for global sync
  useEffect(() => {
    // Local number calling is disabled when using global sync
    // Numbers are now called by the server and received via WebSocket
    if (isPlaying && !gameEnded && !isGlobalConnected) {
      const interval = setInterval(() => {
        const newNumber = callNumber();
        if (!newNumber) {
          setIsPlaying(false);
          setGameEnded(true);
          setGameResult({ won: false, pattern: 'No Win', amount: 0 });
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, gameEnded, callNumber, isGlobalConnected]);

  // Enhanced timer and countdown refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPlaying) {
        setGameStats(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }
      
      // Update countdown for next game
      if (globalGameState.nextGameTime) {
        const timeUntilNext = Math.max(0, Math.floor((globalGameState.nextGameTime - Date.now()) / 1000));
        setNextGameCountdown(timeUntilNext);
      } else {
        setNextGameCountdown(0);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPlaying, globalGameState.nextGameTime]);

  // Initialize on mount
  useEffect(() => {
    initializeGrid();
    if (gameMode !== 'demo') {
      validateToken();
    }
  }, [initializeGrid, gameMode]);

  // WebSocket game state sync
  useEffect(() => {
    if (gameState.winner && gameState.winner !== telegramId) {
      setGameResult({
        won: false,
        pattern: `${gameState.winner} won with ${gameState.winningPattern}`,
        amount: 0
      });
      setGameEnded(true);
      setIsPlaying(false);
    }
  }, [gameState.winner, gameState.winningPattern, telegramId]);

  // Global game state sync - handle synchronized numbers
  useEffect(() => {
    if (globalGameState.calledNumbers && globalGameState.gameActive) {
      setCalledNumbers(globalGameState.calledNumbers);
      if (globalGameState.lastCalledNumber) {
        setCurrentNumber(globalGameState.lastCalledNumber);
        playSound('number');
      }
      setGameStats(prev => ({
        ...prev,
        numbersLeft: 75 - globalGameState.calledNumbers.length
      }));
    }
  }, [globalGameState.calledNumbers, globalGameState.lastCalledNumber, globalGameState.gameActive]);

  // Auto-mark numbers in global game
  useEffect(() => {
    if (globalGameState.lastCalledNumber && autoPlay) {
      const timer = setTimeout(() => {
        markNumber(globalGameState.lastCalledNumber);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [globalGameState.lastCalledNumber, autoPlay]);

  // Handle global game end
  useEffect(() => {
    if (!globalGameState.gameActive && isPlaying) {
      setIsPlaying(false);
      setGameEnded(true);
      if (!gameResult) {
        setGameResult({ won: false, pattern: 'Game Ended', amount: 0 });
      }
    }
  }, [globalGameState.gameActive, isPlaying, gameResult]);

  const startGame = async () => {
    if (!betPlaced) {
      await placeBet();
      if (!betPlaced) return;
    }
    
    // Join the global synchronized game
    if (isGlobalConnected) {
      joinGlobalGame();
    }
    
    setIsPlaying(true);
  };

  const resetGame = () => {
    initializeGrid();
    setIsPlaying(false);
    setBetPlaced(gameMode === 'demo');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCountdownTime = (totalSeconds) => {
    if (totalSeconds <= 0) return "Starting soon...";
    
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else if (secs <= 10) {
      return `${secs}s ⏰`;
    } else {
      return `${secs}s`;
    }
  };

  const getColumnLetter = (colIndex) => ['B', 'I', 'N', 'G', 'O'][colIndex];

  // Show token error if exists
  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-rose-900 p-4 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-auto bg-black/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center border border-red-500/30"
        >
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-6">{tokenError}</p>
          <Link 
            to="/menu" 
            className="inline-block bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-500 hover:to-red-600 transition-all duration-300"
          >
            Return to Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} text-white relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-white/3 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 space-y-6">
        {/* Professional Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-white/20 to-white/10 rounded-full mb-4 shadow-2xl">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
            BINGO {gameMode.toUpperCase()}
          </h1>
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-300">
            {gameMode !== 'demo' && (
              <>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span>Games: {gamesRemaining}</span>
                </div>
              </>
            )}
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Bet: {config.bet} coins</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              <span>Win: {Math.floor(config.bet * config.multiplier)} coins</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span>Time: {formatTime(gameStats.timeElapsed)}</span>
            </div>
          </div>
        </motion.div>



        {/* Enhanced Game Stats Dashboard */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/10 shadow-2xl">
            <div className="text-3xl font-black text-emerald-400">{calledNumbers.length}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Called</div>
          </div>
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/10 shadow-2xl">
            <div className="text-3xl font-black text-blue-400">{gameStats.numbersLeft}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Remaining</div>
          </div>
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/10 shadow-2xl">
            <div className="text-3xl font-black text-purple-400">{markedNumbers.size - 1}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Marked</div>
          </div>
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/10 shadow-2xl">
            <div className={`text-2xl font-black ${isBingoConnected ? 'text-green-400' : 'text-gray-500'}`}>
              {gameState.playersCount || 1}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              {isBingoConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </motion.div>

        {/* Professional Game Status Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Countdown */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="inline-flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                  <span className="text-2xl font-black text-white relative z-10">
                    {globalGameState.countdown || (nextGameCountdown > 0 ? formatCountdownTime(nextGameCountdown) : '-')}
                  </span>
                </div>
                {(globalGameState.countdown || nextGameCountdown > 0) && (
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-30 animate-ping"></div>
                )}
              </div>
              <div className="mt-4 text-xl font-bold text-white">Count Down</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">
                {globalGameState.countdown ? 'Game Starting' : 'Next Game'}
              </div>
            </div>
          </motion.div>

          {/* Current Call */}
          <AnimatePresence>
            <motion.div
              key={currentNumber}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="inline-flex flex-col items-center">
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                    <span className="text-4xl font-black text-white relative z-10">{currentNumber || '-'}</span>
                  </div>
                  {currentNumber && (
                    <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full opacity-30 animate-ping"></div>
                  )}
                </div>
                <div className="mt-4 text-xl font-bold text-white">
                  {currentNumber ? `${getColumnLetter(Math.floor((currentNumber - 1) / 15))}-${currentNumber}` : 'Current Call'}
                </div>
                <div className="text-sm text-gray-400 uppercase tracking-wider">Latest Call</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Professional Bingo Grid */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10"
            >
              {/* Column Headers */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
                  <div key={letter} className="text-center">
                    <div className="text-3xl font-black text-white mb-2">{letter}</div>
                    <div className="h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"></div>
                  </div>
                ))}
              </div>

              {/* Enhanced Grid */}
              <div className="grid grid-cols-5 gap-3">
                {grid.map((row, rowIndex) => 
                  row.map((cell, colIndex) => {
                    const isMarked = cell === 'FREE' || markedNumbers.has(cell);
                    const isCalled = cell === 'FREE' || calledNumbers.includes(cell);
                    const isFree = cell === 'FREE';
                    
                    return (
                      <motion.button
                        key={`${rowIndex}-${colIndex}`}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => !isFree && markNumber(cell)}
                        className={`
                          aspect-square rounded-2xl font-black text-lg shadow-2xl transition-all duration-500 relative overflow-hidden border-2
                          ${isFree 
                            ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white border-yellow-300 shadow-yellow-500/50' 
                            : isMarked
                              ? 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white border-emerald-300 shadow-emerald-500/50 transform scale-110'
                              : isCalled
                                ? 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 text-white border-blue-300 shadow-blue-500/30 animate-pulse'
                                : 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-gray-300 border-gray-600 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800'
                          }
                          ${!isFree && isCalled && !isMarked ? 'animate-bounce' : ''}
                        `}
                        disabled={!isCalled || isMarked}
                      >
                        {isMarked && !isFree && (
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                        )}
                        <span className="relative z-10">
                          {isFree ? '★' : cell}
                        </span>
                        {isMarked && (
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
                        )}
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          {/* Enhanced Control Panel */}
          <div className="space-y-6">
            {/* Game Controls */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10"
            >
              <h3 className="text-xl font-bold mb-4 text-white">Game Controls</h3>
              
              {!betPlaced ? (
                <button
                  onClick={placeBet}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl hover:from-green-400 hover:to-emerald-500 transition-all duration-300 transform hover:scale-105"
                >
                  {gameMode === 'demo' ? 'Start Demo' : `Place Bet (${config.bet} coins)`}
                </button>
              ) : !isPlaying && !gameEnded ? (
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl hover:from-blue-400 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105"
                >
                  🎮 Start Game
                </button>
              ) : gameEnded ? (
                <button
                  onClick={resetGame}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl hover:from-purple-400 hover:to-pink-500 transition-all duration-300 transform hover:scale-105"
                >
                  🔄 New Game
                </button>
              ) : (
                <button
                  onClick={() => setIsPlaying(false)}
                  className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-4 rounded-2xl font-bold text-lg shadow-2xl hover:from-red-400 hover:to-rose-500 transition-all duration-300 transform hover:scale-105"
                >
                  ⏸️ Pause Game
                </button>
              )}

              {/* Settings Toggle */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Auto Play</span>
                  <button
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`w-12 h-6 rounded-full transition-all duration-300 ${
                      autoPlay ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                      autoPlay ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Sound Effects</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full transition-all duration-300 ${
                      soundEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Called Numbers History */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10"
            >
              <h3 className="text-xl font-bold mb-4 text-white">Recent Calls</h3>
              <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                {calledNumbers.slice(-15).reverse().map((number, index) => (
                  <motion.div
                    key={number}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      aspect-square rounded-xl flex items-center justify-center text-sm font-bold
                      ${index === 0 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg' 
                        : 'bg-gray-700 text-gray-300'
                      }
                    `}
                  >
                    {number}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Professional Game Result Modal */}
        <AnimatePresence>
          {gameResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.5, rotate: 10 }}
                className={`max-w-md w-full rounded-3xl p-8 text-center shadow-2xl border-2 ${
                  gameResult.won 
                    ? 'bg-gradient-to-br from-emerald-900 to-green-900 border-emerald-400' 
                    : 'bg-gradient-to-br from-gray-900 to-slate-900 border-gray-400'
                }`}
              >
                <div className="text-8xl mb-4">
                  {gameResult.won ? '🎉' : '😔'}
                </div>
                <h2 className={`text-3xl font-black mb-4 ${
                  gameResult.won ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  {gameResult.won ? 'BINGO!' : 'Game Over'}
                </h2>
                <p className="text-xl text-white mb-2">{gameResult.pattern}</p>
                {gameResult.won && (
                  <p className="text-2xl font-bold text-yellow-400 mb-6">
                    +{gameResult.amount} coins
                  </p>
                )}
                <div className="space-y-3">
                  <button
                    onClick={resetGame}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-2xl font-bold hover:from-blue-400 hover:to-indigo-500 transition-all duration-300"
                  >
                    Play Again
                  </button>
                  <Link
                    to="/menu"
                    className="block w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 rounded-2xl font-bold hover:from-gray-500 hover:to-gray-600 transition-all duration-300"
                  >
                    Back to Menu
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Professional Navigation */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <Link 
            to="/menu" 
            className="inline-flex items-center space-x-2 bg-black/40 backdrop-blur-xl text-white px-6 py-3 rounded-2xl font-semibold hover:bg-black/60 transition-all duration-300 border border-white/10"
          >
            <span>←</span>
            <span>Back to Menu</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default BingoPro;
