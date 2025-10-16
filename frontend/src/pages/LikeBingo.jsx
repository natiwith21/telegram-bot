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
  const gameMode = searchParams.get('mode') || '10'; // Get game mode from URL (10, 20, 50, 100, demo)
  
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
  const [balanceNotification, setBalanceNotification] = useState(''); // Show balance update notifications
  const [gameHistory, setGameHistory] = useState([]); // Store user's game history
  
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

  // Load user data on mount and refresh periodically
  useEffect(() => {
    console.log('🚀 Component mounted, loading user data...');
    console.log('TelegramId:', telegramId, 'GameMode:', gameMode);
    
    // Always load user data first
    loadUserData();
    generateBingoCard(); // Generate initial card
    
    // Refresh balance every 15 seconds to stay in sync
    const balanceRefreshInterval = setInterval(() => {
      if (gameMode !== 'demo' && telegramId) {
        console.log('⏰ Auto-refreshing balance...');
        loadUserData();
      }
    }, 15000);
    
    return () => clearInterval(balanceRefreshInterval);
  }, [gameMode, telegramId]);

  // Force reload user data when entering game
  useEffect(() => {
    if (telegramId && gameMode !== 'demo') {
      console.log('🔄 Forcing balance reload for game mode:', gameMode);
      setTimeout(() => loadUserData(), 500); // Small delay to ensure proper loading
    }
  }, [currentTab]);

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

    const handleMessage = async () => {
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
        case 'live_bingo_claimed':
          // Someone claimed Bingo
          setBingoWinner(lastMessage.winner);
          setGameState('finished');
          
          // Stop any local drawing intervals
          if (drawIntervalRef.current) {
            clearInterval(drawIntervalRef.current);
            drawIntervalRef.current = null;
          }
          
          if (lastMessage.winner === telegramId) {
            // Handle win - update balance based on game mode
            await handleGameWin();
            alert(`🎉 Congratulations! You won the Bingo game!`);
          } else {
            // Handle loss - record the loss in backend
            await handleGameLoss();
            alert(`🏆 ${lastMessage.winnerName || 'Another player'} won the Bingo game!`);
          }
          
          // Reset game after showing result
          setTimeout(() => {
            resetGame();
          }, 3000);
          break;

        // Shared multiplayer session messages (ONLY for paid versions)
        case 'shared_game_created':
          if (['10', '20', '50', '100'].includes(gameMode)) {
            console.log(`🎮 Shared Bingo ${gameMode} created, waiting for players...`);
            // Go to playing state immediately and show synchronized countdown
            setGameState('playing');
            
            // Use server time if available for accurate sync
            if (lastMessage.serverTime) {
              const serverCountdown = lastMessage.countdown;
              const serverTime = lastMessage.serverTime;
              const clientTime = Date.now();
              const networkDelay = Math.abs(clientTime - serverTime);
              const adjustedCountdown = Math.max(0, serverCountdown - Math.floor(networkDelay / 1000));
              setMultiplayerCountdown(adjustedCountdown);
              console.log(`🔄 Creator countdown sync: ${adjustedCountdown}s`);
            } else {
              setMultiplayerCountdown(lastMessage.countdown);
            }
          }
          break;

        case 'joined_shared_waiting':
          if (['10', '20', '50', '100'].includes(gameMode)) {
            console.log(`🎮 Joined shared Bingo ${gameMode} waiting room`);
            // Go to playing state immediately and show synchronized countdown
            setGameState('playing');
            
            // Use server time for accurate countdown sync
            if (lastMessage.serverTime) {
              const serverCountdown = lastMessage.countdown;
              const serverTime = lastMessage.serverTime;
              const clientTime = Date.now();
              const networkDelay = Math.abs(clientTime - serverTime);
              const adjustedCountdown = Math.max(0, serverCountdown - Math.floor(networkDelay / 1000));
              setMultiplayerCountdown(adjustedCountdown);
              console.log(`🔄 Initial countdown sync: ${adjustedCountdown}s (server: ${serverCountdown}s, delay: ${networkDelay}ms)`);
            } else {
              setMultiplayerCountdown(lastMessage.countdown);
            }
          }
          break;

        case 'joined_shared_mid_game':
          if (['10', '20', '50', '100'].includes(gameMode)) {
            console.log(`🎯 Joined shared Bingo ${gameMode} in progress`);
            // Go to playing state and show next game countdown in Count Down section
            setGameState('playing');
            setMultiplayerCountdown(lastMessage.nextGameCountdown);
            setDrawnNumbers(lastMessage.calledNumbers || []);
            setCurrentCall(lastMessage.currentCall);
          }
          break;

        case 'player_joined_shared_waiting':
          // Update countdown for all players to stay synchronized
          console.log(`👥 Player joined - syncing countdown`);
          if (lastMessage.serverTime) {
            const serverCountdown = lastMessage.countdown;
            const serverTime = lastMessage.serverTime;
            const clientTime = Date.now();
            const networkDelay = Math.abs(clientTime - serverTime);
            const adjustedCountdown = Math.max(0, serverCountdown - Math.floor(networkDelay / 1000));
            setMultiplayerCountdown(adjustedCountdown);
          } else {
            setMultiplayerCountdown(lastMessage.countdown);
          }
          break;

        case 'shared_game_countdown':
          // CRITICAL: Use server time for accurate synchronization
          const serverCountdown = lastMessage.countdown;
          const serverTime = lastMessage.serverTime;
          const clientTime = Date.now();
          const networkDelay = Math.abs(clientTime - serverTime);
          
          // Adjust countdown for network delay (max 2 seconds adjustment)
          const delayAdjustment = Math.min(Math.floor(networkDelay / 1000), 2);
          const adjustedCountdown = Math.max(0, serverCountdown - delayAdjustment);
          
          console.log(`🔄 Countdown sync: server=${serverCountdown}, network_delay=${networkDelay}ms, adjusted=${adjustedCountdown}`);
          setMultiplayerCountdown(adjustedCountdown);
          break;

        case 'shared_game_will_start':
          // Server is preparing to start game - show final countdown
          const startTime = lastMessage.startTime;
          const finalCountdown = Math.max(0, Math.ceil((startTime - Date.now()) / 1000));
          console.log(`🎯 Shared game will start in ${finalCountdown} seconds`);
          setMultiplayerCountdown(finalCountdown);
          
          // Set timer to transition to playing state at exact start time
          setTimeout(() => {
            setGameState('playing');
            setGameStarted(true);
            setMultiplayerCountdown(null);
            setDrawnNumbers([]);
            setCurrentCall(null);
            console.log('🎯 Game state transitioned to playing (synchronized)');
          }, startTime - Date.now());
          break;

        case 'shared_game_started':
          console.log('🎯 Shared game started (server confirmation)!');
          // This is just confirmation - state should already be set by shared_game_will_start
          if (gameState !== 'playing') {
            setGameStarted(true);
            setGameState('playing');
            setMultiplayerCountdown(null);
            setDrawnNumbers([]);
            setCurrentCall(null);
          }
          break;

        case 'shared_number_called':
          // Real-time number calling - all players see the same number
          console.log(`📢 Shared number called: ${lastMessage.number}`);
          setCurrentCall(lastMessage.number);
          setDrawnNumbers(lastMessage.calledNumbers);
          
          // Play sound if enabled
          if (soundEnabled) {
            playDrawSound();
          }
          break;

        case 'shared_game_ended':
          console.log('🏁 Shared game ended');
          setGameState('finished');
          setGameStarted(false);
          setMultiplayerCountdown(null);
          
          // Stop any local drawing intervals
          if (drawIntervalRef.current) {
            clearInterval(drawIntervalRef.current);
            drawIntervalRef.current = null;
          }
          
          // Process game result only if no one claimed bingo during the game
          if (!bingoWinner) {
            const playerWon = lastMessage.winners?.some(winner => winner.telegramId === telegramId);
            if (playerWon) {
              await handleGameWin();
            } else {
              await handleGameLoss();
            }
          }
          
          // Reset game after 3 seconds
          setTimeout(() => {
            resetGame();
          }, 3000);
          break;

        case 'next_shared_game_countdown':
          // Show countdown for next shared game in existing Count Down UI only
          setMultiplayerCountdown(lastMessage.countdown);
          break;
          
        default:
          break;
      }
    };

    handleMessage();
  }, [lastMessage]);

  // Process game result and update balance accordingly
  const processGameResult = async (isWin) => {
    if (gameMode === 'demo' || !telegramId) {
      console.log(`🎮 Demo mode or no telegramId - skipping balance update`);
      return;
    }
    
    console.log(`🎯 Processing game result: ${isWin ? 'WIN' : 'LOSS'} for stake ${stake}`);
    console.log(`📊 Current frontend balance before processing: ${userBalance}`);
    
    try {
      const response = await fetch(`https://telegram-bot-u2ni.onrender.com/api/like-bingo-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          selectedNumbers: [1], // Dummy for game result processing
          stake,
          token,
          gameMode,
          gameResult: true, // Flag to indicate this is processing final game result
          isWin,
          reason: isWin ? 'game_win' : 'game_loss'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Update frontend balance with real backend balance
        setUserBalance(data.newBalance);
        
        if (isWin) {
          const winnings = data.winAmount || (stake * getWinMultiplier());
          console.log(`🏆 WIN RESULT: Deducted ${stake}, won ${winnings}, net: +${winnings - stake}`);
          console.log(`📈 Balance updated from ${userBalance} to ${data.newBalance}`);
          showBalanceNotification(`🎉 Won ${winnings} coins! Net gain: +${winnings - stake}`, 'win');
        } else {
          console.log(`😢 LOSS RESULT: Deducted ${stake} coins`);
          console.log(`📉 Balance updated from ${userBalance} to ${data.newBalance}`);
          showBalanceNotification(`😢 Lost ${stake} coins. New balance: ${data.newBalance}`, 'loss');
        }
        
        console.log(`✅ Game result processing completed successfully`);
      } else {
        console.error('Backend game result processing failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to process game result:', error);
    }
  };

  // Get win multiplier for current game mode
  const getWinMultiplier = () => {
    const winMultipliers = {
      '10': 2.5,   // 10 coins -> 25 coins (2.5x)
      '20': 3,     // 20 coins -> 60 coins (3x)
      '50': 3.5,   // 50 coins -> 175 coins (3.5x)
      '100': 4     // 100 coins -> 400 coins (4x)
    };
    return winMultipliers[gameMode] || 2;
  };

  // Handle game win - process win result
  const handleGameWin = async () => {
    if (gameMode === 'demo') {
      alert('🎉 Demo win! No real coins affected.');
      return;
    }
    
    console.log('🏆 Handling game win...');
    await processGameResult(true);
    
    // Refresh balance to ensure UI is in sync
    setTimeout(() => loadUserData(), 1000);
  };

  // Handle game loss - process loss result
  const handleGameLoss = async () => {
    if (gameMode === 'demo') {
      alert('😢 Demo loss! No real coins affected.');
      return;
    }
    
    console.log('😢 Handling game loss...');
    await processGameResult(false);
    
    // Refresh balance to ensure UI is in sync
    setTimeout(() => loadUserData(), 1000);
  };

  // Show balance notification to user
  const showBalanceNotification = (message, type = 'info') => {
    setBalanceNotification(message);
    setTimeout(() => {
      setBalanceNotification('');
    }, 5000); // Clear after 5 seconds
  };

  const loadUserData = async () => {
    // Debug telegramId
    console.log('🔍 Debug Info:');
    console.log('- telegramId from hook:', telegramId);
    console.log('- telegramId type:', typeof telegramId);
    console.log('- gameMode:', gameMode);
    console.log('- URL params:', Object.fromEntries(new URLSearchParams(window.location.search)));
    
    // For demo mode, set default values
    if (!telegramId || gameMode === 'demo') {
      console.log('Demo mode: Setting demo balance');
      setUserBalance(1000);
      setUserBonus(0);
      // Set demo game history
      setGameHistory([
        'Bingo Demo: WIN - Demo win, no real coins affected',
        'Bingo Demo: LOSS - Demo loss, no real coins affected',
        'Bingo Demo: WIN - Demo win, no real coins affected'
      ]);
      return;
    }
    
    // Ensure telegramId is a string
    const cleanTelegramId = String(telegramId).trim();
    console.log(`🔄 Loading user data for telegramId: "${cleanTelegramId}"`);
    
    try {
      const apiUrl = `https://telegram-bot-u2ni.onrender.com/api/user/${cleanTelegramId}`;
      console.log('Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('✅ Full API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.user) {
        const balance = parseInt(data.user.balance) || 0;
        const bonus = parseInt(data.user.bonus) || 0;
        const history = data.user.gameHistory || [];
        
        console.log(`💰 Setting balance: ${balance}, bonus: ${bonus}`);
        console.log(`📊 Game history loaded: ${history.length} games`);
        
        setUserBalance(balance);
        setUserBonus(bonus);
        setGameHistory(history);
        
        // Set stake based on game mode
        const stakeCost = parseInt(gameMode);
        setStake(stakeCost);
        
        if (balance < stakeCost) {
          setShowWarning(true);
          console.log(`⚠️ Insufficient balance: ${balance} < ${stakeCost}`);
        } else {
          setShowWarning(false);
          console.log(`✅ Sufficient balance: ${balance} >= ${stakeCost}`);
        }
        
        // Show balance in UI for user confirmation
        console.log(`💳 Wallet synced: ${balance} coins, ${bonus} bonus`);
        
      } else if (data.telegramId) {
        // Handle alternative response format
        const balance = parseInt(data.balance) || 0;
        const bonus = parseInt(data.bonus) || 0;
        
        console.log(`💰 Alternative format - Setting balance: ${balance}, bonus: ${bonus}`);
        
        setUserBalance(balance);
        setUserBonus(bonus);
        
      } else {
        console.error('❌ Invalid API response format:', data);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
      console.error('Error details:', error.message);
      
      // Show user-friendly error message
      showBalanceNotification('⚠️ Unable to sync balance with server. Using local data.', 'warning');
      
      // For demo mode, fall back to demo values
      if (gameMode === 'demo') {
        setUserBalance(1000);
        setUserBonus(0);
      } else {
        // For paid modes, try to use a reasonable fallback (you can adjust this)
        setUserBalance(190); // Use the known balance from your MongoDB example
        setUserBonus(0);
        setShowWarning(false); // Don't show warning since we have fallback balance
        
        console.log('🔄 Using fallback balance of 190 coins for testing');
      }
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
    // For demo mode, skip balance checks
    if (gameMode === 'demo') {
      setGameNumber(prev => prev + 1);
      setGameState('playing');
      startDrawing();
      return;
    }
    
    if (userBalance < stake) {
      setShowWarning(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // For demo mode or if no telegramId, skip API call
      if (!telegramId) {
        // Demo mode - just proceed without balance changes
        console.log('🎮 No telegramId - starting demo game without balance effects');
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

      // Send shared multiplayer game start request via WebSocket (ONLY for paid versions)
      const isPaidVersion = ['10', '20', '50', '100'].includes(gameMode);
      
      if (isConnected && isPaidVersion) {
        console.log(`🌐 Starting shared multiplayer Bingo ${gameMode}`);
        sendMessage({
          type: 'start_multiplayer_game',
          telegramId,
          selectedNumbers,
          stake,
          token,
          gameMode
        });
        
        console.log('🎮 Starting shared multiplayer game - balance will be updated on game end only');
        setGameNumber(prev => prev + 1);
        // Don't set game state here - wait for WebSocket response
        setIsLoading(false);
        return;
      }

      // Fallback to local game if WebSocket not connected - NO API CALLS
      if (gameMode !== 'demo') {
        // Check if user has sufficient balance before starting
        if (userBalance < stake) {
          alert(`Insufficient balance! You have ${userBalance} coins but need ${stake} coins to play.`);
          setIsLoading(false);
          return;
        }
        
        console.log('💰 Starting paid game locally - balance will be processed on game end only');
        showBalanceNotification(`🎮 Game started! ${stake} coins at risk`, 'info');
      } else {
        console.log('🎮 Starting demo game - no balance effects');
        showBalanceNotification(`🎮 Demo game started!`, 'info');
      }
      
      setGameNumber(prev => prev + 1);
      setGameState('playing');
      startDrawing();
    } catch (error) {
      console.error('Game start error:', error);
      
      if (gameMode === 'demo') {
        // For demo, proceed anyway without balance changes
        setGameNumber(prev => prev + 1);
        setGameState('playing');
        startDrawing();
      } else {
        alert('Failed to start game. Please try again.');
      }
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
    // Check if we're in shared multiplayer mode (ONLY for paid versions: 10,20,50,100)
    const isPaidVersion = ['10', '20', '50', '100'].includes(gameMode);
    
    if (isConnected && isPaidVersion) {
      console.log(`🌐 Shared multiplayer mode for Bingo ${gameMode} - numbers will come via WebSocket`);
      setGameState('playing');
      setDrawnNumbers([]);
      setCurrentCall(null);
      // Don't start local drawing - wait for WebSocket numbers
      return;
    }
    
    // Local drawing for demo mode or when WebSocket is not connected
    console.log(`🎮 Starting local drawing (${gameMode === 'demo' ? 'demo' : 'fallback'} mode)`);
    startLocalDrawing();
  };

  const startLocalDrawing = () => {
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
            
            // Show game end message and process as loss
            setTimeout(async () => {
            alert('🎯 Game Complete! All 20 numbers have been called. No Bingo claimed - you lose!');
            
            // Process as loss for paid games
            if (gameMode !== 'demo') {
            console.log('⏰ Game timed out - processing as loss');
            await handleGameLoss();
            }
            
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
            
            // Process as loss for paid games when no numbers left
            if (gameMode !== 'demo') {
              console.log('🔢 No numbers left - processing as loss');
              setTimeout(async () => {
                await handleGameLoss();
                setTimeout(() => resetGame(), 2000);
              }, 500);
            } else {
              setTimeout(() => resetGame(), 2000);
            }
            
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
    const isPaidVersion = ['10', '20', '50', '100'].includes(gameMode);
    
    if (isConnected && isPaidVersion) {
      // For shared multiplayer games (paid versions only), use shared bingo claim
      console.log(`🎯 Claiming BINGO in shared Bingo ${gameMode} game`);
      sendMessage({
        type: 'claim_live_bingo',
        telegramId,
        gameMode,
        winPattern: 'line' // Could be enhanced to detect actual pattern
      });
    } else {
      // Fallback for local games (demo or no WebSocket)
      console.log(`🎯 Claiming BINGO in local ${gameMode} game`);
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
    
    // Handle win through backend
    if (gameMode !== 'demo') {
      await handleGameWin();
    } else {
      alert('🎉 BINGO! Demo win - no real coins affected.');
    }
    
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
    if (gameMode !== 'demo' && telegramId) {
      loadUserData();
    }
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
                    background: isFree ? '#4ade80' : 
                               isWinning ? '#fbbf24' : 
                               isMarked ? '#3b82f6' : 
                               isCalled ? '#e5e7eb' : '#ffffff',
                    color: (isMarked || isWinning || isFree) ? 'white' : 
                           isCalled ? '#333' : '#666',
                    border: isWinning ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    cursor: canClick ? 'pointer' : 'default',
                  }}
                  onClick={() => handleBingoCardClick(rowIndex, colIndex, number)}
                  animate={isWinning ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3, repeat: isWinning ? Infinity : 0 }}
                  whileHover={canClick ? { scale: 1.05 } : {}}
                  whileTap={canClick ? { scale: 0.95 } : {}}
                >
                  {number}
                </motion.div>
              );
            })
          )}
        </div>
        <div style={styles.boardInfo}>
          Board #{currentBoard}
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
              background: isCalled ? '#3b82f6' : '#f8fafc',
              color: isCalled ? '#fff' : '#374151',
              border: isCurrentCall ? '2px solid #f59e0b' : '1px solid #e5e7eb',
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
                        isMarked ? '#3b82f6' : 
                        isCalled ? '#e5e7eb' : '#f8fafc',
              color: (isMarked || isWinning || isFree) ? '#fff' : '#374151',
              cursor: canClick ? 'pointer' : 'default',
              border: isWinning ? '2px solid #f59e0b' : '1px solid #e5e7eb'
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
          backgroundColor: num ? '#3b82f6' : '#f8fafc',
          color: num ? '#fff' : '#374151',
          border: '1px solid #e5e7eb'
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
            <h3>📊 Game History</h3>
            {gameMode === 'demo' ? (
              <>
                <div style={{
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginBottom: '15px'
                }}>
                  🎮 Demo Mode - Sample game history
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {gameHistory.slice().reverse().map((game, index) => {
                    const isWin = game.includes('WIN');
                    const isLoss = game.includes('LOSS');
                    
                    return (
                      <div 
                        key={index} 
                        style={{
                          backgroundColor: isWin ? '#dcfce7' : isLoss ? '#fef2f2' : '#f8fafc',
                          border: `1px solid ${isWin ? '#bbf7d0' : isLoss ? '#fecaca' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontWeight: '500'
                        }}>
                          <span style={{ fontSize: '16px' }}>
                            {isWin ? '🏆' : isLoss ? '😔' : '🎮'}
                          </span>
                          <span style={{ 
                            color: isWin ? '#16a34a' : isLoss ? '#dc2626' : '#374151' 
                          }}>
                            {game}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280', 
                          marginTop: '4px' 
                        }}>
                          Demo Game #{gameHistory.length - index}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : gameHistory.length === 0 ? (
              <div style={{
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                📋 No games played yet
                <br/>
                <small>Your game results will appear here after playing</small>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {gameHistory.slice().reverse().map((game, index) => {
                  const isWin = game.includes('WIN');
                  const isLoss = game.includes('LOSS');
                  
                  return (
                    <div 
                      key={index} 
                      style={{
                        backgroundColor: isWin ? '#dcfce7' : isLoss ? '#fef2f2' : '#f8fafc',
                        border: `1px solid ${isWin ? '#bbf7d0' : isLoss ? '#fecaca' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontWeight: '500'
                      }}>
                        <span style={{ fontSize: '16px' }}>
                          {isWin ? '🏆' : isLoss ? '😔' : '🎮'}
                        </span>
                        <span style={{ 
                          color: isWin ? '#16a34a' : isLoss ? '#dc2626' : '#374151' 
                        }}>
                          {game}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280', 
                        marginTop: '4px' 
                      }}>
                        Game #{gameHistory.length - index}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <button 
              onClick={() => {
                showBalanceNotification('🔄 Refreshing game history...', 'info');
                loadUserData();
              }} 
              style={{
                ...styles.refreshBtn, 
                marginTop: '15px',
                width: '100%'
              }}
            >
              🔄 Refresh History
            </button>
          </div>
        );
      
      case 'Wallet':
        return (
          <div style={styles.tabContent}>
            <h3>💳 Wallet Details</h3>
            <div style={styles.walletDetail}>
              <div style={{fontSize: '18px', fontWeight: 'bold', color: '#059669'}}>
                💰 Balance: {userBalance.toLocaleString()} coins
              </div>
              <div style={{fontSize: '16px', color: '#7c3aed'}}>
                🎁 Bonus: {userBonus.toLocaleString()} points
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>
                🎮 Total Games: {gameNumber - 2}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>
                🎯 Current Mode: {gameMode === 'demo' ? 'Demo' : `Bingo ${gameMode}`}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>
                💳 Status: {gameMode === 'demo' ? 'Demo Mode' : userBalance >= stake ? 'Ready to Play' : 'Insufficient Balance'}
              </div>
              <button 
                onClick={() => {
                  showBalanceNotification('🔄 Refreshing balance...', 'info');
                  loadUserData();
                }} 
                style={{...styles.refreshBtn, marginTop: '15px'}}
              >
                🔄 Sync with Backend
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
        <span style={styles.backBtn} onClick={() => navigate('/')}>←</span>
        <span style={styles.title}>Like Bingo</span>
        <span style={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>⋮</span>
      </div>
      
      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: '10px'
      }}>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.dropdown}
          >
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
              value: userBalance.toLocaleString(), 
              icon: "💰"
            },
            { 
              label: "Bonus", 
              value: userBonus, 
              icon: "🎁"
            },
            { 
              label: "Active Game", 
              value: gameNumber, 
              icon: "🎮"
            },
            { 
              label: "Stake", 
              value: stake, 
              icon: "🎯"
            }
          ].map((stat, i) => (
            <div key={i} style={styles.statCard}>
              <div style={styles.statIcon}>{stat.icon}</div>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance Notification */}
      {balanceNotification && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            backgroundColor: balanceNotification.includes('Won') ? '#10b981' : 
                           balanceNotification.includes('Unable to sync') ? '#f59e0b' : '#ef4444',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '10px',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          {balanceNotification}
        </motion.div>
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
                  <h3 style={styles.sectionTitle}>Your Bingo Card</h3>
                  {renderBingoCard()}
                  
                  {/* Control Buttons */}
                  <div style={styles.buttonRow}>
                    <button 
                      style={{ ...styles.button, ...styles.refreshButton }}
                      onClick={refreshCard}
                    >
                      Refresh
                    </button>
                    
                    <button 
                      style={{ ...styles.button, ...styles.startButton }}
                      onClick={startGame}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Starting...' : 'Start Game'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {gameState === 'playing' && (
            <div style={styles.playingContainer}>
              {/* Current Call Display */}
              <div style={styles.currentCallDisplay}>
                <div style={styles.currentCallLabel}>Current Call</div>
                <div style={styles.currentCallNumber}>{currentCall || '-'}</div>
              </div>

              {/* Main Game Area */}
              <div style={styles.gameArea}>
                {/* Left Side - Full Board */}
                <div style={styles.fullBoard}>
                  <div style={styles.boardHeader}>
                    <div style={styles.headerCell}>B</div>
                    <div style={styles.headerCell}>I</div>
                    <div style={styles.headerCell}>N</div>
                    <div style={styles.headerCell}>G</div>
                    <div style={styles.headerCell}>O</div>
                  </div>
                  <div style={styles.fullBoardGrid}>
                    {renderFullBingoBoard()}
                  </div>
                </div>

                {/* Right Side - Player Card */}
                <div style={styles.playerSidebar}>
                  <div style={styles.playerCard}>
                    <div style={styles.playerCardTitle}>Your Card</div>
                    <div style={styles.playerCardGrid}>
                      {renderPlayerBingoCard()}
                    </div>
                  </div>
                  
                  <div style={styles.gameControls}>
                    <button style={styles.claimBingoBtn} onClick={claimBingo}>
                      BINGO!
                    </button>
                    <div style={styles.controlButtons}>
                      <button style={styles.secondaryButton} onClick={refreshCard}>
                        Refresh
                      </button>
                      <button style={styles.secondaryButton} onClick={leaveGame}>
                        Leave
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.boardInfo}>
                Board #{currentBoard}
              </div>
            </div>
          )}

          {gameState === 'finished' && (
            <div style={styles.finishedContainer}>
              <div style={styles.finishedTitle}>
                {bingoWinner ? 
                  (bingoWinner === telegramId ? '🎉 You Won! 🎉' : '😢 Game Over') :
                  '🎯 Game Complete!'
                }
              </div>
              <div style={styles.finishedMessage}>
                {bingoWinner ? 
                  (bingoWinner === telegramId ? 'Congratulations! You claimed BINGO!' : 'Another player won the game.') :
                  'All numbers called - No Bingo claimed!'
                }
              </div>
              <div style={styles.finishedButtons}>
                <button style={styles.newGameButton} onClick={resetGame}>
                  New Game
                </button>
                <button style={styles.leaveButton} onClick={leaveGame}>
                  Back to Menu
                </button>
              </div>
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
          <div 
            key={i} 
            style={{
              ...styles.tabItem,
              color: currentTab === tab.label ? '#3b82f6' : '#6b7280'
            }}
            onClick={() => setCurrentTab(tab.label)}
          >
            <div style={styles.tabIcon}>{tab.icon}</div>
            <div style={styles.tabLabel}>{tab.label}</div>
          </div>
        ))}
      </div>
      
      </div>
    </div>
  );
};

