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
                                        <div className="flex items-center space-x-2">
                                            <a
                                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                                    `Someone in ${reason.districtId} is feeling ${reason.mood} ${moodObj?.emoji || ''}: "${reason.reason}"\n\nCheck live mood: ${window.location.origin}`
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-slate-600 hover:text-green-500 transition-colors"
                                                title="Share on WhatsApp"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                                                </svg>
                                            </a>
                                            <span className="text-[10px] text-slate-600">
                                                {reason.timestamp ? formatDistanceToNow(new Date(reason.timestamp), { addSuffix: true }) : 'Just now'}
                                            </span>
                                        </div>
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
