import { upsertMood, aggregateDistrictMoods, getMoodStats as getMoodStatsRepo } from '../repositories/mood.js';

export const submitMood = async (req, res) => {
    // userId from Protected Middleware (Safe!)
    const { districtId, mood } = req.body;
    const userId = req.user._id;

    try {
        const newMood = await upsertMood(userId, districtId, mood);
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
