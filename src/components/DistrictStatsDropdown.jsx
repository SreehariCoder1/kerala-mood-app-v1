import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DistrictStatsDropdown = ({ isOpen, moods, onClose }) => {
    // Mood emoji mapping
    const moodEmojis = {
        happy: '😊',
        excited: '🤩',
        neutral: '😐',
        sad: '😢',
        angry: '😡'
    };

    const moodColors = {
        happy: 'text-yellow-400',
        excited: 'text-pink-400',
        neutral: 'text-slate-400',
        sad: 'text-blue-300',
        angry: 'text-red-500'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-12 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-2 mx-2 overflow-hidden"
                    onClick={(e) => e.stopPropagation()} // Prevent clicking through to district
                >
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Moods</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="text-slate-400 hover:text-white"
                        >
                            ×
                        </button>
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {moods && moods.length > 0 ? (
                            moods.map((stat) => (
                                <div key={stat.mood} className="flex justify-between items-center p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">{moodEmojis[stat.mood] || '❓'}</span>
                                        <span className={`text-xs font-medium capitalize ${moodColors[stat.mood]}`}>{stat.mood}</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">{stat.count}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-500 text-xs py-2">No votes yet</div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DistrictStatsDropdown;
