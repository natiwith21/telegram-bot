module.exports = (bot) => {
  bot.start((ctx) => {
    ctx.reply(`👋 Welcome to Addis Bingo!
Use /register to create your account and start playing.`);
  });
};
