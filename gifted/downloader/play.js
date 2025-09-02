const axios = require("axios"),
      yts = require("yt-search");

// Retry utility for API calls
async function retryApiCall(apiCall, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            console.log(`API call attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw error; // Last attempt failed
            }
            
            // Exponential backoff
            const waitTime = delay * Math.pow(2, attempt - 1);
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

module.exports = {
    command: ['play', 'song', 'audio'],
    desc: 'Download Audio from Youtube',
    category: ['downloader'],
    async run(m, { Gifted, text }) {

        if (!text) return Gifted.reply({ text: `Usage: ${global.prefix}play Faded` }, m);

        Gifted.reply({ text: giftechMess.wait }, m);

        try {
            const searchTerm = Array.isArray(text) ? text.join(" ") : text;
            
            // Retry search with exponential backoff
            const searchResults = await retryApiCall(async () => {
                console.log(`Searching for: ${searchTerm}`);
                return await yts(searchTerm);
            }, 3, 2000);

            if (!searchResults.videos.length) {
                return Gifted.reply({ text: 'No video found for your query. Please try a different search term.' }, m);
            }

            const video = searchResults.videos[0];
            const videoUrl = video.url;

            let giftedButtons = [
                [
                    { text: 'Ytdl Web', url: `${global.ytdlWeb}` },
                    { text: 'WaChannel', url: global.giftedWaChannel }
                ]
            ];

            // Enhanced download with multiple API attempts and fallbacks
            try {
                console.log(`Attempting to download: ${video.title}`);
                
                // Primary API with retry logic
                const apiResponse = await retryApiCall(async () => {
                    const response = await axios.get(
                        `${global.giftedApi}/api/download/ytmp3?apikey=${global.giftedKey}&url=${videoUrl}`,
                        { timeout: 30000 } // 30 second timeout
                    );
                    
                    if (!response.data?.result?.download_url) {
                        throw new Error('Invalid API response - missing download URL');
                    }
                    
                    return response;
                }, 3, 3000);

                const downloadUrl = apiResponse.data.result.download_url;
                const fileName = apiResponse.data.result.title;

                if (!downloadUrl) {
                    throw new Error('Download URL not available from API');
                }

                let giftedMess = `
${global.botName} SONG DOWNLOADER 
╭───────────────◆  
│⿻ *Title:* ${video.title}
│⿻ *Quality:* 128Kbps
│⿻ *Duration:* ${video.timestamp}
│⿻ *Viewers:* ${video.views}
│⿻ *Uploaded:* ${video.ago}
│⿻ *Artist:* ${video.author.name}
╰────────────────◆  
⦿ *Direct Yt Link:* ${video.url}
⦿ *Download More At:* ${global.ytdlWeb}

╭────────────────◆  
│ ${global.footer}
╰─────────────────◆`;

                console.log(`Sending video info for: ${video.title}`);
                await Gifted.reply({ image: { url: video.thumbnail }, caption: giftedMess, parse_mode: 'Markdown' }, giftedButtons, m);

                console.log(`Sending audio file: ${fileName}`);
                await retryApiCall(async () => {
                    return Gifted.downloadAndSend({ audio: downloadUrl, fileName: fileName, caption: giftechMess.done }, giftedButtons, m);
                }, 2, 5000);
                
                console.log(`Successfully completed download for: ${video.title}`);
                
            } catch (e) {
                console.error('API/Download Error in play command:', e);
                
                // Enhanced error handling with specific messages
                let errorMsg = '❌ Download failed. ';
                
                if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') {
                    errorMsg += 'Network connectivity issue. Please check your connection and try again.';
                } else if (e.code === 'ETIMEDOUT' || e.message?.includes('timeout')) {
                    errorMsg += 'Request timed out. The service might be slow. Please try again in a moment.';
                } else if (e.message?.includes('download_url') || e.message?.includes('Invalid API response')) {
                    errorMsg += 'The download service is temporarily unavailable. Please try again later.';
                } else if (e.response?.status === 429) {
                    errorMsg += 'Too many requests. Please wait a minute before trying again.';
                } else if (e.response?.status >= 500) {
                    errorMsg += 'Server error on download service. Please try again later.';
                } else {
                    errorMsg += 'Please try again in a few minutes or use a different song.';
                }
                
                errorMsg += `\n\n🔄 You can also try: ${global.ytdlWeb}`;
                
                return Gifted.reply({ text: errorMsg }, giftedButtons, m);
            }
        } catch (e) {
            console.error('Search Error in play command:', e);
            
            // Enhanced error handling for search failures
            let errorMsg = '🔍 Search failed. ';
            
            if (e.code === 'ENOTFOUND') {
                errorMsg += 'Unable to connect to YouTube search. Please check your internet connection and try again.';
            } else if (e.code === 'ETIMEDOUT') {
                errorMsg += 'Search timed out. Please try again with a shorter or different search term.';
            } else if (e.message?.includes('rate limit') || e.message?.includes('quota')) {
                errorMsg += 'Search quota exceeded. Please try again in a few minutes.';
            } else {
                errorMsg += 'Please try with a different search term or check your spelling.';
            }
            
            return Gifted.reply({ text: errorMsg }, m);
        }
    }
};
