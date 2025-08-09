const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
const connectDB = require('./utils/db');
const User = require('./models/User');
const Payment = require('./models/Payment');
const GameSession = require('./models/GameSession');
const crypto = require('crypto');

// Import WebSocket functions (optional - real-time features)
let wsServer = null;
try {
  // Only try to load WebSocket server if it exists
  if (require('fs').existsSync('./websocket-server.js')) {
    wsServer = require('./websocket-server');
    console.log('✅ WebSocket integration loaded');
  } else {
    console.log('⚠️  WebSocket server not found - real-time features disabled');
  }
} catch (error) {
  console.log('⚠️  WebSocket server not available - real-time features disabled');
  console.log('   Error:', error.message);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// In-memory session store for better session management
const sessionStore = new Map();

// Improved session middleware for deposit flow
bot.use((ctx, next) => {
  const userId = ctx.from?.id?.toString();
  
  if (!userId) {
    return next();
  }
  
  // Get or create session for this user
  if (!sessionStore.has(userId)) {
    sessionStore.set(userId, {});
  }
  
  // Attach session to context
  ctx.session = sessionStore.get(userId);
  
  // Add debugging for session state
  if (ctx.session.depositState) {
    console.log(`🔍 Session Debug - User ${userId}: depositState = ${ctx.session.depositState}`);
  }
  
  return next();
});

connectDB();
console.log("🤖 Bot is starting...");

// Debug environment variables
console.log('🔍 Environment Debug:');
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'Found' : '❌ Missing');
console.log('WEB_APP_URL:', process.env.WEB_APP_URL || '❌ Missing');
console.log('ADMIN_ID_1:', process.env.ADMIN_ID_1 || '❌ Missing');
console.log('ADMIN_ID_2:', process.env.ADMIN_ID_2 || '❌ Missing');

// Bingo Game Configuration (using wallet balance instead of bank payment)
const BINGO_CONFIG = {
  '10': { cost: 10, multiplier: 2.5, winnings: 25 },
  '20': { cost: 20, multiplier: 3, winnings: 60 },
  '50': { cost: 50, multiplier: 3.5, winnings: 175 },
  '100': { cost: 100, multiplier: 4, winnings: 400 }
};

// Admin Configuration - Add your admin Telegram IDs here
const ADMIN_IDS = [
  process.env.ADMIN_ID_1,
  process.env.ADMIN_ID_2,
  process.env.ADMIN_ID_3, // Support for more admins if needed
].filter(id => id && id.trim() !== ''); // Filter out empty/undefined values

// Payment Agent Configuration
const PAYMENT_AGENTS = [
  process.env.ADMIN_ID_1,
  process.env.ADMIN_ID_2,
].filter(id => id && id.trim() !== '');

// Payment Configuration
const PAYMENT_CONFIG = {
  minAmount: 50,
  maxAmount: 10000,
  supportedMethods: ['Telebirr', 'HelloCash', 'Bank Transfer'],
  agentPhone: process.env.AGENT_PHONE || '0967218959',
  agentName: process.env.AGENT_NAME || 'Payment Agent',
  bankAccount: '1000526054753',
  bankName: 'Ethiopian Commercial Bank',
  pointRate: 1 // 1 Birr = 1 point
};

// Log admin configuration on startup
console.log('🔑 Admin Configuration:');
if (ADMIN_IDS.length === 0) {
  console.log('⚠️  WARNING: No admin IDs configured! Add ADMIN_ID_1, ADMIN_ID_2, etc. to your .env file');
  console.log('📋 To get your Telegram User ID, send /getid to your bot');
} else {
  console.log(`✅ ${ADMIN_IDS.length} admin(s) configured:`, ADMIN_IDS);
  
  // Check if any admin IDs look like usernames (contain @ or letters)
  ADMIN_IDS.forEach((id, index) => {
    if (id.includes('@') || isNaN(id)) {
      console.log(`❌ ADMIN_ID_${index + 1} (${id}) appears to be a username, not a numeric user ID!`);
      console.log('   Use /getid command to get the correct numeric ID');
    }
  });
}

// Main menu keyboard
const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🎯 Play Bingo', 'play_bingo')],
  [Markup.button.callback('📝 Register', 'register')],
  [Markup.button.callback('💰 Deposit', 'deposit')],
  [Markup.button.callback('🏧 Withdraw', 'withdraw')],
  [Markup.button.callback('💳 Check Balance', 'balance')],
  [Markup.button.callback('🎮 Instructions', 'instructions')],
  [Markup.button.callback('👥 Invite', 'invite')],
  [Markup.button.callback('📞 Contact Support', 'support')],
]);

// Bingo game modes keyboard
const bingoModesKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🎯 Play Bingo 10', 'bingo_10')],
  [Markup.button.callback('🎯 Play Bingo 20', 'bingo_20')],
  [Markup.button.callback('🎯 Play Bingo 50', 'bingo_50')],
  [Markup.button.callback('🎯 Play Bingo 100', 'bingo_100')],
  [Markup.button.callback('🎯 Play Bingo Demo', 'bingo_demo')],
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

// Global error handler for bot
bot.catch((err, ctx) => {
  console.log('Bot error:', err);
  
  // Don't crash on common Telegram errors
  if (err.code === 403) {
    console.log(`User ${ctx.from?.id} has blocked the bot`);
    return;
  }
  
  if (err.code === 429) {
    console.log('Rate limited by Telegram');
    return;
  }
  
  // Log other errors but don't crash
  console.error('Unexpected bot error:', err);
});

// Start command with referral tracking
bot.start(async (ctx) => {
  try {
    const startPayload = ctx.message.text.split(' ')[1]; // Get referral ID if present
    const newUserId = ctx.from.id.toString();
    
    let welcomeMessage = `
🎮 **Welcome to Bingo Bot!**

Get ready for an exciting gaming experience! Our bot offers:

🎯 **Bingo Games** - Multiple betting levels
💰 **Wallet System** - Track your earnings
🎁 **Bonuses & Rewards** - Daily surprises

Ready to start your adventure? Click the button below!
    `;
    
    // Handle referral if present
    if (startPayload && startPayload !== newUserId) {
      try {
        // Check if referred user exists and if referrer exists
        const referrer = await User.findOne({ telegramId: startPayload });
        const newUser = await User.findOne({ telegramId: newUserId });
        
        if (referrer && !newUser) {
          welcomeMessage = `
🎮 **Welcome to Bingo Bot!**

🎉 You were invited by ${referrer.name}! 

When you register, both you and your friend will receive bonus rewards:
• You get: **50 bonus coins**
• ${referrer.name} gets: **25 bonus coins**

Get ready for an exciting gaming experience! Our bot offers:

🎯 **Bingo Games** - Multiple betting levels
💰 **Wallet System** - Track your earnings
🎁 **Bonuses & Rewards** - Daily surprises

Ready to start your adventure? Click the button below!
          `;
          
          // Store referral info temporarily (will be processed during registration)
          ctx.session = ctx.session || {};
          ctx.session.referredBy = startPayload;
        }
      } catch (error) {
        console.log('Referral processing error:', error.message);
      }
    }
    
    await ctx.replyWithMarkdown(welcomeMessage, Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Start Playing', 'main_menu')]
    ]));
  } catch (error) {
    console.log('Start command error:', error.message);
    // Don't crash, just log the error
  }
});

// Main menu action
bot.action('main_menu', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  if (!user) {
    await ctx.editMessageText(
      '❌ **User not found**\n\nPlease register first to access the menu.',
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register', 'register')]
        ]).reply_markup
      }
    );
    return;
  }
  
  const gameAccess = getUserGameAccess(user.balance);
  const availableGames = Object.values(gameAccess).filter(game => game.available);
  const lockedGames = Object.values(gameAccess).filter(game => !game.available);
  
  let message = `🎮 **Welcome to the Gaming Platform!**

💰 **Your Balance:** ${user.balance} coins
🎁 **Bonus:** ${user.bonus} coins

🎯 **Available Games:**\n`;
  
  availableGames.forEach(game => {
    message += `✅ ${game.name} ${game.cost > 0 ? `(${game.cost} coins)` : '(Free)'}\n`;
  });
  
  if (lockedGames.length > 0) {
    message += `\n🔒 **Locked Games:**\n`;
    lockedGames.forEach(game => {
      const needed = game.cost - user.balance;
      message += `❌ ${game.name} - Need ${needed} more coins\n`;
    });
  }
  
  message += `\n💡 **Need more coins?** Use the Deposit button below!`;
  
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🎮 Play Bingo', 'play_bingo')],
      [Markup.button.callback('💰 Deposit', 'deposit')],
      [Markup.button.callback('🏧 Withdraw', 'withdraw')],
      [Markup.button.callback('💳 Check Balance', 'balance')],
      [Markup.button.callback('📞 Support', 'support')]
    ]).reply_markup
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



