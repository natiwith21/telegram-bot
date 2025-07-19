module.exports = (bot) => {
  bot.command('invite', (ctx) => {
    const username = ctx.from.username || ctx.from.id;
    const link = `https://t.me/YourBotUsername?start=${username}`; // Replace with your bot username

    ctx.reply(`📢 Invite your friends using this link:\n${link}`);
  });
};