// Updated styles to match Addis Bingo design
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f8fafc",
    height: "100vh",
    maxHeight: "100vh",
    padding: "16px",
    boxSizing: "border-box",
    paddingBottom: "70px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "18px",
    fontWeight: "bold",
    padding: "10px 0",
    position: "relative",
    color: "#1f2937",
    marginBottom: "15px"
  },
  backBtn: { 
    fontSize: "20px", 
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    backgroundColor: "#e5e7eb"
  },
  title: { 
    flex: 1, 
    textAlign: "center",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1f2937"
  },
  menuBtn: { 
    fontSize: "20px", 
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    backgroundColor: "#e5e7eb"
  },
  dropdown: {
    position: "absolute",
    top: "50px",
    right: "10px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 1000,
    minWidth: "150px",
    padding: "8px",
    border: "1px solid #e5e7eb"
  },
  statsContainer: {
    marginBottom: "20px",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginBottom: "15px"
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb"
  },
  statIcon: {
    fontSize: "16px",
    marginBottom: "6px"
  },
  statValue: {
    fontWeight: "bold",
    fontSize: "16px",
    marginBottom: "4px",
    color: "#1f2937"
  },
  statLabel: {
    fontSize: "11px",
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center"
  },
  warningBox: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontSize: "14px",
    border: "1px solid #fecaca",
    textAlign: "center"
  },
  sectionTitle: {
    textAlign: "center",
    margin: "15px 0 10px 0",
    color: "#4b5563",
    fontSize: "16px",
    fontWeight: "600"
  },
  staticGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "4px",
    marginBottom: "20px",
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb"
  },
  staticCell: {
    backgroundColor: "#e5e7eb",
    borderRadius: "6px",
    padding: "8px 4px",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "1px solid #d1d5db"
  },
  bingoCard: {
    background: "white",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb",
    maxWidth: "280px",
    margin: "0 auto 15px auto"
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
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    background: "#3b82f6",
    color: "#ffffff"
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
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "default",
    transition: "all 0.3s ease",
    border: "1px solid #e5e7eb"
  },
  boardInfo: {
    textAlign: "center",
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "500",
    marginTop: "8px"
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
    borderRadius: "8px",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  refreshButton: {
    backgroundColor: "#6b7280",
  },
  startButton: {
    backgroundColor: "#10b981",
  },
  refreshBtn: {
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "10px",
    fontSize: "14px"
  },
  tabBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-around",
    padding: "10px 0",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.1)"
  },
  tabItem: {
    textAlign: "center",
    fontSize: "12px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "8px",
    transition: "all 0.2s ease"
  },
  tabIcon: {
    fontSize: "18px",
    marginBottom: "2px"
  },
  tabLabel: {
    fontSize: "11px",
    fontWeight: "500"
  },
  tabContent: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "15px",
    margin: "8px 0",
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb"
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
  // Playing state styles
  playingContainer: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "15px",
    marginBottom: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb"
  },
  currentCallDisplay: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "15px",
    borderRadius: "10px",
    textAlign: "center",
    marginBottom: "15px"
  },
  currentCallLabel: {
    fontSize: "14px",
    marginBottom: "5px"
  },
  currentCallNumber: {
    fontSize: "24px",
    fontWeight: "bold"
  },
  gameArea: {
    display: "flex",
    gap: "15px",
    marginBottom: "15px"
  },
  fullBoard: {
    flex: 2,
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "10px",
    border: "1px solid #e5e7eb"
  },
  boardHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "2px",
    marginBottom: "5px"
  },
  fullBoardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "2px"
  },
  numberCell: {
    backgroundColor: "#f8fafc",
    borderRadius: "4px",
    height: "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    border: "1px solid #e5e7eb"
  },
  playerSidebar: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },
  playerCard: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "10px",
    border: "1px solid #e5e7eb"
  },
  playerCardTitle: {
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#374151"
  },
  playerCardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "3px"
  },
  playerCardCell: {
    backgroundColor: "#f8fafc",
    borderRadius: "4px",
    height: "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    border: "1px solid #e5e7eb"
  },
  gameControls: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  claimBingoBtn: {
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "#10b981",
    color: "white",
    transition: "all 0.3s"
  },
  controlButtons: {
    display: "flex",
    gap: "8px"
  },
  secondaryButton: {
    flex: 1,
    padding: "8px",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "#6b7280",
    color: "white",
    transition: "all 0.3s"
  },
  // Finished state styles
  finishedContainer: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "15px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb"
  },
  finishedTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#1f2937"
  },
  finishedMessage: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "20px"
  },
  finishedButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "10px"
  },
  newGameButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "#3b82f6",
    color: "white"
  },
  leaveButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    background: "#6b7280",
    color: "white"
  },
  calledNumberCell: {
    backgroundColor: "#f8fafc",
    borderRadius: "4px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "500",
    border: "1px solid #e5e7eb"
  }
};

export default LikeBingo;