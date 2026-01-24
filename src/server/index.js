import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRoutes from './routes/user.js';
import moodRoutes from './routes/mood.js';
import { setupGameHandler } from './game/SocketHandler.js';
import { setupChatHandler } from './chat/ChatHandler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Allow requests from the frontend
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://kerala-mood-app-v1.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(express.json());

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "https://kerala-mood-app-v1.vercel.app"];

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
}));

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

setupGameHandler(io);
setupChatHandler(io);


const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
