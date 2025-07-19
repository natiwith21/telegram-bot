const User = require('../models/User');

module.exports = (bot) => {
  bot.command('register', async (ctx) => {
    const telegramId = ctx.from.id;
    const existingUser = await User.findOne({ telegramId });

    if (existingUser) return ctx.reply('✅ You are already registered.');

    const user = new User({
      telegramId,
      name: ctx.from.first_name
    });

    await user.save();
    ctx.reply('🎉 Registration complete! Use /balance to check your account.');
  });
};