// Like Bingo action - Now redirects to new mobile UI
bot.action('like_bingo', async (ctx) => {
  if (await checkUserRegistration(ctx, 'like_bingo')) {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });
    
    // Generate session token
    const sessionToken = generateSessionToken();
    const session = new GameSession({
      telegramId,
      gameMode: 'like_bingo',
      sessionToken,
      maxGames: 999, // Unlimited for Like Bingo
      betAmount: 10, // Default stake
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    await session.save();
    
    const hasInsufficientFunds = user.balance < 10; // Minimum stake is 10
    
    await ctx.editMessageText(
      `🎮 **Like Bingo - Mobile Gaming Experience**\n\n` +
      `💰 Current Balance: ${user.balance} coins\n` +
      `🎁 Bonus Points: ${user.bonus}\n` +
      `🎯 Minimum Stake: 10 coins\n\n` +
      `${hasInsufficientFunds ? '⚠️ **Insufficient Balance**: You need to deposit first to play!\n\n' : ''}` +
      `🎲 **How to Play:**\n` +
      `• Select up to 10 numbers (1-100)\n` +
      `• Set your stake (10-50 coins)\n` +
      `• Win based on how many numbers match!\n\n` +
      `🏆 **Win Multipliers:**\n` +
      `3 matches: 1.2x • 5 matches: 2x\n` +
      `7 matches: 5x • 10 matches: 20x\n\n` +
      `${hasInsufficientFunds ? '💡 **To start playing:**\n• Use /deposit to add money to your wallet\n• Or try the free demo game first' : ''}`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('🎮 Play Like Bingo (Browser)', `${process.env.WEB_APP_URL}/like-bingo?token=${sessionToken}`)],
          [Markup.button.webApp('📱 Like Bingo Mobile', `${process.env.WEB_APP_URL}/like-bingo?token=${sessionToken}`)],
          [Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]
        ]).reply_markup
      }
    );
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
    await ctx.answerCbQuery('❌ Insufficient funds! You need to deposit first to play.', { show_alert: true });
    return;
  }
  
  // Deduct stake
  user.balance -= 10;
  await user.save();
  
  await ctx.answerCbQuery('�� Game started! Good luck!', { show_alert: true });
  
  // Refresh interface with new balance
  const interface = await createLikeBingoInterface(ctx, user.balance, user.bonus, false);
  await ctx.editMessageText(interface.text, {
    parse_mode: 'Markdown', 
    reply_markup: interface.keyboard.reply_markup
  });
});

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Process game winnings
async function processGameWinnings(telegramId, gameMode, won) {
  try {
    const user = await User.findOne({ telegramId });
    if (!user) return false;
    
    const config = BINGO_CONFIG[gameMode];
    if (!config || !won) return true; // No winnings if lost or invalid config
    
    // Add winnings to user balance
    user.balance += config.winnings;
    await user.save();
    
    // Notify user about winnings
    try {
      await bot.telegram.sendMessage(telegramId, 
        `🎉 Congratulations! You won Bingo ${gameMode}!\n\n` +
        `🏆 Winnings: ${config.winnings} coins\n` +
        `💰 New Balance: ${user.balance} coins\n\n` +
        `🎮 Ready for another game?`, 
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🎯 Play Again', `bingo_${gameMode}`)],
            [Markup.button.callback('🎮 Other Games', 'play_bingo')]
          ]).reply_markup
        }
      );
    } catch (error) {
      console.log('Failed to send winning notification:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error processing game winnings:', error);
    return false;
  }
}

// Check if user is admin
function isAdmin(telegramId) {
  const userIdStr = telegramId.toString();
  const isAdminUser = ADMIN_IDS.includes(userIdStr);
  
  // Debug logging
  console.log(`🔐 Admin Check: User ${userIdStr} -> ${isAdminUser ? 'ADMIN' : 'NOT ADMIN'}`);
  console.log(`🔐 Configured Admins: [${ADMIN_IDS.join(', ')}]`);
  
  return isAdminUser;
}

// Bingo game modes
bot.action('bingo_demo', async (ctx) => {
  // Demo mode - instant access
  const sessionToken = generateSessionToken();
  const telegramId = ctx.from.id.toString();
  
  // Create demo session
  const session = new GameSession({
    telegramId,
    gameMode: 'demo',
    sessionToken,
    maxGames: 999 // Unlimited for demo
  });
  await session.save();
  
  await ctx.editMessageText(`🎮 **Free Bingo Demo**\n\nNo payment required! Practice and learn how to play Bingo.\n\n🔗 **Direct Links:**\n• Desktop: ${process.env.WEB_APP_URL}/bingo?mode=demo&token=${sessionToken}\n• Mobile: Open link below`, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.url('🎮 Play Demo (Browser)', `${process.env.WEB_APP_URL}/bingo?mode=demo&token=${sessionToken}`)],
      [Markup.button.webApp(`🎮 Mini App`, `${process.env.WEB_APP_URL}/bingo?mode=demo&token=${sessionToken}`)],
      [Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]
    ]).reply_markup
  });
});

// Paid Bingo modes - Now using wallet balance
const paidBingoModes = ['bingo_10', 'bingo_20', 'bingo_50', 'bingo_100'];
paidBingoModes.forEach(mode => {
  bot.action(mode, async (ctx) => {
    const gameMode = mode.split('_')[1];
    const config = BINGO_CONFIG[gameMode];
    const telegramId = ctx.from.id.toString();
    
    if (!config) {
      await ctx.answerCbQuery('❌ Game mode not available', { show_alert: true });
      return;
    }
    
    try {
      // Get user's current balance
      const user = await User.findOne({ telegramId });
      if (!user) {
        await ctx.answerCbQuery('❌ User not found. Please register first.', { show_alert: true });
        return;
      }
      
      // Check if user has sufficient balance
      if (user.balance < config.cost) {
        // Show insufficient balance message and redirect to mini app with notification
        const sessionToken = generateSessionToken();
        const session = new GameSession({
          telegramId,
          gameMode: 'insufficient_balance',
          sessionToken,
          maxGames: 0,
          metadata: { requiredAmount: config.cost, currentBalance: user.balance }
        });
        await session.save();
        
        await ctx.editMessageText(
          `💰 Bingo ${gameMode}\n\n` +
          `🎯 Entry Cost: ${config.cost} coins\n` +
          `💰 Your Balance: ${user.balance} coins\n` +
          `❌ Insufficient Balance!\n\n` +
          `You need ${config.cost - user.balance} more coins to play this level.\n\n` +
          `🎮 Try the demo version or play other games to earn coins!`,
          {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('🌐 Open Wallet (Browser)', `${process.env.WEB_APP_URL}/menu?token=${sessionToken}&notification=insufficient_balance&required=${config.cost}&current=${user.balance}`)],
              [Markup.button.webApp('📱 Wallet Mini App', `${process.env.WEB_APP_URL}/menu?token=${sessionToken}&notification=insufficient_balance&required=${config.cost}&current=${user.balance}`)],
              [Markup.button.callback('🎮 Play Demo', 'bingo_demo')],
              [Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]
            ]).reply_markup
          }
        );
        return;
      }
      
      // User has sufficient balance - deduct cost and start game
      user.balance -= config.cost;
      await user.save();
      
      // Create game session
      const sessionToken = generateSessionToken();
      const session = new GameSession({
        telegramId,
        gameMode: `bingo_${gameMode}`,
        sessionToken,
        maxGames: 1,
        betAmount: config.cost,
        potentialWinnings: config.winnings
      });
      await session.save();
      
      await ctx.editMessageText(
        `🎮 Bingo ${gameMode} - Ready to Play!\n\n` +
        `💰 Entry Cost: ${config.cost} coins (deducted)\n` +
        `🏆 Potential Winnings: ${config.winnings} coins\n` +
        `💼 Remaining Balance: ${user.balance} coins\n\n` +
        `🎯 Good luck! Choose how to play:`,
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.url('🌐 Browser Game', `${process.env.WEB_APP_URL}/bingo?mode=${gameMode}&token=${sessionToken}`)],
            [Markup.button.webApp(`📱 Mini App`, `${process.env.WEB_APP_URL}/bingo?mode=${gameMode}&token=${sessionToken}`)],
            [Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]
          ]).reply_markup
        }
      );
      
    } catch (error) {
      console.error('Error in paid bingo mode:', error);
      await ctx.answerCbQuery('❌ An error occurred. Please try again.', { show_alert: true });
    }
  });
});

// Handle "I've Paid" button clicks
bot.action(/paid_(\d+)/, async (ctx) => {
  const gameMode = ctx.match[1];
  const telegramId = ctx.from.id.toString();
  const config = PAYMENT_CONFIG[gameMode];
  
  if (!config) {
    await ctx.answerCbQuery('❌ Invalid game mode', { show_alert: true });
    return;
  }
  
  try {
    // Check if user already has a pending payment for this game mode
    const existingPayment = await Payment.findOne({
      telegramId,
      gameMode,
      status: { $in: ['pending', 'paid_waiting'] }
    });
    
    if (existingPayment) {
      await ctx.editMessageText(
        `⏳ **Payment Already Submitted**\n\n` +
        `You already have a payment request for Bingo ${gameMode} that is being processed.\n\n` +
        `📅 Submitted: ${existingPayment.createdAt.toLocaleString()}\n` +
        `💰 Amount: ${config.amount} Birr\n` +
        `📊 Status: ${existingPayment.status === 'pending' ? 'Waiting for payment confirmation' : 'Payment confirmed, waiting for verification'}\n\n` +
        `Please wait for admin verification. This usually takes 5-10 minutes.`,
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Check Status', `status_${gameMode}`)],
            [Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]
          ]).reply_markup
        }
      );
      return;
    }
    
    // Create new payment record
    const payment = new Payment({
      telegramId,
      gameMode,
      amount: config.amount,
      bankAccount: config.account,
      status: 'paid_waiting',
      paidAt: new Date(),
      sessionToken: generateSessionToken()
    });
    
    await payment.save();
    
    // Notify user
    await ctx.editMessageText(
      `✅ **Payment Confirmed!**\n\n` +
      `Thank you for confirming your payment of ${config.amount} Birr for Bingo ${gameMode}.\n\n` +
      `🔍 **Our team is now verifying your payment...**\n\n` +
      `⏱️ Verification usually takes 5-10 minutes\n` +
      `📱 You'll receive a notification when verified\n` +
      `🎮 Then you can start playing!\n\n` +
      `📋 Payment ID: ${payment._id.toString().substr(-8)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Check Status', `status_${gameMode}`)],
          [Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]
        ]).reply_markup
      }
    );
    
    // Notify admins
    const user = await User.findOne({ telegramId });
    const adminMessage = `
🔔 **New Payment Notification**

👤 User: ${user.name} (@${user.username || 'no_username'})
📱 Phone: ${user.phoneNumber || 'Not provided'}
🆔 Telegram ID: ${telegramId}
🎮 Game: Bingo ${gameMode}
💰 Amount: ${config.amount} Birr
🏦 Bank Account: ${config.account}
📋 Payment ID: ${payment._id.toString().substr(-8)}
📅 Time: ${new Date().toLocaleString()}

**Action Required:** Please verify this payment and click the button below.
    `;
    
    const adminKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Verify Payment', `admin_verify_${payment._id}`),
        Markup.button.callback('❌ Reject Payment', `admin_reject_${payment._id}`)
      ],
      [Markup.button.callback('👤 User Details', `admin_user_${telegramId}`)]
    ]);
    
    // Send to all admins
    for (const adminId of ADMIN_IDS) {
      try {
        await bot.telegram.sendMessage(adminId, adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: adminKeyboard.reply_markup
        });
      } catch (error) {
        console.log(`Failed to notify admin ${adminId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Payment processing error:', error);
    await ctx.answerCbQuery('❌ Error processing payment. Please try again.', { show_alert: true });
  }
});

