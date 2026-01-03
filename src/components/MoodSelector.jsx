import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const moods = [
    { id: 'happy', label: 'Happy', emoji: '😊' },
    { id: 'excited', label: 'Excited', emoji: '🤩' },
    { id: 'neutral', label: 'Neutral', emoji: '😐' },
    { id: 'sad', label: 'Sad', emoji: '😢' },
    { id: 'angry', label: 'Angry', emoji: '😡' },
];

const MoodSelector = ({ isOpen, onClose, onSubmit, districtName }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-800 border border-slate-700 p-6 rounded-3xl shadow-2xl w-full max-w-sm"
                >
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                        How is {districtName}?
                    </h2>
                    <p className="text-slate-400 text-center mb-6">Select the overall vibe right now.</p>

                    <div className="grid grid-cols-3 gap-4">
                        {moods.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => onSubmit(m.id)}
                                className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-slate-700 transition-colors"
                            >
                                <span className="text-4xl mb-2">{m.emoji}</span>
                                <span className="text-sm text-slate-300 font-medium">{m.label}</span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodSelector;
