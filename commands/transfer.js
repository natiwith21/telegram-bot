const User = require('../models/User');

module.exports = (bot) => {
  bot.command('transfer', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    if (parts.length !== 3 || isNaN(parts[2])) {
      return ctx.reply('💡 Usage: /transfer <telegram_id> <amount>');
    }

    const sender = await User.findOne({ telegramId: ctx.from.id });
    const recipientId = parts[1];
    const amount = parseInt(parts[2]);

    if (!sender) return ctx.reply('❌ Please register first using /register');
    if (amount > sender.balance) return ctx.reply('❌ Not enough balance.');

    const recipient = await User.findOne({ telegramId: recipientId });
    if (!recipient) return ctx.reply('❌ Recipient not found.');

    sender.balance -= amount;
    recipient.balance += amount;

    sender.transactions.push(`Transferred ${amount} to ${recipientId}`);
    recipient.transactions.push(`Received ${amount} from ${ctx.from.id}`);

    await sender.save();
    await recipient.save();

    ctx.reply(`✅ Transferred ${amount} coins to user ${recipientId}.`);
  });
};