// Check payment status
bot.action(/status_(\d+)/, async (ctx) => {
  const gameMode = ctx.match[1];
  const telegramId = ctx.from.id.toString();
  
  const payment = await Payment.findOne({
    telegramId,
    gameMode,
    status: { $in: ['pending', 'paid_waiting', 'verified', 'rejected'] }
  }).sort({ createdAt: -1 });
  
  if (!payment) {
    await ctx.answerCbQuery('❌ No payment found for this game mode', { show_alert: true });
    return;
  }
  
  let statusMessage = `📊 **Payment Status**\n\n`;
  statusMessage += `🎮 Game: Bingo ${gameMode}\n`;
  statusMessage += `💰 Amount: ${payment.amount} Birr\n`;
  statusMessage += `📋 Payment ID: ${payment._id.toString().substr(-8)}\n`;
  statusMessage += `📅 Submitted: ${payment.createdAt.toLocaleString()}\n\n`;
  
  switch (payment.status) {
    case 'pending':
      statusMessage += `🟡 **Status: Waiting for payment**\nPlease complete your bank transfer and click "I've Paid" button.`;
      break;
    case 'paid_waiting':
      statusMessage += `🟠 **Status: Payment confirmed, waiting for verification**\nOur team is verifying your payment. This usually takes 5-10 minutes.`;
      break;
    case 'verified':
      statusMessage += `🟢 **Status: Verified! Ready to play**\nYour payment has been verified. You can now access the game!`;
      break;
    case 'rejected':
      statusMessage += `🔴 **Status: Payment rejected**\nYour payment could not be verified. Please contact support.`;
      if (payment.adminNotes) {
        statusMessage += `\n\n📝 Admin Notes: ${payment.adminNotes}`;
      }
      break;
  }
  
  const buttons = [];
  if (payment.status === 'verified') {
    const session = await GameSession.findOne({ paymentId: payment._id, isActive: true });
    if (session) {
      buttons.push([Markup.button.webApp(`🎯 Play Bingo ${gameMode}`, `${process.env.WEB_APP_URL}/bingo?mode=${gameMode}&token=${session.sessionToken}`)]);
    }
  }
  buttons.push([Markup.button.callback('🔄 Refresh', `status_${gameMode}`)]);
  buttons.push([Markup.button.callback('⬅️ Back to Bingo', 'play_bingo')]);
  
  await ctx.editMessageText(statusMessage, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard(buttons).reply_markup
  });
});

// Admin verification handlers
bot.action(/admin_verify_(.+)/, async (ctx) => {
  const paymentId = ctx.match[1];
  const adminId = ctx.from.id.toString();
  
  console.log(`🔔 Admin Verify Attempt: Payment ${paymentId} by User ${adminId}`);
  
  if (!isAdmin(adminId)) {
    console.log(`❌ Unauthorized admin verify attempt by ${adminId}`);
    await ctx.answerCbQuery('❌ Unauthorized access - You are not configured as an admin', { show_alert: true });
    return;
  }
  
  console.log(`✅ Admin ${adminId} authorized for payment verification`);
  
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      await ctx.answerCbQuery('❌ Payment not found', { show_alert: true });
      return;
    }
    
    if (payment.status === 'verified') {
      await ctx.answerCbQuery('✅ Payment already verified', { show_alert: true });
      return;
    }
    
    // Update payment status
    payment.status = 'verified';
    payment.verifiedAt = new Date();
    payment.adminNotes = `Verified by admin ${adminId}`;
    await payment.save();
    
    // Create game session
    const session = new GameSession({
      telegramId: payment.telegramId,
      gameMode: payment.gameMode,
      sessionToken: payment.sessionToken,
      paymentId: payment._id,
      maxGames: 5 // Allow 5 games per payment
    });
    await session.save();
    
    // Notify user via Telegram
    const user = await User.findOne({ telegramId: payment.telegramId });
    const userMessage = `
🎉 **Payment Verified!**

Your payment for Bingo ${payment.gameMode} has been verified!

💰 Amount: ${payment.amount} Birr
🎮 Game: Bingo ${payment.gameMode}
📋 Payment ID: ${payment._id.toString().substr(-8)}

You can now access your game! Click the button below to start playing.
    `;
    
    const userKeyboard = Markup.inlineKeyboard([
      [Markup.button.webApp(`🎯 Play Bingo ${payment.gameMode}`, `${process.env.WEB_APP_URL}/bingo?mode=${payment.gameMode}&token=${session.sessionToken}`)],
      [Markup.button.callback('🎮 Back to Games', 'main_menu')]
    ]);
    
    try {
      await bot.telegram.sendMessage(payment.telegramId, userMessage, {
        parse_mode: 'Markdown',
        reply_markup: userKeyboard.reply_markup
      });
    } catch (error) {
      console.log(`Failed to notify user ${payment.telegramId}:`, error.message);
    }
    
    // Send real-time WebSocket notification
    if (wsServer) {
      wsServer.notifyPaymentVerified(payment.telegramId, payment.gameMode, session.sessionToken);
    }
    
    // Update admin message
    await ctx.editMessageText(
      `✅ **Payment Verified Successfully**\n\n` +
      `Payment ID: ${payment._id.toString().substr(-8)}\n` +
      `User: ${user.name}\n` +
      `Game: Bingo ${payment.gameMode}\n` +
      `Amount: ${payment.amount} Birr\n` +
      `Verified by: Admin ${adminId}\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `User has been notified and can now access the game.`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('👤 User Details', `admin_user_${payment.telegramId}`)]
        ]).reply_markup
      }
    );
    
    await ctx.answerCbQuery('✅ Payment verified and user notified!', { show_alert: false });
    
  } catch (error) {
    console.error('Admin verification error:', error);
    await ctx.answerCbQuery('❌ Error verifying payment', { show_alert: true });
  }
});

bot.action(/admin_reject_(.+)/, async (ctx) => {
  const paymentId = ctx.match[1];
  const adminId = ctx.from.id.toString();
  
  if (!isAdmin(adminId)) {
    await ctx.answerCbQuery('❌ Unauthorized access', { show_alert: true });
    return;
  }
  
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      await ctx.answerCbQuery('❌ Payment not found', { show_alert: true });
      return;
    }
    
    if (payment.status === 'rejected') {
      await ctx.answerCbQuery('❌ Payment already rejected', { show_alert: true });
      return;
    }
    
    // Update payment status
    payment.status = 'rejected';
    payment.adminNotes = `Rejected by admin ${adminId} - Payment not found or invalid`;
    await payment.save();
    
    // Notify user via Telegram
    const user = await User.findOne({ telegramId: payment.telegramId });
    const userMessage = `
❌ **Payment Verification Failed**

Your payment for Bingo ${payment.gameMode} could not be verified.

💰 Amount: ${payment.amount} Birr
🎮 Game: Bingo ${payment.gameMode}
📋 Payment ID: ${payment._id.toString().substr(-8)}

**Possible reasons:**
• Payment not received
• Incorrect amount
• Wrong account details

Please contact support if you believe this is an error.
    `;
    
    const userKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📞 Contact Support', 'support')],
      [Markup.button.callback('🎮 Back to Games', 'main_menu')]
    ]);
    
    try {
      await bot.telegram.sendMessage(payment.telegramId, userMessage, {
        parse_mode: 'Markdown',
        reply_markup: userKeyboard.reply_markup
      });
    } catch (error) {
      console.log(`Failed to notify user ${payment.telegramId}:`, error.message);
    }
    
    // Send real-time WebSocket notification
    if (wsServer) {
      wsServer.notifyPaymentRejected(payment.telegramId, payment.gameMode, payment.adminNotes);
    }
    
    // Update admin message
    await ctx.editMessageText(
      `❌ **Payment Rejected**\n\n` +
      `Payment ID: ${payment._id.toString().substr(-8)}\n` +
      `User: ${user.name}\n` +
      `Game: Bingo ${payment.gameMode}\n` +
      `Amount: ${payment.amount} Birr\n` +
      `Rejected by: Admin ${adminId}\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `User has been notified about the rejection.`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('👤 User Details', `admin_user_${payment.telegramId}`)]
        ]).reply_markup
      }
    );
    
    await ctx.answerCbQuery('❌ Payment rejected and user notified', { show_alert: false });
    
  } catch (error) {
    console.error('Admin rejection error:', error);
    await ctx.answerCbQuery('❌ Error rejecting payment', { show_alert: true });
  }
});

