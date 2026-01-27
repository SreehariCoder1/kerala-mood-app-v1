import { OAuth2Client } from 'google-auth-library';
import { findOrCreateUser } from '../repositories/user.js';
import generateToken from '../utils/generateToken.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
    const { credential, client_id } = req.body;

    try {
        // Verify JWT locally (Fast!)
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: client_id || process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleInfo = {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
        };

        const user = await findOrCreateUser(googleInfo);

        res.status(200).json({
            user,
            token: generateToken(user._id) // Issue Session JWT
        });

    } catch (error) {
        console.error("Auth Error:", error);
        res.status(400).json({
            message: "Authentication failed",
            error: error.message,
            details: error.response ? error.response.data : "No upstream response"
        });
    }
};
