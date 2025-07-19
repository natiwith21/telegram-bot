const User = require('../models/User');

module.exports = (bot) => {
  bot.command('switch_ui', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('❌ Please register first using /register');

    user.ui = user.ui === 'default' ? 'new' : 'default';
    await user.save();

    ctx.reply(`✅ UI switched to "${user.ui}" mode.`);
  });
};
