import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    text: { type: String, required: true },
    mood: { type: String, required: true },
    sender: { type: String, required: true },
    replyTo: [{
        id: String,
        sender: String,
        text: String
    }],
    likedBy: [{ type: String }],
    dislikedBy: [{ type: String }],
    timestamp: { type: Date, default: Date.now }
});

// Transform _id to id for frontend compatibility
messageSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
