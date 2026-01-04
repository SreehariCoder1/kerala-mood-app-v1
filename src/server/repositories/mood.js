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
                totalVotes: { $sum: "$count" },
                moods: {
                    $push: {
                        mood: "$_id.mood",
                        count: "$count"
                    }
                }
            }
        }
    ]);

    const result = {};
    moodStats.forEach(stat => {
        result[stat._id] = {
            mood: stat.dominantMood,
            count: stat.moods.find(m => m.mood === stat.dominantMood)?.count || 0,
            totalVotes: stat.totalVotes,
            moods: stat.moods
        };
    });

    return result;
};

export const getMoodStats = async () => {

    const today = getTodayDateString();
    const baseMatch = { $match: { date: today } };

    // 1. Total Votes
    const totalVotes = await Mood.countDocuments({ date: today });

    // Helper to get top districts by mood (handling ties)
    const getTopDistrictByCondition = async (condition) => {
        const result = await Mood.aggregate([
            baseMatch,
            { $match: condition },
            { $group: { _id: "$districtId", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        if (result.length === 0) return null;

        const maxCount = result[0].count;
        const topDistricts = result.filter(r => r.count === maxCount).map(r => r._id);

        return { districts: topDistricts, count: maxCount };
    };

    // Helper for most active (handling ties)
    const getMostActiveDistrict = async () => {
        const result = await Mood.aggregate([
            baseMatch,
            { $group: { _id: "$districtId", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        if (result.length === 0) return null;

        const maxCount = result[0].count;
        const topDistricts = result.filter(r => r.count === maxCount).map(r => r._id);

        return { districts: topDistricts, count: maxCount };
    };

    const happiest = await getTopDistrictByCondition({ mood: 'happy' });
    const excited = await getTopDistrictByCondition({ mood: 'excited' });
    const neutral = await getTopDistrictByCondition({ mood: 'neutral' });
    const sad = await getTopDistrictByCondition({ mood: 'sad' });
    const angriest = await getTopDistrictByCondition({ mood: 'angry' });
    const mostActive = await getMostActiveDistrict();

    return {
        totalVotes,
        happiest,
        excited,
        neutral,
        sad,
        angriest,
        mostActive
    };
};
