import { upsertMood, aggregateDistrictMoods, getMoodStats as getMoodStatsRepo, getMoodHistory as getMoodHistoryRepo, getMoodReasons as getMoodReasonsRepo } from '../repositories/mood.js';

export const submitMood = async (req, res) => {
    // userId from Protected Middleware (Safe!)
    const { districtId, mood, reason } = req.body;
    const userId = req.user._id;

    try {
        const newMood = await upsertMood(userId, districtId, mood, reason);

        // Emit real-time notification
        if (req.io) {
            // const message = reason
            //     ? `Someone in ${districtId} is feeling ${mood}: "${reason}"`
            //     : `Someone in ${districtId} just reported feeling ${mood}!`;

            req.io.emit('mood_update', {
                _id: newMood._id, // Pass ID for linking
                // message: message,
                mood: mood,
                reason: reason,
                districtId: districtId,
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json(newMood);
    } catch (error) {
        console.error("Error submitting mood:", error);
        res.status(500).json({ message: "Error submitting mood", error: error.message });
    }
};

export const getDistrictMoods = async (req, res) => {
    try {
        const result = await aggregateDistrictMoods();
        res.status(200).json(result);
    } catch (error) {

        res.status(500).json({ message: "Error fetching moods", error });
    }
};

export const getMoodStats = async (req, res) => {
    try {
        const stats = await getMoodStatsRepo();
        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats", error });
    }
};

export const getMoodHistory = async (req, res) => {
    try {
        const history = await getMoodHistoryRepo();
        res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching mood history:", error);
        res.status(500).json({ message: "Error fetching mood history", error });
    }
};

export const getMoodReasons = async (req, res) => {
    try {
        const reasons = await getMoodReasonsRepo();
        res.status(200).json(reasons);
    } catch (error) {
        res.status(500).json({ message: "Error fetching reasons", error });
    }
};
