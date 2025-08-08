import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';

const Spin = () => {
  const { telegramId } = useTelegram();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  const prizes = [
    { label: 'Win 10 coins', value: 10, type: 'coins', color: 'bg-green-400' },
    { label: 'Bonus 5', value: 5, type: 'bonus', color: 'bg-blue-400' },
    { label: 'Win 25 coins', value: 25, type: 'coins', color: 'bg-yellow-400' },
    { label: 'Lose', value: 0, type: 'lose', color: 'bg-red-400' },
    { label: 'Win 50 coins', value: 50, type: 'coins', color: 'bg-purple-400' },
    { label: 'Bonus 10', value: 10, type: 'bonus', color: 'bg-indigo-400' },
    { label: 'Win 15 coins', value: 15, type: 'coins', color: 'bg-pink-400' },
    { label: 'Lose', value: 0, type: 'lose', color: 'bg-gray-400' },
  ];

  const spinWheel = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);
    
    // Random prize selection
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
    
    // Calculate rotation for selected prize
    const prizeAngle = (360 / prizes.length) * prizes.indexOf(randomPrize);
    const spins = 5; // Number of full rotations
    const finalRotation = rotation + (360 * spins) + prizeAngle;
    
    setRotation(finalRotation);
    
    // Show result after animation
    setTimeout(async () => {
      setResult(randomPrize);
      setIsSpinning(false);
      
      // Send result to backend
      if (telegramId && randomPrize.type !== 'lose') {
        try {
          await fetch(`https://telegram-bot-2-rffp.onrender.com/api/spin-result/${telegramId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: randomPrize.type,
              amount: randomPrize.value,
              result: randomPrize.label
            })
          });
        } catch (error) {
          console.error('Failed to send spin result:', error);
        }
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-800 mb-2">🎰 Spin Wheel</h1>
          <p className="text-gray-600">Spin to win coins and bonuses!</p>
        </div>

        {/* Wheel Container */}
        <div className="relative bg-white rounded-full shadow-2xl p-8 mb-8">
          {/* Pointer */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-red-600"></div>
          </div>
          
          {/* Wheel */}
          <motion.div
            className="relative w-80 h-80 mx-auto rounded-full overflow-hidden border-4 border-gray-300"
            animate={{ rotate: rotation }}
            transition={{ duration: 3, ease: "easeOut" }}
          >
            {prizes.map((prize, index) => {
              const angle = (360 / prizes.length) * index;
              return (
                <div
                  key={index}
                  className={`absolute w-full h-full ${prize.color}`}
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((angle - 22.5) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle - 22.5) * Math.PI / 180)}%, ${50 + 50 * Math.cos((angle + 22.5) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle + 22.5) * Math.PI / 180)}%)`,
                  }}
                >
                  <div 
                    className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: '50% 50%'
                    }}
                  >
                    <span className="transform rotate-45 text-center">
                      {prize.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Result Display */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center p-6 rounded-xl mb-6 ${
              result.type === 'lose' 
                ? 'bg-red-100 border-2 border-red-300' 
                : 'bg-green-100 border-2 border-green-300'
            }`}
          >
            <h2 className="text-2xl font-bold mb-2">
              {result.type === 'lose' ? '😞 Try Again!' : '🎉 Congratulations!'}
            </h2>
            <p className="text-lg">
              {result.label}
            </p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={spinWheel}
            disabled={isSpinning}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg"
          >
            {isSpinning ? 'Spinning...' : 'SPIN!'}
          </motion.button>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Link to="/menu">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Back to Menu
            </motion.button>
          </Link>
        </div>

        {/* Prize List */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-bold text-lg mb-4 text-center">Possible Prizes:</h3>
          <div className="space-y-2">
            {prizes.map((prize, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${prize.color}`}></div>
                <span className="text-sm">{prize.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spin;
