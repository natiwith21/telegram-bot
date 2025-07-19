const User = require('../models/User');

module.exports = (bot) => {
  bot.command('game_history', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('❌ Please register first using /register');

    if (user.gameHistory.length === 0) {
      return ctx.reply('📜 No game history found.');
    }

    const history = user.gameHistory.slice(-5).join('\n');
    ctx.reply(`🎮 Recent Games:\n${history}`);
  });
};
