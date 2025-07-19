const User = require('../models/User');

module.exports = (bot) => {
  bot.command('check_transaction', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('❌ Please register first using /register');

    if (user.transactions.length === 0) {
      return ctx.reply('📄 No transaction history found.');
    }

    const history = user.transactions.slice(-5).join('\n');
    ctx.reply(`💳 Recent Transactions:\n${history}`);
  });
};
