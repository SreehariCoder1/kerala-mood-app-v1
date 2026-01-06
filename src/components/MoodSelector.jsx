import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const moods = [
    { id: 'happy', label: 'Happy', emoji: '😊', color: 'bg-yellow-500/20 border-yellow-500/30' },
    { id: 'excited', label: 'Excited', emoji: '🤩', color: 'bg-pink-500/20 border-pink-500/30' },
    { id: 'neutral', label: 'Neutral', emoji: '😐', color: 'bg-slate-500/20 border-slate-500/30' },
    { id: 'sad', label: 'Sad', emoji: '😢', color: 'bg-blue-500/20 border-blue-500/30' },
    { id: 'angry', label: 'Angry', emoji: '😡', color: 'bg-red-500/20 border-red-500/30' },
];

const MoodSelector = ({ isOpen, onClose, onSubmit, districtName }) => {
    const [selectedMoodId, setSelectedMoodId] = useState(null);
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedMoodId(null);
            setReason('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (selectedMoodId) {
            onSubmit(selectedMoodId, reason);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-1 rounded-[2rem] shadow-2xl w-full max-w-xs relative overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Background glow effect */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/10 to-purple-500/5 pointer-events-none" />

                    <div className="relative p-5 overflow-y-auto custom-scrollbar">
                        <div className="text-center mb-4">
                            <motion.h2
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400 mb-1"
                            >
                                {districtName}
                            </motion.h2>
                            <p className="text-slate-400 font-medium text-xs">How's the vibe right now?</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {moods.map((m, idx) => (
                                <motion.button
                                    key={m.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedMoodId(m.id)}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border ${selectedMoodId === m.id
                                        ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                        : 'bg-slate-800/40 border-white/5 hover:bg-slate-700/40 hover:border-white/10'
                                        }`}
                                >
                                    <span className="text-3xl mb-1 drop-shadow-md filter">{m.emoji}</span>
                                    <span className={`text-[10px] font-bold tracking-wide transition-colors ${selectedMoodId === m.id ? 'text-white' : 'text-slate-400'}`}>
                                        {m.label}
                                    </span>
                                </motion.button>
                            ))}
                        </div>

                        <div className="mb-4 space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Why? (Required)</label>
                            <motion.div
                                className="relative rounded-xl bg-slate-950/30 border border-white/10 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden"
                            >
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    className="w-full bg-transparent border-none p-3 text-white placeholder-slate-600 focus:ring-0 resize-none h-16 text-sm leading-relaxed"
                                    maxLength={280}
                                />
                                <div className="absolute bottom-1 right-3 text-[9px] font-medium text-slate-600">
                                    {reason.length}/280
                                </div>
                            </motion.div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl font-bold transition-all bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedMoodId || !reason.trim()}
                                className={`flex-[2] py-3 rounded-xl font-bold shadow-lg transition-all text-sm ${selectedMoodId && reason.trim()
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                    }`}
                            >
                                Submit Mood
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodSelector;
