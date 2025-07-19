const User = require('../models/User');

module.exports = (bot) => {
  bot.command('withdraw', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) return ctx.reply('❌ Please register first using /register');

    const input = ctx.message.text.split(' ');
    if (input.length !== 2 || isNaN(input[1])) {
      return ctx.reply('💡 Usage: /withdraw 50');
    }

    const amount = parseInt(input[1]);

    if (amount > user.balance) {
      return ctx.reply('❌ Not enough balance to withdraw.');
    }

    user.balance -= amount;
    user.transactions.push(`Withdrew ${amount} coins`);
    await user.save();

    ctx.reply(`✅ Withdrew ${amount} coins from your wallet.`);
  });
};
