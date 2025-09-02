require('./set');
const path = require('path');
const express = require('express');
const GiftedMd = require('node-telegram-bot-api'); 
const chalk = require('chalk');

// Global error handlers - These prevent the bot from crashing unexpectedly
// and help identify issues that cause the bot to stop responding
process.on('unhandledRejection', async (reason, promise) => {
    console.error(chalk.red('🚨 Unhandled Promise Rejection:'), reason);
    console.error(chalk.red('🔍 Promise:'), promise);
    console.error(chalk.yellow('⚠️  This may indicate an async operation that failed without proper error handling'));
    
    // Handle fatal errors that should trigger restart
    await handleFatalError(reason, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', async (error) => {
    console.error(chalk.red('🚨 Uncaught Exception:'), error);
    console.error(chalk.red('🔍 Stack Trace:'), error.stack);
    console.error(chalk.yellow('⚠️  This may indicate a synchronous error that wasn\'t caught'));
    
    // Handle fatal exceptions
    await handleFatalError(error, 'Uncaught Exception');
});
const { customMessage: GiftedMess, DataBase: GiftedDB } = require('./gift');
const gifteddb = new GiftedDB();
let Gifted;
const app = express();

// Recovery and restart management
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;
let lastHealthCheck = Date.now();
let isRestarting = false;
let lastRestartTime = 0;
const MIN_RESTART_INTERVAL = 30000; // 30 seconds minimum between restarts

// Expose recovery variables globally for monitoring
global.restartAttempts = 0;
global.isRestarting = false;
global.lastHealthCheck = Date.now();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './gift/gifted.html'));
});

// Graceful restart function
async function gracefulRestart(reason = 'Unknown') {
    if (isRestarting) return;
    
    isRestarting = true;
    global.isRestarting = true;
    console.log(chalk.yellow(`🔄 Initiating graceful restart due to: ${reason}`));
    
    try {
        // Save database before restart
        if (global.db) {
            await gifteddb.giftedWrite(global.db);
            console.log(chalk.green('💾 Database saved successfully'));
        }
        
        // Stop polling if Gifted exists
        if (Gifted) {
            try {
                await Gifted.stopPolling();
                console.log(chalk.green('🛑 Stopped Telegram polling'));
            } catch (e) {
                console.log(chalk.yellow('⚠️  Polling was already stopped or failed to stop:', e.message));
            }
        }
        
        console.log(chalk.cyan('⏱️  Waiting 3 seconds before restart...'));
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Reset variables
        Gifted = null;
        isRestarting = false;
        global.isRestarting = false;
        restartAttempts++;
        global.restartAttempts = restartAttempts;
        
        console.log(chalk.green(`🚀 Restarting bot (Attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`));
        
        // Restart the bot
        await startGifted();
        
    } catch (error) {
        console.error(chalk.red('❌ Error during graceful restart:'), error);
        isRestarting = false;
        
        if (restartAttempts < MAX_RESTART_ATTEMPTS) {
            setTimeout(() => gracefulRestart('Restart failed, retrying'), 5000);
        } else {
            console.error(chalk.red('🚨 Maximum restart attempts reached. Manual intervention required.'));
            process.exit(1);
        }
    }
}

const port = process.env.PORT || 7000;
app.listen(port, () => console.log(`App running on port ${port}`));

// Enhanced error recovery function
async function handleFatalError(error, context = 'Unknown') {
    console.error(chalk.red(`🚨 Fatal error in ${context}:`), error);
    
    const errorCode = error?.code || error?.message || '';
    const isFatalNetworkError = errorCode.includes('ENOTFOUND') || 
                               errorCode.includes('ECONNREFUSED') || 
                               errorCode.includes('EFATAL') ||
                               errorCode.includes('ETIMEDOUT');
    
    if (isFatalNetworkError && !isRestarting) {
        const now = Date.now();
        
        // Throttle restarts to prevent rapid cycling
        if (now - lastRestartTime < MIN_RESTART_INTERVAL) {
            console.log(chalk.yellow(`⏱️  Restart throttled - waiting ${Math.ceil((MIN_RESTART_INTERVAL - (now - lastRestartTime)) / 1000)}s`));
            return;
        }
        
        lastRestartTime = now;
        console.log(chalk.yellow('🔧 Network error detected, attempting recovery...'));
        await gracefulRestart(`Network error: ${errorCode}`);
    }
}

