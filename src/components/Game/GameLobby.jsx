import React, { useState } from 'react';
import { motion } from 'framer-motion';

const MOOD_CLASSES = [
    { id: 'happy', emoji: '😊', name: 'Happy Sprinter', stats: 'Speed: High, Dmg: Med' },
    { id: 'angry', emoji: '😡', name: 'Angry Tank', stats: 'Speed: Low, Dmg: High' },
    { id: 'sad', emoji: '😢', name: 'Sad Sniper', stats: 'Speed: Med, Range: High' },
];

const GameLobby = ({ onFindMatch, connectionStatus }) => {
    const [selectedMood, setSelectedMood] = useState(MOOD_CLASSES[0]);

    return (
        <div className="flex flex-col items-center justify-center p-8 text-white min-h-[500px]">
            <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent"
            >
                Mood Duel Arena
            </motion.h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {MOOD_CLASSES.map((mood) => (
                    <motion.button
                        key={mood.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedMood(mood)}
                        className={`p-6 rounded-2xl border-2 transition-all ${selectedMood.id === mood.id
                                ? 'border-yellow-400 bg-white/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                                : 'border-white/20 bg-black/20 hover:bg-white/5'
                            }`}
                    >
                        <div className="text-6xl mb-4">{mood.emoji}</div>
                        <h3 className="text-xl font-bold mb-2">{mood.name}</h3>
                        <p className="text-sm text-gray-400">{mood.stats}</p>
                    </motion.button>
                ))}
            </div>

            <div className="text-center">
                <p className="mb-6 text-gray-300">
                    {connectionStatus === 'connected'
                        ? 'Server Online ready for battle!'
                        : `Status: ${connectionStatus}`}
                </p>

                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFindMatch(selectedMood)}
                    disabled={connectionStatus !== 'connected'}
                    className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    FIND MATCH
                </motion.button>
            </div>
        </div>
    );
};

export default GameLobby;
