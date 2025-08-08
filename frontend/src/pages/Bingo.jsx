import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';

const Bingo = () => {
  const { telegramId } = useTelegram();
  const [searchParams] = useSearchParams();
  const gameMode = searchParams.get('mode') || 'demo';
  const [grid, setGrid] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState(false);
  const [currentNumber, setCurrentNumber] = useState(null);

  // Initialize 10x10 grid with random numbers 1-100
  const initializeGrid = () => {
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
    const shuffled = numbers.sort(() => Math.random() - 0.5);
    const newGrid = [];
    
    for (let i = 0; i < 10; i++) {
      newGrid.push(shuffled.slice(i * 10, (i + 1) * 10));
    }
    
    setGrid(newGrid);
    setCalledNumbers([]);
    setWinner(false);
    setCurrentNumber(null);
  };

  // Auto mark numbers
  const callNumber = () => {
    if (calledNumbers.length >= 100) return;
    
    const availableNumbers = Array.from({ length: 100 }, (_, i) => i + 1)
      .filter(num => !calledNumbers.includes(num));
    
    if (availableNumbers.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    setCurrentNumber(newNumber);
    setCalledNumbers(prev => [...prev, newNumber]);
  };

  // Check for winner (full row, column, or diagonal)
  const checkWinner = () => {
    if (!grid.length) return false;
    
    // Check rows
    for (let row of grid) {
      if (row.every(num => calledNumbers.includes(num))) {
        return true;
      }
    }
    
    // Check columns
    for (let col = 0; col < 10; col++) {
      if (grid.every(row => calledNumbers.includes(row[col]))) {
        return true;
      }
    }
    
    // Check diagonals
    const diagonal1 = grid.every((row, i) => calledNumbers.includes(row[i]));
    const diagonal2 = grid.every((row, i) => calledNumbers.includes(row[9 - i]));
    
    return diagonal1 || diagonal2;
  };

  // Game loop
  useEffect(() => {
    if (isPlaying && !winner) {
      const interval = setInterval(() => {
        callNumber();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, winner, calledNumbers]);

  // Get bet amount and prize multiplier based on game mode
  const getBetInfo = () => {
    const modes = {
      '10': { bet: 10, prize: 20 },
      '20': { bet: 20, prize: 50 },
      '50': { bet: 50, prize: 150 },
      '100': { bet: 100, prize: 350 },
      'demo': { bet: 0, prize: 10 }
    };
    return modes[gameMode] || modes.demo;
  };

  // Check for winner after each number
  useEffect(() => {
    if (checkWinner()) {
      setWinner(true);
      setIsPlaying(false);
      const betInfo = getBetInfo();
      
      // API call to award coins
      if (telegramId && gameMode !== 'demo') {
        fetch(`https://telegram-bot-2-rffp.onrender.com/api/bingo-win/${telegramId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            winType: 'bingo', 
            amount: betInfo.prize,
            gameMode: gameMode 
          })
        });
      }
    }
  }, [calledNumbers]);

  // Initialize on mount
  useEffect(() => {
    initializeGrid();
  }, []);

  const startGame = () => {
    setIsPlaying(true);
  };

  const resetGame = () => {
    setIsPlaying(false);
    initializeGrid();
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            🎯 Bingo {gameMode.toUpperCase()}
          </h1>
          <div className="text-sm text-gray-600 mb-4">
            {gameMode === 'demo' ? 
              'Demo Mode - Free Play' : 
              `Bet: ${getBetInfo().bet} coins | Prize: ${getBetInfo().prize} coins`
            }
          </div>
          {currentNumber && (
            <motion.div
              key={currentNumber}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-6xl font-bold text-red-600 my-4"
            >
              {currentNumber}
            </motion.div>
          )}
          {winner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-400 text-yellow-900 p-4 rounded-lg font-bold text-xl"
            >
              🎉 BINGO! You won {getBetInfo().prize} coins! 🎉
            </motion.div>
          )}
        </div>

        {/* Bingo Grid */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="grid grid-cols-10 gap-1 max-w-lg mx-auto">
            {grid.map((row, rowIndex) =>
              row.map((number, colIndex) => (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square flex items-center justify-center text-sm font-bold rounded
                    ${calledNumbers.includes(number)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {number}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Called Numbers */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <h3 className="font-bold text-lg mb-2">Called Numbers:</h3>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {calledNumbers.map((num, index) => (
              <motion.span
                key={num}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold"
              >
                {num}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            disabled={isPlaying || winner}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
          >
            {isPlaying ? 'Playing...' : 'Play'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Reset
          </motion.button>
          
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
      </div>
    </div>
  );
};

export default Bingo;
