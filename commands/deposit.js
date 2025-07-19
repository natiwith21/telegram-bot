const User = require('../models/User');

module.exports = (bot) => {
  bot.command('deposit', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) return ctx.reply('❌ Please register first using /register');

    const input = ctx.message.text.split(' ');
    if (input.length !== 2 || isNaN(input[1])) {
      return ctx.reply('💡 Usage: /deposit 100');
    }

    const amount = parseInt(input[1]);
    user.balance += amount;
    user.transactions.push(`Deposited ${amount} coins`);
    await user.save();

    ctx.reply(`✅ Deposited ${amount} coins to your wallet.`);
  });
};