bot.action(/admin_user_(.+)/, async (ctx) => {
  const telegramId = ctx.match[1];
  const adminId = ctx.from.id.toString();
  
  if (!isAdmin(adminId)) {
    await ctx.answerCbQuery('❌ Unauthorized access', { show_alert: true });
    return;
  }
  
  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.answerCbQuery('❌ User not found', { show_alert: true });
      return;
    }
    
    const payments = await Payment.find({ telegramId }).sort({ createdAt: -1 }).limit(5);
    const sessions = await GameSession.find({ telegramId }).sort({ createdAt: -1 }).limit(3);
    
    let userInfo = `👤 **User Details**\n\n`;
    userInfo += `🆔 Telegram ID: ${telegramId}\n`;
    userInfo += `📛 Name: ${user.name}\n`;
    userInfo += `👤 Username: @${user.username || 'none'}\n`;
    userInfo += `📱 Phone: ${user.phoneNumber || 'Not provided'}\n`;
    userInfo += `💰 Balance: ${user.balance} coins\n`;
    userInfo += `🎁 Bonus: ${user.bonus} coins\n`;
    userInfo += `📅 Registered: ${user.registeredAt.toDateString()}\n`;
    userInfo += `⏰ Last Active: ${user.lastActive.toDateString()}\n\n`;
    
    if (payments.length > 0) {
      userInfo += `💳 **Recent Payments:**\n`;
      payments.forEach((payment, index) => {
        userInfo += `${index + 1}. Bingo ${payment.gameMode} - ${payment.amount} Birr (${payment.status})\n`;
      });
      userInfo += '\n';
    }
    
    if (sessions.length > 0) {
      userInfo += `🎮 **Active Sessions:**\n`;
      sessions.forEach((session, index) => {
        if (session.isActive) {
          userInfo += `${index + 1}. Bingo ${session.gameMode} - ${session.gamesPlayed}/${session.maxGames} games\n`;
        }
      });
    }
    
    await ctx.reply(userInfo, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back', 'admin_dashboard')]
      ]).reply_markup
    });
    
  } catch (error) {
    console.error('Admin user details error:', error);
    await ctx.answerCbQuery('❌ Error fetching user details', { show_alert: true });
  }
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
      // Get referral info if available
      const referredBy = ctx.session?.referredBy;
      let bonusMessage = '';
      
      // Create new user with 0 balance and 0 bonus
      user = new User({
        telegramId,
        name: `${firstName} ${lastName}`.trim(),
        username,
        phoneNumber,
        balance: 0, // Starting balance - users must pay first
        bonus: 0, // Starting bonus - users must pay first
        referredBy: referredBy || null
      });
      
      await user.save();
      
      // Note: Referral system disabled - users must pay first to play
      // Referral bonuses will be awarded when users make their first deposit
      
      await ctx.reply(
        `🎉 **Registration Successful!**\n\nYou have been successfully registered!\n\n💰 Starting Balance: 0 coins\n🎁 Starting Bonus: 0 coins\n\n💡 **To start playing:**\n• Use /deposit to add money to your wallet\n• Or try the free demo game first\n\nClick /play to see available games!`,
        Markup.removeKeyboard()
      );
      
      // Clear referral session data
      if (ctx.session) {
        delete ctx.session.referredBy;
      }
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
    `💳 **Your Balance**\n\n💰 Coins: ${user.balance}\n🎁 Bonus: ${user.bonus}\n📱 Phone: ${user.phoneNumber || 'Not set'}\n\n${user.balance === 0 ? '💡 **To start playing:**\n• Use /deposit to add money to your wallet\n• Or try the free demo game first' : ''}`,
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

🎮 **Demo Game:**
• Free to play - no payment required
• Practice and learn the game
• No real money involved

💰 **Payment System:**
• You must deposit first to play paid games
• Use /deposit to add money to your wallet
• 1 Ethiopian Birr = 1 point
• Minimum deposit: 50 Birr

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

// Old deposit action removed - replaced by comprehensive flow below

bot.action('invite', async (ctx) => {
  try {
    // Get bot info to ensure we have the username
    const botInfo = await ctx.telegram.getMe();
    const botUsername = botInfo.username;
    
    if (!botUsername) {
      await ctx.editMessageText(
        '❌ Invite System Unavailable\n\nThe bot username is not configured. Please contact the admin.',
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('📞 Contact Support', 'support')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ]).reply_markup
        }
      );
      return;
    }
    
    const referralLink = `https://t.me/${botUsername}?start=${ctx.from.id}`;
    await ctx.editMessageText(
      `👥 Invite Friends\n\nShare this link and earn bonuses:\n\n${referralLink}\n\n🎁 Earn 25 bonus coins for each friend who registers!`,
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('📤 Share Link', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me in this awesome Bingo game!`)],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ]).reply_markup
      }
    );
  } catch (error) {
    console.error('Invite error:', error);
    await ctx.editMessageText(
      '❌ Invite System Error\n\nThere was an error generating your invite link. Please try again later.',
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'invite')],
          [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
        ]).reply_markup
      }
    );
  }
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

// Deposit action handler for main menu button
bot.action('deposit', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || 'Unknown';
  
  // Check if user is registered first
  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.editMessageText(
        `❌ **Registration Required**\n\n` +
        `You need to register first before making deposits.\n\n` +
        `📝 **To register:**\n` +
        `• Click "📝 Register" in the main menu\n` +
        `• Or use /register command`,
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('📝 Register Now', 'register')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ]).reply_markup
        }
      );
      return;
    }
  } catch (error) {
    console.error('Error checking user registration:', error);
    await ctx.editMessageText('❌ Error checking registration. Please try again.');
    return;
  }
  
  const message = `💰 **Deposit Flow**\n\n` +
    `Choose your preferred deposit method:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🟡 Manual', 'deposit_manual')],
    [Markup.button.callback('💰 Check Balance', 'balance')],
    [Markup.button.callback('📞 Contact Support', 'support')],
    [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup
  });
});

