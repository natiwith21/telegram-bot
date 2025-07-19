const User = require('../models/User');

module.exports = (bot) => {
  bot.command('balance', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) return ctx.reply('❌ Please register first using /register');

    ctx.reply(`💰 Wallet: ${user.balance} coins\n🎁 Bonus: ${user.bonus} coins`);
  });
};
