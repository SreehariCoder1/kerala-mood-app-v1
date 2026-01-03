import User from '../models/user.js';

export const findOrCreateUser = async (googleInfo) => {
    const { sub, email, name, picture } = googleInfo;

    // Find user by email and update, or create if not exists
    // This prevents duplicate email errors if the user already exists
    return await User.findOneAndUpdate(
        { email: email },
        {
            googleId: sub,
            name: name,
            picture: picture
        },
        { new: true, upsert: true }
    );
};
