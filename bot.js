const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
const connectDB = require('./utils/db');
const User = require('./models/User');

const bot = new Telegraf(process.env.BOT_TOKEN);
connectDB();
console.log("Bot is starting...");

// Main menu keyboard
const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🎯 Play Bingo', 'play_bingo')],
  [Markup.button.callback('🎰 Play Spin', 'play_spin')],
  [Markup.button.callback('📝 Register', 'register')],
  [Markup.button.callback('💰 Deposit', 'deposit')],
  [Markup.button.callback('💳 Check Balance', 'balance')],
  [Markup.button.callback('🎮 Instructions', 'instructions')],
  [Markup.button.callback('👥 Invite', 'invite')],
  [Markup.button.callback('📞 Contact Support', 'support')]
]);

// Bingo game modes keyboard
const bingoModesKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🎯 Play Bingo 10', 'bingo_10')],
  [Markup.button.callback('🎯 Play Bingo 20', 'bingo_20')],
  [Markup.button.callback('🎯 Play Bingo 50', 'bingo_50')],
  [Markup.button.callback('🎯 Play Bingo 100', 'bingo_100')],
  [Markup.button.callback('🎯 Play Bingo Demo', 'bingo_demo')],
  [Markup.button.callback('🎮 Like Bingo (NEW)', 'like_bingo')],
  [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
]);

// Generate 10x10 Bingo grid (1–100) for Like Bingo
function generateLikeBingoGrid() {
  const keyboard = [];
  for (let i = 0; i < 100; i += 10) {
    const row = [];
    for (let j = 1; j <= 10; j++) {
      const num = i + j;
      row.push(Markup.button.callback(`${num}`, `likebingo_${num}`));
    }
    keyboard.push(row);
  }
  return keyboard;
}

// Generate Like Bingo game interface
async function createLikeBingoInterface(ctx, userBalance = 0, userBonus = 0, hasInsufficientFunds = false) {
  const walletWarning = hasInsufficientFunds ? 
    '🚨 _Please top up your wallet._\n_If you already have and are still seeing this,_\n*please refresh the page.*\n\n' : '';
  
  const message = `🎉 *Like Bingo* 🎉

💰 *Wallet:* ${userBalance}       🎁 *Bonus:* ${userBonus}
🎯 *Active Game:* 2  💸 *Stake:* 10

${walletWarning}🔢 *Select your numbers:*`;

  const keyboard = [
    ...generateLikeBingoGrid(),
    [
      Markup.button.callback('🔄 Refresh', 'likebingo_refresh'),
      Markup.button.callback('🎲 Start Game', 'likebingo_start')
    ],
    [Markup.button.callback('⬅️ Back to Bingo Menu', 'play_bingo')]
  ];

  return {
    text: message,
    keyboard: Markup.inlineKeyboard(keyboard)
  };
}

// Registration keyboard
const registrationKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📱 Share Contact')]
]).resize();

// Terms of Service keyboard
const tosKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✅ Start', 'tos_accept')],
  [Markup.button.callback('❌ Cancel', 'tos_cancel')]
]);

// Start command
bot.start(async (ctx) => {
  const welcomeMessage = `
🎮 **Welcome to Bingo Bot!**

Get ready for an exciting gaming experience! Our bot offers:

🎯 **Bingo Games** - Multiple betting levels
🎰 **Spin Wheel** - Win coins and bonuses  
💰 **Wallet System** - Track your earnings
🎁 **Bonuses & Rewards** - Daily surprises

Ready to start your adventure? Click the button below!
  `;
  
  await ctx.replyWithMarkdown(welcomeMessage, Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Start Playing', 'main_menu')]
  ]));
});

// Main menu action
bot.action('main_menu', async (ctx) => {
  await ctx.editMessageText('🎮 **Welcome to Bingo!** Choose an option below:', {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard.reply_markup
  });
});

