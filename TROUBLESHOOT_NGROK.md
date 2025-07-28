# 🔧 Fixing ngrok Issues - Complete Guide

## Problem: ngrok popup disappears immediately

This usually happens because:
1. ngrok isn't properly installed
2. Auth token not configured
3. Command prompt closes too quickly
4. Path issues on Windows

## 🛠️ Solution: Step-by-Step Fix

### Step 1: Download ngrok Manually
1. Go to https://ngrok.com/download
2. Download **Windows 64-bit** version
3. Extract `ngrok.exe` to `C:\ngrok\` folder
4. Add `C:\ngrok\` to your Windows PATH

### Step 2: Verify Installation
Open **Command Prompt as Administrator** and test:
```bash
cd C:\ngrok
ngrok --version
```
You should see version info like `ngrok version 3.x.x`

### Step 3: Configure Auth Token
```bash
cd C:\ngrok
ngrok config add-authtoken 305ycN0ipqo9S135NXDQl2JXf8E_6yTJ6Kv2qr8k65nZZnEM6
```

### Step 4: Test ngrok
```bash
cd C:\ngrok
ngrok http 3000
```

## 🚀 Alternative: Use PowerShell Method

If Command Prompt doesn't work, try PowerShell:

### Step 1: Open PowerShell as Administrator
```powershell
# Navigate to your project
cd C:\Users\hp\Desktop\telegram-bot

# Install ngrok via chocolatey (if you have it)
choco install ngrok

# OR install via npm globally
npm install -g ngrok

# Configure auth token
ngrok config add-authtoken 305ycN0ipqo9S135NXDQl2JXf8E_6yTJ6Kv2qr8k65nZZnEM6

# Start tunnel
ngrok http 3000
```

## 🔄 Alternative Solution: Use Online Services

If ngrok still doesn't work, try these alternatives:

### Option 1: LocalTunnel
```bash
npm install -g localtunnel
lt --port 3000
```

### Option 2: Serveo (No installation needed)
```bash
ssh -R 80:localhost:3000 serveo.net
```

## 📋 Complete Testing Process

### Terminal 1: Backend
```bash
cd C:\Users\hp\Desktop\telegram-bot
node server.js
```

### Terminal 2: Frontend
```bash
cd C:\Users\hp\Desktop\telegram-bot\frontend
npm run dev
```

### Terminal 3: ngrok (or alternative)
```bash
# Method 1: ngrok
ngrok http 3000

# Method 2: LocalTunnel
lt --port 3000

# Method 3: Serveo
ssh -R 80:localhost:3000 serveo.net
```

## 🎯 What You Should See

### ngrok Success Output:
```
ngrok by @inconshreveable

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123-def-456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy this URL**: `https://abc123-def-456.ngrok-free.app`

## 🔧 If Still Not Working

Try this simple PowerShell script:

```powershell
# Save as start-tunnel.ps1
Write-Host "Starting ngrok tunnel..."
cd C:\Users\hp\Desktop\telegram-bot
Start-Process powershell -ArgumentList "ngrok http 3000" -Verb RunAs
```

Then run: `powershell -ExecutionPolicy Bypass -File start-tunnel.ps1`
