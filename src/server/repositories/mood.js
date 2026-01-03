import Mood from '../models/mood.js';

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

export const upsertMood = async (userId, districtId, mood) => {
    // ONE VOTE PER USER PER DAY
    // We strictly scope this to the current date string (YYYY-MM-DD).
    const today = getTodayDateString();

    return await Mood.findOneAndUpdate(
        { userId, date: today },
        {
            $set: { districtId, mood, timestamp: new Date() }
        },
        { upsert: true, new: true }
    );
};

export const aggregateDistrictMoods = async () => {
    const today = getTodayDateString();

    // Only count votes explicitly made TODAY
    const moodStats = await Mood.aggregate([
        {
            $match: { date: today }
        },
        {
            $group: {
                _id: { district: "$districtId", mood: "$mood" },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        },
        {
            $group: {
                _id: "$_id.district",
                dominantMood: { $first: "$_id.mood" },
                totalVotes: { $first: "$count" }
            }
        }
    ]);

    const result = {};
    moodStats.forEach(stat => {
        result[stat._id] = {
            mood: stat.dominantMood,
            count: stat.totalVotes
        };
    });

    return result;
};
