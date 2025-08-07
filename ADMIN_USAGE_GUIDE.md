# 🔧 Admin Point Management - Usage Guide

## 📍 **Where to Use Admin Commands**

**⚠️ IMPORTANT:** Admin commands work **ONLY in the Telegram bot**, NOT in the mini-app!

### **🎯 Location: Telegram Bot Chat**
- Open your Telegram app
- Go to your bot chat (the bot you're an admin for)
- Type commands directly in the chat
- Commands will only work if you're an authorized agent

## 🔑 **Admin Commands Reference**

### **1. Add Points to User**
```
/addpoints @username amount_in_birr
```

**Examples:**
- `/addpoints @john 100` - Add 100 points (100 Birr payment)
- `/addpoints @jane 50` - Add 50 points (50 Birr payment)

**What happens:**
- ✅ Validates user exists and is registered
- ✅ Checks for pending payments
- ✅ Logs transaction with admin details
- ✅ Notifies user automatically
- ✅ Shows detailed confirmation to admin

### **2. Remove Points (Refund)**
```
/removepoints @username amount_in_birr
```

**Examples:**
- `/removepoints @john 50` - Remove 50 points (50 Birr refund)
- `/removepoints @jane 25` - Remove 25 points (25 Birr refund)

**What happens:**
- ✅ Validates user has sufficient balance
- ✅ Logs refund transaction
- ✅ Notifies user of refund
- ✅ Shows detailed confirmation to admin

### **3. Check User Balance**
```
/checkuser @username
```

**Examples:**
- `/checkuser @john` - Check @john's balance and transaction history

**What shows:**
- User information and current balance
- Recent transactions (last 5)
- Registration date and last activity

### **4. List Pending Payments**
```
/pending
```

**What shows:**
- All pending payment requests
- Payment details and dates
- Helps prioritize which payments to process first

### **5. Admin Help**
```
/adminhelp
```

**What shows:**
- All available admin commands
- Usage examples
- System features

## 📊 **Step-by-Step Process**

### **Step 1: Receive Payment Notification**
When a user submits a payment, you'll receive a message like:
```
🔔 New Payment Verification Request

👤 User: @john
🆔 ID: 1234567890
💰 Amount: 100 ETB
🏦 Method: CBE Bank
📱 Transaction Details:
Dear John your Account 1*****1234 has been Credited with ETB 100.00...

📋 Action Required:
• Verify the payment
• Use /addpoints @john 100 to credit user
```

### **Step 2: Verify Payment**
1. Check the payment details
2. Verify the amount matches what user requested
3. Confirm the payment method is correct

### **Step 3: Credit User**
Type the command in your bot chat:
```
/addpoints @john 100
```

### **Step 4: Confirm Success**
You'll receive a confirmation:
```
✅ Points Added Successfully

👤 User: @john
💰 Payment Amount: 100 Birr
🎯 Points Added: 100 points
📈 Previous Balance: 0 points
📈 New Balance: 100 points
🆔 Transaction ID: PAY_1234567890_abc123def
📅 Date: 12/25/2024, 2:30:45 PM
```

### **Step 5: User Gets Notified**
The user receives:
```
✅ Payment Confirmed!

💰 Payment: 100 Birr
🎯 Points Added: 100 points
📈 Previous Balance: 0 points
📈 New Balance: 100 points

🎮 You can now play games!
• Use /play to start playing
• Or click "🎯 Play Bingo" in the menu
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Access Denied"**
**Problem:** You're not authorized to use admin commands
**Solution:** 
- Make sure your Telegram ID is in the `PAYMENT_AGENTS` array
- Contact the system administrator to add your ID

### **Issue 2: "User not found"**
**Problem:** User hasn't registered yet
**Solution:**
- Ask user to register first using `/register`
- Or use the bot's registration button

### **Issue 3: "Insufficient balance" (for refunds)**
**Problem:** User doesn't have enough points
**Solution:**
- Check current balance with `/checkuser @username`
- Only refund what they actually have

### **Issue 4: "Pending payment found"**
**Problem:** User already has a pending payment
**Solution:**
- Process the pending payment first
- Use `/pending` to see all pending payments

## 📱 **How to Get Your Telegram ID**

If you need to add yourself as an admin:

1. **Send `/getid` to your bot**
2. **Bot will reply with your ID**
3. **Add that ID to the `.env` file**

Example:
```
Your Telegram User ID: 1234567890
```

## 🔧 **Environment Setup**

Make sure your `.env` file has:
```env
ADMIN_ID_1=your_telegram_id_here
ADMIN_ID_2=another_admin_id_here
```

## 📋 **Quick Reference**

| Command | Usage | Purpose |
|---------|-------|---------|
| `/addpoints` | `/addpoints @username amount` | Add points to user |
| `/removepoints` | `/removepoints @username amount` | Remove points (refund) |
| `/checkuser` | `/checkuser @username` | Check user balance & history |
| `/pending` | `/pending` | List pending payments |
| `/adminhelp` | `/adminhelp` | Show all admin commands |

## 🎯 **Best Practices**

### **For Payment Processing:**
1. **Always verify payment** before adding points
2. **Use exact amounts** - if user paid 100 Birr, add 100 points
3. **Check for pending payments** first using `/pending`
4. **Use `/checkuser`** to verify user details before processing
5. **Keep transaction IDs** for reference
6. **Notify users immediately** after processing

### **For Refunds:**
1. **Verify the reason** for refund
2. **Check user balance** before processing
3. **Use exact amounts** - refund only what was paid
4. **Document the reason** in admin notes
5. **Notify user** of the refund

### **For Security:**
1. **Never share admin commands** with users
2. **Keep your bot access** secure
3. **Log all transactions** for audit
4. **Verify user identity** before processing
5. **Use strong passwords** for bot access

## 📞 **Support Contacts**

- **Payment Agent:** @nati280
- **System Admin:** Contact the bot owner

---

**Last Updated:** ${new Date().toLocaleDateString()}
**Version:** 2.0 Admin Usage Guide 