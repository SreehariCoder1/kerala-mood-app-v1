import Message from '../models/Message.js';

export const setupChatHandler = (io) => {
    io.on('connection', async (socket) => {

        // Load history for the current day (resets daily)
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const recentMessages = await Message.find({
                timestamp: { $gte: startOfDay }
            }).sort({ timestamp: -1 });

            // Send in reverse order (oldest first) so they append correctly on client
            const history = recentMessages.reverse().map(msg => msg.toJSON());
            socket.emit('chat:history', history);
        } catch (err) {
            console.error('Error loading chat history:', err);
        }

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
                io.emit('chat:broadcast', broadcastData);

            } catch (err) {
                console.error('Error saving message:', err);
            }
        });

        // Listen for vote (like/dislike)
        socket.on('chat:vote', async ({ id, type, username }) => {
            // console.log(`Vote received: ${type} for msg ${id} by ${username}`);
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
                        // Toggle off
                        message.likedBy = message.likedBy.filter(u => u !== username);
                    } else {
                        // Add like, remove dislike if exists
                        message.likedBy.push(username);
                        if (alreadyDisliked) {
                            message.dislikedBy = message.dislikedBy.filter(u => u !== username);
                        }
                    }
                } else if (type === 'dislike') {
                    if (alreadyDisliked) {
                        // Toggle off
                        message.dislikedBy = message.dislikedBy.filter(u => u !== username);
                    } else {
                        // Add dislike, remove like if exists
                        message.dislikedBy.push(username);
                        if (alreadyLiked) {
                            message.likedBy = message.likedBy.filter(u => u !== username);
                        }
                    }
                }

                const savedMessage = await message.save();
                io.emit('chat:voteUpdate', savedMessage.toJSON());

            } catch (err) {
                console.error('Error handling vote:', err);
            }
        });
    });
};
