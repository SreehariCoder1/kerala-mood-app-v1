import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { districts, moodColors } from '../data/districts';
import MoodSelector from './MoodSelector';
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
    const [districtMoods, setDistrictMoods] = useState({}); // { districtId: 'happy' }
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
            await axios.post(`${config.API_UR}/moods`, {
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
                        const currentMood = districtMoods[district.id] || 'default';
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
                                className={`${colorClass} p-3 md:p-6 rounded-2xl shadow-lg cursor-pointer backdrop-blur-md bg-opacity-90 border border-white/10 flex flex-col items-center justify-center text-center transition-all duration-500 hover:shadow-2xl h-40 relative overflow-hidden group`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <h3 className="text-white font-bold text-sm md:text-lg drop-shadow-md z-10 break-words w-full px-1">{district.name}</h3>
                                <span className="text-3xl mt-2 filter drop-shadow-lg z-10 transition-transform group-hover:scale-110">
                                    {moodEmoji}
                                </span>
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

        </div>
    );
}

export default DistrictMap;