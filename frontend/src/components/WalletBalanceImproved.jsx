import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WalletBalanceImproved = ({ telegramId }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [previousBalance, setPreviousBalance] = useState(null);
  const [balanceChange, setBalanceChange] = useState(null);

  const fetchUserData = async (showRefresh = false) => {
    if (!telegramId) return;
    
    if (showRefresh) setRefreshing(true);
    
    try {
      const response = await fetch(`http://localhost:3001/api/user/${telegramId}`);
      if (!response.ok) throw new Error('User not found');
      
      const data = await response.json();
      
      // Track balance changes
      if (userData) {
        const balanceDiff = data.balance - userData.balance;
        const bonusDiff = data.bonus - userData.bonus;
        
        if (balanceDiff !== 0 || bonusDiff !== 0) {
          setBalanceChange({
            balance: balanceDiff,
            bonus: bonusDiff,
            timestamp: Date.now()
          });
          
          // Clear change indicator after 3 seconds
          setTimeout(() => setBalanceChange(null), 3000);
        }
      }
      
      setPreviousBalance(userData);
      setUserData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [telegramId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!telegramId) return;
    
    const interval = setInterval(() => {
      fetchUserData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [telegramId]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getBalanceGrowth = () => {
    if (!userData || !previousBalance) return 0;
    const currentTotal = userData.balance + userData.bonus;
    const previousTotal = previousBalance.balance + previousBalance.bonus;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 shadow-2xl">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-300 rounded-2xl"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-300 rounded-2xl"></div>
            <div className="h-20 bg-gray-300 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">❌</span>
          <div>
            <p className="text-red-800 font-semibold">Connection Error</p>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => fetchUserData(true)}
              className="mt-2 text-red-600 text-sm underline hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  const totalValue = userData.balance + userData.bonus;
  const growth = getBalanceGrowth();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 shadow-2xl overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Balance Change Indicator */}
      <AnimatePresence>
        {balanceChange && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold"
          >
            +{balanceChange.balance + balanceChange.bonus}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <motion.div 
              className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xl">💰</span>
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Digital Wallet</h2>
              <p className="text-purple-600 text-sm">Welcome back, {userData.name?.split(' ')[0] || 'Player'}</p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchUserData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <motion.div
              animate={{ rotate: refreshing ? 360 : 0 }}
              transition={{ duration: 1, repeat: refreshing ? Infinity : 0 }}
            >
              🔄
            </motion.div>
          </motion.button>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Main Balance */}
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="relative bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4 shadow-lg overflow-hidden"
          >
            <div className="absolute top-0 right-0 text-4xl opacity-10">🪙</div>
            <div className="relative z-10">
              <div className="flex items-center justify-center w-10 h-10 bg-emerald-200 rounded-xl mb-3">
                <span className="text-lg">🪙</span>
              </div>
              <div className="text-emerald-700 text-sm font-medium">Main Balance</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {formatNumber(userData.balance)}
              </div>
              <div className="text-emerald-600 text-xs">COINS</div>
            </div>
          </motion.div>

          {/* Bonus Balance */}
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="relative bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 shadow-lg overflow-hidden"
          >
            <div className="absolute top-0 right-0 text-4xl opacity-10">🎁</div>
            <div className="relative z-10">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-200 rounded-xl mb-3">
                <span className="text-lg">🎁</span>
              </div>
              <div className="text-blue-700 text-sm font-medium">Bonus Coins</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {formatNumber(userData.bonus)}
              </div>
              <div className="text-blue-600 text-xs">BONUS</div>
            </div>
          </motion.div>
        </div>

        {/* Total Portfolio */}
        <motion.div 
          className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 mb-6 shadow-lg"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-center">
            <div className="text-purple-600 text-sm font-medium mb-2">Total Portfolio Value</div>
            <div className="text-3xl font-bold text-gray-800 mb-1">
              {formatNumber(totalValue)}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-purple-500 text-xs">TOTAL COINS</span>
              {growth !== 0 && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  growth > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {growth > 0 ? '↗' : '↘'} {Math.abs(growth).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Details Toggle */}
        <motion.button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mb-4 text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          {showDetails ? '↑ Hide Details' : '↓ Show Details'}
        </motion.button>

        {/* Expandable Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium">
                    {new Date(userData.registeredAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Active:</span>
                  <span className="font-medium">
                    {userData.lastActive ? new Date(userData.lastActive).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Games Played:</span>
                  <span className="font-medium">{userData.gameHistory?.length || 0}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl py-3 px-4 text-white font-semibold text-sm shadow-lg"
          >
            💳 Deposit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white/60 backdrop-blur-lg border border-gray-300 rounded-2xl py-3 px-4 text-gray-700 font-semibold text-sm shadow-lg"
          >
            📊 History
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default WalletBalanceImproved;
