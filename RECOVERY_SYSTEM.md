# Bot Recovery & Auto-Restart System

## Overview

This bot now includes a comprehensive **automatic recovery and restart system** designed to handle fatal errors, network issues, and periods of inactivity. The system ensures maximum uptime and reliability.

## ✨ Key Features

### 🔄 **Automatic Restart Mechanism**
- **Fatal Error Detection**: Automatically detects `ENOTFOUND`, `ECONNREFUSED`, `EFATAL`, and `ETIMEDOUT` errors
- **Graceful Shutdown**: Saves database and stops polling before restarting
- **Restart Throttling**: Prevents rapid restart loops with 30-second minimum intervals
- **Maximum Attempts**: Limits to 5 restart attempts before requiring manual intervention

### 🌐 **Network Error Recovery**
- **Connection Retry**: Uses exponential backoff for Telegram API connections (3 attempts max)
- **Connection Monitoring**: Detects when the bot can't reach `api.telegram.org`
- **Automatic Reconnection**: Attempts to reconnect after network issues resolve

### 💚 **Health Monitoring**
- **Regular Health Checks**: Logs status every 15 minutes with uptime and memory usage
- **Hang Detection**: Automatically restarts if bot stops responding for 20+ minutes
- **Activity Tracking**: Monitors message handling to detect hanging states

### 🎵 **Enhanced /play Command**
- **Retry Logic**: Retries failed API calls with exponential backoff
- **Better Error Messages**: Provides specific error messages for different failure types
- **Timeout Handling**: 30-second timeout for download API calls
- **Fallback URLs**: Provides alternative download links when APIs fail

### 📊 **Recovery Monitoring**
- **Admin Commands**: `/recovery`, `/restartstatus`, `/botstatus` for owners
- **Detailed Logging**: Comprehensive error logging with context
- **Status Tracking**: Tracks restart attempts, system status, and health metrics

## 🚀 How It Works

### Startup Process
1. **Connection Attempts**: Makes 3 attempts to connect to Telegram API
2. **Exponential Backoff**: Waits 2^n seconds between connection attempts
3. **Error Handlers**: Sets up polling error and bot error handlers
4. **Health Monitoring**: Starts health check and hang detection timers

### Error Recovery Flow
```
Network/Fatal Error Detected
         ↓
Check if restart is throttled
         ↓
Save database to prevent data loss
         ↓
Stop Telegram polling gracefully
         ↓
Wait 3 seconds for cleanup
         ↓
Reset bot instance and restart
         ↓
Attempt reconnection with retry logic
```

### Recovery Types

| Error Type | Recovery Action | Retry Logic |
|------------|----------------|-------------|
| `ENOTFOUND` | Restart with network recovery | 3 attempts with backoff |
| `EFATAL` | Immediate graceful restart | Up to 5 total restarts |
| `ETIMEDOUT` | Retry connection then restart | 30s throttle between restarts |
| Bot Hang | Automatic restart after 20 minutes | Health check monitoring |

## 📝 Admin Commands

### `/recovery` or `/restartstatus`
**Owner-only command** that shows:
- System uptime and memory usage
- Total restart count and recovery status
- Last health check timestamp
- Active recovery features
- Current system status

Example output:
```
🔧 Bot Recovery System Status

System Information:
• Uptime: 2h 45m 32s
• Memory Usage: 125MB
• Process ID: 1234

Recovery Metrics:
• Total Restarts: 2
• Max Restart Limit: 5
• Recovery Status: STABLE
• Last Health Check: 12s ago

Features Active:
✅ Automatic restart on fatal errors
✅ Network error detection & recovery
✅ Hang detection (20min threshold)
✅ Exponential backoff retry logic
✅ Database backup before restarts
✅ Enhanced /play command resilience

Recent Status:
💚 System running normally
```

## 🛡️ Safety Features

### Database Protection
- **Auto-Save**: Database saved every 5 seconds during normal operation
- **Pre-Restart Backup**: Database explicitly saved before each restart
- **Data Integrity**: No data loss during recovery operations

### Restart Limits
- **Maximum Attempts**: 5 restart attempts maximum
- **Throttling**: Minimum 30 seconds between restart attempts
- **Graceful Failure**: Process exits cleanly if max attempts reached

### Resource Management
- **Memory Monitoring**: Tracks memory usage in health checks
- **Clean Shutdown**: Proper cleanup of connections and resources
- **Process Isolation**: Each restart creates a fresh bot instance

## 🔧 Configuration

The system is automatically enabled and requires no additional configuration. Key parameters:

```javascript
MAX_RESTART_ATTEMPTS = 5          // Maximum restart attempts
MIN_RESTART_INTERVAL = 30000      // 30 seconds between restarts  
HANG_DETECTION_THRESHOLD = 20min   // Bot hang detection timeout
HEALTH_CHECK_INTERVAL = 15min      // Regular health check frequency
CONNECTION_TIMEOUT = 30000         // API call timeout (30 seconds)
```

## 📈 Benefits

1. **🔄 Maximum Uptime**: Bot automatically recovers from most common failures
2. **🛡️ Data Safety**: Database protected with automatic backups
3. **🌐 Network Resilience**: Handles temporary network outages gracefully  
4. **🎵 Reliable Commands**: Enhanced /play command with retry mechanisms
5. **📊 Monitoring**: Comprehensive logging and admin monitoring tools
6. **🚦 Smart Recovery**: Throttling prevents resource waste from rapid restarts

## 🚨 Emergency Procedures

If the bot reaches maximum restart attempts:
1. Check server logs for persistent errors
2. Verify network connectivity to `api.telegram.org`
3. Check bot token validity
4. Restart manually: `npm start` or `node index.js`
5. Monitor with `/recovery` command after restart

The recovery system ensures your bot maintains maximum uptime with minimal manual intervention while providing comprehensive monitoring and safety features.