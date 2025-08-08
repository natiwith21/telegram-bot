import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';

const SpinImproved = () => {
  const { telegramId } = useTelegram();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [userBalance, setUserBalance] = useState({ balance: 0, bonus: 0 });
  const [spinHistory, setSpinHistory] = useState([]);
  const [canSpin, setCanSpin] = useState(true);
  const [lastSpinTime, setLastSpinTime] = useState(0);
  const wheelRef = useRef(null);

  // Enhanced prizes with better rewards and animations
  const prizes = [
    { 
      id: 1,
      label: '🪙 50 Coins', 
      value: 50, 
      type: 'coins', 
      color: 'from-yellow-400 to-yellow-600',
      probability: 0.15,
      rarity: 'common'
    },
    { 
      id: 2,
      label: '🎁 25 Bonus', 
      value: 25, 
      type: 'bonus', 
      color: 'from-blue-400 to-blue-600',
      probability: 0.20,
      rarity: 'common'
    },
    { 
      id: 3,
      label: '💰 100 Coins', 
      value: 100, 
      type: 'coins', 
      color: 'from-green-400 to-green-600',
      probability: 0.10,
      rarity: 'uncommon'
    },
    { 
      id: 4,
      label: '❌ Try Again', 
      value: 0, 
      type: 'lose', 
      color: 'from-gray-400 to-gray-600',
      probability: 0.25,
      rarity: 'common'
    },
    { 
      id: 5,
      label: '💎 200 Coins', 
      value: 200, 
      type: 'coins', 
      color: 'from-purple-400 to-purple-600',
      probability: 0.08,
      rarity: 'rare'
    },
    { 
      id: 6,
      label: '🎊 50 Bonus', 
      value: 50, 
      type: 'bonus', 
      color: 'from-pink-400 to-pink-600',
      probability: 0.12,
      rarity: 'uncommon'
    },
    { 
      id: 7,
      label: '🌟 75 Coins', 
      value: 75, 
      type: 'coins', 
      color: 'from-indigo-400 to-indigo-600',
      probability: 0.08,
      rarity: 'uncommon'
    },
    { 
      id: 8,
      label: '🔥 500 MEGA!', 
      value: 500, 
      type: 'coins', 
      color: 'from-red-500 to-orange-500',
      probability: 0.02,
      rarity: 'legendary'
    }
  ];

  // Weighted random selection based on probability
  const selectPrize = () => {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const prize of prizes) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        return prize;
      }
    }
    
    return prizes[0]; // Fallback
  };

  // Fetch user balance
  const fetchUserBalance = async () => {
    if (!telegramId) return;
    
    try {
      const response = await fetch(`https://telegram-bot-2-rffp.onrender.com/api/user/${telegramId}`);
      if (response.ok) {
        const data = await response.json();
        setUserBalance({ balance: data.balance, bonus: data.bonus });
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  // Spin cooldown (prevent spam)
  const SPIN_COOLDOWN = 3000; // 3 seconds
  
  const spinWheel = async () => {
    if (isSpinning || !canSpin) return;
    
    const now = Date.now();
    if (now - lastSpinTime < SPIN_COOLDOWN) {
      const remaining = Math.ceil((SPIN_COOLDOWN - (now - lastSpinTime)) / 1000);
      alert(`Please wait ${remaining} seconds before spinning again!`);
      return;
    }
    
    setIsSpinning(true);
    setResult(null);
    setCanSpin(false);
    setLastSpinTime(now);
    
    // Select prize with weighted probability
    const selectedPrize = selectPrize();
    
    // Calculate rotation for smooth animation
    const prizeIndex = prizes.findIndex(p => p.id === selectedPrize.id);
    const segmentAngle = 360 / prizes.length;
    const prizeAngle = (prizeIndex * segmentAngle) + (segmentAngle / 2);
    
    // Add multiple rotations for dramatic effect
    const spins = 4 + Math.random() * 2; // 4-6 full rotations
    const finalRotation = rotation + (360 * spins) - prizeAngle + (Math.random() - 0.5) * 10;
    
    setRotation(finalRotation);
    
    // Haptic feedback for mobile
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    
    // Show result after animation completes
    setTimeout(async () => {
      setResult(selectedPrize);
      setIsSpinning(false);
      
      // Add to history
      setSpinHistory(prev => [
        { ...selectedPrize, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4) // Keep last 5 spins
      ]);
      
      // Send result to backend
      if (telegramId && selectedPrize.type !== 'lose') {
        try {
          const response = await fetch(`https://telegram-bot-2-rffp.onrender.com/api/spin-result/${telegramId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: selectedPrize.type,
              amount: selectedPrize.value,
              result: selectedPrize.label,
              rarity: selectedPrize.rarity
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserBalance({ 
              balance: data.newBalance || userBalance.balance, 
              bonus: data.newBonus || userBalance.bonus 
            });
          }
        } catch (error) {
          console.error('Failed to send spin result:', error);
        }
      }
      
      // Re-enable spinning after cooldown
      setTimeout(() => {
        setCanSpin(true);
      }, SPIN_COOLDOWN);
      
      // Celebration effects for big wins
      if (selectedPrize.rarity === 'legendary' || selectedPrize.value >= 200) {
        triggerCelebration();
      }
      
    }, 4000); // Match animation duration
  };

  // Celebration effect for big wins
  const triggerCelebration = () => {
    // Create confetti effect
    for (let i = 0; i < 50; i++) {
      createConfetti();
    }
    
    // Enhanced haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      setTimeout(() => window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy'), 100);
      setTimeout(() => window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy'), 300);
    }
  };

  const createConfetti = () => {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'][Math.floor(Math.random() * 5)]};
      top: -10px;
      left: ${Math.random() * 100}vw;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      animation: confetti-fall 3s linear forwards;
    `;
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 3000);
  };

  // Fetch balance on mount
  useEffect(() => {
    fetchUserBalance();
  }, [telegramId]);

  // Add confetti animation styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => style.remove();
  }, []);

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-600',
      uncommon: 'text-green-600',
      rare: 'text-purple-600',
      legendary: 'text-orange-600'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityBadge = (rarity) => {
    const badges = {
      common: '🟢',
      uncommon: '🔵', 
      rare: '🟣',
      legendary: '🟠'
    };
    return badges[rarity] || badges.common;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl font-bold text-purple-800 mb-2">🎰 Fortune Wheel</h1>
          <p className="text-gray-600">Spin the wheel of destiny!</p>
          
          {/* Balance Display */}
          {telegramId && (
            <div className="flex justify-center space-x-4 mt-4">
              <div className="bg-white/80 backdrop-blur rounded-lg px-3 py-1 shadow-lg">
                <span className="text-sm text-gray-600">💰 {userBalance.balance.toLocaleString()}</span>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-lg px-3 py-1 shadow-lg">
                <span className="text-sm text-gray-600">🎁 {userBalance.bonus.toLocaleString()}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Wheel Container */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-8"
        >
          {/* Outer Ring */}
          <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-4 shadow-2xl">
            {/* Pointer */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
              <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-red-600 drop-shadow-lg"></div>
            </div>
            
            {/* Wheel */}
            <motion.div
              ref={wheelRef}
              className="relative w-80 h-80 mx-auto rounded-full overflow-hidden border-4 border-white shadow-inner"
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: "easeOut" }}
            >
              {prizes.map((prize, index) => {
                const angle = (360 / prizes.length) * index;
                const nextAngle = (360 / prizes.length) * (index + 1);
                
                return (
                  <div
                    key={prize.id}
                    className={`absolute w-full h-full bg-gradient-to-r ${prize.color}`}
                    style={{
                      clipPath: `polygon(50% 50%, 
                        ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%, 
                        ${50 + 50 * Math.cos((nextAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((nextAngle - 90) * Math.PI / 180)}%)`,
                    }}
                  >
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        transform: `rotate(${angle + (360 / prizes.length) / 2}deg)`,
                        transformOrigin: '50% 50%'
                      }}
                    >
                      <div className="text-white font-bold text-xs text-center leading-tight transform -rotate-90">
                        <div className="mb-1">{getRarityBadge(prize.rarity)}</div>
                        <div className="whitespace-nowrap">{prize.label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Spin Button */}
        <div className="text-center mb-6">
          <motion.button
            whileHover={{ scale: canSpin ? 1.05 : 1 }}
            whileTap={{ scale: canSpin ? 0.95 : 1 }}
            onClick={spinWheel}
            disabled={isSpinning || !canSpin}
            className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 ${
              canSpin && !isSpinning
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-purple-500/25 transform hover:-translate-y-1'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSpinning ? (
              <span className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Spinning...</span>
              </span>
            ) : !canSpin ? (
              `Wait ${Math.ceil((SPIN_COOLDOWN - (Date.now() - lastSpinTime)) / 1000)}s`
            ) : (
              '🎰 SPIN TO WIN!'
            )}
          </motion.button>
        </div>

        {/* Result Display */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -50 }}
              className={`text-center p-6 rounded-2xl mb-6 shadow-2xl ${
                result.type === 'lose' 
                  ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300' 
                  : result.rarity === 'legendary'
                    ? 'bg-gradient-to-br from-orange-100 to-red-100 border-2 border-orange-400'
                    : 'bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-300'
              }`}
            >
              <div className="text-5xl mb-3">
                {result.type === 'lose' ? '😅' : result.rarity === 'legendary' ? '🏆' : '🎉'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {result.type === 'lose' ? 'Better Luck Next Time!' : 'Congratulations!'}
              </h3>
              <p className="text-lg mb-2">{result.label}</p>
              <div className="flex items-center justify-center space-x-2">
                <span className={getRarityColor(result.rarity)}>{getRarityBadge(result.rarity)}</span>
                <span className={`font-semibold ${getRarityColor(result.rarity)}`}>
                  {result.rarity.toUpperCase()}
                </span>
              </div>
              {result.type !== 'lose' && (
                <p className="text-lg font-bold text-green-600 mt-2">
                  +{result.value} {result.type === 'coins' ? 'coins' : 'bonus'}!
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spin History */}
        {spinHistory.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3">Recent Spins</h3>
            <div className="space-y-2">
              {spinHistory.map((spin, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <span>{getRarityBadge(spin.rarity)}</span>
                    <span>{spin.label}</span>
                  </span>
                  <span className="text-gray-500">{spin.timestamp}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Prize Information */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 shadow-lg"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-3">Prize Chances</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {prizes.map((prize) => (
              <div key={prize.id} className="flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <span>{getRarityBadge(prize.rarity)}</span>
                  <span>{prize.label}</span>
                </span>
                <span className="text-gray-500">{(prize.probability * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="text-center">
          <Link 
            to="/menu" 
            className="inline-block px-6 py-3 bg-white/80 backdrop-blur text-gray-700 font-semibold rounded-xl shadow-lg hover:bg-white/90 transition-all"
          >
            ← Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SpinImproved;
