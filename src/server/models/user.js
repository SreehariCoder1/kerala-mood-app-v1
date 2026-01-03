import mongoose from 'mongoose';

// User Model
const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    picture: {
        type: String
    }
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

export default User;
