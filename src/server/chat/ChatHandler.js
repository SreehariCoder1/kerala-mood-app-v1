import Message from '../models/Message.js';

export const setupChatHandler = (io) => {
    // Track active chat users globally
    const activeChatUsers = new Set();

    io.on('connection', async (socket) => {


        const updateOnlineCount = () => {
             io.emit('chat:onlineCount', activeChatUsers.size);
        };
        // Emit initial count on connect logic if needed, but 'chat:join' covers it for openers.
        // But if a user opens chat, they need the current count? 
        // Yes, let's emit current count on connect so they see it before joining?
        // Actually, they only care when they join. 
        // But simpler to just rely on updateOnlineCount broadcast.
        socket.emit('chat:onlineCount', activeChatUsers.size);

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
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const recentMessages = await Message.find({
                    timestamp: { $gte: startOfDay }
                }).sort({ timestamp: -1 });

                const history = recentMessages.reverse().map(msg => msg.toJSON());
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
