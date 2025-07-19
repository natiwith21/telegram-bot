const { Telegraf } = require('telegraf');
require('dotenv').config();
const connectDB = require('./utils/db');

const bot = new Telegraf(process.env.BOT_TOKEN);
connectDB();
console.log("Bot is starting...");

// Import commands
const fs = require('fs');
const commandsPath = './commands';
fs.readdirSync(commandsPath).forEach(file => {
  require(`${commandsPath}/${file}`)(bot);
});

bot.launch().then(() => console.log('🤖 Bot started'));