// Command shortcuts
bot.command('playbingo', async (ctx) => {
  if (await checkUserRegistration(ctx, 'play_bingo')) {
    await ctx.reply('🍀 Best of luck on your Bingo game adventure! 🎮\n\nChoose your betting level:', bingoModesKeyboard);
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
        [Markup.button.callback('📋 Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

// Old deposit command removed - replaced by comprehensive flow below

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
  try {
    // Get bot info to ensure we have the username
    const botInfo = await ctx.telegram.getMe();
    const botUsername = botInfo.username;
    
    if (!botUsername) {
      await ctx.reply(
        '❌ **Invite System Unavailable**\n\nThe bot username is not configured. Please contact the admin.',
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('📞 Contact Support', 'support')]
          ]).reply_markup
        }
      );
      return;
    }
    
    const referralLink = `https://t.me/${botUsername}?start=${ctx.from.id}`;
    await ctx.reply(
      `👥 Invite Friends\n\nShare this link and earn bonuses:\n\n${referralLink}\n\n🎁 Earn 25 bonus coins for each friend who registers!`,
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('📤 Share Link', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me in this awesome Bingo game!`)],
          [Markup.button.callback('🎮 Back to Menu', 'main_menu')]
        ]).reply_markup
      }
    );
  } catch (error) {
    console.error('Invite command error:', error);
    await ctx.reply(
      '❌ **Invite System Error**\n\nThere was an error generating your invite link. Please try again later.',
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'invite')]
        ]).reply_markup
      }
    );
  }
});

// Menu command - shows all 7 main options
bot.command('menu', async (ctx) => {
  await ctx.reply(
    `📋 **Main Menu**\n\nWelcome! Choose from the options below:`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🎯 Play Bingo', 'play_bingo')],
        [Markup.button.callback('📝 Register', 'register')],
        [Markup.button.callback('💰 Deposit', 'deposit')],
        [Markup.button.callback('🏧 Withdraw', 'withdraw')],
        [Markup.button.callback('💳 Check Balance', 'balance')],
        [Markup.button.callback('🎮 Instructions', 'instructions')],
        [Markup.button.callback('👥 Invite', 'invite')],
        [Markup.button.callback('📞 Contact Support', 'support')],
      ]).reply_markup
    }
  );
});

// Instructions command - how to play guide
bot.command('instructions', async (ctx) => {
  await ctx.reply(
    `🎮 **How to Play Guide**\n\n` +
    `**🎯 Bingo Games:**\n` +
    `• Select numbers from 1-75 grid\n` +
    `• Match numbers on your 5x5 card\n` +
    `• Get 5 in a row to win!\n\n` +
    `**🎱 Like Bingo:**\n` +
    `• Choose 1-10 numbers (1-100)\n` +
    `• Set your stake (5-50 coins)\n` +
    `• Win based on matches!\n\n` +
    `**💰 Deposits:**\n` +
    `• Use CBE Bank or Telebirr\n` +
    `• 1 ETB = 1 point\n` +
    `• Minimum: 50 ETB\n\n` +
    `**🏆 Winning:**\n` +
    `• First to click "BINGO!" wins\n` +
    `• Valid patterns only count\n` +
    `• Check your balance regularly!`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🎯 Start Playing', 'play_bingo')],
        [Markup.button.callback('💰 Deposit Now', 'deposit')],
        [Markup.button.callback('📋 Back to Menu', 'menu')]
      ]).reply_markup
    }
  );
});

// Command to get user ID (for admin setup)
bot.command('getid', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name || '';
  
  await ctx.reply(
    `🆔 **Your Telegram Information**\n\n` +
    `**User ID:** \`${userId}\`\n` +
    `**Username:** @${username || 'none'}\n` +
    `**Name:** ${firstName} ${lastName}\n\n` +
    `ℹ️ **For Admin Setup:**\n` +
    `Copy this User ID and add it to your .env file:\n` +
    `\`ADMIN_ID_1=${userId}\`\n\n` +
    `⚠️ **Important:** Use the numeric User ID, not the username!`,
    { parse_mode: 'Markdown' }
  );
});

// Quick play command - direct access to games
bot.command('play', async (ctx) => {
  if (await checkUserRegistration(ctx, 'play')) {
    const telegramId = ctx.from.id.toString();
    
    // Check for any verified payments with active sessions
    let activeSessions = [];
    try {
      activeSessions = await GameSession.find({
        telegramId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).populate('paymentId');
    } catch (error) {
      console.log('Error fetching sessions:', error.message);
    }

    let message = `🎮 **Quick Play Access**\n\n`;
    const buttons = [];

    // Always show demo
    const demoToken = generateSessionToken();
    try {
      const demoSession = new GameSession({
        telegramId,
        gameMode: 'demo',
        sessionToken: demoToken,
        maxGames: 999
      });
      await demoSession.save();
      
      buttons.push([Markup.button.webApp(`🎮 Play Demo (Free)`, `${process.env.WEB_APP_URL}/bingo?mode=demo&token=${demoToken}`)]);
    } catch (error) {
      console.log('Error creating demo session:', error.message);
    }

    // Show active paid games
    if (activeSessions.length > 0) {
      message += `🎯 **Your Active Games:**\n`;
      activeSessions.forEach(session => {
        const remaining = session.maxGames - session.gamesPlayed;
        message += `• Bingo ${session.gameMode}: ${remaining} games remaining\n`;
        buttons.push([Markup.button.webApp(
          `🎯 Play Bingo ${session.gameMode} (${remaining} left)`, 
          `${process.env.WEB_APP_URL}/bingo?mode=${session.gameMode}&token=${session.sessionToken}`
        )]);
      });
      message += '\n';
    }

    message += `💰 **Buy New Games:**\n`;
    message += `Choose a betting level to purchase access to 5 games.`;

    // Add purchase options
    buttons.push([Markup.button.callback('💰 Buy Bingo Games', 'play_bingo')]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  }
});

// Payment System Commands

// Deposit command - Step 1: Choose deposit method
bot.command('deposit', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || 'Unknown';
  
  // Check if user is registered first
  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.reply(
        `❌ **Registration Required**\n\n` +
        `You need to register first before making deposits.\n\n` +
        `📝 **To register:**\n` +
        `• Click "📝 Register" in the main menu\n` +
        `• Or use /register command`,
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('📝 Register Now', 'register')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ]).reply_markup
        }
      );
      return;
    }
  } catch (error) {
    console.error('Error checking user registration:', error);
    await ctx.reply('❌ Error checking registration. Please try again.');
    return;
  }
  
  const message = `💰 **Deposit Flow**\n\n` +
    `Choose your preferred deposit method:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🟡 Manual', 'deposit_manual')],
    [Markup.button.callback('💰 Check Balance', 'balance')],
    [Markup.button.callback('📞 Contact Support', 'support')],
    [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
  ]);

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup
  });
});

// Step 2: Manual deposit - Enter amount
bot.action('deposit_manual', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  // Check if user is registered first
  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.editMessageText(
        `❌ **Registration Required**\n\n` +
        `You need to register first before making deposits.\n\n` +
        `📝 **To register:**\n` +
        `• Click "📝 Register" in the main menu\n` +
        `• Or use /register command`,
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('📝 Register Now', 'register')],
            [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
          ]).reply_markup
        }
      );
      return;
    }
  } catch (error) {
    console.error('Error checking user registration:', error);
    await ctx.editMessageText('❌ Error checking registration. Please try again.');
    return;
  }
  
  // Store user state for deposit flow
  ctx.session = ctx.session || {};
  ctx.session.depositState = 'waiting_for_amount';
  
  console.log(`✅ Deposit Manual - User ${userId}: Set depositState = 'waiting_for_amount'`);
  console.log(`🔍 Session after setting:`, ctx.session);
  
  const message = `🟡 **Manual Deposit**\n\n` +
    `Please enter the amount you wish to deposit in Ethiopian Birr (ETB).\n\n` +
    `💡 **Minimum:** 50 ETB\n` +
    `💡 **Maximum:** 10,000 ETB\n\n` +
    `📝 **Example:** 100`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💰 Check Balance', 'balance')],
    [Markup.button.callback('📞 Contact Support', 'support')],
    [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup
  });
});

// Step 3: Handle amount input and show payment methods
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || 'Unknown';
  
  console.log('🔍 Text received:', ctx.message.text);
  console.log('🔍 Session state:', ctx.session ? ctx.session.depositState : 'No session');
  
  // Check if user is in deposit flow
  if (ctx.session && ctx.session.depositState === 'waiting_for_amount') {
    console.log('✅ Processing deposit amount input');
    const amount = parseInt(ctx.message.text);
    
    if (isNaN(amount) || amount < 50) {
      await ctx.reply(
        `❌ **Invalid Amount**\n\n` +
        `The minimum deposit amount is 50 ETB. Please try again.\n\n` +
        `📝 **Example:** 100`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    if (amount > 10000) {
      await ctx.reply(
        `❌ **Amount Too High**\n\n` +
        `The maximum deposit amount is 10,000 ETB. Please try again.\n\n` +
        `📝 **Example:** 1000`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Store amount in session
    ctx.session.depositAmount = amount;
    ctx.session.depositState = 'waiting_for_payment_method';
    
    const message = `💳 **Payment Details**\n\n` +
      `💰 **Amount:** ${amount} ETB\n` +
      `🎯 **Points to receive:** ${amount} points\n\n` +
      `Please choose your payment method:`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔵 Pay from CBE Bank to CBE Bank only', 'payment_cbe')],
      [Markup.button.callback('🟡 Pay from Telebirr to Telebirr only', 'payment_telebirr')],
      [Markup.button.callback('💰 Check Balance', 'balance')],
      [Markup.button.callback('📞 Contact Support', 'support')],
      [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup
    });
    return; // Important to return here
  }
  
  // Handle payment SMS/transaction code
  else if (ctx.session && ctx.session.depositState === 'waiting_for_sms') {
    console.log('✅ Processing SMS input');
    const amount = ctx.session.depositAmount;
    const paymentMethod = ctx.session.paymentMethod;
    
    // Enhanced admin notification with better formatting
    const adminMessage = `🔔 **New Payment Verification Request**\n\n👤 **User:** @${username}\n🆔 **ID:** \`${userId}\`\n💰 **Amount:** ${amount} ETB\n🏦 **Method:** ${paymentMethod}\n📱 **Transaction Details:**\n\`\`\`\n${ctx.message.text}\n\`\`\`\n\n📋 **Action Required:**\n• Verify the payment details above\n• Click the button below to credit the user\n• User will be automatically notified when points are added`;

    const creditButton = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Credit User', `credit_${userId}_${amount}`)]
    ]);

    // Send to all payment agents
    let notifiedAgents = 0;
    for (const agentId of PAYMENT_AGENTS) {
      try {
        await bot.telegram.sendMessage(agentId, adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: creditButton.reply_markup
        });
        notifiedAgents++;
        console.log(`✅ Successfully notified agent ${agentId}`);
      } catch (error) {
        console.error(`❌ Failed to notify agent ${agentId}:`, error.message);
        if (error.description === 'chat not found') {
          console.log(`💡 Agent ${agentId} needs to start the bot first (send /start)`);
        }
      }
    }
    
    if (notifiedAgents === 0) {
      console.log(`⚠️  No agents were notified. Make sure agents have started the bot.`);
    } else {
      console.log(`✅ Successfully notified ${notifiedAgents}/${PAYMENT_AGENTS.length} agents`);
    }

    // Enhanced user confirmation
    await ctx.reply(
      `✅ **Payment Details Submitted Successfully!**

📱 Your payment details have been sent to our verification team.
⏱️ **Processing Time:** 5-15 minutes

📞 **Need Help?**
• Support: @nati280 (support)

🎮 **Once verified, you'll receive a notification and can play all games!**`,
      { parse_mode: 'Markdown' }
    );

    // Reset session
    ctx.session.depositState = null;
    ctx.session.depositAmount = null;
    ctx.session.paymentMethod = null;
    return; // Important to return here
  }
  
  // If not in any deposit state, ignore the text
  console.log('❌ Text not handled - not in deposit flow');
});

// Step 4: CBE Bank Payment
bot.action('payment_cbe', async (ctx) => {
  const userId = ctx.from.id.toString();
  const amount = ctx.session.depositAmount;
  
  ctx.session.paymentMethod = 'CBE Bank';
  ctx.session.depositState = 'waiting_for_sms';
  
  const message = `🏦 **ኢትዮጵያ ንግድ ባንክ (CBE) አካውንት**\n` +
    `➡️ \`${PAYMENT_CONFIG.bankAccount}\`\n\n` +
    `📌 **Instructions:**\n` +
    `1. Deposit at least ${Math.max(amount, 60)} ETB to the above CBE account.\n` +
    `2. Make sure the amount you send matches the amount you entered earlier (${amount} ETB).\n` +
    `3. After sending the money, you will receive a confirmation SMS from CBE.\n` +
    `4. Copy the full SMS and paste it below in the Telegram message box.\n\n` +
    `📢 **Notes:**\n` +
    `- Only send to the above **CBE account**. If you send to a different agent's account, 2% will be deducted before crediting.\n` +
    `- If you face any issues, contact:\n` +
    `  - 🛠 @nati280 (support)\n\n` +
    `✍️ **Now, please paste the full SMS here:**\n` +
    `👇👇👇`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💰 Check Balance', 'balance')],
    [Markup.button.callback('📞 Contact Support', 'support')],
    [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup
  });
});

// Step 4: Telebirr Payment
bot.action('payment_telebirr', async (ctx) => {
  const userId = ctx.from.id.toString();
  const amount = ctx.session.depositAmount;
  
  ctx.session.paymentMethod = 'Telebirr';
  ctx.session.depositState = 'waiting_for_sms';
  
  const message = `📱 **የቴሌብር አካውንት**\n` +
    `➡️ \`${PAYMENT_CONFIG.agentPhone}\`\n\n` +
    `📌 **Instructions:**\n` +
    `1. Deposit at least ${Math.max(amount, 70)} ETB to the above Telebirr number.\n` + // Ensure min 70 ETB
    `2. Make sure the amount you send matches the amount you entered earlier (${amount} ETB).\n` +
    `3. After sending, you will receive an SMS from Telebirr.\n` +
    `4. Copy the full SMS and paste it below in the Telegram message box.\n\n` +
    `📢 **Notes:**\n` +
    `- Only send to the above **Telebirr account**. If you send to a different agent, 2% will be deducted before crediting.\n` +
    `- If you face any issues, contact:\n` +
    `  - 🛠 @nati280 (support)\n\n` +
    `✍️ **Now, please paste the full SMS here:**\n` +
    `👇👇👇`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💰 Check Balance', 'balance')],
    [Markup.button.callback('📞 Contact Support', 'support')],
    [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard.reply_markup
  });
});

