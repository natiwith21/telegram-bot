require('dotenv').config();

console.log('==============================');
console.log('    TELEGRAM BOT SETUP CHECK');
console.log('==============================');
console.log();

const webAppUrl = process.env.WEB_APP_URL;
const botToken = process.env.BOT_TOKEN;

console.log('✅ Environment Variables:');
console.log(`   BOT_TOKEN: ${botToken ? 'Found' : '❌ Missing'}`);
console.log(`   WEB_APP_URL: ${webAppUrl || '❌ Missing'}`);
console.log();

if (webAppUrl) {
  console.log('🔍 URL Analysis:');
  console.log(`   URL: ${webAppUrl}`);
  
  if (webAppUrl.startsWith('https://')) {
    console.log('   ✅ Uses HTTPS - Good for Telegram Web Apps');
  } else if (webAppUrl.startsWith('http://')) {
    console.log('   ❌ Uses HTTP - Telegram requires HTTPS!');
    console.log('   🔧 Fix: Use ngrok to create HTTPS tunnel');
  } else {
    console.log('   ❌ Invalid URL format');
  }
  
  if (webAppUrl.includes('ngrok')) {
    console.log('   ✅ Using ngrok tunnel');
  } else if (webAppUrl.includes('localhost')) {
    console.log('   ❌ Using localhost - won\'t work on mobile');
  }
} else {
  console.log('❌ WEB_APP_URL not set in .env file');
}

console.log();
console.log('🎯 Next Steps:');
if (!webAppUrl || !webAppUrl.startsWith('https://') || webAppUrl.includes('localhost')) {
  console.log('   1. Run: setup-tunnel.bat');
  console.log('   2. Copy ngrok HTTPS URL to .env file');
  console.log('   3. Run: npm start');
} else {
  console.log('   ✅ Configuration looks good!');
  console.log('   Run: npm start');
}
console.log();
