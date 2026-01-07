import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRoutes from './routes/user.js';
import moodRoutes from './routes/mood.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Allow requests from the frontend
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"], // Add your frontend URL
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(cors());

// Attach Socket.io to req
app.use((req, res, next) => {
    req.io = io;
    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.get('/', (req, res) => {
    res.send("API is running...");
});

app.use('/api/auth', userRoutes);
app.use('/api/moods', moodRoutes);

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Emit a notification every 15 seconds (DISABLED: Using real-time submissions now)
// setInterval(() => {
//     const moods = ["Happy", "Sad", "Excited", "Angry", "Neutral"];
//     const randomMood = moods[Math.floor(Math.random() * moods.length)];
//     const message = `Someone just reported feeling ${randomMood}!`;
//
//     io.emit('mood_update', {
//         message: message,
//         mood: randomMood,
//         timestamp: new Date().toISOString()
//     });
// }, 15000);

const PORT = process.env.PORT || 5000;

// Only listen if NOT running in Vercel (local development)
if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
