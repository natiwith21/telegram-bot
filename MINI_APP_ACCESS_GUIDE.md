# 🎮 Mini App Access Guide

## ✅ **Yes! All Bingo options have mini app links:**

### **🎯 Demo Mode (Free)**
- **Access:** Instant mini app link
- **Command:** `/play` → "🎮 Play Demo (Free)"
- **Features:** Unlimited games, no payment required
- **URL Pattern:** `/bingo?mode=demo&token=SESSION_TOKEN`

### **💰 Paid Bingo Games**
After payment verification, you get direct mini app links:

#### **Bingo 10 (25 Birr)**
- **Access:** After payment verification
- **Games:** 5 games per payment
- **URL:** `/bingo?mode=10&token=SESSION_TOKEN`

#### **Bingo 20 (50 Birr)**
- **Access:** After payment verification  
- **Games:** 5 games per payment
- **URL:** `/bingo?mode=20&token=SESSION_TOKEN`

#### **Bingo 50 (125 Birr)**
- **Access:** After payment verification
- **Games:** 5 games per payment
- **URL:** `/bingo?mode=50&token=SESSION_TOKEN`

#### **Bingo 100 (250 Birr)**
- **Access:** After payment verification
- **Games:** 5 games per payment
- **URL:** `/bingo?mode=100&token=SESSION_TOKEN`

## 🚀 **How to Access Mini App Links:**

### **Method 1: Quick Play Command** ⭐ **EASIEST**
```
/play
```
Shows all available games with direct mini app buttons:
- ✅ Free demo (always available)
- ✅ Your active paid games (if any)
- ✅ Option to buy new games

### **Method 2: Payment Verification**
1. Choose Bingo 10/20/50/100
2. Make payment
3. Click "I've Paid"
4. **Admin verifies** → You get mini app link instantly
5. Click "🎯 Play Bingo X" button

### **Method 3: Status Check**
1. After making payment, use status check
2. When verified, you'll see "🎯 Play Bingo X" button
3. Clicking launches mini app directly

### **Method 4: Frontend Menu**
The frontend at `http://localhost:3000` has buttons for:
- 🎮 Free Bingo Demo
- 🎯 Bingo 10, 20, 50, 100 (with payment flow)
- 🎰 Fortune Wheel

## 🔗 **Mini App URL Structure:**

```
http://localhost:3000/bingo?mode=GAME_MODE&token=SESSION_TOKEN
```

**Examples:**
- Demo: `http://localhost:3000/bingo?mode=demo&token=abc123`
- Bingo 10: `http://localhost:3000/bingo?mode=10&token=xyz789`
- Bingo 20: `http://localhost:3000/bingo?mode=20&token=def456`

## 🎯 **Token-Based Security:**

Each mini app link includes a secure session token that:
- ✅ Validates user access
- ✅ Tracks games remaining
- ✅ Prevents unauthorized access
- ✅ Expires after 7 days

## 📱 **User Experience Flow:**

### **For Demo:**
1. Send `/play` → Click "🎮 Play Demo" → **Instant mini app access**

### **For Paid Games:**
1. Send `/play` → Click "💰 Buy Bingo Games"
2. Choose Bingo 10/20/50/100 → See payment instructions
3. Make payment → Click "💳 I've Paid"
4. **Admin verifies** → Get "🎯 Play Bingo X" button
5. Click button → **Mini app launches with your game**

### **Return to Existing Games:**
1. Send `/play` → See "Your Active Games" section
2. Click "🎯 Play Bingo X (4 left)" → **Continue playing**

## ✅ **Summary:**

**YES!** All Bingo options (10, 20, 50, 100, Demo) have direct mini app links that:
- Launch the web app at `localhost:3000`
- Include proper game mode and session token
- Provide secure, token-based access
- Track remaining games for paid modes
- Work seamlessly with the payment system

**Use `/play` command for the quickest access to all your games!**
