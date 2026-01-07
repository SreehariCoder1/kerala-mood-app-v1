import Mood from '../models/mood.js';

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

export const upsertMood = async (userId, districtId, mood, reason = null) => {
    // ONE VOTE PER USER PER DAY
    // We strictly scope this to the current date string (YYYY-MM-DD).
    const today = getTodayDateString();

    const updateData = { districtId, mood, timestamp: new Date() };
    if (reason) updateData.reason = reason;

    return await Mood.findOneAndUpdate(
        { userId, date: today },
        {
            $set: updateData
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
        const maxCount = Math.max(...stat.moods.map(m => m.count));
        const topMoods = stat.moods.filter(m => m.count === maxCount).map(m => m.mood);

        result[stat._id] = {
            mood: topMoods[0], // Keep for backward compatibility/primary display
            topMoods: topMoods, // New field for ties
            count: maxCount,
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

export const getMoodHistory = async () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    // Convert to YYYY-MM-DD
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Aggregate daily mood counts
    const history = await Mood.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { date: "$date", mood: "$mood" },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: "$_id.date",
                moods: {
                    $push: {
                        k: "$_id.mood",
                        v: "$count"
                    }
                },
                totalVotes: { $sum: "$count" }
            }
        },
        {
            $sort: { _id: 1 }
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                moods: { $arrayToObject: "$moods" },
                totalVotes: 1
            }
        }
    ]);

    // Fill in missing dates with zero data
    const result = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(sevenDaysAgo.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const existing = history.find(h => h.date === dateStr);
        if (existing) {
            result.push({
                date: dateStr,
                happy: existing.moods.happy || 0,
                excited: existing.moods.excited || 0,
                neutral: existing.moods.neutral || 0,
                sad: existing.moods.sad || 0,
                angry: existing.moods.angry || 0,
                totalVotes: existing.totalVotes,
                displayDate: d.toLocaleDateString('en-US', { weekday: 'short' }) // Mon, Tue
            });
        } else {
            result.push({
                date: dateStr,
                happy: 0,
                excited: 0,
                neutral: 0,
                sad: 0,
                angry: 0,
                totalVotes: 0,
                displayDate: d.toLocaleDateString('en-US', { weekday: 'short' })
            });
        }
    }

    return result;
};

export const getMoodReasons = async () => {
    const today = getTodayDateString();
    return await Mood.find({
        date: today,
        reason: { $exists: true, $ne: "" }
    })
        .sort({ timestamp: -1 })
        .limit(100)
        .select('mood districtId reason timestamp');
};
