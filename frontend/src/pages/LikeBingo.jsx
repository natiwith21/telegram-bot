import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { useWebSocket } from '../hooks/useWebSocket';

const LikeBingo = () => {
  const { telegramId } = useTelegram();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  // Game State
  const [userBalance, setUserBalance] = useState(0);
  const [userBonus, setUserBonus] = useState(0);
  const [gameState, setGameState] = useState('setup'); // 'setup', 'countdown', 'playing', 'finished'
  const [gameNumber, setGameNumber] = useState(2);
  const [stake, setStake] = useState(10);
  const [showWarning, setShowWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('Game');
  const [showMenu, setShowMenu] = useState(false);
  const [hasSelectedNumber, setHasSelectedNumber] = useState(false); // New state to track if user has selected a number
  const [selectedNumber, setSelectedNumber] = useState(null); // Track which number was selected
  
  // WebSocket connection for multiplayer
  const { isConnected, lastMessage, sendMessage } = useWebSocket(telegramId, token, 'like-bingo-room');
  
  // Multiplayer countdown state
  const [multiplayerCountdown, setMultiplayerCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [bingoWinner, setBingoWinner] = useState(null); // Track who won
  
  // Bingo Game Specific State
  const [bingoCard, setBingoCard] = useState([]);
  const [showBingoCard, setShowBingoCard] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [markedCells, setMarkedCells] = useState(new Set());
  const [winningLine, setWinningLine] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentBoard, setCurrentBoard] = useState(56);

  // Use refs for interval management
  const drawIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Static display grid (1-100 for pre-game)
  const staticNumbers = Array.from({ length: 100 }, (_, i) => i + 1);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
    generateBingoCard(); // Generate initial card
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (drawIntervalRef.current) {
        clearInterval(drawIntervalRef.current);
        drawIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  // Handle WebSocket messages for multiplayer
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'game_start':
        setGameStarted(true);
        setGameState('playing');
        startDrawing();
        break;
        
      case 'game_end':
        setGameState('finished');
        setGameStarted(false);
        break;
        
      case 'bingo_claimed':
        // Someone claimed Bingo
        setBingoWinner(lastMessage.winner);
        setGameState('finished');
        
        if (lastMessage.winner === telegramId) {
          alert(`🎉 Congratulations! You won the Bingo game!`);
        } else {
          alert(`🏆 ${lastMessage.winnerName || 'Another player'} won the Bingo game!`);
        }
        
        // Reset game after showing result
        setTimeout(() => {
          resetGame();
        }, 3000);
        break;
        
      default:
        break;
    }
  }, [lastMessage]);

  const loadUserData = async () => {
    // For demo mode, set default values
    if (!telegramId) {
      setUserBalance(1000);
      setUserBonus(50);
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/user/${telegramId}`);
      const data = await response.json();
      
      if (data.success) {
        setUserBalance(data.user.balance || 1000);
        setUserBonus(data.user.bonus || 50);
        
        if (data.user.balance < stake) {
          setShowWarning(true);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Set demo values on error
      setUserBalance(1000);
      setUserBonus(50);
    }
  };

  const generateBingoCard = () => {
    const card = [];
    const ranges = [
      [1, 15],   // B column: 1-15
      [16, 30],  // I column: 16-30  
      [31, 45],  // N column: 31-45
      [46, 60],  // G column: 46-60
      [61, 75]   // O column: 61-75
    ];

    // Generate 5x5 grid with proper B-I-N-G-O ranges
    for (let row = 0; row < 5; row++) {
      const rowNumbers = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
          // Center cell - free space
          rowNumbers.push('*');
        } else {
          // Pick random number from proper B-I-N-G-O range
          const [min, max] = ranges[col];
          const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
          rowNumbers.push(randomNum);
        }
      }
      card.push(rowNumbers);
    }

    setBingoCard(card);
    // Mark center as free space
    setMarkedCells(new Set(['2-2']));
  };

  const startGame = async () => {
    if (userBalance < stake) {
      setShowWarning(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // For demo mode or if no telegramId, skip API call
      if (!telegramId) {
        // Demo mode - just proceed
        setUserBalance(prev => prev - stake);
        setGameNumber(prev => prev + 1);
        setGameState('playing');
        startDrawing();
        setIsLoading(false);
        return;
      }

      // For Like Bingo, select 10 random numbers from 1-100
      const selectedNumbers = [];
      while (selectedNumbers.length < 10) {
        const num = Math.floor(Math.random() * 100) + 1;
        if (!selectedNumbers.includes(num)) {
          selectedNumbers.push(num);
        }
      }

      // Send multiplayer game start request via WebSocket
      if (isConnected) {
        sendMessage({
          type: 'start_multiplayer_game',
          telegramId,
          selectedNumbers,
          stake,
          token
        });
        
        // Go directly to playing state, skip countdown
        setUserBalance(prev => prev - stake);
        setGameNumber(prev => prev + 1);
        setGameState('playing');
        startDrawing();
        setIsLoading(false);
        return;
      }

      // Fallback to local game if WebSocket not connected
      const response = await fetch(`http://localhost:3001/api/like-bingo-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          selectedNumbers,
          stake,
          token
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setUserBalance(data.newBalance);
        setGameNumber(prev => prev + 1);
        // Go directly to playing state, skip countdown
        setGameState('playing');
        startDrawing();
      } else {
        alert(data.error || 'Failed to start game');
      }
    } catch (error) {
      console.error('Game start error:', error);
      // For demo, proceed anyway
      setUserBalance(prev => prev - stake);
      setGameNumber(prev => prev + 1);
      setGameState('playing');
      startDrawing();
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    setCountdown(10); // 10 second countdown
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          startDrawing();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startDrawing = () => {
    // Clear any existing drawing interval
    if (drawIntervalRef.current) {
      clearInterval(drawIntervalRef.current);
      drawIntervalRef.current = null;
    }
    
    setGameState('playing');
    setDrawnNumbers([]);
    
    // Draw first number immediately
    const drawFirstNumber = () => {
      const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const firstNumber = availableNumbers[randomIndex];
      
      setCurrentCall(firstNumber);
      setDrawnNumbers([firstNumber]);
      
      if (soundEnabled) {
        playDrawSound();
      }
      
      // Check win after first number
      setTimeout(() => checkForWins([firstNumber]), 100);
    };
    
    // Draw first number immediately
    drawFirstNumber();
    
    drawIntervalRef.current = setInterval(() => {
      setDrawnNumbers(prev => {
        try {
          if (prev.length >= 20) { // Maximum 20 calls
            clearInterval(drawIntervalRef.current);
            drawIntervalRef.current = null;
            setGameState('finished');
            
            // Show game end message
            setTimeout(() => {
              alert('🎯 Game Complete! All 20 numbers have been called. No Bingo claimed - game ends in a draw!');
              
              // Send game limit reached message to WebSocket
              if (isConnected) {
                sendMessage({
                  type: 'game_limit_reached',
                  roomId: 'like-bingo-room'
                });
              }
              
              // Auto-reset after 3 seconds
              setTimeout(() => {
                resetGame();
              }, 3000);
            }, 500);
            
            return prev;
          }

          const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
            .filter(num => !prev.includes(num));
          
          if (availableNumbers.length === 0) {
            clearInterval(drawIntervalRef.current);
            drawIntervalRef.current = null;
            setGameState('finished');
            return prev;
          }

          const randomIndex = Math.floor(Math.random() * availableNumbers.length);
          const drawnNumber = availableNumbers[randomIndex];
          setCurrentCall(drawnNumber);
          
          // Play sound effect
          if (soundEnabled) {
            playDrawSound();
          }

          const newDrawn = [...prev, drawnNumber];
          
          // Check for wins after each draw
          setTimeout(() => checkForWins(newDrawn), 100);
          
          return newDrawn;
        } catch (error) {
          console.error('Error in draw interval:', error);
          clearInterval(drawIntervalRef.current);
          drawIntervalRef.current = null;
          return prev;
        }
      });
    }, 2000); // Draw every 2 seconds
  };

  // Note: Numbers are no longer automatically marked - players must click them

  // Old win detection - now handled by checkBingoCardWin

  const claimBingo = async () => {
    // Check if user actually has a winning pattern
    const hasWinningPattern = checkBingoCardWin(markedCells);
    
    if (!hasWinningPattern) {
      alert('❌ No winning pattern found! You need a complete row, column, or diagonal to claim Bingo.');
      return;
    }
    
    // Send Bingo claim via WebSocket
    if (isConnected) {
      sendMessage({
        type: 'claim_bingo',
        telegramId,
        roomId: 'like-bingo-room'
      });
    }
    
    // Stop the game locally
    if (drawIntervalRef.current) {
      clearInterval(drawIntervalRef.current);
      drawIntervalRef.current = null;
    }
    
    setGameState('finished');
    
    // Calculate win amount (example: 5x stake for bingo)
    const winAmount = stake * 5;
    setUserBalance(prev => prev + winAmount);
    
    alert(`🎉 BINGO! You won ${winAmount} coins!`);
    
    // Reset game
    setTimeout(() => {
      resetGame();
    }, 3000);
  };

  const resetGame = () => {
    // Clear all intervals
    if (drawIntervalRef.current) {
      clearInterval(drawIntervalRef.current);
      drawIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setGameState('setup');
    setDrawnNumbers([]);
    setCurrentCall(null);
    setMarkedCells(new Set(['2-2'])); // Keep center free
    setWinningLine(null);
    setBingoWinner(null); // Reset winner
    setCountdown(0);
    setShowBingoCard(false); // Hide card on reset
    setHasSelectedNumber(false); // Reset selection state
    setSelectedNumber(null); // Reset selected number
    setMultiplayerCountdown(null); // Reset multiplayer countdown
    setGameStarted(false); // Reset game started state
    generateBingoCard(); // Generate new card for next game
    
    // Refresh user balance after game
    refreshWallet();
  };

  const refreshCard = () => {
    if (gameState === 'setup') {
      // Hide bingo card and go back to number selection
      setHasSelectedNumber(false);
      setSelectedNumber(null);
      generateBingoCard();
      setCurrentBoard(prev => prev + 1);
    } else if (gameState === 'playing') {
      // In playing state, refresh means generate new card and reset marks
      generateBingoCard();
      setMarkedCells(new Set(['2-2'])); // Keep only center marked
      setWinningLine(null);
      setCurrentBoard(prev => prev + 1);
    }
  };

  const leaveGame = () => {
    resetGame(); // resetGame now handles interval cleanup
  };

  // Audio Context - create once and reuse
  const [audioContext, setAudioContext] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Initialize audio context once
  useEffect(() => {
    if (soundEnabled && !audioContext) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        setAudioEnabled(true);
      } catch (error) {
        console.log('Audio not supported, disabling sound');
        setAudioEnabled(false);
        setSoundEnabled(false);
      }
    }
  }, [soundEnabled, audioContext]);

  const playDrawSound = () => {
    if (!soundEnabled || !audioEnabled || !audioContext) return;
    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silently disable audio if it fails
      setAudioEnabled(false);
      setSoundEnabled(false);
    }
  };

  const playWinSound = () => {
    if (!soundEnabled || !audioEnabled || !audioContext) return;
    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      // Silently disable audio if it fails
      setAudioEnabled(false);
      setSoundEnabled(false);
    }
  };

  const refreshWallet = async () => {
    setIsLoading(true);
    try {
      await loadUserData();
    } catch (error) {
      console.error('Refresh wallet error:', error);
    }
    setTimeout(() => {
      setIsLoading(false);
      setShowWarning(false);
    }, 1000);
  };

  const handleBingoCardClick = (rowIndex, colIndex, number) => {
    if (gameState !== 'playing') return;
    if (number === '*') return; // Can't click free space
    if (!drawnNumbers.includes(number)) return; // Can only click called numbers
    
    const cellKey = `${rowIndex}-${colIndex}`;
    setMarkedCells(prev => {
      const newMarked = new Set(prev);
      if (newMarked.has(cellKey)) {
        newMarked.delete(cellKey); // Unmark if already marked
      } else {
        newMarked.add(cellKey); // Mark the cell
      }
      
      // Don't automatically check for win - let user click Bingo button manually
      return newMarked;
    });
  };

  const checkBingoCardWin = (marked) => {
    const winPatterns = [];
    
    // Check rows (5x5 card)
    for (let row = 0; row < 5; row++) {
      const rowPattern = [];
      for (let col = 0; col < 5; col++) {
        rowPattern.push(`${row}-${col}`);
      }
      winPatterns.push(rowPattern);
    }
    
    // Check columns (5x5 card)
    for (let col = 0; col < 5; col++) {
      const colPattern = [];
      for (let row = 0; row < 5; row++) {
        colPattern.push(`${row}-${col}`);
      }
      winPatterns.push(colPattern);
    }
    
    // Check diagonals (5x5 card)
    winPatterns.push(['0-0', '1-1', '2-2', '3-3', '4-4']); // Top-left to bottom-right
    winPatterns.push(['0-4', '1-3', '2-2', '3-1', '4-0']); // Top-right to bottom-left
    
    // Check each pattern
    for (const pattern of winPatterns) {
      if (pattern.every(cell => marked.has(cell))) {
        setWinningLine(pattern);
        return true; // Return true if winning pattern found
      }
    }
    
    // No win pattern found
    setWinningLine(null);
    return false; // Return false if no winning pattern
  };

  const renderBingoCard = () => {
    return (
      <motion.div 
        style={styles.bingoCard}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* BINGO Header */}
        <div style={styles.bingoHeader}>
          <div style={styles.headerCell}>B</div>
          <div style={styles.headerCell}>I</div>
          <div style={styles.headerCell}>N</div>
          <div style={styles.headerCell}>G</div>
          <div style={styles.headerCell}>O</div>
        </div>
        
        <div style={styles.bingoGrid}>
          {bingoCard.map((row, rowIndex) =>
            row.map((number, colIndex) => {
              const cellKey = `${rowIndex}-${colIndex}`;
              const isMarked = markedCells.has(cellKey);
              const isWinning = winningLine && winningLine.includes(cellKey);
              const isFree = number === '*';
              const isCalled = drawnNumbers.includes(number);
              const canClick = gameState === 'playing' && isCalled && !isFree;
              
              return (
                <motion.div
                  key={cellKey}
                  style={{
                    ...styles.bingoCell,
                    background: isFree ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 
                               isWinning ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 
                               isMarked ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 
                               isCalled ? 'linear-gradient(135deg, #e5e7eb, #d1d5db)' : 
                               'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.8))',
                    color: (isMarked || isWinning || isFree) ? 'white' : 
                           isCalled ? '#333' : '#666',
                    border: isWinning ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.3)',
                    cursor: canClick ? 'pointer' : 'default',
                    boxShadow: isWinning ? '0 4px 15px rgba(251, 191, 36, 0.4)' : 
                               isMarked ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 
                               '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onClick={() => handleBingoCardClick(rowIndex, colIndex, number)}
                  animate={isWinning ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3, repeat: isWinning ? Infinity : 0 }}
                  whileHover={canClick ? { scale: 1.05, boxShadow: "0 6px 20px rgba(0,0,0,0.2)" } : {}}
                  whileTap={canClick ? { scale: 0.95 } : {}}
                >
                  {number}
                </motion.div>
              );
            })
          )}
        </div>
        <div style={styles.boardInfo}>
          🎯 Board #{currentBoard}
        </div>
      </motion.div>
    );
  };

  const handleGridNumberClick = (number) => {
    if (gameState === 'setup') {
      generateBingoCard(); // Generate new card when any number is clicked
      setCurrentBoard(prev => prev + 1);
      setHasSelectedNumber(true); // Mark that user has selected a number
      setSelectedNumber(number); // Track which number was selected
    }
  };

  const renderStaticGrid = () => {
    return (
      <div style={styles.staticGrid}>
        {staticNumbers.map((num) => (
          <motion.div 
            key={num} 
            style={{
              ...styles.staticCell,
              backgroundColor: selectedNumber === num ? '#3b82f6' : '#e2e8f0',
              color: selectedNumber === num ? 'white' : '#333',
              fontWeight: selectedNumber === num ? 'bold' : 'normal'
            }}
            onClick={() => handleGridNumberClick(num)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {num}
          </motion.div>
        ))}
      </div>
    );
  };

  const renderFullBingoBoard = () => {
    const ranges = [
      [1, 15],   // B column: 1-15
      [16, 30],  // I column: 16-30  
      [31, 45],  // N column: 31-45
      [46, 60],  // G column: 46-60
      [61, 75]   // O column: 61-75
    ];

    const cells = [];
    
    // Generate 15 rows × 5 columns = 75 numbers
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col];
        const number = min + row;
        const isPlayerNumber = bingoCard.flat().includes(number);
        const isCalled = drawnNumbers.includes(number);
        const isCurrentCall = currentCall === number;
        
        cells.push(
          <div
            key={`${row}-${col}`}
            style={{
              ...styles.numberCell,
              background: isCalled ? 'linear-gradient(to bottom, #ff8a00, #ff0080)' : '#1a2a4a',
              color: isCalled ? '#fff' : '#a0a0a0',
              border: isCurrentCall ? '2px solid #ffff00' : 'none',
              boxShadow: isCurrentCall ? '0 0 10px #ffff00' : 'none'
            }}
          >
            {number}
          </div>
        );
      }
    }
    
    return cells;
  };

  const renderPlayerBingoCard = () => {
    // Render the player's 5x5 bingo card in the right panel
    return bingoCard.map((row, rowIndex) =>
      row.map((number, colIndex) => {
        const cellKey = `${rowIndex}-${colIndex}`;
        const isMarked = markedCells.has(cellKey);
        const isWinning = winningLine && winningLine.includes(cellKey);
        const isFree = number === '*';
        const isCalled = drawnNumbers.includes(number);
        const canClick = gameState === 'playing' && (isCalled || isFree);
        
        return (
          <div
            key={cellKey}
            style={{
              ...styles.playerCardCell,
              background: isFree ? '#4ade80' : 
                        isWinning ? '#fbbf24' : 
                        isMarked ? 'linear-gradient(to bottom, #ff8a00, #ff0080)' : 
                        isCalled ? '#2a3a5a' : '#1a2a4a',
              color: (isMarked || isWinning || isFree || isCalled) ? '#fff' : '#a0a0a0',
              cursor: canClick ? 'pointer' : 'default',
              border: isWinning ? '2px solid #f59e0b' : 'none'
            }}
            onClick={() => handleBingoCardClick(rowIndex, colIndex, number)}
          >
            {isFree ? '*' : number}
          </div>
        );
      })
    ).flat();
  };

  const renderCalledNumbersGrid = () => {
    // Create a 5x5 grid showing the most recent called numbers
    const gridNumbers = Array(25).fill(null);
    
    // Fill with called numbers (most recent first)
    drawnNumbers.slice(-25).forEach((num, index) => {
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

  const renderTabContent = () => {
    switch (currentTab) {
      case 'Scores':
        return (
          <div style={styles.tabContent}>
            <h3>Game Scores</h3>
            <div style={styles.scoreItem}>
              <span>Current Game: #{gameNumber}</span>
              <span>Status: {gameState}</span>
            </div>
            <div style={styles.scoreItem}>
              <span>Numbers Called: {drawnNumbers.length}/75</span>
              <span>Marked: {markedCells.size - 1}/24</span>
            </div>
          </div>
        );
      
      case 'History':
        return (
          <div style={styles.tabContent}>
            <h3>Game History</h3>
            <p>Previous games will appear here</p>
          </div>
        );
      
      case 'Wallet':
        return (
          <div style={styles.tabContent}>
            <h3>Wallet Details</h3>
            <div style={styles.walletDetail}>
              <div>Balance: {userBalance} coins</div>
              <div>Bonus: {userBonus} points</div>
              <div>Total Games: {gameNumber - 2}</div>
              <button onClick={refreshWallet} style={styles.refreshBtn}>
                Refresh Wallet
              </button>
            </div>
          </div>
        );
      
      case 'Profile':
        return (
          <div style={styles.tabContent}>
            <h3>Player Profile</h3>
            <div style={styles.profileInfo}>
              <div>Player ID: {telegramId || 'Demo Mode'}</div>
              <div>Current Stake: {stake} coins</div>
              <div>Status: {gameState}</div>
              <div>Sound: {soundEnabled ? 'On' : 'Off'}</div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.backBtn} onClick={() => navigate('/menu')}>✕</span>
        <span style={styles.title}>Like Bingo ⏷</span>
        <span style={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>⋮</span>
      </div>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.dropdown}
          >
            <div onClick={() => {setStake(5); setShowMenu(false);}}>Set Stake: 5 coins</div>
            <div onClick={() => {setStake(10); setShowMenu(false);}}>Set Stake: 10 coins</div>
            <div onClick={() => {setStake(20); setShowMenu(false);}}>Set Stake: 20 coins</div>
            <div onClick={() => {setSoundEnabled(!soundEnabled); setShowMenu(false);}}>
              Sound: {soundEnabled ? 'On' : 'Off'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.statsRow}>
          {[
            { 
              label: "Wallet", 
              value: userBalance, 
              icon: "💰",
              color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            },
            { 
              label: "Bonus", 
              value: userBonus, 
              icon: "🎁",
              color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            },
            { 
              label: "Active Game", 
              value: gameNumber, 
              icon: "🎮",
              color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            },
            { 
              label: "Stake", 
              value: stake, 
              icon: "🎯",
              color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            }
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              style={{
                ...styles.statCard,
                background: stat.color
              }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)"
              }}
              whileTap={{ scale: 0.95 }}
            >
              <div style={styles.statIcon}>{stat.icon}</div>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* WebSocket Connection Status */}
      {isConnected && (
        <div style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '8px',
          fontSize: '12px',
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          🎮 Connected to Multiplayer Server
        </div>
      )}

      {/* Warning Message */}
      <AnimatePresence>
        {showWarning && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={styles.warningBox}
          >
            🚨 Please top up your wallet. If you already have and are still seeing this, please refresh the page.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Content or Tab Content */}
      {currentTab === 'Game' ? (
        <>
          {/* Show different content based on game state */}
          {gameState === 'setup' && (
            <>
              <h3 style={styles.sectionTitle}>
                {hasSelectedNumber 
                  ? `Selected Number: ${selectedNumber} - Click another number to generate new card` 
                  : 'Click any number to generate new bingo card'
                }
              </h3>
              {renderStaticGrid()}
              
              {/* Show bingo card only after user has selected a number */}
              {hasSelectedNumber && (
                <>
                  <h3 style={styles.sectionTitle}>Your Bingo Card (B-I-N-G-O)</h3>
                  {renderBingoCard()}
                  
                  {/* Control Buttons */}
                  <div style={styles.buttonRow}>
                    <motion.button 
                      style={{ ...styles.button, backgroundColor: "#3B82F6" }}
                      onClick={refreshCard}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Refresh
                    </motion.button>
                    
                    <motion.button 
                      style={{ ...styles.button, backgroundColor: "#10b981" }}
                      onClick={startGame}
                      disabled={isLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoading ? 'Starting...' : 'Start Live Game'}
                    </motion.button>
                  </div>
                </>
              )}
            </>
          )}

          {gameState === 'playing' && (
            <div style={styles.bingoHallContainer}>
              {/* Status Bar */}
              <div style={styles.statusBar}>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Game</span>
                  <span style={styles.statusValue}>TV{gameNumber}321</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Derash</span>
                  <span style={styles.statusValue}>-</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Bonus</span>
                  <span style={styles.statusValue}>Off</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Players</span>
                  <span style={styles.statusValue}>-</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Stake</span>
                  <span style={styles.statusValue}>{stake}</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Call</span>
                  <span style={styles.statusValue}>{drawnNumbers.length}</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Sound</span>
                  <span style={styles.statusValue}>{soundEnabled ? 'On' : 'Off'}</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Mode</span>
                  <span style={styles.statusValue}>Bingo</span>
                </div>
              </div>

              {/* Bingo Title */}
              <div style={styles.bingoTitle}>BINGO</div>

              {/* Main Content */}
              <div style={styles.mainContent}>
                {/* Left Panel - Full 1-75 Bingo Board */}
                <div style={styles.fullBingoCard}>
                  {/* Header */}
                  <div style={styles.bingoCardHeader}>
                    <div style={styles.headerCell}>B</div>
                    <div style={styles.headerCell}>I</div>
                    <div style={styles.headerCell}>N</div>
                    <div style={styles.headerCell}>G</div>
                    <div style={styles.headerCell}>O</div>
                  </div>
                  
                  {/* Full 1-75 Grid */}
                  <div style={styles.fullBingoGrid}>
                    {renderFullBingoBoard()}
                  </div>
                </div>

                {/* Right Panel */}
                <div style={styles.rightPanel}>
                  {/* Countdown */}
                  <div style={styles.controlPanel}>
                    <div style={styles.controlTitle}>Count Down</div>
                    <div style={styles.controlValue}>{countdown > 0 ? countdown : '-'}</div>
                  </div>

                  {/* Current Call */}
                  <div style={styles.controlPanel}>
                    <div style={styles.controlTitle}>Current Call</div>
                    <div style={styles.controlValue}>
                      {currentCall || '-'}
                    </div>
                  </div>

                  {/* Player's Bingo Card */}
                  <div style={styles.currentCallPanel}>
                    <div style={styles.currentCallTitle}>Your Card</div>
                    <div style={styles.playerCardGrid}>
                      {renderPlayerBingoCard()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Board Number */}
              <div style={styles.boardNumber}>Board number {currentBoard}</div>

              {/* Bingo Section */}
              <div style={styles.bingoSection}>
                <div style={styles.bingoControls}>
                  <button style={styles.claimBingoBtn} onClick={claimBingo}>
                    🎉 BINGO! 🎉
                  </button>
                  <div style={styles.controlButtonsRow}>
                    <button style={styles.refreshBingoBtn} onClick={refreshCard}>
                      🔄 Refresh
                    </button>
                    <button style={styles.leaveBingoBtn} onClick={leaveGame}>
                      🚪 Leave
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Game End Section */}
              {gameState === 'finished' && (
                <div style={styles.gameEndSection}>
                  <div style={styles.gameEndTitle}>
                    🎯 Game Complete!
                  </div>
                  <div style={styles.gameEndMessage}>
                    {bingoWinner ? 
                      `🏆 ${bingoWinner === telegramId ? 'You won!' : 'Another player won!'}` :
                      'All 20 numbers called - No Bingo claimed!'
                    }
                  </div>
                  <div style={styles.gameEndButtons}>
                    <button style={styles.newGameBtn} onClick={resetGame}>
                      🎮 New Game
                    </button>
                    <button style={styles.leaveGameBtn} onClick={leaveGame}>
                      🚪 Back to Menu
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        renderTabContent()
      )}

      {/* Bottom Tab Bar */}
      <div style={styles.tabBar}>
        {[
          { label: "Game", icon: "🎮" },
          { label: "Scores", icon: "🏆" },
          { label: "History", icon: "📊" },
          { label: "Wallet", icon: "💰" },
          { label: "Profile", icon: "👤" }
        ].map((tab, i) => (
          <motion.div 
            key={i} 
            style={{
              ...styles.tabItem,
              color: currentTab === tab.label ? '#3b82f6' : '#555'
            }}
            onClick={() => setCurrentTab(tab.label)}
            whileTap={{ scale: 0.95 }}
          >
            <div style={styles.tabIcon}>{tab.icon}</div>
            <div style={styles.tabLabel}>{tab.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Enhanced styles for bingo game
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#d1a5e3",
    minHeight: "100vh",
    padding: "10px",
    boxSizing: "border-box",
    paddingBottom: "70px",
    position: "relative"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "18px",
    fontWeight: "bold",
    padding: "10px 0",
    position: "relative"
  },
  backBtn: { 
    fontSize: "22px", 
    cursor: "pointer",
    padding: "5px",
    borderRadius: "50%",
    transition: "background-color 0.2s"
  },
  title: { flex: 1, textAlign: "center" },
  menuBtn: { 
    fontSize: "20px", 
    cursor: "pointer",
    padding: "5px",
    borderRadius: "50%",
    transition: "background-color 0.2s"
  },
  dropdown: {
    position: "absolute",
    top: "50px",
    right: "10px",
    backgroundColor: "white",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 1000,
    minWidth: "150px"
  },
  statsContainer: {
    marginBottom: "15px",
    padding: "0 5px"
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px"
  },
  statCard: {
    flex: 1,
    borderRadius: "15px",
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    position: "relative",
    overflow: "hidden"
  },
  statIcon: {
    fontSize: "20px",
    marginBottom: "4px",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
  },
  statValue: {
    fontWeight: "bold",
    fontSize: "18px",
    color: "#fff",
    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    marginBottom: "2px"
  },
  statLabel: {
    fontSize: "10px",
    color: "#fff",
    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
    fontWeight: "500",
    textAlign: "center"
  },
  warningBox: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "10px",
    borderRadius: "10px",
    marginBottom: "10px",
    fontSize: "14px",
    border: "1px solid #fca5a5"
  },
  countdownBox: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "20px",
    borderRadius: "15px",
    marginBottom: "15px",
    textAlign: "center",
    fontSize: "24px",
    fontWeight: "bold"
  },

  bingoButton: {
    width: "100%",
    padding: "20px",
    fontSize: "24px",
    fontWeight: "bold",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "15px",
    cursor: "pointer",
    marginBottom: "15px",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)"
  },
  sectionTitle: {
    textAlign: "center",
    margin: "15px 0 10px 0",
    color: "#4a5568"
  },
  staticGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "2px",
    marginBottom: "20px",
    backgroundColor: "#f7fafc",
    padding: "10px",
    borderRadius: "10px"
  },
  staticCell: {
    backgroundColor: "#e2e8f0",
    borderRadius: "4px",
    padding: "6px",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  bingoCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "20px",
    padding: "15px",
    marginBottom: "15px",
    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
    maxWidth: "240px",
    margin: "0 auto 15px auto",
    border: "2px solid rgba(255, 255, 255, 0.2)",
    position: "relative",
    overflow: "hidden"
  },
  bingoHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "4px",
    marginBottom: "8px"
  },
  headerCell: {
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    background: "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))",
    color: "#ffffff",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255,255,255,0.3)"
  },
  bingoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "4px",
    marginBottom: "10px"
  },
  bingoCell: {
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "bold",
    cursor: "default",
    transition: "all 0.3s ease",
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
  },
  boardInfo: {
    textAlign: "center",
    fontSize: "11px",
    color: "#ffffff",
    fontWeight: "bold",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
    marginTop: "8px"
  },
  callHistory: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "15px"
  },
  calledNumbers: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
    marginTop: "10px"
  },
  calledNumber: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
    minWidth: "25px",
    textAlign: "center"
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "20px"
  },
  button: {
    flex: 1,
    padding: "12px",
    fontSize: "16px",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  refreshBtn: {
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "10px"
  },
  tabBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    width: "100%",
    backgroundColor: "white",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-around",
    padding: "8px 0",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.1)"
  },
  tabItem: {
    textAlign: "center",
    fontSize: "12px",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "8px",
    transition: "all 0.2s ease"
  },
  tabIcon: {
    fontSize: "20px"
  },
  tabLabel: {
    marginTop: "4px"
  },
  tabContent: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    margin: "10px 0",
    minHeight: "300px"
  },
  scoreItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #e5e7eb"
  },
  walletDetail: {
    lineHeight: 2
  },
  profileInfo: {
    lineHeight: 2
  },
  liveGamePage: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: "15px",
    padding: "20px",
    margin: "10px 0"
  },
  liveGameTitle: {
    textAlign: "center",
    color: "#7c3aed",
    marginBottom: "20px",
    fontSize: "24px"
  },
  liveCountdown: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "30px",
    borderRadius: "15px",
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "20px"
  },
  gameInfo: {
    backgroundColor: "#f0fdf4",
    color: "#166534",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px",
    textAlign: "center"
  },
  currentCallDisplay: {
    backgroundColor: "#f59e0b",
    color: "white",
    padding: "20px",
    borderRadius: "15px",
    textAlign: "center",
    marginBottom: "15px",
    fontSize: "24px",
    fontWeight: "bold",
    border: "3px solid #d97706"
  },
  liveCardContainer: {
    textAlign: "center",
    marginBottom: "20px"
  },
  liveCallHistory: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "10px",
    marginTop: "15px"
  },
  drawnNumbersList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
    marginTop: "10px"
  },
  drawnNumber: {
    padding: "5px 10px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "bold",
    minWidth: "30px",
    textAlign: "center"
  },
  // New Bingo Hall Styles
  bingoHallContainer: {
    background: "rgba(0, 0, 0, 0.8)",
    borderRadius: "15px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
  },
  statusBar: {
    background: "#0d1526",
    padding: "10px 15px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    fontSize: "12px",
    borderBottom: "1px solid #2a3a5a"
  },
  statusItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    whiteSpace: "nowrap"
  },
  statusLabel: {
    color: "#a0a0a0"
  },
  statusValue: {
    color: "#fff",
    fontWeight: "bold"
  },
  bingoTitle: {
    textAlign: "center",
    padding: "10px",
    fontSize: "24px",
    fontWeight: "bold",
    letterSpacing: "3px",
    background: "linear-gradient(to right, #ff8a00, #ff0080, #00b3ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 0 10px rgba(255, 255, 255, 0.2)"
  },
  mainContent: {
    display: "flex",
    padding: "10px",
    gap: "10px"
  },
  fullBingoCard: {
    flex: "1 1 50%",
    background: "#0d1526",
    padding: "10px",
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
  },
  bingoCardHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "3px",
    marginBottom: "5px"
  },
  headerCell: {
    textAlign: "center",
    padding: "5px 0",
    fontWeight: "bold",
    fontSize: "14px",
    background: "linear-gradient(to bottom, #2a3a5a, #1a2a4a)",
    borderRadius: "4px",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
    color: "#fff"
  },
  fullBingoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "3px"
  },
  playerBingoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "3px"
  },
  playerBingoCell: {
    background: "#1a2a4a",
    borderRadius: "4px",
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "all 0.3s ease"
  },
  numberCell: {
    background: "#1a2a4a",
    borderRadius: "4px",
    height: "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "500",
    transition: "all 0.3s ease"
  },
  rightPanel: {
    flex: "1 1 50%",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  controlPanel: {
    background: "#0d1526",
    borderRadius: "8px",
    padding: "15px",
    textAlign: "center",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    marginBottom: "10px"
  },
  controlTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#a0a0a0"
  },
  controlValue: {
    fontSize: "20px",
    fontWeight: "bold",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a2a4a",
    borderRadius: "4px",
    color: "#fff"
  },
  currentCallPanel: {
    background: "#0d1526",
    borderRadius: "8px",
    padding: "10px",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
  },
  currentCallTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#ffcc00"
  },
  calledNumbersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "3px"
  },
  calledNumberCell: {
    background: "#1a2a4a",
    borderRadius: "4px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "500"
  },
  playerCardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "3px"
  },
  playerCardCell: {
    background: "#1a2a4a",
    borderRadius: "4px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "500",
    transition: "all 0.3s ease"
  },
  boardNumber: {
    textAlign: "center",
    margin: "10px 0",
    fontSize: "14px",
    color: "#ffcc00"
  },
  bingoSection: {
    background: "linear-gradient(to right, #ff8a00, #ff0080)",
    padding: "15px",
    textAlign: "center",
    margin: "10px",
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
  },
  bingoSectionTitle: {
    fontSize: "32px",
    fontWeight: "bold",
    letterSpacing: "3px",
    marginBottom: "10px",
    textShadow: "0 2px 5px rgba(0, 0, 0, 0.5)",
    color: "#fff"
  },
  bingoControls: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "15px"
  },
  controlButtonsRow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap"
  },
  refreshBingoBtn: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "20px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "#1a2a4a",
    color: "#fff",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    minWidth: "120px",
    justifyContent: "center"
  },
  leaveBingoBtn: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "20px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "#ff3333",
    color: "#fff",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    minWidth: "120px",
    justifyContent: "center"
  },
  claimBingoBtn: {
    padding: "15px 30px",
    border: "none",
    borderRadius: "25px",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "linear-gradient(to right, #00ff00, #ffff00)",
    color: "#000",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 15px rgba(0, 255, 0, 0.4)",
    animation: "pulse 1s infinite",
    minWidth: "200px",
    justifyContent: "center"
  },
  gameEndSection: {
    background: "linear-gradient(to right, #ff6b6b, #4ecdc4)",
    padding: "20px",
    textAlign: "center",
    margin: "10px",
    borderRadius: "15px",
    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)"
  },
  gameEndTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "10px",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)"
  },
  gameEndMessage: {
    fontSize: "16px",
    color: "#fff",
    marginBottom: "15px",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)"
  },
  gameEndButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    flexWrap: "wrap"
  },
  newGameBtn: {
    padding: "12px 25px",
    border: "none",
    borderRadius: "20px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "linear-gradient(to right, #4CAF50, #45a049)",
    color: "#fff",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    boxShadow: "0 4px 15px rgba(76, 175, 80, 0.4)"
  },
  leaveGameBtn: {
    padding: "12px 25px",
    border: "none",
    borderRadius: "20px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "linear-gradient(to right, #ff6b6b, #ff5252)",
    color: "#fff",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    boxShadow: "0 4px 15px rgba(255, 107, 107, 0.4)"
  }
};

export default LikeBingo;
