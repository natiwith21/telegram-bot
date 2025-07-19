module.exports = (bot) => {
  bot.command('playspin', async (ctx) => {
    const webAppUrl = 'https://your-spin-web-app-url.com'; // Replace with your actual deployed URL

    ctx.reply('🎰 Click below to play Spin!', {
      reply_markup: {
        inline_keyboard: [[{
          text: '▶️ Launch Spin Game',
          web_app: { url: webAppUrl }
        }]]
      }
    });
  });
};
