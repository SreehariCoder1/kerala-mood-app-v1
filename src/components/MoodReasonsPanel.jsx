import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const moods = [
    { id: 'all', label: 'All', emoji: '🌈' },
    { id: 'happy', label: 'Happy', emoji: '😊' },
    { id: 'excited', label: 'Excited', emoji: '🤩' },
    { id: 'neutral', label: 'Neutral', emoji: '😐' },
    { id: 'sad', label: 'Sad', emoji: '😢' },
    { id: 'angry', label: 'Angry', emoji: '😡' },
];

const MoodReasonsPanel = ({ highlightedId }) => {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchReasons = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${config.API_URL}/moods/reasons`);
            setReasons(res.data);
            return res.data; // Return for chaining
        } catch (error) {
            console.error("Failed to fetch reasons", error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReasons();
        const interval = setInterval(fetchReasons, 30000);
        return () => clearInterval(interval);
    }, []);

    // Handle Scrolling to Highlighted Item
    useEffect(() => {
        if (!highlightedId) return;

        const scrollToItem = () => {
            const element = document.getElementById(`reason-${highlightedId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a temporary highlight class
                element.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-500/10');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-500/10');
                }, 3000);
            }
        };

        // Check if item exists, if not fetch (likely new submission)
        const itemExists = reasons.find(r => r._id === highlightedId);

        if (itemExists) {
            // Wait a tick for render (if filter was just cleared?)
            // Actually, if filter is preventing it, we should clear filter
            if (filter !== 'all' && itemExists.mood !== filter) {
                setFilter('all');
                setTimeout(scrollToItem, 100);
            } else {
                setTimeout(scrollToItem, 100);
            }
        } else {
            // Not found, maybe new? Fetch and then try
            fetchReasons().then((newReasons) => {
                const found = newReasons?.find(r => r._id === highlightedId);
                if (found) {
                    setFilter('all'); // Ensure visible
                    setTimeout(scrollToItem, 300); // Wait for render
                }
            });
        }
    }, [highlightedId]);

    const filteredReasons = filter === 'all'
        ? reasons
        : reasons.filter(r => r.mood === filter);

    return (
        <div className="w-full flex flex-col h-full bg-slate-900 text-white">

            {/* Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto p-3 border-b border-white/10 no-scrollbar">
                {moods.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setFilter(m.id)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border ${filter === m.id
                            ? 'bg-white text-slate-900 border-white'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                    >
                        <span>{m.emoji}</span>
                        <span>{m.label}</span>
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loading && reasons.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 text-sm">Loading thoughts...</div>
                ) : filteredReasons.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 text-sm">
                        {filter === 'all' ? "No thoughts shared today yet." : `No one is feeling ${filter} today.`}
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {filteredReasons.map((reason) => {
                            const moodObj = moods.find(m => m.id === reason.mood);
                            return (
                                <motion.div
                                    id={`reason-${reason._id}`} // ID for scrolling
                                    key={reason._id || Math.random()}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`bg-slate-800/50 border border-white/5 p-3 rounded-xl hover:bg-slate-800 transition-colors ${highlightedId === reason._id ? 'bg-indigo-500/10 border-indigo-500/50' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg" title={reason.mood}>{moodObj?.emoji}</span>
                                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                                {reason.districtId}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-600">
                                            {reason.timestamp ? formatDistanceToNow(new Date(reason.timestamp), { addSuffix: true }) : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm break-words leading-relaxed">
                                        "{reason.reason}"
                                    </p>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default MoodReasonsPanel;
