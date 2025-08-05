import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';

const SpinPro = () => {
  const { telegramId } = useTelegram();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [userBonus, setUserBonus] = useState(0);
  const [spinHistory, setSpinHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const wheelRef = useRef(null);

  // Professional prize configuration
  const prizes = [
    { id: 1, label: '50 COINS', coins: 50, bonus: 0, color: 'from-yellow-400 to-orange-500', probability: 0.15 },
    { id: 2, label: '10 BONUS', coins: 0, bonus: 10, color: 'from-purple-400 to-pink-500', probability: 0.2 },
    { id: 3, label: '25 COINS', coins: 25, bonus: 0, color: 'from-emerald-400 to-green-500', probability: 0.25 },
    { id: 4, label: 'JACKPOT', coins: 100, bonus: 20, color: 'from-red-400 to-rose-500', probability: 0.05 },
    { id: 5, label: '15 COINS', coins: 15, bonus: 0, color: 'from-blue-400 to-indigo-500', probability: 0.25 },
    { id: 6, label: '5 BONUS', coins: 0, bonus: 5, color: 'from-cyan-400 to-teal-500', probability: 0.3 },
    { id: 7, label: 'TRY AGAIN', coins: 0, bonus: 0, color: 'from-gray-400 to-gray-600', probability: 0.2 },
    { id: 8, label: '35 COINS', coins: 35, bonus: 0, color: 'from-violet-400 to-purple-500', probability: 0.15 }
  ];

  const playSound = (type) => {
    if (!soundEnabled) return;
    const audio = new Audio();
    switch(type) {
      case 'spin':
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBz2a2;';
        break;
      case 'win':
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBz2a2;';
        break;
    }
    audio.play().catch(() => {});
  };

  const selectPrize = () => {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const prize of prizes) {
      cumulative += prize.probability;
      if (rand <= cumulative) {
        return prize;
      }
    }
    return prizes[prizes.length - 1]; // Fallback
  };

  const spin = useCallback(async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);
    playSound('spin');

    // Select winning prize
    const winningPrize = selectPrize();
    const winningIndex = winningPrize.id - 1;
    
    // Calculate rotation (multiple full spins + landing position)
    const segmentAngle = 360 / prizes.length;
    const targetAngle = (winningIndex * segmentAngle) + (segmentAngle / 2);
    const fullSpins = 5 + Math.random() * 3; // 5-8 full rotations
    const totalRotation = (fullSpins * 360) + (360 - targetAngle);

    // Animate wheel
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    // Wait for animation to complete
    setTimeout(async () => {
      setIsSpinning(false);
      setResult(winningPrize);
      
      if (winningPrize.coins > 0 || winningPrize.bonus > 0) {
        playSound('win');
      }

      // Update balance
      try {
        const response = await fetch(`http://localhost:3001/api/spin-result/${telegramId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coins: winningPrize.coins,
            bonus: winningPrize.bonus,
            prize: winningPrize.label
          })
        });

        const data = await response.json();
        if (data.success) {
          setUserBalance(data.newBalance);
          setUserBonus(data.newBonus);
          
          // Add to history
          setSpinHistory(prev => [{
            id: Date.now(),
            prize: winningPrize.label,
            coins: winningPrize.coins,
            bonus: winningPrize.bonus,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev.slice(0, 9)]); // Keep last 10 spins
        }
      } catch (error) {
        console.error('Failed to update balance:', error);
      }
    }, 4000);
  }, [isSpinning, telegramId, soundEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-white/3 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 space-y-8">
        {/* Professional Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-white/20 to-white/10 rounded-full mb-4 shadow-2xl">
            <span className="text-3xl">🎰</span>
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
            FORTUNE WHEEL
          </h1>
          <p className="text-gray-300 text-lg">Spin to win amazing prizes!</p>
        </motion.div>

        {/* Balance Display */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="grid grid-cols-2 gap-4 max-w-md mx-auto"
        >
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-black text-yellow-400">{userBalance}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Coins</div>
          </div>
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-black text-purple-400">{userBonus}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Bonus</div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Fortune Wheel */}
          <div className="lg:col-span-2 flex justify-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              {/* Wheel Container */}
              <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                {/* Wheel */}
                <div 
                  ref={wheelRef}
                  className="w-full h-full rounded-full relative overflow-hidden shadow-2xl border-8 border-white/20 transition-transform duration-[4000ms] ease-out"
                  style={{ transformOrigin: 'center' }}
                >
                  {prizes.map((prize, index) => {
                    const angle = (360 / prizes.length) * index;
                    return (
                      <div
                        key={prize.id}
                        className={`absolute w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br ${prize.color}`}
                        style={{
                          transform: `rotate(${angle}deg)`,
                          clipPath: 'polygon(0 100%, 100% 100%, 50% 0)'
                        }}
                      >
                        <div 
                          className="absolute bottom-4 right-4 text-xs font-bold text-white transform -rotate-45 text-center leading-tight"
                          style={{ transform: `rotate(-${angle + 22.5}deg)` }}
                        >
                          {prize.label.split(' ').map((word, i) => (
                            <div key={i}>{word}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Center Circle */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-4 border-white shadow-2xl flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>

                {/* Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white shadow-lg"></div>
                </div>
              </div>

              {/* Spin Button */}
              <div className="text-center mt-8">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={spin}
                  disabled={isSpinning}
                  className={`
                    px-12 py-4 rounded-2xl font-black text-xl shadow-2xl transition-all duration-300
                    ${isSpinning 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500'
                    }
                  `}
                >
                  {isSpinning ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Spinning...</span>
                    </div>
                  ) : (
                    '🎰 SPIN NOW'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Controls */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10"
            >
              <h3 className="text-xl font-bold mb-4">Settings</h3>
              
              <div className="space-y-4">
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
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Show History</span>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`w-12 h-6 rounded-full transition-all duration-300 ${
                      showHistory ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                      showHistory ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Prize Table */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10"
            >
              <h3 className="text-xl font-bold mb-4">Prize Table</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {prizes.map((prize) => (
                  <div key={prize.id} className="flex items-center justify-between p-2 rounded-lg bg-black/30">
                    <div className={`w-4 h-4 rounded bg-gradient-to-r ${prize.color}`}></div>
                    <span className="text-sm font-medium text-white">{prize.label}</span>
                    <span className="text-xs text-gray-400">{Math.round(prize.probability * 100)}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Spin History */}
            <AnimatePresence>
              {showHistory && (
                <motion.div 
                  initial={{ x: 50, opacity: 0, height: 0 }}
                  animate={{ x: 0, opacity: 1, height: 'auto' }}
                  exit={{ x: 50, opacity: 0, height: 0 }}
                  className="bg-black/60 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10"
                >
                  <h3 className="text-xl font-bold mb-4">Recent Spins</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {spinHistory.length > 0 ? (
                      spinHistory.map((spin) => (
                        <div key={spin.id} className="p-2 rounded-lg bg-black/30 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-white">{spin.prize}</span>
                            <span className="text-xs text-gray-400">{spin.timestamp}</span>
                          </div>
                          {(spin.coins > 0 || spin.bonus > 0) && (
                            <div className="text-xs text-green-400">
                              +{spin.coins} coins {spin.bonus > 0 && `+${spin.bonus} bonus`}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        No spins yet. Start spinning!
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Result Modal */}
        <AnimatePresence>
          {result && (
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
                  result.coins > 0 || result.bonus > 0
                    ? 'bg-gradient-to-br from-emerald-900 to-green-900 border-emerald-400' 
                    : 'bg-gradient-to-br from-gray-900 to-slate-900 border-gray-400'
                }`}
              >
                <div className="text-8xl mb-4">
                  {result.coins > 0 || result.bonus > 0 ? '🎉' : '😔'}
                </div>
                <h2 className={`text-3xl font-black mb-4 ${
                  result.coins > 0 || result.bonus > 0 ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  {result.label}
                </h2>
                {(result.coins > 0 || result.bonus > 0) && (
                  <div className="space-y-2 mb-6">
                    {result.coins > 0 && (
                      <p className="text-2xl font-bold text-yellow-400">
                        +{result.coins} coins
                      </p>
                    )}
                    {result.bonus > 0 && (
                      <p className="text-xl font-bold text-purple-400">
                        +{result.bonus} bonus
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setResult(null)}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-2xl font-bold hover:from-blue-400 hover:to-indigo-500 transition-all duration-300"
                >
                  Continue
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
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

export default SpinPro;
