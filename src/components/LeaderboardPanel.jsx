import React from 'react';
import { motion } from 'framer-motion';
import { districts } from '../data/districts';

const LeaderboardPanel = ({ districtMoods }) => {
    // 1. Process Data
    const sortedDistricts = React.useMemo(() => {
        // Create an array of all districts with their stats
        const allDistricts = districts.map(d => {
            const stats = districtMoods[d.id] || { count: 0, mood: 'default' };
            return {
                id: d.id,
                name: d.name,
                count: stats.totalVotes || stats.count || 0, // Prefer totalVotes if available, else generic count
                mood: stats.mood || 'default'
            };
        });

        // Sort by count descending
        const sorted = allDistricts.sort((a, b) => b.count - a.count);

        // Assign Dense Ranks (1, 1, 2, 3...)
        let currentRank = 1;
        return sorted.map((district, index) => {
            if (index > 0 && district.count < sorted[index - 1].count) {
                currentRank++;
            }
            return { ...district, rank: currentRank };
        });
    }, [districtMoods]);

    const moodEmojiMap = {
        happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡', default: '📍'
    };

    const getRankStyle = (rank) => {
        if (rank === 1) return "text-yellow-400 font-bold scale-110"; // Gold
        if (rank === 2) return "text-slate-300 font-bold scale-105";   // Silver
        if (rank === 3) return "text-amber-700 font-bold";     // Bronze
        return "text-slate-500 font-medium";
    };

    return (
        <div className="w-full flex flex-col h-full bg-slate-900 text-white">
            <div className="flex-1 overflow-y-auto p-2 pb-5 space-y-1">
                {sortedDistricts.map((district, index) => (
                    <motion.div
                        key={district.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center justify-between p-2 rounded-lg border border-white/5 bg-slate-800/50 hover:bg-slate-800 transition-colors ${district.rank <= 3 ? 'bg-gradient-to-r from-white/5 to-transparent' : ''}`}
                    >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <span className={`w-6 text-center shrink-0 ${getRankStyle(district.rank)}`}>#{district.rank}</span>
                            <div className="min-w-0">
                                <h4 className="font-bold text-sm text-slate-200 truncate pr-1" title={district.name}>{district.name}</h4>
                                <div className="flex items-center space-x-1 mt-0.5">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider shrink-0">Top Vibe:</span>
                                    <span className="text-sm shadow-sm">{moodEmojiMap[district.mood]}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                            <span className="block font-bold text-lg text-white leading-tight">
                                {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(district.count)}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">votes</span>
                        </div>
                    </motion.div>
                ))}

                {sortedDistricts.every(d => d.count === 0) && (
                    <div className="text-center text-slate-500 py-10 text-sm italic">
                        No votes yet today! Be the first to verify the vibe.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardPanel;
