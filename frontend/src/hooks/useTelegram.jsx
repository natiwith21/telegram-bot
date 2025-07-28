import { createContext, useContext } from 'react';

const TelegramContext = createContext();

export const TelegramProvider = ({ children, telegramId }) => {
  return (
    <TelegramContext.Provider value={{ telegramId }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
};
