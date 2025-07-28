import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import WalletBalanceImproved from '../components/WalletBalanceImproved';
import { useTelegram } from '../hooks/useTelegram';

const MenuImproved = () => {
  const { telegramId } = useTelegram();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotification, setShowNotification] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Show welcome notification for new users
  useEffect(() => {
    if (telegramId) {
      const hasVisited = localStorage.getItem('hasVisited');
      if (!hasVisited) {
        setShowNotification(true);
        localStorage.setItem('hasVisited', 'true');
        setTimeout(() => setShowNotification(false), 5000);
      }
    }
  }, [telegramId]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const cardHoverVariants = {
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  const games = [
    {
      id: 'bingo-10',
      title: 'Bingo 10',
      subtitle: '10 Coins Bet • 2.5x Multiplier • Quick Rounds',
      icon: '🎯',
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
      path: '/bingo?mode=10',
      tags: ['Starter', 'Popular'],
      tagColors: ['bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700'],
      description: 'Perfect for beginners! Start with 10 coins and win up to 25 coins!'
    },
    {
      id: 'bingo-20',
      title: 'Bingo 20',
      subtitle: '20 Coins Bet • 3x Multiplier • Enhanced Rewards',
      icon: '🎲',
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      path: '/bingo?mode=20',
      tags: ['Balanced', 'Recommended'],
      tagColors: ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'],
      description: 'Great balance of risk and reward! Win up to 60 coins with smart gameplay!'
    },
    {
      id: 'bingo-50',
      title: 'Bingo 50',
      subtitle: '50 Coins Bet • 3.5x Multiplier • High Stakes',
      icon: '💎',
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      path: '/bingo?mode=50',
      tags: ['Premium', 'High Risk'],
      tagColors: ['bg-purple-100 text-purple-700', 'bg-red-100 text-red-700'],
      description: 'For experienced players! High stakes with potential 175 coin rewards!'
    },
    {
      id: 'bingo-100',
      title: 'Bingo 100',
      subtitle: '100 Coins Bet • 4x Multiplier • Maximum Rewards',
      icon: '👑',
      gradient: 'from-yellow-500 to-orange-600',
      bgGradient: 'from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-200',
      path: '/bingo?mode=100',
      tags: ['VIP', 'Max Reward'],
      tagColors: ['bg-yellow-100 text-yellow-700', 'bg-orange-100 text-orange-700'],
      description: 'Elite gaming! Ultimate challenge with massive 400 coin jackpots!'
    },
    {
      id: 'bingo-demo',
      title: 'Free Bingo Demo',
      subtitle: 'No Coins Required • Practice Mode • Learn the Game',
      icon: '🎮',
      gradient: 'from-gray-500 to-slate-600',
      bgGradient: 'from-gray-50 to-slate-50',
      borderColor: 'border-gray-200',
      path: '/bingo?mode=demo',
      tags: ['Free', 'Practice'],
      tagColors: ['bg-gray-100 text-gray-700', 'bg-green-100 text-green-700'],
      description: 'Learn how to play Bingo without spending any coins! Perfect for new players!'
    },
    {
      id: 'spin',
      title: 'Fortune Wheel',
      subtitle: 'Spin to Win • Instant Rewards • Lucky Bonuses',
      icon: '🎰',
      gradient: 'from-pink-500 to-rose-600',
      bgGradient: 'from-pink-50 to-rose-50',
      borderColor: 'border-pink-200',
      path: '/spin',
      tags: ['Free', 'Quick'],
      tagColors: ['bg-pink-100 text-pink-700', 'bg-blue-100 text-blue-700'],
      description: 'Test your luck with our enhanced fortune wheel featuring 8 exciting prizes!'
    }
  ];

  const stats = [
    {
      value: '24/7',
      label: 'Available',
      icon: '⏰',
      color: 'text-blue-600'
    },
    {
      value: '10K+',
      label: 'Players',
      icon: '👥',
      color: 'text-green-600'
    },
    {
      value: '∞',
      label: 'Fun',
      icon: '🎊',
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-60 h-60 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Welcome Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-bold">Welcome to Game Universe!</p>
                <p className="text-sm opacity-90">Start your gaming journey with free spins!</p>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="ml-auto text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen p-4 sm:p-6">
        <div className="max-w-lg mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl mb-6 shadow-2xl relative">
                <span className="text-3xl">🎮</span>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </div>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-800 via-indigo-700 to-purple-700 bg-clip-text text-transparent mb-3">
                Game Universe
              </h1>
              
              <p className="text-lg text-gray-600 font-medium mb-2">
                Your Gateway to Digital Fortune
              </p>
              
              <div className="text-sm text-gray-500">
                {currentTime.toLocaleTimeString()} • Online Now
              </div>
            </motion.div>

            {/* Wallet Balance Card */}
            {telegramId && (
              <motion.div variants={itemVariants}>
                <WalletBalanceImproved telegramId={telegramId} />
              </motion.div>
            )}

            {/* Game Cards */}
            <motion.div variants={itemVariants} className="space-y-4">
              {games.map((game) => (
                <motion.div
                  key={game.id}
                  variants={cardHoverVariants}
                  whileHover="hover"
                  className="group"
                >
                  <Link to={game.path} className="block">
                    <div className={`relative bg-gradient-to-br ${game.bgGradient} border-2 ${game.borderColor} rounded-3xl p-6 shadow-xl overflow-hidden transition-all duration-300`}>
                      {/* Gradient overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${game.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-3xl`}></div>
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-start space-x-4">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${game.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <span className="text-2xl">{game.icon}</span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-gray-900 transition-colors">
                              {game.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                              {game.subtitle}
                            </p>
                            
                            {/* Tags */}
                            <div className="flex items-center space-x-2 mb-3">
                              {game.tags.map((tag, index) => (
                                <span
                                  key={tag}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${game.tagColors[index]}`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            
                            {/* Description */}
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {game.description}
                            </p>
                          </div>
                          
                          {/* Arrow */}
                          <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Decorative elements */}
                      <div className="absolute top-4 right-4 text-4xl opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                        {game.icon}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="bg-white/70 backdrop-blur-xl border border-gray-200 rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-600 font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div variants={itemVariants}>
              <div className="bg-white/60 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">✨ Platform Features</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500">🔐</span>
                    <span className="text-gray-700">Secure Gaming</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-500">⚡</span>
                    <span className="text-gray-700">Instant Payouts</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-purple-500">🎁</span>
                    <span className="text-gray-700">Daily Bonuses</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-orange-500">📱</span>
                    <span className="text-gray-700">Mobile First</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Debug/Status section */}
            {!telegramId && (
              <motion.div variants={itemVariants}>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-amber-800 font-semibold">Demo Mode</p>
                      <p className="text-amber-700 text-sm">
                        Open through Telegram Mini App for full experience
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* CSS for blob animation */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default MenuImproved;
