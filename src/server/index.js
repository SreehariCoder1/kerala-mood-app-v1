import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/user.js';
import moodRoutes from './routes/mood.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

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

const PORT = process.env.PORT || 5000;

// Only listen if NOT running in Vercel (local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
