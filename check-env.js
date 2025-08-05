// Quick environment variable checker
try {
  require('dotenv').config();
} catch (error) {
  console.log('❌ Error loading dotenv:', error.message);
  console.log('   Make sure you have installed dotenv: npm install dotenv');
  process.exit(1);
}

console.log('🔍 Environment Variable Check');
console.log('============================');

// Check if .env file exists
const fs = require('fs');
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found!');
  console.log('   Please copy .env.template to .env and configure it');
  process.exit(1);
}

const requiredVars = {
  'BOT_TOKEN': process.env.BOT_TOKEN,
  'WEB_APP_URL': process.env.WEB_APP_URL,
  'ADMIN_ID_1': process.env.ADMIN_ID_1
};

const optionalVars = {
  'ADMIN_ID_2': process.env.ADMIN_ID_2,
  'ADMIN_ID_3': process.env.ADMIN_ID_3,
  'WS_PORT': process.env.WS_PORT
};

let allGood = true;

console.log('\n📋 Required Variables:');
for (const [key, value] of Object.entries(requiredVars)) {
  if (value && value.trim() !== '') {
    console.log(`✅ ${key}: ${key === 'BOT_TOKEN' ? '[HIDDEN]' : value}`);
    
    // Check if admin IDs look correct
    if (key.startsWith('ADMIN_ID') && value) {
      if (value.includes('@')) {
        console.log(`   ⚠️  WARNING: ${key} contains '@' - should be numeric ID only`);
        allGood = false;
      } else if (isNaN(value)) {
        console.log(`   ⚠️  WARNING: ${key} is not numeric - should be a number`);
        allGood = false;
      } else {
        console.log(`   ✅ ${key} format looks correct`);
      }
    }
  } else {
    console.log(`❌ ${key}: Not set`);
    allGood = false;
  }
}

console.log('\n📋 Optional Variables:');
for (const [key, value] of Object.entries(optionalVars)) {
  if (value && value.trim() !== '') {
    console.log(`✅ ${key}: ${value}`);
    
    // Check admin ID format
    if (key.startsWith('ADMIN_ID') && value) {
      if (value.includes('@')) {
        console.log(`   ⚠️  WARNING: ${key} contains '@' - should be numeric ID only`);
      } else if (isNaN(value)) {
        console.log(`   ⚠️  WARNING: ${key} is not numeric - should be a number`);
      } else {
        console.log(`   ✅ ${key} format looks correct`);
      }
    }
  } else {
    console.log(`➖ ${key}: Not set (optional)`);
  }
}

console.log('\n📋 Summary:');
if (allGood) {
  console.log('✅ All required environment variables are properly configured!');
  console.log('🚀 You can now start your bot with: start-simple.bat');
} else {
  console.log('❌ Some required environment variables need attention.');
  console.log('📝 Please check your .env file and fix the issues above.');
}

console.log('\n💡 Tips:');
console.log('- Admin IDs should be numeric (e.g., 492994227)');
console.log('- No @ symbols in admin IDs');
console.log('- ADMIN_ID_2 is optional if you only have one admin');
console.log('- Use /getid command in your bot to get correct IDs');
console.log('- Use start-simple.bat for basic setup without WebSocket');
