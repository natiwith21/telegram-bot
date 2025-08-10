import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Menu from './pages/Menu';
import MenuImproved from './pages/MenuImproved';
import Bingo from './pages/Bingo';
import BingoImproved from './pages/BingoImproved';
import BingoPro from './pages/BingoPro';
import Spin from './pages/Spin';
import SpinImproved from './pages/SpinImproved';
import SpinPro from './pages/SpinPro';
import LikeBingo from './pages/LikeBingo';
import Admin from './pages/Admin';
import { TelegramProvider } from './hooks/useTelegram';

function App() {
  const [telegramId, setTelegramId] = useState('');

  useEffect(() => {
    // Get Telegram user ID from multiple sources
    let userTelegramId = '';
    
    // Method 1: From URL parameters (for testing/direct access)
    const urlParams = new URLSearchParams(window.location.search);
    const urlTelegramId = urlParams.get('telegramId') || urlParams.get('telegram_id');
    
    if (urlTelegramId) {
      userTelegramId = urlTelegramId;
      console.log('📱 Got telegramId from URL:', userTelegramId);
    }
    
    // Method 2: From Telegram WebApp API (when opened in Telegram)
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      
      const user = tg.initDataUnsafe?.user;
      if (user) {
        userTelegramId = user.id.toString();
        console.log('📱 Got telegramId from Telegram WebApp:', userTelegramId);
      }
    }
    
    // Method 3: Fallback for testing (use the user from your example)
    if (!userTelegramId) {
      userTelegramId = '5888330255'; // Your test user ID
      console.log('📱 Using fallback telegramId for testing:', userTelegramId);
    }
    
    setTelegramId(userTelegramId);
    console.log('✅ Final telegramId set:', userTelegramId);
  }, []);

  return (
    <TelegramProvider telegramId={telegramId}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          <Routes>
            <Route path="/" element={<LikeBingo />} />
            <Route path="/menu" element={<MenuImproved />} />
            <Route path="/menu-old" element={<Menu />} />
            <Route path="/bingo" element={<BingoPro />} />
            <Route path="/bingo-improved" element={<BingoImproved />} />
            <Route path="/bingo-old" element={<Bingo />} />
            <Route path="/spin" element={<SpinPro />} />
            <Route path="/spin-improved" element={<SpinImproved />} />
            <Route path="/spin-old" element={<Spin />} />
            <Route path="/like-bingo" element={<LikeBingo />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </Router>
    </TelegramProvider>
  );
}

export default App;
