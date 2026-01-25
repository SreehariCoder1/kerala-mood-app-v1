import Message from '../models/Message.js';

// Helper to get today's start in IST (UTC+5:30)
const getISTStartOfDay = () => {
    const now = new Date();
    // Convert current UTC time to IST string
    // "en-GB" gives dd/mm/yyyy, hh:mm:ss format. We use it to get correct local IST parts
    const istDateString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istDateString);
    
    // Reset to midnight IST
    istDate.setHours(0, 0, 0, 0);
    
    // Create new Date object that represents that specific time
    // Note: Creating a Date from the logic above might result in a "Local Server Time" representation of that string
    // To be precise: We want a Date object that, when compared to stored UTC dates, matches IST midnight.
    // Simpler approach: Shift the timestamp.
    
    // Robust approach:
    // 1. Get current time
    // 2. Add 5h 30m
    // 3. Floor to day
    // 4. Subtract 5h 30m
    
    const offset = 5.5 * 60 * 60 * 1000; // IST is +5:30
    const nowTime = now.getTime();
    const istTime = nowTime + offset;
    const istMidnight = Math.floor(istTime / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
    const utcMidnight = istMidnight - offset;
    
    return new Date(utcMidnight);
};

export const setupChatHandler = (io) => {
    // Track active chat users globally
    const activeChatUsers = new Set();
    
    // State for optimized counting
    let cachedDailyCount = 0;
    let lastCountFetchDate = ""; // String: "YYYY-MM-DD" in IST

    // Helper to get IST YYYY-MM-DD string for comparison
    const getISTDateString = () => {
         return new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' }).split(',')[0];
    };

    // Helper to sync count from DB
    const syncDailyCount = async () => {
        try {
            const startOfDay = getISTStartOfDay();
            const count = await Message.countDocuments({ timestamp: { $gte: startOfDay } });
            
            cachedDailyCount = count;
            lastCountFetchDate = getISTDateString();
            console.log(`Daily count synced to: ${count} for date: ${lastCountFetchDate}`);
            return count;
        } catch (err) {
            console.error("Critical Error syncing daily messages:", err);
            return cachedDailyCount;
        }
    };

    // Ensure cache is valid for "today" before returning
    const getOrSyncDailyCount = async () => {
        const todayIST = getISTDateString();
        // If dates mismatch (new day) or never fetched
        if (todayIST !== lastCountFetchDate) {
             return await syncDailyCount();
        }
        return cachedDailyCount;
    };

    // Auto-Reset at Midnight IST
    const scheduleMidnightReset = () => {
        const now = new Date();
        const startOfToday = getISTStartOfDay();
        const nextMidnight = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        
        let msUntilMidnight = nextMidnight.getTime() - now.getTime();
        
        // Safety check: If for some reason we are past the calculated next midnight (rare race), add 24h
        if (msUntilMidnight <= 0) msUntilMidnight += 24 * 60 * 60 * 1000;

        console.log(`Scheduling daily reset in ${Math.round(msUntilMidnight / 1000 / 60)} minutes (${new Date(now.getTime() + msUntilMidnight).toISOString()})`);

        setTimeout(async () => {
            console.log("🕛 Executing Midnight Reset...");
            
            // Force Sync
            const newCount = await syncDailyCount();
            
            // Broadcast to absolutely everyone
            io.emit('chat:messageCount', newCount);
            
            // Beep boop? Maybe play a sound on client side if we wanted to be fancy, but simpler is better.
            
            // Schedule next day
            scheduleMidnightReset();
            
        }, msUntilMidnight);
    };

    // Initialize once on server start
    syncDailyCount().then(() => {
        scheduleMidnightReset();
    });

    io.on('connection', async (socket) => {


        const updateOnlineCount = () => {
             io.emit('chat:onlineCount', activeChatUsers.size);
        };
        
        // Initial Data Broadcasts
        socket.emit('chat:onlineCount', activeChatUsers.size);
        
        // Send current daily count on connect (Checks for stale cache first)
        getOrSyncDailyCount().then(count => {
            socket.emit('chat:messageCount', count);
        });

        // Typing Status
        // Map socket.id -> username to handle cleanup on disconnect
        const typingSockets = new Map();

        socket.on('chat:typing', (data) => {
            typingSockets.set(socket.id, data.username);
            socket.to('global_chat').emit('chat:typing', data);
        });

        socket.on('chat:stopTyping', (data) => {
            typingSockets.delete(socket.id);
            socket.to('global_chat').emit('chat:stopTyping', data);
        });

        // Cleanup helper
        const handleDisconnect = () => {
            if (activeChatUsers.has(socket.id)) {
                activeChatUsers.delete(socket.id);
                updateOnlineCount();
            }

            if (typingSockets.has(socket.id)) {
                const username = typingSockets.get(socket.id);
                typingSockets.delete(socket.id);
                socket.to('global_chat').emit('chat:stopTyping', { username });
            }
        };

        socket.on('disconnect', handleDisconnect);

        socket.on('chat:join', async () => {
            activeChatUsers.add(socket.id);
            socket.join('global_chat');
            
            updateOnlineCount();

            // Send history only on join
            try {
                const startOfDay = getISTStartOfDay();

                // Optimization: Sort ascending database side to avoid .reverse()
                const recentMessages = await Message.find({
                    timestamp: { $gte: startOfDay }
                }).sort({ timestamp: 1 });

                const history = recentMessages.map(msg => msg.toJSON());
                socket.emit('chat:history', history);
            } catch (err) {
                console.error('Error loading chat history:', err);
            }
        });

        socket.on('chat:leave', () => {
             activeChatUsers.delete(socket.id);
             socket.leave('global_chat');
             updateOnlineCount();
 
             // Cleanup typing
             handleDisconnect();
        });

        // Listen for chat messages
        socket.on('chat:send', async (data) => {
            console.log('Server received chat:send:', data);

            try {
                const newMessage = new Message({
                    text: data.text,
                    mood: data.mood,
                    sender: data.sender || 'Anonymous',
                    replyTo: data.replyTo || null,
                    timestamp: new Date()
                });

                const savedMessage = await newMessage.save();
                const broadcastData = savedMessage.toJSON();

                console.log('Broadcasting message:', broadcastData);
                // Broadcast only to room
                io.to('global_chat').emit('chat:broadcast', broadcastData);
                
                // Robust Update Logic
                const todayIST = getISTDateString();
                
                if (todayIST !== lastCountFetchDate) {
                    // New Day Detected! Sync from DB (includes the message just saved)
                    await syncDailyCount();
                } else {
                     // Same day, safe to increment memory cache
                     cachedDailyCount++;
                }

                io.emit('chat:messageCount', cachedDailyCount);

            } catch (err) {
                console.error('Error saving message:', err);
            }
        });

        // Listen for vote (like/dislike)
        socket.on('chat:vote', async ({ id, type, username }) => {
            try {
                const message = await Message.findById(id);
                if (!message) return;

                // Ensure arrays exist
                if (!message.likedBy) message.likedBy = [];
                if (!message.dislikedBy) message.dislikedBy = [];

                const alreadyLiked = message.likedBy.includes(username);
                const alreadyDisliked = message.dislikedBy.includes(username);

                if (type === 'like') {
                    if (alreadyLiked) {
                        message.likedBy = message.likedBy.filter(u => u !== username);
                    } else {
                        message.likedBy.push(username);
                        if (alreadyDisliked) {
                            message.dislikedBy = message.dislikedBy.filter(u => u !== username);
                        }
                    }
                } else if (type === 'dislike') {
                    if (alreadyDisliked) {
                        message.dislikedBy = message.dislikedBy.filter(u => u !== username);
                    } else {
                        message.dislikedBy.push(username);
                        if (alreadyLiked) {
                            message.likedBy = message.likedBy.filter(u => u !== username);
                        }
                    }
                }

                const savedMessage = await message.save();
                // Broadcast only to room
                io.to('global_chat').emit('chat:voteUpdate', savedMessage.toJSON());

            } catch (err) {
                console.error('Error handling vote:', err);
            }
        });
    });
};
