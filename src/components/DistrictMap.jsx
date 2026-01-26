import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import ThreeBackground from './ThreeBackground';
import { districts, moodColors } from '../data/districts';
import MoodSelector from './MoodSelector';
import AnalyticsPanel from './AnalyticsPanel';
import MoodTrendsPanel from './MoodTrendsPanel';
import MoodReasonsPanel from './MoodReasonsPanel';
import LeaderboardPanel from './LeaderboardPanel';
import DistrictStatsDropdown from './DistrictStatsDropdown';
import DistrictComparisonPanel from './DistrictComparisonPanel';
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
    const [isSubmittingMood, setIsSubmittingMood] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showTrends, setShowTrends] = useState(false);
    const [showReasons, setShowReasons] = useState(false);
    const [isReasonsFullScreen, setIsReasonsFullScreen] = useState(false);
    const [isAnalyticsFullScreen, setIsAnalyticsFullScreen] = useState(false);
    const [isTrendsFullScreen, setIsTrendsFullScreen] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isLeaderboardFullScreen, setIsLeaderboardFullScreen] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    const [isComparisonFullScreen, setIsComparisonFullScreen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [districtMoods, setDistrictMoods] = useState({}); // { districtId: { mood: 'happy', count: 10 } }
    const [loading, setLoading] = useState(true);
    const [highlightedReasonId, setHighlightedReasonId] = useState(null);
    const [activeDistricts, setActiveDistricts] = useState([]); // Track districts with live updates

    // Fetch moods on mount and poll every 30s
    useEffect(() => {
        fetchMoods();
        const interval = setInterval(fetchMoods, 30000);
        return () => clearInterval(interval);
    }, []);

    const [showMoodImages, setShowMoodImages] = useState(false);

    // Toggle mood images every 30 seconds for 5 seconds
    useEffect(() => {
        const toggleImages = () => {
            setShowMoodImages(true);
            setTimeout(() => {
                setShowMoodImages(false);
            }, 15000); // Hide after 5 seconds
        };

        // Initial trigger
        // toggleImages(); // Optional: trigger immediately on load? user said "every 30 seconds"

        const imageInterval = setInterval(toggleImages, 40000);
        return () => clearInterval(imageInterval);
    }, []);

    // Socket connection for live active status
    useEffect(() => {
        const socketUrl = config.API_URL.replace('/api', '');
        const socket = io(socketUrl);

        socket.on('mood_update', (data) => {
            if (data?.districtId) {
                setActiveDistricts(prev => [...prev, data.districtId]);
                setTimeout(() => {
                    setActiveDistricts(prev => {
                        const idx = prev.indexOf(data.districtId);
                        if (idx > -1) {
                            const newArr = [...prev];
                            newArr.splice(idx, 1);
                            return newArr;
                        }
                        return prev;
                    });
                }, 3000);
            }
        });

        return () => socket.disconnect();
    }, []);

    // Listen for notification clicks to open reasons panel
    useEffect(() => {
        const handleOpenReason = (e) => {
            const { id } = e.detail;
            setHighlightedReasonId(id);
            setShowReasons(true);
            setShowAnalytics(false);
            setShowTrends(false);
            setShowLeaderboard(false);
            setShowComparison(false);
            setIsMenuOpen(false);
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

        setIsSubmittingMood(true);
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
        } finally {
            setIsSubmittingMood(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-transparent text-white relative overflow-hidden">
            <ThreeBackground />
            
            {/* Header */}
            <nav className="sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
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
                        const topMoods = districtData.topMoods && districtData.topMoods.length > 0
                            ? districtData.topMoods
                            : (districtData.mood ? [districtData.mood] : ['default']);

                        const currentMood = topMoods[0]; // Primary mood for styling
                        const voteCount = districtData.count || 0;
                        const colorClass = moodColors[currentMood] || moodColors['default'];

                        // Color mapping for gradients (using RGBA to match bg-opacity-90)
                        const moodColorCodes = {
                            happy: 'rgba(250, 204, 21, 0.9)',   // yellow-400
                            sad: 'rgba(37, 99, 235, 0.9)',      // blue-600
                            angry: 'rgba(239, 68, 68, 0.9)',    // red-500
                            excited: 'rgba(236, 72, 153, 0.9)', // pink-500
                            neutral: 'rgba(156, 163, 175, 0.9)',// gray-400
                            default: 'rgba(51, 65, 85, 0.9)'    // slate-700
                        };

                        const isTie = topMoods.length > 1;
                        let cardStyle = {};
                        let finalColorClass = colorClass;

                        if (isTie) {
                            const gradientColors = topMoods.map(m => moodColorCodes[m] || moodColorCodes['default']).join(', ');
                            cardStyle = { background: `linear-gradient(135deg, ${gradientColors})` };
                            finalColorClass = ''; // Remove single color class to let gradient take over
                        }

                        const moodEmojiMap = {
                            happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡', default: '📍'
                        };

                        return (
                            <motion.div
                                key={district.id}
                                onClick={() => handleDistrictClick(district)}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                style={cardStyle}
                                className={`${finalColorClass} p-3 md:p-6 rounded-2xl shadow-lg cursor-pointer backdrop-blur-md bg-opacity-90 border border-white/10 flex flex-col items-center justify-center text-center transition-all duration-500 hover:shadow-2xl h-40 relative overflow-visible group ${openDropdownId === district.id ? 'z-50' : 'z-0 hover:z-40'}`}
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

                                {/* Live Pulse Indicator */}
                                {activeDistricts.includes(district.id) && (
                                    <div className="absolute top-2 left-2 z-30">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
                                        </span>
                                    </div>
                                )}

                                {/* Stats Dropdown Component */}
                                <DistrictStatsDropdown
                                    isOpen={openDropdownId === district.id}
                                    moods={districtData.moods}
                                    onClose={() => setOpenDropdownId(null)}
                                />

                                <h3 className="text-white font-bold text-sm md:text-lg drop-shadow-md z-10 break-words w-full px-1">{district.name}</h3>

                                <div className="flex justify-center items-center space-x-1 max-[500px]:space-x-0.5 mt-2 z-10 flex-wrap">
                                    {topMoods.map((mood, index) => (
                                        <span key={`${district.id}-${mood}-${index}`} className="text-3xl max-[500px]:text-lg filter drop-shadow-lg transition-transform group-hover:scale-110">
                                            {moodEmojiMap[mood] || moodEmojiMap['default']}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-2 text-xs font-semibold text-white/80 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                                    {voteCount} votes
                                </div>

                                {/* Mood Image Overlay */}
                                <AnimatePresence>
                                    {showMoodImages && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-2xl"
                                        >
                                            <img
                                                src={`/mood-images/${currentMood}.jpg`}
                                                onError={(e) => { e.target.src = '/mood-images/default.png'; }}
                                                alt={currentMood}
                                                className="w-45 h-45 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
                isSubmitting={isSubmittingMood}
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
                                        setShowLeaderboard(false);
                                        setShowComparison(false);
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
                                        setShowLeaderboard(false);
                                        setShowComparison(false);
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
                                        setShowLeaderboard(false);
                                        setShowComparison(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-pink-500/20 transition-colors group"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">💬</span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Feed</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLeaderboard(true);
                                        setShowAnalytics(false);
                                        setShowTrends(false);
                                        setShowReasons(false);
                                        setShowComparison(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-yellow-500/20 transition-colors group"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">🏆</span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Ranks</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowComparison(true);
                                        setShowAnalytics(false);
                                        setShowTrends(false);
                                        setShowReasons(false);
                                        setShowLeaderboard(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-orange-500/20 transition-colors group"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">🆚</span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Compare</span>
                                </button>
                                <button
                                    onClick={() => navigate('/game')}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors group"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">🎮</span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Play Game</span>
                                </button>
                                <a
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                        `Check out Kerala Mood Map! 🌍✨\nSee how Kerala is feeling in real-time.\n${window.location.origin}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors group w-full text-left"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#25D366" viewBox="0 0 16 16">
                                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                                        </svg>
                                    </span>
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Share App</span>
                                </a>
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
                                <h3 className="font-bold text-white text-xs">Stats</h3>
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
                {/* Leaderboard Panel */}
                {showLeaderboard && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`fixed z-[60] transition-all duration-300 ${isLeaderboardFullScreen
                            ? "inset-0 top-0 left-0 w-full h-full"
                            : "top-[60px] right-14"
                            }`}
                    >
                        <div className={`bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isLeaderboardFullScreen
                            ? "w-full h-full rounded-none"
                            : "max-h-[50vh] w-52 md:w-56 rounded-xl"
                            }`}>
                            <div className="bg-slate-800/50 px-3 py-2 border-b border-white/5 flex justify-between items-center bg-slate-900/95 backdrop-blur shrink-0">
                                <h3 className="font-bold text-white text-xs">Leaderboard</h3>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setIsLeaderboardFullScreen(!isLeaderboardFullScreen)}
                                        className={`p-1.5 rounded-lg transition-all border ${isLeaderboardFullScreen
                                            ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                                            }`}
                                        title={isLeaderboardFullScreen ? "Minimize" : "Maximize"}
                                    >
                                        {isLeaderboardFullScreen ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 14h6v6M20 10h-6V4" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M20 16v4m0 0h-4" />
                                            </svg>
                                        )}
                                    </button>
                                    <button onClick={() => setShowLeaderboard(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded p-0.5 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <LeaderboardPanel districtMoods={districtMoods} />
                            </div>
                        </div>
                    </motion.div>
                )}
                {/* Comparison Panel */}
                {showComparison && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`fixed z-[60] transition-all duration-300 ${isComparisonFullScreen
                            ? "inset-0 top-0 left-0 w-full h-full"
                            : "top-[60px] right-4 md:right-14"
                            }`}
                    >
                        <div className={`bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isComparisonFullScreen
                            ? "w-full h-full rounded-none"
                            : "max-h-[70vh] w-[90vw] max-[425px]:w-[300px] md:w-96 rounded-xl"
                            }`}>
                            <div className="bg-slate-800/50 px-3 py-2 border-b border-white/5 flex justify-between items-center bg-slate-900/95 backdrop-blur shrink-0">
                                <h3 className="font-bold text-white text-xs">Compare Districts</h3>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setIsComparisonFullScreen(!isComparisonFullScreen)}
                                        className={`p-1.5 rounded-lg transition-all border ${isComparisonFullScreen
                                            ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                                            }`}
                                        title={isComparisonFullScreen ? "Minimize" : "Maximize"}
                                    >
                                        {isComparisonFullScreen ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 14h6v6M20 10h-6V4" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M20 16v4m0 0h-4" />
                                            </svg>
                                        )}
                                    </button>
                                    <button onClick={() => setShowComparison(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded p-0.5 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <DistrictComparisonPanel districtMoods={districtMoods} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
}

export default DistrictMap;