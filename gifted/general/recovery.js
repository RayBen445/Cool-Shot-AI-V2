const chalk = require('chalk');

let Giftedd = async (m, { Gifted }) => {
    // Check if user is owner/admin
    const userId = m.from.id;
    if (!global.ownerId.includes(userId)) {
        return Gifted.reply({ text: 'Owner-Only Feature!' }, m);
    }

    let giftedButtons = [
        [
            { text: 'WaChannel', url: global.giftedWaChannel },
            { text: 'Repository', url: global.giftedRepo }
        ]
    ];

    // Get recovery system status
    const uptime = process.uptime();
    const uptimeFormatted = Math.floor(uptime / 3600) + 'h ' + 
                           Math.floor((uptime % 3600) / 60) + 'm ' + 
                           Math.floor(uptime % 60) + 's';
    
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    let giftedMess = `*🔧 Bot Recovery System Status*

*System Information:*
• Uptime: \`${uptimeFormatted}\`
• Memory Usage: \`${memUsageMB}MB\`
• Process ID: \`${process.pid}\`

*Recovery Metrics:*
• Total Restarts: \`${global.restartAttempts || 0}\`
• Max Restart Limit: \`5\`
• Recovery Status: \`${global.isRestarting ? 'RESTARTING' : 'STABLE'}\`
• Last Health Check: \`${Math.floor((Date.now() - global.lastHealthCheck) / 1000)}s ago\`

*Features Active:*
✅ Automatic restart on fatal errors
✅ Network error detection & recovery
✅ Hang detection (20min threshold)
✅ Exponential backoff retry logic
✅ Database backup before restarts
✅ Enhanced /play command resilience

*Recent Status:*
${global.isRestarting ? '🔄 Currently restarting...' : '💚 System running normally'}

${global.footer}`;

    Gifted.reply({ 
        text: giftedMess, 
        parse_mode: 'Markdown' 
    }, giftedButtons, m);
}

Giftedd.command = ['recovery', 'restartstatus', 'botstatus']
Giftedd.desc = 'Show bot recovery system status (Owner Only)'
Giftedd.category = ['general', 'owner']

module.exports = Giftedd