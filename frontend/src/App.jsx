import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Menu from './pages/Menu';
import MenuImproved from './pages/MenuImproved';
import Bingo from './pages/Bingo';
import BingoImproved from './pages/BingoImproved';
import Spin from './pages/Spin';
import SpinImproved from './pages/SpinImproved';
import Admin from './pages/Admin';
import { TelegramProvider } from './hooks/useTelegram';

function App() {
  const [telegramId, setTelegramId] = useState('');

  useEffect(() => {
    // Get Telegram user ID from Telegram WebApp API
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTelegramId(user.id.toString());
      }
    }
  }, []);

  return (
    <TelegramProvider telegramId={telegramId}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          <Routes>
            <Route path="/" element={<MenuImproved />} />
            <Route path="/menu" element={<MenuImproved />} />
            <Route path="/menu-old" element={<Menu />} />
            <Route path="/bingo" element={<BingoImproved />} />
            <Route path="/bingo-old" element={<Bingo />} />
            <Route path="/spin" element={<SpinImproved />} />
            <Route path="/spin-old" element={<Spin />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </Router>
    </TelegramProvider>
  );
}

export default App;
