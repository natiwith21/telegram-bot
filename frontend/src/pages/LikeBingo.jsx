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

        for (let row = 0; row < 5; row++) {
            const rowNumbers = [];
            for (let col = 0; col < 5; col++) {
                // Center cell is FREE
                if (row === 2 && col === 2) {
                    rowNumbers.push('*');
                } else {
                    const [min, max] = ranges[col];
                    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
                    rowNumbers.push(randomNum);
                }
            }
            card.push(rowNumbers);
        }
        setBingoCard(card);
        // Mark the FREE center cell as already marked
        setMarkedCells(new Set(['2-2']));
    };

    const startGame = async () => {
        if (gameState !== 'setup') return;

        // Check balance before starting
        if (userBalance < stake) {
            setShowWarning(true);
            alert('❌ Insufficient balance! Please top up your wallet.');
            return;
        }

        if (gameMode === 'demo') {
            // For demo mode, start countdown immediately
            setGameState('countdown');
            startCountdown();
            return;
        }

        if (!telegramId) {
            alert('❌ Cannot start game: Missing Telegram ID');
            return;
        }

        setIsLoading(true);
        try {
            // Generate and send selected numbers to backend
            const selectedNumbers = [];
            while (selectedNumbers.length < 5) {
                const num = Math.floor(Math.random() * 100) + 1;
                if (!selectedNumbers.includes(num)) {
                    selectedNumbers.push(num);
                }
            }

            const isPaidVersion = ['10', '20', '50', '100'].includes(gameMode);

            if (isPaidVersion) {
                // For paid versions, use shared multiplayer session via WebSocket
                console.log('🎮 Starting shared multiplayer bingo...');

                // Request to join a shared waiting session
                // Backend will create or join existing session
                const response = await fetch('https://telegram-bot-u2ni.onrender.com/api/like-bingo-join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegramId,
                        token,
                        gameMode,
                        stake
                    })
                });

                const data = await response.json();
                if (data.success) {
                    console.log('✅ Joined shared bingo session:', data.sessionId);
                    // The WebSocket will handle the game start and countdown
                    // No local countdown or drawing needed
                } else {
                    throw new Error(data.error || 'Failed to join bingo session');
                }
            } else {
                // Demo mode - start immediately with local countdown
                setGameState('countdown');
                startCountdown();
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            alert(`❌ Failed to start game: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const startCountdown = () => {
        let count = 5;
        setCountdown(count);
        setGameState('countdown');

        countdownIntervalRef.current = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
                setGameState('playing');
                startDrawing();
            }
        }, 1000);
    };

    const startDrawing = () => {
        // Only local drawing for demo mode
        const isPaidVersion = ['10', '20', '50', '100'].includes(gameMode);

        if (isPaidVersion) {
            // For paid versions, drawing is controlled by server via WebSocket
            console.log('🎮 Using server-controlled drawing for paid version');
            return;
        }

        // Demo mode - use local drawing
        startLocalDrawing();
    };

    const startLocalDrawing = () => {
        console.log('🎮 Starting local demo drawing...');
        setDrawnNumbers([]);
        setCurrentCall(null);
        setGameState('playing');
        setGameStarted(true);

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
        };

        // Start with first number after 1 second
        setTimeout(drawFirstNumber, 1000);

        // Then continue with interval
        drawIntervalRef.current = setInterval(() => {
            setDrawnNumbers(prev => {
                // Check if we've drawn all 75 numbers
                if (prev.length >= 75) {
                    clearInterval(drawIntervalRef.current);
                    drawIntervalRef.current = null;
                    setGameState('finished');
                    setGameStarted(false);

                    // For demo mode, automatically handle result after 75 draws
                    console.log('🎯 Demo game ended after 75 draws');
                    setTimeout(() => {
                        // Demo auto-loss when all numbers drawn
                        alert('😔 Game ended! All numbers have been called.');
                        resetGame();
                    }, 1000);

                    return prev;
                }

                // Get available numbers (1-75) that haven't been drawn
                const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
                    .filter(num => !prev.includes(num));

                if (availableNumbers.length === 0) {
                    clearInterval(drawIntervalRef.current);
                    drawIntervalRef.current = null;
                    setGameState('finished');
                    return prev;
                }

                // Draw a random number
                const randomIndex = Math.floor(Math.random() * availableNumbers.length);
                const drawnNumber = availableNumbers[randomIndex];

                setCurrentCall(drawnNumber);

                if (soundEnabled) {
                    playDrawSound();
                }

                const newDrawn = [...prev, drawnNumber];
                console.log(`📢 Called ${drawnNumber} (${newDrawn.length}/75)`);
                return newDrawn;
            });
        }, 3000); // Draw every 3 seconds for demo
    };

    const claimBingo = async () => {
        // Check if the player has a winning pattern
        const hasWinningPattern = checkBingoCardWin(markedCells);

        if (!hasWinningPattern) {
            alert('❌ No Bingo! You do not have a winning pattern yet.');
            return;
        }

        const isPaidVersion = ['10', '20', '50', '100'].includes(gameMode);

        if (isPaidVersion) {
            // For paid versions, send claim to server via WebSocket
            console.log('🏆 Claiming Bingo in shared game!');
            sendMessage({
                type: 'claim_bingo',
                telegramId,
                gameMode,
                markedCells: Array.from(markedCells),
                drawnNumbers,
                bingoCard
            });

            // Server will broadcast the winner to all players
            // and handle balance updates
        } else {
            // Demo mode - just show local win
            alert('🎉 BINGO! Demo win - no real coins affected.');
            setGameState('finished');

            // Stop drawing
            if (drawIntervalRef.current) {
                clearInterval(drawIntervalRef.current);
                drawIntervalRef.current = null;
            }

            setTimeout(() => resetGame(), 3000);
        }
    };

    const resetGame = () => {
        setGameState('setup');
        setGameStarted(false);
        setDrawnNumbers([]);
        setCurrentCall(null);
        setCountdown(0);
        setMarkedCells(new Set(['2-2'])); // Keep FREE cell marked
        setWinningLine(null);
        setBingoWinner(null);
        setMultiplayerCountdown(null);

        // Clear any active intervals
        if (drawIntervalRef.current) {
            clearInterval(drawIntervalRef.current);
            drawIntervalRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        // Generate new card
        generateBingoCard();
        setGameNumber(prev => prev + 1);

        // Reload user data to get updated balance
        if (gameMode !== 'demo') {
            loadUserData();
        }
    };

    const refreshCard = () => {
        generateBingoCard();
        setCurrentBoard(prev => prev + 1);
        setMarkedCells(new Set(['2-2'])); // Reset marked cells, keep FREE center
    };

    const leaveGame = () => {
        resetGame();
        navigate('/');
    };

    const [audioContext, setAudioContext] = useState(null);
    const [audioEnabled, setAudioEnabled] = useState(false);

    useEffect(() => {
        // Initialize Audio Context on first user interaction
        const initAudio = () => {
            if (!audioContext && soundEnabled) {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                setAudioContext(ctx);
                setAudioEnabled(true);
            }
        };

        document.addEventListener('click', initAudio, { once: true });
        return () => document.removeEventListener('click', initAudio);
    }, [soundEnabled]);

    const playDrawSound = () => {
        if (!audioContext || !audioEnabled || !soundEnabled) return;

        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 600;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.error('Sound play error:', error);
        }
    };

    const playWinSound = () => {
        if (!audioContext || !audioEnabled || !soundEnabled) return;

        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Sound play error:', error);
        }
    };

    const refreshWallet = async () => {
        setIsLoading(true);
        try {
            await loadUserData();
            alert('✅ Wallet refreshed successfully!');
        } catch (error) {
            alert('❌ Failed to refresh wallet');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBingoCardClick = (rowIndex, colIndex, number) => {
        if (gameState !== 'playing') return;
        const cellKey = `${rowIndex}-${colIndex}`;

        setMarkedCells(prev => {
            const newMarked = new Set(prev);
            if (newMarked.has(cellKey)) {
                newMarked.delete(cellKey);
            } else {
                newMarked.add(cellKey);
            }
            return newMarked;
        });
    };

    // Check for winning Bingo pattern (any full row, column, or diagonal)
    const checkBingoCardWin = (marked) => {
        const winPatterns = [];

        // Check rows
        for (let row = 0; row < 5; row++) {
            const rowPattern = [];
            for (let col = 0; col < 5; col++) {
                rowPattern.push(`${row}-${col}`);
            }
            winPatterns.push(rowPattern);
        }

        // Check columns
        for (let col = 0; col < 5; col++) {
            const colPattern = [];
            for (let row = 0; row < 5; row++) {
                colPattern.push(`${row}-${col}`);
            }
            winPatterns.push(colPattern);
        }

        // Check diagonals
        winPatterns.push(['0-0', '1-1', '2-2', '3-3', '4-4']); // Top-left to bottom-right
        winPatterns.push(['0-4', '1-3', '2-2', '3-1', '4-0']); // Top-right to bottom-left

        for (const pattern of winPatterns) {
            if (pattern.every(cell => marked.has(cell))) {
                setWinningLine(pattern);
                return true;
            }
        }

        return false;
    };

    // Render mini bingo card for setup mode (compact view)
    const renderMiniBingoCard = () => {
        return (
            <div style={styles.miniCard}>
                {bingoCard.map((row, rowIndex) =>
                    row.map((number, colIndex) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        const isFree = number === '*';
                        return (
                            <div key={cellKey} style={styles.miniCardCell}>
                                {isFree ? '*' : number}
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    // Render full bingo card for playing mode (large view with animations)
    const renderBingoCard = () => {
        return (
            <motion.div
                style={styles.bingoCard}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
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
                                                isMarked ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                                                    isCalled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
                                        color: (isMarked || isWinning || isFree) ? '#fff' : '#333',
                                        cursor: canClick ? 'pointer' : 'default',
                                        border: isWinning ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.3)'
                                    }}
                                    onClick={() => handleBingoCardClick(rowIndex, colIndex, number)}
                                    whileHover={canClick ? { scale: 1.1 } : {}}
                                    whileTap={canClick ? { scale: 0.95 } : {}}
                                >
                                    {isFree ? '★' : number}
                                </motion.div>
                            );
                        })
                    )}
                </div>

                <div style={styles.boardInfo}>Board #{currentBoard}</div>
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
                            backgroundColor: selectedNumber === num ? '#1f8f3d' : drawnNumbers.includes(num) ? '#ff8a2f' : '#ead9f2',
                            color: selectedNumber === num || drawnNumbers.includes(num) ? '#fff' : '#6a2f6a'
                        }}
                        onClick={() => handleGridNumberClick(num)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
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
                        ) : (
                            <>
                                {gameHistory.length === 0 ? (
                                    <div style={{
                                        backgroundColor: '#f3f4f6',
                                        color: '#6b7280',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        textAlign: 'center'
                                    }}>
                                        No games played yet. Start playing to see your history!
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
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <button
                                    onClick={loadUserData}
                                    style={{
                                        ...styles.refreshBtn,
                                        width: '100%',
                                        marginTop: '15px'
                                    }}
                                >
                                    🔄 Refresh History
                                </button>
                            </>
                        )}
                    </div>
                );

            case 'Wallet':
                return (
                    <div style={styles.tabContent}>
                        <h3>💰 Wallet Details</h3>
                        <div style={styles.walletDetail}>
                            <p><strong>Main Balance:</strong> {userBalance} coins</p>
                            <p><strong>Bonus Balance:</strong> {userBonus} coins</p>
                            <p><strong>Current Stake:</strong> {stake} coins</p>
                            <p><strong>Game Mode:</strong> {gameMode === 'demo' ? 'Demo (Free)' : `${gameMode} Coins`}</p>
                            <p><strong>Next Game Cost:</strong> {stake} coins</p>
                        </div>
                        {gameMode === 'demo' ? (
                            <div style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '12px',
                                borderRadius: '8px',
                                marginTop: '15px',
                                textAlign: 'center'
                            }}>
                                🎮 Demo Mode - No real coins used
                            </div>
                        ) : (
                            <button
                                onClick={refreshWallet}
                                style={{ ...styles.refreshBtn, marginTop: '15px' }}
                            >
                                🔄 Refresh Wallet
                            </button>
                        )}
                        {process.env.NODE_ENV === 'development' && (
                            <button
                                onClick={async () => {
                                    try {
                                        const testUrl = `https://telegram-bot-u2ni.onrender.com/api/user/5888330255`;
                                        const response = await fetch(testUrl);
                                        const data = await response.json();
                                        console.log('Test API Response:', data);
                                        alert(JSON.stringify(data, null, 2));
                                    } catch (error) {
                                        console.error('Test API Error:', error);
                                    }
                                }}
                                style={{ ...styles.refreshBtn, marginTop: '10px', backgroundColor: '#ef4444' }}
                            >
                                🧪 Test API (Dev Only)
                            </button>
                        )}
                    </div>
                );

            case 'Profile':
                return (
                    <div style={styles.tabContent}>
                        <h3>👤 Profile</h3>
                        <div style={styles.profileInfo}>
                            <p><strong>Telegram ID:</strong> {telegramId || 'Guest'}</p>
                            <p><strong>Games Played:</strong> {gameHistory.length}</p>
                            <p><strong>Current Game:</strong> #{gameNumber}</p>
                            <p><strong>Sound:</strong> {soundEnabled ? '🔊 On' : '🔇 Off'}</p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.appShell}>
                {/* Header */}
                <div style={styles.header}>
                    <span style={styles.backBtn} onClick={() => navigate('/')}>👍</span>
                    <span style={styles.title}>Like Bingo ⩔</span>
                    <span style={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>⋮</span>
                </div>

                {/* Content Area - Fixed height, no scrolling */}
                <div style={{
                    flex: 1,
                    overflowY: 'hidden',
                    overflowX: 'hidden',
                    paddingBottom: '40px', /* Reduced padding to accommodate smaller tab bar */
                    marginBottom: '0',
                    maxHeight: 'calc(100vh - 90px)' /* Adjusted max height */
                }}>

                    {/* Debug Info - Remove this after fixing */}
                    {process.env.NODE_ENV === 'development' && (
                        <div style={{
                            backgroundColor: '#f3f4f6',
                            padding: '10px',
                            fontSize: '12px',
                            color: '#374151',
                            borderRadius: '8px',
                            margin: '10px 0'
                        }}>
                            <strong>Debug Info:</strong><br />
                            TelegramId: {telegramId || 'Not set'}<br />
                            GameMode: {gameMode}<br />
                            Balance: {userBalance}<br />
                            API URL: https://telegram-bot-u2ni.onrender.com/api/user/{telegramId}
                        </div>
                    )}

                    {/* Menu Dropdown */}
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={styles.dropdown}
                            >

                                <div onClick={() => { setStake(10); setShowMenu(false); }}>Set Stake: 10 coins</div>
                                <div onClick={() => { setStake(20); setShowMenu(false); }}>Set Stake: 20 coins</div>
                                <div onClick={() => { setSoundEnabled(!soundEnabled); setShowMenu(false); }}>
                                    Sound: {soundEnabled ? 'On' : 'Off'}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Top Stats */}
                    <div style={styles.statusGrid}>
                        <div style={styles.statusCard}>
                            <div style={styles.statusLabel}>Wallet</div>
                            <div style={styles.statusValue}>{userBalance}</div>
                        </div>
                        <div style={styles.statusCard}>
                            <div style={styles.statusLabel}>Bonus</div>
                            <div style={styles.statusValue}>{userBonus}</div>
                        </div>
                        <div style={styles.statusCard}>
                            <div style={styles.statusLabel}>Active Game</div>
                            <div style={styles.statusValue}>{gameNumber}</div>
                        </div>
                        <div style={styles.statusCard}>
                            <div style={styles.statusLabel}>Stake</div>
                            <div style={styles.statusValue}>{stake}</div>
                        </div>
                    </div>

                    {/* Warning */}
                    {showWarning && (
                        <div style={styles.warning}>
                            Please top up your wallet. If you already have and are still seeing this, please refresh the page.
                        </div>
                    )}

                    {/* Balance Notification */}
                    {balanceNotification && (
                        <div style={styles.notification}>
                            {balanceNotification}
                        </div>
                    )}

                    {/* Game Content */}
                    {currentTab === 'Game' && (
                        <>
                            {gameState === 'setup' && (
                                <>
                                    {/* Static Grid */}
                                    {renderStaticGrid()}

                                    {/* Bottom Row: Mini Card + Buttons (only show if number selected) */}
                                    {hasSelectedNumber && (
                                        <div style={styles.bottomRow}>
                                            {/* Mini Bingo Card (24% width) */}
                                            {renderMiniBingoCard()}

                                            {/* Action Buttons (66% width) */}
                                            <div style={styles.actionButtons}>
                                                <button
                                                    style={{ ...styles.button, backgroundColor: "#2f88ff" }}
                                                    onClick={refreshCard}
                                                >
                                                    Refresh
                                                </button>
                                                <button
                                                    style={{ ...styles.button, backgroundColor: "#ff6600" }}
                                                    onClick={startGame}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? 'Starting...' : 'Start Game'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Live Bingo Hall (when game is playing) */}
                            {(gameState === 'playing' || gameState === 'finished') && (
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

                                    {/* Title */}
                                    <div style={styles.bingoTitle}>BINGO</div>

                                    {/* Main Content */}
                                    <div style={styles.mainContent}>
                                        {/* Left: Full Bingo Board (1-75) */}
                                        <div style={styles.fullBingoCard}>
                                            {/* Header: B I N G O */}
                                            <div style={styles.bingoCardHeader}>
                                                <div style={styles.headerCell}>B</div>
                                                <div style={styles.headerCell}>I</div>
                                                <div style={styles.headerCell}>N</div>
                                                <div style={styles.headerCell}>G</div>
                                                <div style={styles.headerCell}>O</div>
                                            </div>

                                            {/* Full board grid */}
                                            <div style={styles.fullBingoGrid}>
                                                {renderFullBingoBoard()}
                                            </div>
                                        </div>

                                        {/* Right Panel: Controls and Your Card */}
                                        <div style={styles.rightPanel}>
                                            {/* Count Down */}
                                            <div style={styles.controlPanel}>
                                                <div style={styles.controlTitle}>Count Down</div>
                                                <div style={styles.controlValue}>
                                                    {multiplayerCountdown !== null ? multiplayerCountdown : '-'}
                                                </div>
                                            </div>

                                            {/* Current Call */}
                                            <div style={styles.controlPanel}>
                                                <div style={styles.controlTitle}>Current Call</div>
                                                <div style={styles.controlValue}>
                                                    {currentCall || '-'}
                                                </div>
                                            </div>

                                            {/* Your Card (5x5 mini grid) */}
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

                                    {/* Bottom Controls */}
                                    <div style={styles.bingoSection}>
                                        <div style={styles.bingoControls}>
                                            <button style={styles.claimBingoBtn} onClick={claimBingo}>
                                                🏆 Claim Bingo
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
                                                {bingoWinner === telegramId ? '🎉 You Won!' : '😔 Game Over'}
                                            </div>
                                            <div style={styles.gameEndMessage}>
                                                {bingoWinner ?
                                                    (bingoWinner === telegramId ? 'Congratulations! You won the Bingo!' : 'Another player won the Bingo!') :
                                                    'Game ended. Better luck next time!'}
                                            </div>
                                            <div style={styles.gameEndButtons}>
                                                <button style={styles.newGameBtn} onClick={resetGame}>
                                                    🔄 New Game
                                                </button>
                                                <button style={styles.leaveGameBtn} onClick={leaveGame}>
                                                    🏠 Exit
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Other Tabs */}
                    {currentTab !== 'Game' && renderTabContent()}

                </div>

                {/* Bottom Navigation */}
                <div style={styles.tabBar}>
                    {[
                        { label: 'Game', icon: '🎮' },
                        { label: 'Scores', icon: '🏆' },
                        { label: 'History', icon: '🕘' },
                        { label: 'Wallet', icon: '💼' },
                        { label: 'Profile', icon: '👤' }
                    ].map((tab) => (
                        <div
                            key={tab.label}
                            onClick={() => setCurrentTab(tab.label)}
                            style={{
                                ...styles.tabItem,
                                color: currentTab === tab.label ? '#2f88ff' : 'black',
                                fontWeight: currentTab === tab.label ? '700' : 'normal'
                            }}
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

// Enhanced styles for bingo game - PURPLE THEME
const styles = {
    container: {
        minHeight: "100vh",
        maxHeight: "100vh",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#e9d9f0",
        padding: "0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden"
    },
    appShell: {
        width: "100%",
        maxWidth: "390px",
        height: "100vh",
        maxHeight: "100vh",
        background: "#b992c9",
        borderRadius: "0",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        overflow: "hidden",
        padding: "12px 14px 0",
        position: "relative",
        display: "flex",
        flexDirection: "column"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "14px",
        fontWeight: "bold",
        padding: "4px 0",
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
    statusGrid: {
        display: "flex",
        gap: "4px",
        justifyContent: "space-between",
        margin: "6px 0 10px 0" /* Added bottom margin */
    },
    statusCard: {
        background: "#fff",
        padding: "4px 6px",
        borderRadius: "20px",
        textAlign: "center",
        minWidth: "60px",
        flex: 1
    },
    statusLabel: {
        fontSize: "9px",
        color: "#7a4f9a"
    },
    statusValue: {
        fontSize: "11px",
        fontWeight: "700",
        color: "#7a4f9a"
    },
    warning: {
        margin: "6px 0 10px 0", /* Added bottom margin */
        background: "#ffdede",
        color: "#c94b4b",
        padding: "8px",
        borderRadius: "8px",
        textAlign: "center",
        fontSize: "11px"
    },
    notification: {
        margin: "6px 0 10px 0", /* Added bottom margin */
        background: "#dcfce7",
        color: "#16a34a",
        padding: "8px",
        borderRadius: "8px",
        textAlign: "center",
        fontSize: "11px",
        fontWeight: "500"
    },
    sectionTitle: {
        textAlign: "center",
        margin: "15px 0 10px 0",
        color: "#4a5568"
    },
    staticGrid: {
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: "4px", /* Increased gap */
        padding: "4px", /* Increased padding */
        maxWidth: "350px",
        margin: "0 auto 15px auto" /* Added bottom margin */
    },
    staticCell: {
        width: "28px", /* Reduced box size */
        height: "28px", /* Reduced box size */
        borderRadius: "4px",
        background: "#ead9f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "600",
        color: "#6a2f6a",
        fontSize: "14px", /* Normal font size */
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
        cursor: "pointer",
        transition: "all 0.3s ease"
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
    bottomRow: {
        marginTop: "6px",
        display: "flex",
        gap: "8px",
        alignItems: "flex-start"
    },
    miniCard: {
        background: "rgba(255,255,255,0.12)",
        borderRadius: "8px",
        padding: "6px",
        width: "24%",
        fontSize: "10px",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        textAlign: "center",
        gap: "2px",
        lineHeight: "1.2",
        color: "#fff"
    },
    miniCardCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "14px",
        fontSize: "9px"
    },
    actionButtons: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "6px",
        width: "66%"
    },
    buttonRow: {
        marginTop: "14px",
        display: "flex",
        gap: "12px",
        alignItems: "flex-start"
    },
    button: {
        border: "none",
        padding: "8px 10px",
        borderRadius: "20px",
        fontWeight: "700",
        fontSize: "13px",
        cursor: "pointer",
        color: "#fff",
        transition: "all 0.2s ease"
    },
    refreshBtn: {
        background: "#2f88ff",
        color: "#fff",
        border: "none",
        padding: "8px 10px",
        borderRadius: "20px",
        fontWeight: "700",
        fontSize: "13px",
        cursor: "pointer"
    },
    tabBar: {
        position: "fixed",
        left: "0",
        right: "0",
        bottom: "0",
        maxWidth: "390px",
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        background: "white",
        borderRadius: "0",
        padding: "6px 10px", /* Reduced padding */
        zIndex: 1000,
        borderTop: "1px solid #e5e7eb",
        height: "40px" /* Explicitly set height */
    },
    tabItem: {
        textAlign: "center",
        fontSize: "12px",
        color: "black",
        width: "20%",
        cursor: "pointer",
        transition: "all 0.2s ease"
    },
    tabIcon: {
        fontSize: "16px" /* Reduced icon size */
    },
    tabLabel: {
        marginTop: "2px", /* Reduced margin */
        fontSize: "10px" /* Reduced label font size */
    },
    tabContent: {
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "15px",
        margin: "8px 0",
        height: "calc(100vh - 220px)",
        maxHeight: "calc(100vh - 220px)",
        overflowY: "auto",
        overflowX: "hidden"
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
    // New Bingo Hall Styles
    bingoHallContainer: {
        background: "rgba(0, 0, 0, 0.8)",
        borderRadius: "15px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
        marginBottom: "15px" /* Added bottom margin */
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
    bingoTitle: {
        textAlign: "center",
        padding: "8px",
        fontSize: "20px",
        fontWeight: "bold",
        letterSpacing: "2px",
        background: "linear-gradient(to right, #ff8a00, #ff0080, #00b3ff)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        textShadow: "0 0 10px rgba(255, 255, 255, 0.2)"
    },
    mainContent: {
        display: "flex",
        padding: "8px",
        gap: "8px"
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
    fullBingoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "3px"
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
        padding: "10px",
        textAlign: "center",
        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
        marginBottom: "8px"
    },
    controlTitle: {
        fontSize: "14px",
        fontWeight: "bold",
        marginBottom: "8px",
        color: "#a0a0a0"
    },
    controlValue: {
        fontSize: "18px",
        fontWeight: "bold",
        height: "35px",
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
    boardNumber: {
        textAlign: "center",
        margin: "10px 0",
        fontSize: "14px",
        color: "#ffcc00"
    },
    bingoSection: {
        background: "linear-gradient(to right, #ff8a00, #ff0080)",
        padding: "12px",
        textAlign: "center",
        margin: "8px",
        borderRadius: "8px",
        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
    },
    bingoControls: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px"
    },
    controlButtonsRow: {
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        flexWrap: "wrap"
    },
    refreshBingoBtn: {
        padding: "10px 16px",
        border: "none",
        borderRadius: "16px",
        fontSize: "14px",
        fontWeight: "bold",
        cursor: "pointer",
        background: "#1a2a4a",
        color: "#fff",
        transition: "all 0.3s",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        minWidth: "100px",
        justifyContent: "center"
    },
    leaveBingoBtn: {
        padding: "10px 16px",
        border: "none",
        borderRadius: "16px",
        fontSize: "14px",
        fontWeight: "bold",
        cursor: "pointer",
        background: "#ff3333",
        color: "#fff",
        transition: "all 0.3s",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        minWidth: "100px",
        justifyContent: "center"
    },
    claimBingoBtn: {
        padding: "12px 24px",
        border: "none",
        borderRadius: "20px",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer",
        background: "linear-gradient(to right, #00ff00, #ffff00)",
        color: "#000",
        transition: "all 0.3s",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "0 4px 15px rgba(0, 255, 0, 0.4)",
        animation: "pulse 1s infinite",
        minWidth: "160px",
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
