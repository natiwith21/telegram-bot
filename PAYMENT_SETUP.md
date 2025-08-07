# 🏦 Payment System Setup Guide

## 📋 Overview
This payment system allows users to deposit Ethiopian Birr through trusted agents and get points credited to their account. **1 Birr = 1 Point**

## 🔧 Environment Variables
Add these to your `.env` file:

```env
# Payment Agent Configuration
AGENT_PHONE=0967218959
AGENT_NAME=Payment Agent

# Admin IDs (same as existing)
ADMIN_ID_1=your_telegram_id_1
ADMIN_ID_2=your_telegram_id_2
```

## 🎯 How It Works

### 1. User Payment Flow
1. User types `/deposit`
2. Bot shows payment instructions with bank account
3. User clicks "I've Paid" button
4. Bot notifies payment agents
5. Agent verifies payment and uses `/addpoints @username amount_in_birr`
6. User gets points credited automatically (1 Birr = 1 Point)

### 2. Agent Commands
- `/addpoints @username amount_in_birr` - Add points to user (1 Birr = 1 point)
- `/removepoints @username amount_in_birr` - Remove points (refunds)
- `/transactions` - View recent transactions

### 3. User Commands
- `/deposit` - Start payment process
- `/balance` - Check current balance

## 🔐 Security Features
- Only authorized agents can add/remove points
- All transactions are logged with unique IDs
- Automatic user notifications
- Transaction history tracking

## 📱 Example Flow

**User:**
```
/deposit
```

**Bot Response:**
```
🏦 Deposit Funds

💰 Payment Instructions:
1. Bank Transfer: Send to Ethiopian Commercial Bank
   Account: 1000526054753
2. Mobile Money: Send to 0967218959
   Methods: Telebirr, HelloCash, Bank Transfer
3. Amount Range: 50 - 10000 Birr
4. Points Rate: 1 Birr = 1 point

📱 After Payment:
• Click "I've Paid" button below
• Send your transaction code/screenshot
• Our agent will verify and credit your account

⏱️ Processing Time: 5-15 minutes

💡 Example: If you send 100 Birr, you'll get 100 points

[✅ I've Paid] [💰 Check Balance] [📞 Contact Support]
```

**Agent Notification:**
```
🔔 New Payment Request

👤 User: @username
🆔 ID: 123456789
📝 Name: John Doe
💰 Status: Waiting for payment verification

📱 Action Required:
• Check payment received
• Use /addpoints @username 100 to credit user
```

**Agent Response:**
```
/addpoints @username 100
```

**User Notification:**
```
✅ Payment Confirmed!

💰 Payment: 100 Birr
🎯 Points Added: 100 points
📈 New Balance: 150 points

🎮 You can now play games!
Use /play to start playing.
```

## 🚀 Getting Started

1. **Set up environment variables** in `.env`
2. **Start the bot** with `npm run dev`
3. **Test the system** with `/deposit` command
4. **Verify as agent** with `/addpoints @yourusername 100`

## 💡 Tips

- Always verify payments before adding points
- Keep transaction logs for security
- Respond quickly to payment requests
- Use unique transaction IDs for tracking
- Monitor for suspicious activity
- **Remember: 1 Birr = 1 Point**

## 🔧 Troubleshooting

**Issue: Agent not receiving notifications**
- Check ADMIN_ID_1 and ADMIN_ID_2 in .env
- Ensure agent has started a chat with the bot

**Issue: Points not adding**
- Verify user has registered with `/register`
- Check username spelling in `/addpoints` command
- Ensure agent ID is in PAYMENT_AGENTS array
- Make sure you're entering the amount in Birr (not points)

**Issue: Transaction errors**
- Check database connection
- Verify Payment model is updated
- Check for duplicate transaction IDs

## 🏦 Bank Account Details

**Ethiopian Commercial Bank**
- Account Number: `1000526054753`
- Payment Methods: Bank Transfer, Telebirr, HelloCash
- Processing Time: 5-15 minutes
- Minimum Amount: 50 Birr
- Maximum Amount: 10,000 Birr 