// Payment confirmation handler
bot.action('payment_confirmed', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || 'Unknown';
  const firstName = ctx.from.first_name || 'Unknown';
  
  // Notify payment agents
  const agentMessage = `🔔 **New Payment Request**\n\n` +
    `👤 **User:** @${username}\n` +
    `🆔 **ID:** \`${userId}\`\n` +
    `📝 **Name:** ${firstName}\n` +
    `💰 **Status:** Waiting for payment verification\n\n` +
    `📱 **Action Required:**\n` +
    `• Check payment received\n` +
    `• Use /addpoints @${username} [amount] to credit user`;

  // Send to all payment agents
  for (const agentId of PAYMENT_AGENTS) {
    try {
      await bot.telegram.sendMessage(agentId, agentMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error(`Failed to notify agent ${agentId}:`, error);
    }
  }

  // Confirm to user
  await ctx.reply(
    `✅ **Payment Request Submitted**\n\n` +
    `📱 Your payment request has been sent to our agents.\n` +
    `⏱️ Please wait 5-15 minutes for verification.\n\n` +
    `📞 **If you need help:**\n` +
    `• Contact support: @nati280\n` +
    `• Or use the "Contact Support" button below`,
    { parse_mode: 'Markdown' }
  );

  await ctx.answerCbQuery('Payment request sent to agents!');
});

// Admin command to add points
bot.command('addpoints', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    await ctx.reply(
      '📝 **Usage:** /addpoints <username|telegramId> amount_in_birr\n\n' +
      '**Example:** /addpoints @john 100\n' +
      '**Example:** /addpoints 123456789 100\n' +
      '💡 Points will be equal to the amount in Birr (1 Birr = 1 point)\n' +
      '⚠️ For best results, use the Telegram ID (numeric) shown in the payment request.'
    );
    return;
  }

  const identifier = args[1].replace('@', '');
  const amountInBirr = parseInt(args[2]);
  const pointsToAdd = amountInBirr * PAYMENT_CONFIG.pointRate; // 1 Birr = 1 point

  if (isNaN(amountInBirr) || amountInBirr <= 0) {
    await ctx.reply('❌ Invalid amount. Please enter a valid number in Birr.');
    return;
  }

  let user = null;
  // Try username first
  user = await User.findOne({ username: identifier });
  // If not found and identifier is numeric, try telegramId
  if (!user && /^\d+$/.test(identifier)) {
    user = await User.findOne({ telegramId: identifier });
  }

  if (!user) {
    await ctx.reply(`❌ User @${identifier} not found. Make sure they have registered. Try using their Telegram ID if username fails.`);
    return;
  }

  try {
    // Update balance
    user.balance += pointsToAdd;
    await user.save();

    // Log transaction
    const payment = new Payment({
      userId: user.telegramId,
      username: user.username || 'no_username',
      amount: pointsToAdd,
      type: 'deposit',
      status: 'completed',
      approvedBy: adminId,
      transactionId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: 'Bank Transfer/Mobile Money',
      adminNotes: `Payment: ${amountInBirr} Birr = ${pointsToAdd} points (via inline button)`
    });
    await payment.save();

    // Enhanced user notification with game access information
    let userNotified = false;
    let userNotifyError = null;
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `✅ **Payment Verified Successfully!**\n\n💰 **Payment Details:**\n• Amount: ${amountInBirr} ETB\n• Points Added: ${pointsToAdd} coins\n• New Balance: ${user.balance} coins\n\n🎮 **You can now play all games:**\n• 🎯 Bingo 10 (10 coins)\n• 🎯 Bingo 20 (20 coins) \n• 🎯 Bingo 50 (50 coins)\n• 🎯 Bingo 100 (100 coins)\n\n🚀 **Start Playing:**\nUse /playbingo to begin!\n\nThank you for your payment! 🎉`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Play Bingo', callback_data: 'play_bingo' }],
              [{ text: '💰 Check Balance', callback_data: 'balance' }]
            ]
          }
        }
      );
      userNotified = true;
    } catch (error) {
      userNotifyError = error;
      console.error('Failed to notify user:', error);
    }

    // Enhanced admin confirmation
    let adminMessage =
      `✅ **Payment Processed Successfully!**\n\n` +
      `👤 **User:** @${user.username || identifier} (ID: ${user.telegramId})\n` +
      `💰 **Amount:** ${amountInBirr} ETB\n` +
      `🎯 **Points Added:** ${pointsToAdd} coins\n` +
      `📊 **New Balance:** ${user.balance} coins\n`;
    if (userNotified) {
      adminMessage += `\n✅ User has been notified and can now play all games.`;
    } else {
      adminMessage += `\n❌ *User could NOT be notified.*\nReason: ${userNotifyError?.description || userNotifyError?.message || userNotifyError}`;
      adminMessage += `\n\n*Possible reasons:*\n- User has not started the bot\n- User blocked the bot\n- Telegram error`;
    }
    await ctx.reply(adminMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error adding points:', error);
    await ctx.reply('❌ Error processing payment. Please try again.');
  }
});

// Admin command to remove points (for refunds)
bot.command('removepoints', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    await ctx.reply(
      '📝 **Usage:** /removepoints @username amount_in_birr\n\n' +
      '**Example:** /removepoints @john 50\n' +
      '💡 Points removed will be equal to the amount in Birr (1 Birr = 1 point)'
    );
    return;
  }

  const username = args[1].replace('@', '');
  const amountInBirr = parseInt(args[2]);
  const pointsToRemove = amountInBirr * PAYMENT_CONFIG.pointRate; // 1 Birr = 1 point

  if (isNaN(amountInBirr) || amountInBirr <= 0) {
    await ctx.reply('❌ Invalid amount. Please enter a valid number in Birr.');
    return;
  }

  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      await ctx.reply(`❌ User @${username} not found.`);
      return;
    }

    if (user.balance < pointsToRemove) {
      await ctx.reply(`❌ User @${username} doesn't have enough points. Current balance: ${user.balance} points`);
      return;
    }

    user.balance -= pointsToRemove;
    await user.save();

    // Log transaction
    const payment = new Payment({
      userId: user.telegramId,
      username: username,
      amount: -pointsToRemove,
      type: 'refund',
      status: 'completed',
      approvedBy: adminId,
      transactionId: `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: 'Refund',
      adminNotes: `Refund: ${amountInBirr} Birr = ${pointsToRemove} points`
    });
    await payment.save();

    // Notify user
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `📤 **Points Removed**\n\n` +
        `💰 **Refund Amount:** ${amountInBirr} Birr\n` +
        `🎯 **Points Removed:** ${pointsToRemove} points\n` +
        `📉 **New Balance:** ${user.balance} points\n\n` +
        `📞 Contact support if this was an error.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Failed to notify user:', error);
    }

    await ctx.reply(
      `✅ **Points Removed Successfully**\n\n` +
      `👤 **User:** @${username}\n` +
      `💰 **Refund Amount:** ${amountInBirr} Birr\n` +
      `🎯 **Points Removed:** ${pointsToRemove} points\n` +
      `📉 **New Balance:** ${user.balance} points`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error removing points:', error);
    await ctx.reply('❌ Error processing refund. Please try again.');
  }
});