// Check if user is registered
async function checkUserRegistration(ctx, callback) {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  if (!user) {
    await ctx.editMessageText(
      '📝 **Registration Required**\n\nTo complete your registration, please click the button below to share your phone number.',
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📱 Share Contact', 'request_contact')],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ]).reply_markup
      }
    );
    return false;
  }
  return true;
}

// Play Bingo action
bot.action('play_bingo', async (ctx) => {
  if (await checkUserRegistration(ctx, 'play_bingo')) {
    await ctx.editMessageText('🍀 **Best of luck on your Bingo game adventure!** 🎮\n\nChoose your betting level:', {
      parse_mode: 'Markdown',
      reply_markup: bingoModesKeyboard.reply_markup
    });
  }
});

// Play Spin action
bot.action('play_spin', async (ctx) => {
  if (await checkUserRegistration(ctx, 'play_spin')) {
    await ctx.editMessageText('🎰 **Ready for the Spin Wheel?**\n\nBy launching this mini app, you agree to the Terms of Service for Mini Apps.', {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.webApp('🎰 Start Spin Game', `${process.env.WEB_APP_URL}/spin`)],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    });
  }
});

// Like Bingo action
bot.action('like_bingo', async (ctx) => {
  if (await checkUserRegistration(ctx, 'like_bingo')) {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });
    
    const hasInsufficientFunds = user.balance < 10; // Minimum stake is 10
    const interface = await createLikeBingoInterface(ctx, user.balance, user.bonus, hasInsufficientFunds);
    
    await ctx.editMessageText(interface.text, {
      parse_mode: 'Markdown',
      reply_markup: interface.keyboard.reply_markup
    });
  }
});

// Like Bingo number selection
bot.action(/likebingo_\d+/, async (ctx) => {
  const number = ctx.match[0].split('_')[1];
  await ctx.answerCbQuery(`✅ Selected number ${number}!`, { show_alert: false });
  
  // TODO: Add number to user's selected numbers in database
  // For now, just acknowledge the selection
});

// Like Bingo refresh
bot.action('likebingo_refresh', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  const hasInsufficientFunds = user.balance < 10;
  const interface = await createLikeBingoInterface(ctx, user.balance, user.bonus, hasInsufficientFunds);
  
  await ctx.editMessageText(interface.text, {
    parse_mode: 'Markdown',
    reply_markup: interface.keyboard.reply_markup
  });
  
  await ctx.answerCbQuery('🔄 Page refreshed!', { show_alert: false });
});

// Like Bingo start game
bot.action('likebingo_start', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  if (user.balance < 10) {
    await ctx.answerCbQuery('❌ Insufficient funds! Please top up your wallet.', { show_alert: true });
    return;
  }
  
  // Deduct stake
  user.balance -= 10;
  await user.save();
  
  await ctx.answerCbQuery('🎲 Game started! Good luck!', { show_alert: true });
  
  // Refresh interface with new balance
  const interface = await createLikeBingoInterface(ctx, user.balance, user.bonus, false);
  await ctx.editMessageText(interface.text, {
    parse_mode: 'Markdown', 
    reply_markup: interface.keyboard.reply_markup
  });
});

// Bingo game modes
const bingoModes = ['bingo_10', 'bingo_20', 'bingo_50', 'bingo_100', 'bingo_demo'];
bingoModes.forEach(mode => {
  bot.action(mode, async (ctx) => {
    const bet = mode.split('_')[1];
    await ctx.editMessageText(`🎯 **Bingo ${bet.toUpperCase()}**\n\nBy launching this mini app, you agree to the Terms of Service for Mini Apps.`, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.webApp(`🎯 Start Bingo ${bet.toUpperCase()}`, `${process.env.WEB_APP_URL}/bingo?mode=${bet}`)],
        [Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]
      ]).reply_markup
    });
  });
});

