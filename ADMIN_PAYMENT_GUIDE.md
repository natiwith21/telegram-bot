# 🔧 Admin Payment Management Guide

## 📋 Overview
This guide explains how admins can manage user points after receiving payments. The system uses a **1:1 conversion rate** (1 Birr = 1 point) and includes comprehensive logging and user notifications.

## 🎯 Key Features
- ✅ **Secure Access Control** - Only authorized agents can use admin commands
- ✅ **Automatic Transaction Logging** - All actions are recorded in database
- ✅ **User Notifications** - Users get notified when points are added/removed
- ✅ **Balance Validation** - Prevents removing more points than user has
- ✅ **Pending Payment Detection** - Warns about existing pending payments
- ✅ **Detailed Transaction History** - Complete audit trail for all transactions

## 🔑 Admin Commands

### 1. **Add Points** - `/addpoints`
**Usage:** `/addpoints @username amount_in_birr`

**Examples:**
- `/addpoints @john 100` - Add 100 points (100 Birr payment)
- `/addpoints @jane 50` - Add 50 points (50 Birr payment)

**Features:**
- Validates user exists and is registered
- Checks for pending payments
- Logs transaction with admin details
- Notifies user automatically
- Shows detailed confirmation to admin

### 2. **Remove Points** - `/removepoints`
**Usage:** `/removepoints @username amount_in_birr`

**Examples:**
- `/removepoints @john 50` - Remove 50 points (50 Birr refund)
- `/removepoints @jane 25` - Remove 25 points (25 Birr refund)

**Features:**
- Validates user has sufficient balance
- Logs refund transaction
- Notifies user of refund
- Shows detailed confirmation to admin

### 3. **Check User** - `/checkuser`
**Usage:** `/checkuser @username`

**Examples:**
- `/checkuser @john` - Check @john's balance and transaction history

**Features:**
- Shows user information
- Displays current balance
- Lists recent transactions (last 5)
- Shows registration date and last activity

### 4. **Pending Payments** - `/pending`
**Usage:** `/pending`

**Features:**
- Lists all pending payment requests
- Shows payment details and dates
- Helps prioritize which payments to process first

### 5. **Admin Help** - `/adminhelp`
**Usage:** `/adminhelp`

**Features:**
- Shows all available admin commands
- Provides usage examples
- Lists system features

## 📊 Payment Flow Process

### **Step 1: User Submits Payment**
1. User uses `/deposit` command
2. User enters amount and payment method
3. User submits payment proof (SMS)
4. Payment details sent to agents via Telegram

### **Step 2: Agent Verification**
1. Agent receives payment notification
2. Agent verifies payment manually
3. Agent uses `/addpoints @username amount` to credit user
4. System automatically logs transaction and notifies user

### **Step 3: User Confirmation**
1. User receives confirmation message
2. User can immediately start playing games
3. Transaction is logged in database

## 🔒 Security Features

### **Access Control**
- Only users in `PAYMENT_AGENTS` array can use admin commands
- Each command validates admin permissions
- All actions are logged with admin ID

### **Validation Checks**
- User must be registered before adding points
- Cannot remove more points than user has
- Maximum transaction limit (10,000 Birr)
- Pending payment detection

### **Audit Trail**
- All transactions logged with unique IDs
- Admin details recorded for each action
- Timestamp and approval tracking
- Complete transaction history maintained

## 📱 User Notifications

### **When Points Added:**
```
✅ Payment Confirmed!

💰 Payment: 100 Birr
🎯 Points Added: 100 points
📈 Previous Balance: 50 points
📈 New Balance: 150 points

🎮 You can now play games!
• Use /play to start playing
• Or click "🎯 Play Bingo" in the menu
```

### **When Points Removed:**
```
📤 Points Removed

💰 Refund Amount: 50 Birr
🎯 Points Removed: 50 points
📉 Previous Balance: 150 points
📉 New Balance: 100 points

📞 Contact support if this was an error.
• Support: @nati280
```

## 🛠️ Best Practices

### **For Agents:**
1. **Always verify payment** before adding points
2. **Use exact amounts** - if user paid 100 Birr, add 100 points
3. **Check for pending payments** first using `/pending`
4. **Use `/checkuser`** to verify user details before processing
5. **Keep transaction IDs** for reference
6. **Notify users immediately** after processing

### **For System Administrators:**
1. **Regular monitoring** of `/pending` payments
2. **Review transaction logs** periodically
3. **Update agent list** as needed in `.env` file
4. **Monitor for unusual activity** or large transactions
5. **Backup transaction data** regularly

## 📈 Transaction Logging

### **Database Fields:**
- `userId` - User's Telegram ID
- `username` - User's username
- `amount` - Points added/removed
- `type` - 'deposit' or 'refund'
- `status` - 'completed' or 'pending'
- `approvedBy` - Admin ID who processed
- `approvedAt` - Timestamp of approval
- `transactionId` - Unique transaction identifier
- `paymentMethod` - Method used (Manual Credit/Refund)
- `adminNotes` - Additional notes from admin

### **Transaction ID Format:**
- **Payments:** `PAY_1234567890_abc123def`
- **Refunds:** `REF_1234567890_abc123def`

## 🚨 Troubleshooting

### **Common Issues:**

1. **"User not found"**
   - User must register first using `/register`
   - Check username spelling (case sensitive)

2. **"Insufficient balance"**
   - User doesn't have enough points for refund
   - Check current balance with `/checkuser @username`

3. **"Pending payment found"**
   - User already has a pending payment request
   - Process the pending payment first

4. **"Access denied"**
   - Admin ID not in `PAYMENT_AGENTS` array
   - Check `.env` file configuration

### **Support Contacts:**
- **Payment Agent:** @nati280
- **General Support:** Use "Contact Support" in bot menu

## 📋 Quick Reference

| Command | Usage | Purpose |
|---------|-------|---------|
| `/addpoints` | `/addpoints @username amount` | Add points to user |
| `/removepoints` | `/removepoints @username amount` | Remove points (refund) |
| `/checkuser` | `/checkuser @username` | Check user balance & history |
| `/pending` | `/pending` | List pending payments |
| `/adminhelp` | `/adminhelp` | Show all admin commands |

## 🎯 Conversion Rates
- **1 Ethiopian Birr = 1 Point**
- **Minimum Transaction:** 50 Birr
- **Maximum Transaction:** 10,000 Birr
- **All amounts in Birr (ETB)**

---

**Last Updated:** ${new Date().toLocaleDateString()}
**Version:** 2.0 Enhanced Admin System 