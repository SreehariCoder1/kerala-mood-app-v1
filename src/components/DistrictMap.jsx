import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { districts, moodColors } from '../data/districts';
import MoodSelector from './MoodSelector';
import AnalyticsPanel from './AnalyticsPanel';
import MoodTrendsPanel from './MoodTrendsPanel';
import MoodReasonsPanel from './MoodReasonsPanel';
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
    const [showTrends, setShowTrends] = useState(false);
    const [showReasons, setShowReasons] = useState(false);
    const [isReasonsFullScreen, setIsReasonsFullScreen] = useState(false);
    const [isAnalyticsFullScreen, setIsAnalyticsFullScreen] = useState(false);
    const [isTrendsFullScreen, setIsTrendsFullScreen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [districtMoods, setDistrictMoods] = useState({}); // { districtId: { mood: 'happy', count: 10 } }
    const [loading, setLoading] = useState(true);
    const [highlightedReasonId, setHighlightedReasonId] = useState(null);

    // Fetch moods on mount and poll every 30s
    useEffect(() => {
        fetchMoods();
        const interval = setInterval(fetchMoods, 30000);
        return () => clearInterval(interval);
    }, []);

    // Listen for notification clicks to open reasons panel
    useEffect(() => {
        const handleOpenReason = (e) => {
            const { id } = e.detail;
            setHighlightedReasonId(id);
            setShowReasons(true);
            setShowAnalytics(false);
            setShowTrends(false);
            setIsMenuOpen(false);

            // If on mobile, maybe make it fullscreen?
            // For now keep default behavior
        };

        window.addEventListener('OPEN_MOOD_REASON', handleOpenReason);
        return () => window.removeEventListener('OPEN_MOOD_REASON', handleOpenReason);
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

    const handleMoodSubmit = async (moodId, reason) => {
        if (!user || !selectedDistrict) return;

        try {
            await axios.post(`${config.API_URL}/moods`, {
                districtId: selectedDistrict.id,
                mood: moodId,
                reason: reason
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

            {/* Top Right Menu & Dropdown */}
            <div className="fixed top-[60px] right-6 z-50 flex flex-col items-end">

                {/* Glowing Downward Arrow Button */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="group relative flex items-center justify-center p-2 transition-all duration-300 animate-pulse hover:animate-none"
                    aria-label="Menu"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : 'rotate-0'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Slide Down Menu */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ y: -10, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -10, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden w-32 origin-top-right"
                        >
                            <div className="flex flex-col p-1 space-y-0.5">
                                <button
                                    onClick={() => {
                                        setShowAnalytics(true);
                                        setShowTrends(false);
                                        setShowReasons(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-indigo-500/20 transition-colors group"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">📊</span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Stats</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowTrends(true);
                                        setShowAnalytics(false);
                                        setShowReasons(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors group"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">📈</span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Trends</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowReasons(true);
                                        setShowAnalytics(false);
                                        setShowTrends(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-pink-500/20 transition-colors group"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">💬</span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Feed</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Panels Container (Centered/Fixed Position) */}
            <AnimatePresence>
                {/* Analytics / Leaderboard Panel */}
                {showAnalytics && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`fixed z-50 transition-all duration-300 ${isAnalyticsFullScreen
                            ? "inset-0 top-0 left-0 w-full h-full"
                            : "top-[60px] right-14 max-h-[70vh] w-56"
                            }`}
                    >
                        <div className={`bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isAnalyticsFullScreen
                            ? "w-full h-full rounded-none"
                            : "h-full rounded-xl"
                            }`}>
                            <div className="bg-slate-800/50 px-3 py-2 border-b border-white/5 flex justify-between items-center bg-slate-900/95 backdrop-blur shrink-0">
                                <h3 className="font-bold text-white text-xs">Leaderboard</h3>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setIsAnalyticsFullScreen(!isAnalyticsFullScreen)}
                                        className={`p-1.5 rounded-lg transition-all border ${isAnalyticsFullScreen
                                            ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                                            }`}
                                        title={isAnalyticsFullScreen ? "Minimize" : "Maximize"}
                                    >
                                        {isAnalyticsFullScreen ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 14h6v6M20 10h-6V4" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M20 16v4m0 0h-4" />
                                            </svg>
                                        )}
                                    </button>
                                    <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded p-0.5 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <AnalyticsPanel />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Trends Panel */}
                {showTrends && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`fixed z-50 transition-all duration-300 ${isTrendsFullScreen
                            ? "inset-0 top-0 left-0 w-full h-full"
                            : "top-[60px] right-14 max-w-[90vw] md:w-[800px] max-h-[70vh]"
                            }`}
                    >
                        <div className={`bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isTrendsFullScreen
                            ? "w-full h-full rounded-none"
                            : "h-full rounded-xl"
                            }`}>
                            <div className="bg-slate-800/50 px-3 py-2 border-b border-white/5 flex justify-between items-center bg-slate-900/95 backdrop-blur shrink-0">
                                <h3 className="font-bold text-white text-xs">Mood Trends</h3>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setIsTrendsFullScreen(!isTrendsFullScreen)}
                                        className={`p-1.5 rounded-lg transition-all border ${isTrendsFullScreen
                                            ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                                            }`}
                                        title={isTrendsFullScreen ? "Minimize" : "Maximize"}
                                    >
                                        {isTrendsFullScreen ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 14h6v6M20 10h-6V4" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M20 16v4m0 0h-4" />
                                            </svg>
                                        )}
                                    </button>
                                    <button onClick={() => setShowTrends(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded p-0.5 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <MoodTrendsPanel />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Reasons Panel (Feed) */}
                {showReasons && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`fixed z-50 transition-all duration-300 ${isReasonsFullScreen
                            ? "inset-0 top-0 left-0 w-full h-full"
                            : "top-[60px] right-4 md:right-14 max-w-[calc(100vw-2rem)]"
                            }`}
                    >
                        <div className={`bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isReasonsFullScreen
                            ? "w-full h-full rounded-none"
                            : "h-[70vh] w-80 rounded-xl"
                            }`}>
                            <div className="bg-slate-800/50 px-3 py-2 border-b border-white/5 flex justify-between items-center bg-slate-900/95 backdrop-blur shrink-0">
                                <h3 className="font-bold text-white text-xs">Live Feed</h3>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setIsReasonsFullScreen(!isReasonsFullScreen)}
                                        className={`p-1.5 rounded-lg transition-all border ${isReasonsFullScreen
                                            ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                                            }`}
                                        title={isReasonsFullScreen ? "Minimize" : "Maximize"}
                                    >
                                        {isReasonsFullScreen ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 14h6v6M20 10h-6V4" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M20 16v4m0 0h-4" />
                                            </svg>
                                        )}
                                    </button>
                                    <button onClick={() => setShowReasons(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded p-0.5 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <MoodReasonsPanel highlightedId={highlightedReasonId} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
}

export default DistrictMap;