// Transaction history command
bot.command('transactions', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  try {
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(10);

    let message = '📊 **Recent Transactions**\n\n';
    
    recentPayments.forEach(payment => {
      const type = payment.type === 'deposit' ? '💰' : '📤';
      const status = payment.status === 'completed' ? '✅' : '⏳';
      message += `${type} ${status} @${payment.username}: ${payment.amount} points\n`;
      message += `   ID: ${payment.transactionId}\n`;
      message += `   Time: ${payment.createdAt.toLocaleString()}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    await ctx.reply('❌ Error fetching transaction history.');
  }
});

// Admin test command
bot.command('admintest', async (ctx) => {
  const userId = ctx.from.id.toString();
  const isAdminUser = isAdmin(userId);
  
  // Extra debugging info
  const envDebug = `
**Environment Variables:**
- ADMIN_ID_1: ${process.env.ADMIN_ID_1 || 'Not set'}
- ADMIN_ID_2: ${process.env.ADMIN_ID_2 || 'Not set'}
- WEB_APP_URL: ${process.env.WEB_APP_URL || 'Not set'}
  `;
  
  await ctx.reply(
    `🛡️ **Admin Access Test**\n\n` +
    `**Your User ID:** \`${userId}\`\n` +
    `**Admin Status:** ${isAdminUser ? '✅ ADMIN ACCESS' : '❌ NO ADMIN ACCESS'}\n\n` +
    `**Configured Admins:** ${ADMIN_IDS.length > 0 ? ADMIN_IDS.join(', ') : 'None'}\n\n` +
    envDebug +
    `\n${isAdminUser ? 
      '🎉 You have admin privileges! You can verify payments.' : 
      '⚠️ You need to add your User ID to the .env file as ADMIN_ID_1 or ADMIN_ID_2'
    }`,
    { parse_mode: 'Markdown' }
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
      { command: 'menu', description: '📋 Main Menu - All Options' },
      { command: 'playbingo', description: '🎯 Play Bingo Game' },
      { command: 'register', description: '📱 Register your account' },
      { command: 'balance', description: '💰 Check your balance' },
      { command: 'deposit', description: '🏦 Deposit funds' },
      { command: 'instructions', description: '🎮 How to play guide' },
      { command: 'support', description: '👨‍💻 Contact support' },
      { command: 'invite', description: '👥 Invite your friends' },
      { command: 'getid', description: '🆔 Get your Telegram User ID' },
      { command: 'admintest', description: '🛡️ Test admin access' }
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

// Enhanced Admin command to add points with better validation
bot.command('addpoints', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    await ctx.reply(
      '📝 **Usage:** /addpoints @username amount_in_birr\n\n' +
      '**Examples:**\n' +
      '• `/addpoints @john 100` - Add 100 points (100 Birr)\n' +
      '• `/addpoints @jane 50` - Add 50 points (50 Birr)\n\n' +
      '💡 **Conversion Rate:** 1 Birr = 1 point\n' +
      '📊 **Transaction will be logged automatically**'
    );
    return;
  }

  const username = args[1].replace('@', '');
  const amountInBirr = parseInt(args[2]);
  const pointsToAdd = amountInBirr * PAYMENT_CONFIG.pointRate; // 1 Birr = 1 point

  if (isNaN(amountInBirr) || amountInBirr <= 0) {
    await ctx.reply('❌ Invalid amount. Please enter a valid number in Birr.');
    return;
  }

  if (amountInBirr > 10000) {
    await ctx.reply('❌ Amount too high. Maximum allowed: 10,000 Birr per transaction.');
    return;
  }

  try {
    // Find user by username
    const user = await User.findOne({ username: username });
    if (!user) {
      await ctx.reply(
        `❌ **User Not Found**\n\n` +
        `User @${username} is not registered.\n\n` +
        `📝 **To register:**\n` +
        `• User must use /register command first\n` +
        `• Or click "📝 Register" in the main menu`
      );
      return;
    }

    // Check if user already has a pending payment
    const pendingPayment = await Payment.findOne({
      userId: user.telegramId,
      status: 'pending',
      type: 'deposit'
    });

    if (pendingPayment) {
      await ctx.reply(
        `⚠️ **Pending Payment Found**\n\n` +
        `User @${username} has a pending payment request.\n` +
        `💰 **Amount:** ${pendingPayment.amount} points\n` +
        `📅 **Date:** ${new Date(pendingPayment.createdAt).toLocaleString()}\n\n` +
        `💡 **Recommendation:** Process the pending payment first.`
      );
      return;
    }

    // Update balance
    const oldBalance = user.balance;
    user.balance += pointsToAdd;
    await user.save();

    // Log transaction
    const payment = new Payment({
      userId: user.telegramId,
      username: username,
      firstName: user.firstName || 'Unknown',
      amount: pointsToAdd,
      type: 'deposit',
      status: 'completed',
      approvedBy: adminId,
      approvedAt: new Date(),
      transactionId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: 'Manual Credit',
      adminNotes: `Payment: ${amountInBirr} Birr = ${pointsToAdd} points (Admin: ${adminId})`
    });
    await payment.save();

    // Notify user
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `✅ **Payment Confirmed!**\n\n` +
        `💰 **Payment:** ${amountInBirr} Birr\n` +
        `🎯 **Points Added:** ${pointsToAdd} points\n` +
        `📈 **Previous Balance:** ${oldBalance} points\n` +
        `📈 **New Balance:** ${user.balance} points\n\n` +
        `🎮 **You can now play games!**\n` +
        `• Use /play to start playing\n` +
        `• Or click "🎯 Play Bingo" in the menu`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Failed to notify user:', error);
    }

    // Confirm to admin with detailed info
    await ctx.reply(
      `✅ **Points Added Successfully**\n\n` +
      `👤 **User:** @${username}\n` +
      `💰 **Payment Amount:** ${amountInBirr} Birr\n` +
      `🎯 **Points Added:** ${pointsToAdd} points\n` +
      `📈 **Previous Balance:** ${oldBalance} points\n` +
      `📈 **New Balance:** ${user.balance} points\n` +
      `🆔 **Transaction ID:** \`${payment.transactionId}\`\n` +
      `📅 **Date:** ${new Date().toLocaleString()}`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error adding points:', error);
    await ctx.reply('❌ Error processing payment. Please try again.');
  }
});

// Enhanced Admin command to remove points (for refunds)
bot.command('removepoints', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    await ctx.reply(
      '📝 **Usage:** /removepoints @username amount_in_birr\n\n' +
      '**Examples:**\n' +
      '• `/removepoints @john 50` - Remove 50 points (50 Birr refund)\n' +
      '• `/removepoints @jane 25` - Remove 25 points (25 Birr refund)\n\n' +
      '💡 **Conversion Rate:** 1 Birr = 1 point\n' +
      '⚠️ **This action cannot be undone!**'
    );
    return;
  }

  const username = args[1].replace('@', '');
  const amountInBirr = parseInt(args[2]);
  const pointsToRemove = amountInBirr * PAYMENT_CONFIG.pointRate; // 1 Birr = 1 point

  if (isNaN(amountInBirr) || amountInBirr <= 0) {
    await ctx.reply('❌ Invalid amount. Please enter a valid number in Birr.');
    return;
  }

  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      await ctx.reply(`❌ User @${username} not found.`);
      return;
    }

    if (user.balance < pointsToRemove) {
      await ctx.reply(
        `❌ **Insufficient Balance**\n\n` +
        `User @${username} doesn't have enough points.\n` +
        `💰 **Current Balance:** ${user.balance} points\n` +
        `💰 **Requested Refund:** ${pointsToRemove} points\n` +
        `📉 **Shortfall:** ${pointsToRemove - user.balance} points`
      );
      return;
    }

    const oldBalance = user.balance;
    user.balance -= pointsToRemove;
    await user.save();

    // Log transaction
    const payment = new Payment({
      userId: user.telegramId,
      username: username,
      firstName: user.firstName || 'Unknown',
      amount: -pointsToRemove,
      type: 'refund',
      status: 'completed',
      approvedBy: adminId,
      approvedAt: new Date(),
      transactionId: `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: 'Manual Refund',
      adminNotes: `Refund: ${amountInBirr} Birr = ${pointsToRemove} points (Admin: ${adminId})`
    });
    await payment.save();

    // Notify user
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `📤 **Points Removed**\n\n` +
        `💰 **Refund Amount:** ${amountInBirr} Birr\n` +
        `🎯 **Points Removed:** ${pointsToRemove} points\n` +
        `📉 **Previous Balance:** ${oldBalance} points\n` +
        `📉 **New Balance:** ${user.balance} points\n\n` +
        `📞 **Contact support if this was an error.**\n` +
        `• Support: @nati280`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Failed to notify user:', error);
    }

    await ctx.reply(
      `✅ **Points Removed Successfully**\n\n` +
      `👤 **User:** @${username}\n` +
      `💰 **Refund Amount:** ${amountInBirr} Birr\n` +
      `🎯 **Points Removed:** ${pointsToRemove} points\n` +
      `📉 **Previous Balance:** ${oldBalance} points\n` +
      `📉 **New Balance:** ${user.balance} points\n` +
      `🆔 **Transaction ID:** \`${payment.transactionId}\`\n` +
      `📅 **Date:** ${new Date().toLocaleString()}`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error removing points:', error);
    await ctx.reply('❌ Error processing refund. Please try again.');
  }
});

// New Admin command to check user balance and transaction history
bot.command('checkuser', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    await ctx.reply(
      '📝 **Usage:** /checkuser @username\n\n' +
      '**Example:** /checkuser @john\n\n' +
      '💡 Shows user balance and recent transactions'
    );
    return;
  }

  const username = args[1].replace('@', '');

  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      await ctx.reply(`❌ User @${username} not found.`);
      return;
    }

    // Get recent transactions (last 5)
    const recentTransactions = await Payment.find({ 
      userId: user.telegramId 
    })
    .sort({ createdAt: -1 })
    .limit(5);

    let transactionHistory = '';
    if (recentTransactions.length > 0) {
      transactionHistory = '\n\n📋 **Recent Transactions:**\n';
      recentTransactions.forEach((tx, index) => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const type = tx.type === 'deposit' ? '➕' : '➖';
        const status = tx.status === 'completed' ? '✅' : '⏳';
        transactionHistory += `${index + 1}. ${type} ${Math.abs(tx.amount)} points (${tx.type}) ${status}\n`;
      });
    }

    await ctx.reply(
      `👤 **User Information**\n\n` +
      `**Username:** @${username}\n` +
      `**Name:** ${user.firstName || 'Unknown'}\n` +
      `**ID:** \`${user.telegramId}\`\n` +
      `**Balance:** ${user.balance} points\n` +
      `**Registered:** ${new Date(user.createdAt).toLocaleDateString()}\n` +
      `**Last Active:** ${new Date(user.updatedAt).toLocaleDateString()}` +
      transactionHistory,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error checking user:', error);
    await ctx.reply('❌ Error checking user information. Please try again.');
  }
});

// New Admin command to list pending payments
bot.command('pending', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  try {
    const pendingPayments = await Payment.find({ 
      status: 'pending',
      type: 'deposit'
    })
    .sort({ createdAt: -1 })
    .limit(10);

    if (pendingPayments.length === 0) {
      await ctx.reply('✅ No pending payments found.');
      return;
    }

    let message = `📋 **Pending Payments (${pendingPayments.length})**\n\n`;
    
    pendingPayments.forEach((payment, index) => {
      const date = new Date(payment.createdAt).toLocaleString();
      message += `${index + 1}. **@${payment.username}** - ${payment.amount} points\n`;
      message += `   📅 ${date}\n`;
      message += `   💳 ${payment.paymentMethod}\n`;
      if (payment.adminNotes) {
        message += `   📝 ${payment.adminNotes}\n`;
      }
      message += '\n';
    });

    message += `💡 **To process:** Use /addpoints @username amount`;

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error checking pending payments:', error);
    await ctx.reply('❌ Error checking pending payments. Please try again.');
  }
});