async function startGifted() {
    if (isRestarting) return;
    
    try {
        if (!Gifted) {
            console.log(chalk.blue('🔄 Initializing Telegram Bot connection...'));
            
            // Add connection retry logic with exponential backoff
            let connectionAttempts = 0;
            const maxConnectionAttempts = 3;
            
            while (connectionAttempts < maxConnectionAttempts && !Gifted) {
                try {
                    Gifted = new GiftedMd(`${global.botToken}`, { polling: true });
                    
                    // Add error handlers for the bot instance
                    Gifted.on('polling_error', async (error) => {
                        console.error(chalk.red('🔴 Polling Error:'), error);
                        await handleFatalError(error, 'Telegram Polling');
                    });
                    
                    Gifted.on('error', async (error) => {
                        console.error(chalk.red('🔴 Bot Error:'), error);
                        await handleFatalError(error, 'Telegram Bot');
                    });

                    console.log(chalk.bgHex('#90EE90').hex('#333').bold(' 𝐂𝐨𝐨𝐥 𝐒𝐡𝐨𝐭 𝐀𝐈 𝐕2 Connected '));
                    
                    // Test connection
                    const miscInfo = await Gifted.getMe();
                    console.log(chalk.white.bold('—————————————————'));
                    console.log('Bot Info: ', JSON.stringify(miscInfo, null, 2));
                    console.log(chalk.white.bold('—————————————————'));
                    
                    break; // Connection successful
                    
                } catch (error) {
                    connectionAttempts++;
                    console.error(chalk.red(`❌ Connection attempt ${connectionAttempts}/${maxConnectionAttempts} failed:`), error.message);
                    
                    if (connectionAttempts < maxConnectionAttempts) {
                        const delay = Math.pow(2, connectionAttempts) * 1000; // Exponential backoff
                        console.log(chalk.yellow(`⏱️  Waiting ${delay/1000}s before retry...`));
                        await new Promise(resolve => setTimeout(resolve, delay));
                        Gifted = null; // Reset for retry
                    } else {
                        throw error; // Max attempts reached
                    }
                }
            }

            const loadGiftedData = await gifteddb.giftedRead();
            if (loadGiftedData && Object.keys(loadGiftedData).length === 0) {
                global.db = {
                    users: {},
                    groups: {},
                    ...(loadGiftedData || {}),
                };
                await gifteddb.giftedWrite(global.db);
            } else {
                global.db = loadGiftedData;
            }
            
            setInterval(async () => {
                if (global.db) await gifteddb.giftedWrite(global.db);
            }, 5000);

            // Enhanced health check with hang detection
            setInterval(() => {
                const uptime = process.uptime();
                const uptimeFormatted = Math.floor(uptime / 60) + 'm ' + Math.floor(uptime % 60) + 's';
                const memUsage = process.memoryUsage();
                const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
                
                console.log(chalk.green('💚 Bot Health Check - Bot is alive and running'));
                console.log(chalk.cyan(`⏱️  Uptime: ${uptimeFormatted} | Memory: ${memUsageMB}MB | Restarts: ${restartAttempts}`));
                
                // Update health check timestamp
                lastHealthCheck = Date.now();
                global.lastHealthCheck = lastHealthCheck;
            }, 15 * 60 * 1000); // Every 15 minutes

            // Add hang detection - if health check stops updating, trigger restart
            setInterval(async () => {
                const timeSinceLastCheck = Date.now() - lastHealthCheck;
                const hangThreshold = 20 * 60 * 1000; // 20 minutes
                
                if (timeSinceLastCheck > hangThreshold && !isRestarting) {
                    console.log(chalk.red('🚨 Bot appears to be hanging (no health check updates)'));
                    await gracefulRestart('Bot hang detected');
                }
            }, 5 * 60 * 1000); // Check every 5 minutes

            Gifted.on('message', async (m) => {
                try {
                    console.log(chalk.magenta('📥 Message received by first handler (giftedmd)'));
                    await GiftedMess(Gifted, m);
                    console.log(chalk.magenta('✅ First handler completed successfully'));
                    
                    // Update last activity timestamp
                    lastHealthCheck = Date.now();
                    global.lastHealthCheck = lastHealthCheck;
                } catch (error) {
                    console.error(chalk.red('❌ Error in first message handler:'), error);
                }
            });

            require('./gift/gifted')(Gifted);
            
            // Reset restart attempts on successful start
            restartAttempts = 0;
            console.log(chalk.green('✅ Bot initialized successfully'));
        }
    } catch (error) {
        console.error(chalk.red('❌ Failed to start bot:'), error);
        if (!isRestarting && restartAttempts < MAX_RESTART_ATTEMPTS) {
            setTimeout(() => gracefulRestart('Startup failure'), 10000);
        }
    }
}

startGifted();
