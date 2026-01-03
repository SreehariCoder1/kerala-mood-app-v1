import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    districtId: {
        type: String, // e.g., 'tvm', 'ekm'
        required: true
    },
    mood: {
        type: String, // 'happy', 'sad', etc.
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    date: {
        type: String, // 'YYYY-MM-DD'
        required: true
    }
});

const Mood = mongoose.model('Mood', moodSchema);

export default Mood;
