const User = require('../models/User');

module.exports = (bot) => {
  bot.command('convert', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('❌ Please register first using /register');

    if (user.bonus === 0) return ctx.reply('🎁 No bonus to convert.');

    user.balance += user.bonus;
    user.transactions.push(`Converted ${user.bonus} bonus to wallet`);
    user.bonus = 0;

    await user.save();
    ctx.reply('✅ Bonus converted to wallet balance!');
  });
};
