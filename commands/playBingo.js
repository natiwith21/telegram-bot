module.exports = (bot) => {
  bot.command('playbingo', async (ctx) => {
    const webAppUrl = 'https://your-bingo-web-app-url.com'; // Replace with your actual deployed URL

    ctx.reply('🎲 Click below to start playing Bingo!', {
      reply_markup: {
        inline_keyboard: [[{
          text: '▶️ Launch Bingo Game',
          web_app: { url: webAppUrl }
        }]]
      }
    });
  });
};
