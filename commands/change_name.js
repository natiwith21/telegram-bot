const User = require('../models/User');

module.exports = (bot) => {
  bot.command('change_name', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return ctx.reply('❌ Please register first using /register');

    const input = ctx.message.text.split(' ').slice(1).join(' ');
    if (!input) return ctx.reply('💡 Usage: /change_name NewName');

    user.name = input;
    await user.save();

    ctx.reply(`✅ Name changed to ${input}`);
  });
};
