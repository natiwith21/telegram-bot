import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const WalletBalance = ({ telegramId }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!telegramId) return;
      
      try {
        const response = await fetch(`https://telegram-bot-2-rffp.onrender.com/api/user/${telegramId}`);
        if (!response.ok) throw new Error('User not found');
        
        const data = await response.json();
        setUserData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [telegramId]);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-3 sm:h-4 bg-gray-300 rounded w-1/3"></div>
          <div className="h-6 sm:h-8 bg-gray-300 rounded w-2/3"></div>
          <div className="h-6 sm:h-8 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="text-red-500">❌</span>
          <p className="text-red-700 text-sm">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-2xl sm:rounded-3xl"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-lg sm:text-xl">💰</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Digital Wallet</h2>
              <p className="text-purple-600 text-xs sm:text-sm">Welcome, {userData.name}</p>
            </div>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Main Balance */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-emerald-100 to-green-100 border border-emerald-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg"
          >
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-emerald-200 rounded-lg sm:rounded-xl mb-2 sm:mb-3">
              <span className="text-sm sm:text-lg">🪙</span>
            </div>
            <div className="text-emerald-700 text-xs sm:text-sm font-medium">Main Balance</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">
              {userData.balance.toLocaleString()}
            </div>
            <div className="text-emerald-600 text-xs mt-1">COINS</div>
          </motion.div>

          {/* Bonus Balance */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg"
          >
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-200 rounded-lg sm:rounded-xl mb-2 sm:mb-3">
              <span className="text-sm sm:text-lg">🎁</span>
            </div>
            <div className="text-blue-700 text-xs sm:text-sm font-medium">Bonus Coins</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">
              {userData.bonus.toLocaleString()}
            </div>
            <div className="text-blue-600 text-xs mt-1">BONUS</div>
          </motion.div>
        </div>

        {/* Total Value */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-purple-600 text-xs sm:text-sm font-medium">Total Portfolio Value</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">
              {(userData.balance + userData.bonus).toLocaleString()}
            </div>
            <div className="text-purple-500 text-xs">TOTAL COINS</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 sm:space-x-3 mt-4 sm:mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 text-white font-semibold text-xs sm:text-sm shadow-lg"
          >
            💳 Deposit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 bg-white/60 backdrop-blur-lg border border-gray-300 rounded-lg sm:rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 text-gray-700 font-semibold text-xs sm:text-sm shadow-lg"
          >
            📊 History
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default WalletBalance;