// Admin help command
bot.command('adminhelp', async (ctx) => {
  const adminId = ctx.from.id.toString();
  
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.reply('❌ **Access Denied**\n\nOnly authorized payment agents can use this command.');
    return;
  }

  const helpMessage = `🔧 **Admin Commands Guide**\n\n` +
    `💰 **Payment Management:**\n` +
    `• \`/addpoints @username amount\` - Add points to user\n` +
    `• \`/removepoints @username amount\` - Remove points (refund)\n\n` +
    `📊 **User Information:**\n` +
    `• \`/checkuser @username\` - Check user balance & history\n` +
    `• \`/pending\` - List pending payments\n\n` +
    `📝 **Examples:**\n` +
    `• \`/addpoints @john 100\` - Add 100 points to @john\n` +
    `• \`/removepoints @jane 50\` - Remove 50 points from @jane\n` +
    `• \`/checkuser @mike\` - Check @mike's balance\n\n` +
    `💡 **Features:**\n` +
    `✅ Automatic transaction logging\n` +
    `✅ User notifications\n` +
    `✅ Balance validation\n` +
    `✅ Pending payment detection\n` +
    `✅ Detailed transaction history\n\n` +
    `📞 **Support:**\n` +
    `• Support: @nati280`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Helper function to check user's game access based on balance
function getUserGameAccess(userBalance) {
  const games = {
    demo: { name: 'Bingo Demo', cost: 0, available: true },
    bingo_10: { name: 'Bingo 10', cost: 10, available: userBalance >= 10 },
    bingo_20: { name: 'Bingo 20', cost: 20, available: userBalance >= 20 },
    bingo_50: { name: 'Bingo 50', cost: 50, available: userBalance >= 50 },
    bingo_100: { name: 'Bingo 100', cost: 100, available: userBalance >= 100 }
  };
  
  return games;
}

// Enhanced balance display with game access information
bot.action('balance', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  
  if (!user) {
    await ctx.answerCbQuery('❌ User not found. Please register first.', { show_alert: true });
    return;
  }
  
  const gameAccess = getUserGameAccess(user.balance);
  const availableGames = Object.values(gameAccess).filter(game => game.available);
  const lockedGames = Object.values(gameAccess).filter(game => !game.available);
  
  let message = `💰 **Your Wallet Balance**

💎 **Balance:** ${user.balance} coins
🎁 **Bonus:** ${user.bonus} coins
📊 **Total:** ${user.balance + user.bonus} coins

🎮 **Available Games:**\n`;
  
  availableGames.forEach(game => {
    message += `✅ ${game.name} ${game.cost > 0 ? `(${game.cost} coins)` : '(Free)'}\n`;
  });
  
  if (lockedGames.length > 0) {
    message += `\n🔒 **Locked Games:**\n`;
    lockedGames.forEach(game => {
      const needed = game.cost - user.balance;
      message += `❌ ${game.name} - Need ${needed} more coins\n`;
    });
  }
  
  message += `\n💡 **To unlock more games:** Use /deposit to add coins to your wallet!`;
  
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🎮 Play Games', 'play_bingo')],
      [Markup.button.callback('💰 Deposit', 'deposit')],
      [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
    ]).reply_markup
  });
});

// Add a new handler for the credit button
bot.action(/credit_(\d+)_(\d+)/, async (ctx) => {
  const adminId = ctx.from.id.toString();
  console.log(`[CREDIT BUTTON] Clicked by adminId: ${adminId}`);
  if (!PAYMENT_AGENTS.includes(adminId)) {
    await ctx.answerCbQuery('❌ Access Denied. Only authorized payment agents can credit users.', { show_alert: true });
    console.log(`[CREDIT BUTTON] Access denied for adminId: ${adminId}`);
    return;
  }
  const userId = ctx.match[1];
  const amountInBirr = parseInt(ctx.match[2]);
  const pointsToAdd = amountInBirr * PAYMENT_CONFIG.pointRate;
  console.log(`[CREDIT BUTTON] Attempting to credit userId: ${userId} with amount: ${amountInBirr} (${pointsToAdd} points)`);
  let user = null;
  try {
    user = await User.findOne({ telegramId: userId });
    if (!user) {
      await ctx.answerCbQuery('❌ User not found. Make sure they have registered.', { show_alert: true });
      await ctx.reply(`❌ User with Telegram ID ${userId} not found. Cannot credit user.`);
      console.log(`[CREDIT BUTTON] User not found: ${userId}`);
      return;
    }
    user.balance += pointsToAdd;
    await user.save();
    // Log transaction
    const payment = new Payment({
      userId: user.telegramId,
      username: user.username || 'no_username',
      amount: pointsToAdd,
      type: 'deposit',
      status: 'completed',
      approvedBy: adminId,
      transactionId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: 'Bank Transfer/Mobile Money',
      adminNotes: `Payment: ${amountInBirr} Birr = ${pointsToAdd} points (via inline button)`
    });
    await payment.save();
    // Notify user
    let userNotified = false;
    let userNotifyError = null;
    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `✅ **Payment Verified Successfully!**\n\n💰 **Payment Details:**\n• Amount: ${amountInBirr} ETB\n• Points Added: ${pointsToAdd} coins\n• New Balance: ${user.balance} coins\n\n🎮 **You can now play all games:**\n• 🎯 Bingo 10 (10 coins)\n• 🎯 Bingo 20 (20 coins) \n• 🎯 Bingo 50 (50 coins)\n• 🎯 Bingo 100 (100 coins)\n\n🚀 **Start Playing:**\nUse /playbingo to begin!\n\nThank you for your payment! 🎉`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Play Bingo', callback_data: 'play_bingo' }],
              [{ text: '💰 Check Balance', callback_data: 'balance' }]
            ]
          }
        }
      );
      userNotified = true;
      console.log(`[CREDIT BUTTON] User notified: ${userId}`);
    } catch (error) {
      userNotifyError = error;
      console.error(`[CREDIT BUTTON] Failed to notify user: ${userId}`, error);
      await ctx.reply(`❌ User was credited, but could NOT be notified.\nReason: ${userNotifyError?.description || userNotifyError?.message || userNotifyError}`);
    }
    // Notify admin
    let adminMessage =
      `✅ **User Credited!**\n\n👤 **User:** @${user.username || userId} (ID: ${user.telegramId})\n💰 **Amount:** ${amountInBirr} ETB\n🎯 **Points Added:** ${pointsToAdd} coins\n📊 **New Balance:** ${user.balance} coins\n`;
    if (userNotified) {
      adminMessage += `\n✅ User has been notified and can now play all games.`;
    } else {
      adminMessage += `\n❌ *User could NOT be notified.*`;
    }
    await ctx.reply(adminMessage, { parse_mode: 'Markdown' });
    await ctx.answerCbQuery('✅ User credited!');
  } catch (err) {
    console.error(`[CREDIT BUTTON] Error during credit process:`, err);
    await ctx.reply('❌ Error processing credit. Please try again.');
    await ctx.answerCbQuery('❌ Error processing credit.', { show_alert: true });
  }
});

// Add Withdraw menu to main menu
// (Add this button to your main menu reply_markup)
// [Markup.button.callback('🏧 Withdraw', 'withdraw')],

// Withdraw action handler for main menu button
bot.action('withdraw', async (ctx) => {
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
  // Check if user has played at least 3 games
  if (!user.gameHistory || user.gameHistory.length < 3) {
    await ctx.editMessageText('❌ You must play at least 3 games before you can withdraw.\n\n🎮 Play more games to unlock withdrawals!', {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🎮 Play Bingo', 'play_bingo')],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    });
    return;
  }
  // Start withdraw flow
  ctx.session.withdrawState = 'waiting_for_method';
  await ctx.editMessageText(
    `🏧 **Withdraw Flow**\n\nChoose your preferred withdrawal method:`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🏦 CBE Bank', 'withdraw_cbe')],
        [Markup.button.callback('📱 Telebirr', 'withdraw_telebirr')],
        [Markup.button.callback('⬅️ Back to Menu', 'main_menu')]
      ]).reply_markup
    }
  );
});

// Withdraw CBE handler
bot.action('withdraw_cbe', async (ctx) => {
  ctx.session.withdrawState = 'waiting_for_cbe_account';
  ctx.session.withdrawMethod = 'CBE Bank';
  await ctx.editMessageText(
    `🏦 **CBE Bank Withdrawal**\n\nPlease enter your CBE account number to receive your withdrawal.`,
    { parse_mode: 'Markdown' }
  );
});

// Withdraw Telebirr handler
bot.action('withdraw_telebirr', async (ctx) => {
  ctx.session.withdrawState = 'waiting_for_telebirr_account';
  ctx.session.withdrawMethod = 'Telebirr';
  await ctx.editMessageText(
    `📱 **Telebirr Withdrawal**\n\nPlease enter your Telebirr phone number to receive your withdrawal.`,
    { parse_mode: 'Markdown' }
  );
});

// Handle text input for withdraw flow
bot.on('text', async (ctx, next) => {
  if (ctx.session && ctx.session.withdrawState) {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.reply('❌ You need to register first!');
      return;
    }
    if (ctx.session.withdrawState === 'waiting_for_cbe_account') {
      ctx.session.withdrawAccount = ctx.message.text.trim();
      ctx.session.withdrawState = 'waiting_for_amount';
      await ctx.reply('💸 Please enter the amount you wish to withdraw (in ETB):');
      return;
    }
    if (ctx.session.withdrawState === 'waiting_for_telebirr_account') {
      ctx.session.withdrawAccount = ctx.message.text.trim();
      ctx.session.withdrawState = 'waiting_for_amount';
      await ctx.reply('💸 Please enter the amount you wish to withdraw (in ETB):');
      return;
    }
    if (ctx.session.withdrawState === 'waiting_for_amount') {
      const amount = parseInt(ctx.message.text.trim());
      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please enter a valid number in ETB.');
        return;
      }
      if (amount > user.balance) {
        await ctx.reply(`❌ You do not have enough balance to withdraw ${amount} ETB. Your current balance is ${user.balance} coins.`);
        return;
      }
      // Save withdrawal request (for now, just notify admin)
      ctx.session.withdrawAmount = amount;
      ctx.session.withdrawState = null;
      // Notify admin(s)
      const adminMessage = `🔔 **New Withdrawal Request**\n\n👤 **User:** @${user.username || 'no_username'}\n🆔 **ID:** ${user.telegramId}\n💸 **Amount:** ${amount} ETB\n🏦 **Method:** ${ctx.session.withdrawMethod}\n📱 **Account:** ${ctx.session.withdrawAccount}\n\nPlease review and process this withdrawal.`;
      for (const agentId of PAYMENT_AGENTS) {
        try {
          await bot.telegram.sendMessage(agentId, adminMessage, { parse_mode: 'Markdown' });
        } catch (error) {
          console.error(`❌ Failed to notify agent ${agentId}:`, error.message);
        }
      }
      await ctx.reply('✅ Your withdrawal request has been submitted! Our team will review and process it soon.');
      // Optionally, deduct the amount from user.balance here if you want to lock funds
      // user.balance -= amount; await user.save();
      return;
    }
  }
  // If not in withdraw flow, continue to next handler
  return next();
});

// Add HTTP server for Render deployment
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'Telegram Bot is running!', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP server running on port ${PORT} for Render deployment`);
});

// Start the bot
bot.launch().then(() => {
  console.log('🚀 Bot launched successfully');
}).catch((error) => {
  console.error('❌ Failed to launch bot:', error);
});
