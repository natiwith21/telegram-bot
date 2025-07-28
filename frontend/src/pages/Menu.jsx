import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import WalletBalance from '../components/WalletBalance';
import { useTelegram } from '../hooks/useTelegram';

const Menu = () => {
  const { telegramId } = useTelegram();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-64 h-64 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

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
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 sm:mb-6 shadow-2xl">
                <span className="text-2xl sm:text-3xl">🎮</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-800 via-purple-700 to-pink-700 bg-clip-text text-transparent mb-2 sm:mb-3">
                Game Universe
              </h1>
              <p className="text-gray-600 text-base sm:text-lg font-medium">
                Your Gateway to Digital Fortune
              </p>
            </motion.div>

            {/* Wallet Balance Card */}
            {telegramId && (
              <motion.div variants={itemVariants}>
                <WalletBalance telegramId={telegramId} />
              </motion.div>
            )}

            {/* Game Cards */}
            <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4">
              {/* Bingo Card */}
              <Link to="/bingo" className="block group">
                <div className="relative bg-white/80 backdrop-blur-lg border border-purple-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden shadow-lg">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10 flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-xl sm:text-2xl">🎯</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">Premium Bingo</h3>
                      <p className="text-purple-700 text-xs sm:text-sm">10x10 Grid • Auto Numbers • Big Wins</p>
                      <div className="flex items-center mt-1.5 sm:mt-2 space-x-1.5 sm:space-x-2">
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-purple-100 rounded-full text-xs text-purple-700 font-medium">Live</span>
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-yellow-100 rounded-full text-xs text-yellow-700 font-medium">Hot</span>
                      </div>
                    </div>
                    <div className="text-purple-500 group-hover:translate-x-1 transition-transform duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Spin Wheel Card */}
              <Link to="/spin" className="block group">
                <div className="relative bg-white/80 backdrop-blur-lg border border-blue-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden shadow-lg">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10 flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-xl sm:text-2xl">🎰</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">Fortune Wheel</h3>
                      <p className="text-blue-700 text-xs sm:text-sm">Spin to Win • Instant Rewards • Free Play</p>
                      <div className="flex items-center mt-1.5 sm:mt-2 space-x-1.5 sm:space-x-2">
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-100 rounded-full text-xs text-blue-700 font-medium">New</span>
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-green-100 rounded-full text-xs text-green-700 font-medium">Free</span>
                      </div>
                    </div>
                    <div className="text-blue-500 group-hover:translate-x-1 transition-transform duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-white/70 backdrop-blur-lg border border-purple-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-lg">
                  <div className="text-lg sm:text-2xl font-bold text-gray-800">24/7</div>
                  <div className="text-xs text-purple-600">Available</div>
                </div>
                <div className="bg-white/70 backdrop-blur-lg border border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-lg">
                  <div className="text-lg sm:text-2xl font-bold text-gray-800">1M+</div>
                  <div className="text-xs text-blue-600">Players</div>
                </div>
                <div className="bg-white/70 backdrop-blur-lg border border-pink-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-lg">
                  <div className="text-lg sm:text-2xl font-bold text-gray-800">∞</div>
                  <div className="text-xs text-pink-600">Fun</div>
                </div>
              </div>
            </motion.div>

            {/* Debug section */}
            {!telegramId && (
              <motion.div variants={itemVariants}>
                <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-amber-600">⚠️</span>
                    <p className="text-amber-700 text-xs sm:text-sm">
                      Open through Telegram Mini App for full experience
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
