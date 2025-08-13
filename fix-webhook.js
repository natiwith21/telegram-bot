#!/usr/bin/env node

/**
 * Webhook Fix Script - Permanent Solution for Telegram Bot
 * This script fixes webhook issues by clearing and resetting the webhook URL
 */

require('dotenv').config();
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found in environment variables');
    process.exit(1);
}

if (!RENDER_URL) {
    console.error('❌ RENDER_EXTERNAL_URL not found in environment variables');
    console.error('💡 Set RENDER_EXTERNAL_URL=https://your-app-name.onrender.com');
    process.exit(1);
}

const WEBHOOK_URL = `${RENDER_URL}/webhook/${BOT_TOKEN}`;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

console.log('🔧 Telegram Bot Webhook Fix Tool');
console.log('================================');
console.log(`🤖 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);
console.log(`🌐 Render URL: ${RENDER_URL}`);
console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
console.log('');

// Make HTTP request helper
function makeRequest(url, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: data ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (e) {
                    resolve({ error: 'Invalid JSON response', raw: responseData });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function main() {
    try {
        // Step 1: Check current webhook status
        console.log('📍 Step 1: Checking current webhook status...');
        const webhookInfo = await makeRequest(`${TELEGRAM_API}/getWebhookInfo`);
        
        if (webhookInfo.ok) {
            const info = webhookInfo.result;
            console.log(`✅ Current webhook URL: ${info.url || 'None'}`);
            console.log(`📊 Pending updates: ${info.pending_update_count || 0}`);
            console.log(`⚠️ Last error: ${info.last_error_message || 'None'}`);
            
            if (info.url && info.url !== WEBHOOK_URL) {
                console.log(`🔄 Webhook URL mismatch detected!`);
                console.log(`   Current: ${info.url}`);
                console.log(`   Expected: ${WEBHOOK_URL}`);
            }
        } else {
            console.log(`❌ Failed to get webhook info: ${webhookInfo.description}`);
        }

        // Step 2: Delete current webhook
        console.log('\n🗑️ Step 2: Clearing current webhook...');
        const deleteResult = await makeRequest(`${TELEGRAM_API}/deleteWebhook`);
        
        if (deleteResult.ok) {
            console.log('✅ Webhook cleared successfully');
        } else {
            console.log(`⚠️ Webhook clear result: ${deleteResult.description}`);
        }

        // Wait a moment
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Set new webhook
        console.log('\n📡 Step 3: Setting new webhook...');
        const setWebhookUrl = `${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`;
        const setResult = await makeRequest(setWebhookUrl);
        
        if (setResult.ok) {
            console.log('✅ Webhook set successfully!');
            console.log(`📡 New webhook URL: ${WEBHOOK_URL}`);
        } else {
            console.log(`❌ Failed to set webhook: ${setResult.description}`);
            return;
        }

        // Step 4: Verify new webhook
        console.log('\n✅ Step 4: Verifying webhook...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const verifyInfo = await makeRequest(`${TELEGRAM_API}/getWebhookInfo`);
        
        if (verifyInfo.ok && verifyInfo.result.url === WEBHOOK_URL) {
            console.log('🎉 SUCCESS! Webhook is now properly configured');
            console.log(`✅ Webhook URL: ${verifyInfo.result.url}`);
            console.log(`📊 Pending updates: ${verifyInfo.result.pending_update_count || 0}`);
            console.log('');
            console.log('🤖 Your bot should now respond to messages!');
            console.log('🧪 Test by sending /start to your bot');
        } else {
            console.log('❌ Webhook verification failed');
            console.log('🔧 Please check your Render deployment and try again');
        }

    } catch (error) {
        console.error('💥 Error during webhook fix:', error.message);
        console.log('');
        console.log('🔧 MANUAL FIX COMMANDS:');
        console.log(`curl -X POST "${TELEGRAM_API}/deleteWebhook"`);
        console.log(`curl -X POST "${TELEGRAM_API}/setWebhook" -d "url=${WEBHOOK_URL}"`);
    }
}

// Run the script
main().catch(console.error);
