const { Markup } = require('telegraf');

module.exports = (bot) => {
  // Play Bingo command
  bot.command('playbingo', async (ctx) => {
    try {
      const user = ctx.user;
      
      if (!user.isRegistered) {
        return ctx.reply('❌ Please register first using /register');
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎲 Play Bingo', `${process.env.WEB_APP_URL}/bingo`)],
        [Markup.button.callback('📊 Game Rules', 'bingo_rules')],
        [Markup.button.callback('🏆 Leaderboard', 'bingo_leaderboard')]
      ]);

      const message = `
🎲 **BINGO GAME**

💰 Your Balance: ${user.balance} COINS
🎯 Minimum Bet: 10 COINS
🏆 Max Win: 1000 COINS

Ready to play? Tap the button below!
      `;

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...keyboard 
      });
    } catch (error) {
      console.error('Error in playbingo command:', error);
      ctx.reply('❌ Something went wrong. Please try again.');
    }
  });

  // Play Spin command
  bot.command('playspin', async (ctx) => {
    try {
      const user = ctx.user;
      
      if (!user.isRegistered) {
        return ctx.reply('❌ Please register first using /register');
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎰 Spin Wheel', `${process.env.WEB_APP_URL}/spin`)],
        [Markup.button.callback('📊 Game Rules', 'spin_rules')],
        [Markup.button.callback('🏆 Leaderboard', 'spin_leaderboard')]
      ]);

      const message = `
🎰 **SPIN WHEEL GAME**

💰 Your Balance: ${user.balance} COINS
🎯 Minimum Bet: 5 COINS
🏆 Max Win: 2000 COINS

Feeling lucky? Spin the wheel!
      `;

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...keyboard 
      });
    } catch (error) {
      console.error('Error in playspin command:', error);
      ctx.reply('❌ Something went wrong. Please try again.');
    }
  });

  // Game History command
  bot.command('game_history', async (ctx) => {
    try {
      const user = ctx.user;
      
      // You'll need to implement Game model and fetch user's games
      const message = `
📊 **YOUR GAME HISTORY**

🎮 Games Played: ${user.gamesPlayed || 0}
💰 Total Winnings: ${user.totalWinnings || 0} COINS
📉 Total Losses: ${user.totalLosses || 0} COINS
📈 Net Profit: ${(user.totalWinnings || 0) - (user.totalLosses || 0)} COINS

🏆 Win Rate: ${user.gamesPlayed > 0 ? Math.round(((user.totalWinnings || 0) / user.gamesPlayed) * 100) : 0}%
      `;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('📱 Detailed History', `${process.env.WEB_APP_URL}/history`)],
        [Markup.button.callback('🎮 Play Again', 'games_menu')]
      ]);

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...keyboard 
      });
    } catch (error) {
      console.error('Error in game_history command:', error);
      ctx.reply('❌ Something went wrong. Please try again.');
    }
  });

  // Handle callback queries
  bot.action('bingo_rules', async (ctx) => {
    const rules = `
🎲 **BINGO RULES**

🎯 **How to Play:**
1. Select your bet amount (10-100 COINS)
2. Choose numbers on the 10x10 grid
3. Watch as numbers are drawn
4. Complete lines to win prizes!

🏆 **Winning Combinations:**
• Horizontal Line: 2x bet
• Vertical Line: 2x bet  
• Diagonal Line: 3x bet
• Full House: 10x bet

💡 **Tips:**
• More lines = bigger wins
• Strategic number selection helps
• Watch for patterns!
    `;

    await ctx.editMessageText(rules, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🎲 Play Now', `${process.env.WEB_APP_URL}/bingo`)],
        [Markup.button.callback('⬅️ Back', 'games_menu')]
      ])
    });
  });

  bot.action('spin_rules', async (ctx) => {
    const rules = `
🎰 **SPIN WHEEL RULES**

🎯 **How to Play:**
1. Choose your bet amount (5-200 COINS)
2. Spin the wheel
3. Win based on where it lands!

🏆 **Prize Multipliers:**
• 🍒 Cherry: 1.5x
• 🍋 Lemon: 2x
• 🍊 Orange: 3x
• 🍇 Grape: 5x
• 🔔 Bell: 10x
• 💎 Diamond: 20x
• 🎰 Jackpot: 100x

💡 **Tips:**
• Higher bets = bigger potential wins
• Each spin is independent
• Play responsibly!
    `;

    await ctx.editMessageText(rules, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🎰 Spin Now', `