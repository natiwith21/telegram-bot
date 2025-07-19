module.exports = (bot) => {
  bot.command('instruction', (ctx) => {
    ctx.reply(`📘 *Game Instructions*:
1. Register with /register
2. Use /deposit to add coins
3. Start games with /playbingo or /playspin
4. Earn, convert and withdraw your coins!

Use /support if you need help. Good luck!`, { parse_mode: "Markdown" });
  });
};