// Registration flow
bot.action('register', async (ctx) => {
  await ctx.editMessageText(
    '📝 **Registration**\n\nTo complete your registration, please share your contact information.',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📱 Share Contact', 'request_contact')],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

bot.action('request_contact', async (ctx) => {
  await ctx.reply(
    '📱 **Share Your Contact**\n\nPlease click the button below to share your phone number for registration.',
    registrationKeyboard
  );
});

// Handle contact sharing
bot.on('contact', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const phoneNumber = ctx.message.contact.phone_number;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name || '';
  const username = ctx.from.username || '';
  
  try {
    // Check if user already exists
    let user = await User.findOne({ telegramId });
    
    if (user) {
      await ctx.reply('✅ You are already registered!', Markup.removeKeyboard());
    } else {
      // Create new user
      user = new User({
        telegramId,
        name: `${firstName} ${lastName}`.trim(),
        username,
        phoneNumber,
        balance: 100, // Starting balance
        bonus: 50    // Starting bonus
      });
      
      await user.save();
      
      await ctx.reply(
        '🎉 **Registration Successful!**\n\nYou have been successfully registered!\n\n💰 Starting Balance: 100 coins\n🎁 Starting Bonus: 50 coins\n\nClick /playbingo or /playspin to start the game.',
        Markup.removeKeyboard()
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    await ctx.reply('❌ Registration failed. Please try again later.', Markup.removeKeyboard());
  }
});

// Other menu actions
bot.action('balance', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  if (!user) {
    await ctx.editMessageText('❌ You need to register first!', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📝 Register Now', 'register')],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    });
    return;
  }
  
  await ctx.editMessageText(
    `💳 **Your Balance**\n\n💰 Coins: ${user.balance}\n🎁 Bonus: ${user.bonus}\n📱 Phone: ${user.phoneNumber || 'Not set'}`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'balance')],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

bot.action('instructions', async (ctx) => {
  const instructionsText = `
📖 **Game Instructions**

🎯 **Bingo Games:**
• Choose your betting level (10, 20, 50, 100 coins)
• Numbers are called automatically
• Match a full row, column, or diagonal to win
• Higher bets = bigger rewards!

🎰 **Spin Wheel:**
• Spin to win coins and bonuses
• Multiple prize levels available
• Free to play, big rewards possible!

💰 **Wallet System:**
• Track your coins and bonuses
• Winnings added automatically
• Convert bonuses to coins

Good luck and have fun! 🍀
  `;
  
  await ctx.editMessageText(instructionsText, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
    ]).reply_markup
  });
});

bot.action('deposit', async (ctx) => {
  await ctx.editMessageText(
    '💰 **Deposit Coins**\n\nContact support to add coins to your account.\n\nPayment methods:\n• Cryptocurrency\n• Bank Transfer\n• Mobile Payment',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📞 Contact Support', 'support')],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

bot.action('invite', async (ctx) => {
  const referralLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
  await ctx.editMessageText(
    `👥 **Invite Friends**\n\nShare this link and earn bonuses:\n\n${referralLink}\n\n🎁 Earn 25 bonus coins for each friend who registers!`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('📤 Share Link', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me in this awesome Bingo game!`)],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

bot.action('support', async (ctx) => {
  await ctx.editMessageText(
    '📞 **Contact Support**\n\nNeed help? Our support team is here for you!\n\n📧 Email: support@bingobot.com\n💬 Telegram: @BingoSupport\n⏰ Hours: 24/7',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('💬 Message Support', 'https://t.me/BingoSupport')],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

// Command shortcuts
bot.command('playbingo', async (ctx) => {
  if (await checkUserRegistration(ctx, 'play_bingo')) {
    await ctx.reply('🍀 Best of luck on your Bingo game adventure! 🎮\n\nChoose your betting level:', bingoModesKeyboard);
  }
});

bot.command('playspin', async (ctx) => {
  if (await checkUserRegistration(ctx, 'play_spin')) {
    await ctx.reply('🎰 Ready for the Spin Wheel?\n\nBy launching this mini app, you agree to the Terms of Service for Mini Apps.', 
      Markup.inlineKeyboard([
        [Markup.button.webApp('🎰 Start Spin Game', `${process.env.WEB_APP_URL}/spin`)],
      ])
    );
  }
});

bot.command('likebingo', async (ctx) => {
  if (await checkUserRegistration(ctx, 'like_bingo')) {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });
    
    const hasInsufficientFunds = user.balance < 10;
    const interface = await createLikeBingoInterface(ctx, user.balance, user.bonus, hasInsufficientFunds);
    
    await ctx.reply(interface.text, {
      parse_mode: 'Markdown',
      reply_markup: interface.keyboard.reply_markup
    });
  }
});

bot.command('register', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  if (user) {
    await ctx.reply('✅ You are already registered!\n\n💰 Balance: ' + user.balance + ' coins\n🎁 Bonus: ' + user.bonus + ' coins');
  } else {
    await ctx.reply(
      '📝 **Registration**\n\nTo complete your registration, please share your contact information.',
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📱 Share Contact', 'request_contact')],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ]).reply_markup
      }
    );
  }
});

bot.command('balance', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  if (!user) {
    await ctx.reply('❌ You need to register first! Use /register command.', 
      Markup.inlineKeyboard([
        [Markup.button.callback('📝 Register Now', 'register')]
      ])
    );
    return;
  }
  
  await ctx.reply(
    `💳 **Your Balance**\n\n💰 Coins: ${user.balance}\n🎁 Bonus: ${user.bonus}\n📱 Phone: ${user.phoneNumber || 'Not set'}\n📅 Member since: ${user.registeredAt.toDateString()}`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'balance')],
        [Markup.button.callback('🎮 Play Games', 'main_menu')]
      ]).reply_markup
    }
  );
});

bot.command('deposit', async (ctx) => {
  await ctx.reply(
    '💰 **Deposit Coins**\n\nContact support to add coins to your account.\n\nPayment methods:\n• Cryptocurrency\n• Bank Transfer\n• Mobile Payment',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📞 Contact Support', 'support')],
        [Markup.button.callback('🎮 Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

bot.command('support', async (ctx) => {
  await ctx.reply(
    '📞 **Contact Support**\n\nNeed help? Our support team is here for you!\n\n📧 Email: support@bingobot.com\n💬 Telegram: @BingoSupport\n⏰ Hours: 24/7',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('💬 Message Support', 'https://t.me/BingoSupport')],
        [Markup.button.callback('🎮 Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

bot.command('invite', async (ctx) => {
  const referralLink = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
  await ctx.reply(
    `👥 **Invite Friends**\n\nShare this link and earn bonuses:\n\n${referralLink}\n\n🎁 Earn 25 bonus coins for each friend who registers!`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('📤 Share Link', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me in this awesome Bingo game!`)],
        [Markup.button.callback('🎮 Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Something went wrong. Please try again.');
});

bot.launch().then(async () => {
  console.log('🤖 Bot started');
  
  // Set persistent menu commands
  try {
    // Clear existing commands first
    await bot.telegram.deleteMyCommands();
    console.log('🗑️ Cleared old commands');
    
    // Wait a moment for Telegram to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Set new commands
    await bot.telegram.setMyCommands([
      { command: 'playbingo', description: 'Play Bingo Game 🎮' },
      { command: 'likebingo', description: 'Play Like Bingo (NEW) 🎯' },
      { command: 'playspin', description: 'Play Spin Game 🎰' },
      { command: 'register', description: 'Register your account 📱' },
      { command: 'balance', description: 'Check your balance 💰' },
      { command: 'deposit', description: 'Deposit funds 🏦' },
      { command: 'support', description: 'Contact support 👨‍💻' },
      { command: 'invite', description: 'Invite your friends 👥' }
    ]);
    console.log('✅ Bot commands menu set successfully');
    
    // Also remove any web app menu button to prevent conflicts
    try {
      await bot.telegram.setChatMenuButton();
      console.log('🔧 Cleared menu button to show commands');
    } catch (err) {
      console.log('ℹ️  Menu button clear skipped (may not exist)');
    }
    
  } catch (error) {
    console.error('❌ Failed to set bot commands:', error);
  }
});
