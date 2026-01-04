import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { districts, moodColors } from '../data/districts';
import MoodSelector from './MoodSelector';
import AnalyticsPanel from './AnalyticsPanel';
import DistrictStatsDropdown from './DistrictStatsDropdown';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { playSuccessSound, playErrorSound } from '../utils/audio';
import toast from 'react-hot-toast';

import config from '../config';

const DistrictMap = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [isMoodSelectorOpen, setIsMoodSelectorOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [districtMoods, setDistrictMoods] = useState({}); // { districtId: { mood: 'happy', count: 10 } }
    const [loading, setLoading] = useState(true);

    // Fetch moods on mount and poll every 30s
    useEffect(() => {
        fetchMoods();
        const interval = setInterval(fetchMoods, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchMoods = async () => {
        try {
            const res = await axios.get(`${config.API_URL}/moods`);
            setDistrictMoods(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch moods", error);
        }
    };

    const handleDistrictClick = (district) => {
        setSelectedDistrict(district);
        setIsMoodSelectorOpen(true);
    };

    const handleMoodSubmit = async (moodId) => {
        if (!user || !selectedDistrict) return;

        try {
            await axios.post(`${config.API_URL}/moods`, {
                districtId: selectedDistrict.id,
                mood: moodId
            });

            // Refresh moods immediately
            await fetchMoods();
            playSuccessSound();
            toast.success("Mood submitted successfully! 🎉");
            setIsMoodSelectorOpen(false);
        } catch (error) {
            console.error("Failed to submit mood", error);
            playErrorSound();
            toast.error("Failed to submit mood. Please try again.");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white relative">

            {/* Header */}
            <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
                    Kerala Mood Map
                </h1>

                <div className="flex items-center space-x-4">


                    {user && (
                        <div className="flex items-center space-x-3 bg-slate-800 py-1 px-3 rounded-full border border-white/5">
                            {user.picture ? (
                                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-white/20" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
                                    {user.name?.charAt(0)}
                                </div>
                            )}
                            <span className="text-sm font-medium text-slate-300 hidden sm:block">{user.name}</span>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="text-sm text-slate-400 hover:text-white transition-colors font-medium"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* Map Grid */}
            <div className="w-full max-w-4xl mx-auto p-6 pb-20">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2">How is Kerala feeling?</h2>
                    <p className="text-slate-400">Tap a district to share your vibe.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {districts.map((district) => {
                        const districtData = districtMoods[district.id] || {};
                        const currentMood = districtData.mood || 'default';
                        const voteCount = districtData.count || 0;
                        const colorClass = moodColors[currentMood] || moodColors['default'];

                        // Emoji mapping for display
                        const moodEmoji = {
                            happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡', default: '📍'
                        }[currentMood];

                        return (
                            <motion.div
                                key={district.id}
                                onClick={() => handleDistrictClick(district)}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                className={`${colorClass} p-3 md:p-6 rounded-2xl shadow-lg cursor-pointer backdrop-blur-md bg-opacity-90 border border-white/10 flex flex-col items-center justify-center text-center transition-all duration-500 hover:shadow-2xl h-40 relative overflow-visible group ${openDropdownId === district.id ? 'z-50' : 'z-0 hover:z-40'}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                                {/* Glowing Arrow Button for Stats Dropdown */}
                                <div className="absolute top-2 right-2 z-30">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownId(openDropdownId === district.id ? null : district.id);
                                        }}
                                        className="w-6 h-6 rounded-full bg-slate-900/40 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-slate-900/60 transition-all shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(0,0,0,0.5)] animate-pulse hover:animate-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Stats Dropdown Component */}
                                <DistrictStatsDropdown
                                    isOpen={openDropdownId === district.id}
                                    moods={districtData.moods}
                                    onClose={() => setOpenDropdownId(null)}
                                />

                                <h3 className="text-white font-bold text-sm md:text-lg drop-shadow-md z-10 break-words w-full px-1">{district.name}</h3>
                                <span className="text-3xl mt-2 filter drop-shadow-lg z-10 transition-transform group-hover:scale-110">
                                    {moodEmoji}
                                </span>
                                <div className="mt-2 text-xs font-semibold text-white/80 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                                    {voteCount} votes
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Mood Selector Modal */}
            <MoodSelector
                isOpen={isMoodSelectorOpen}
                onClose={() => setIsMoodSelectorOpen(false)}
                onSubmit={handleMoodSubmit}
                districtName={selectedDistrict?.name}
            />

            {/* Analytics Dropdown - Positioned below header on right */}
            <div className="fixed z-50 top-[140px] right-2 min-[600px]:top-20 min-[600px]:right-6">
                <div className="flex justify-end mb-2">
                    <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`
                            transition-all duration-300 flex items-center justify-center
                            min-[600px]:bg-indigo-600/90 min-[600px]:hover:bg-indigo-500
                            min-[600px]:text-white min-[600px]:shadow-lg min-[600px]:shadow-indigo-500/30
                            min-[600px]:py-2 min-[600px]:px-4 min-[600px]:rounded-full
                            min-[600px]:border min-[600px]:border-indigo-400/30
                            min-[600px]:hover:scale-105 min-[600px]:backdrop-blur-md
                            min-[600px]:space-x-2
                            
                            /* Mobile Styles (<600px) */
                            max-[599px]:w-10 max-[599px]:h-10 max-[599px]:rounded-full
                            max-[599px]:bg-indigo-500/20 max-[599px]:border max-[599px]:border-indigo-400/50
                            max-[599px]:shadow-[0_0_15px_rgba(99,102,241,0.6)]
                            max-[599px]:animate-pulse
                        `}
                    >
                        {/* Desktop Content */}
                        <span className="hidden min-[600px]:inline font-semibold">Stats</span>
                        <span className="hidden min-[600px]:inline text-lg">📊</span>

                        {/* Mobile Content: Down Arrow SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400 min-[600px]:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                <AnimatePresence>
                    {showAnalytics && (
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-180px)] min-[600px]:max-h-[calc(100vh-120px)] overflow-y-auto pb-4"
                        >
                            <div className="bg-slate-800/50 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                                <h3 className="font-bold text-white text-sm">Leaderboard</h3>
                                <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-white">
                                    X
                                </button>
                            </div>
                            <AnalyticsPanel />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
}

export default DistrictMap;