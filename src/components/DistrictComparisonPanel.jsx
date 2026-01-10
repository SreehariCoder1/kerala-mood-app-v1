import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { districts, moodColors } from '../data/districts';

const CustomDropdown = ({ options, value, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(o => o.id === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider font-bold block">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs md:text-sm rounded-md p-2 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-slate-600 transition-colors"
            >
                <span className="truncate">{selectedOption?.name || 'Select'}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-20 w-full bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-40 overflow-y-auto mt-1 no-scrollbar"
                    >
                        {options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => {
                                    onChange(option.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs md:text-sm transition-colors hover:bg-slate-700 ${option.id === value ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-200'
                                    }`}
                            >
                                {option.name}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DistrictComparisonPanel = ({ districtMoods }) => {
    const [district1, setDistrict1] = useState(districts[0]?.id);
    const [district2, setDistrict2] = useState(districts[1]?.id || districts[0]?.id);
    // ... rest of logic remains the same ...
    const getDistrictData = (id) => {
        return districtMoods[id] || { count: 0, mood: 'default', topMoods: ['default'], moods: {} };
    };

    const data1 = getDistrictData(district1);
    const data2 = getDistrictData(district2);

    // Convert moods array to object map for easier lookup
    const getMoodMap = (moodsArray) => {
        if (!Array.isArray(moodsArray)) return {};
        return moodsArray.reduce((acc, curr) => {
            acc[curr.mood] = curr.count;
            return acc;
        }, {});
    };

    const moodsMap1 = getMoodMap(data1.moods);
    const moodsMap2 = getMoodMap(data2.moods);

    const moodEmojiMap = {
        happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡', default: '📍'
    };

    const allMoods = ['happy', 'excited', 'neutral', 'sad', 'angry'];

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    const renderMoodBar = (mood, count1, total1, count2, total2) => {
        const percent1 = total1 > 0 ? (count1 / total1) * 100 : 0;
        const percent2 = total2 > 0 ? (count2 / total2) * 100 : 0;

        return (
            <div key={mood} className="mb-3">
                <div className="flex justify-between text-xs max-[425px]:text-[10px] mb-1 text-slate-400 capitalize">
                    <span>{moodEmojiMap[mood]} {mood}</span>
                </div>
                <div className="flex items-center space-x-2 h-4">
                    {/* District 1 Bar (Right Aligned) */}
                    <div className="flex-1 flex justify-end">
                        <div
                            className="h-full rounded-l-md transition-all duration-500"
                            style={{
                                width: `${percent1}%`,
                                backgroundColor: moodColors[mood].replace('bg-', '').replace('-500', '') === 'yellow' ? '#facc15' :
                                    moodColors[mood].replace('bg-', '').replace('-500', '') === 'blue' ? '#2563eb' :
                                        moodColors[mood].replace('bg-', '').replace('-500', '') === 'red' ? '#ef4444' :
                                            moodColors[mood].replace('bg-', '').replace('-500', '') === 'pink' ? '#ec4899' :
                                                '#9ca3af' // default/gray
                            }}
                        />
                        <span className={`text-[10px] ml-1 ${percent1 > 0 ? 'text-white' : 'text-slate-600'}`}>{formatNumber(count1)}</span>
                    </div>

                    {/* Divider */}
                    <div className="w-[1px] h-6 bg-slate-700"></div>

                    {/* District 2 Bar (Left Aligned) */}
                    <div className="flex-1 flex justify-start">
                        <span className={`text-[10px] mr-1 ${percent2 > 0 ? 'text-white' : 'text-slate-600'}`}>{formatNumber(count2)}</span>
                        <div
                            className="h-full rounded-r-md transition-all duration-500"
                            style={{
                                width: `${percent2}%`,
                                backgroundColor: moodColors[mood].replace('bg-', '').replace('-500', '') === 'yellow' ? '#facc15' :
                                    moodColors[mood].replace('bg-', '').replace('-500', '') === 'blue' ? '#2563eb' :
                                        moodColors[mood].replace('bg-', '').replace('-500', '') === 'red' ? '#ef4444' :
                                            moodColors[mood].replace('bg-', '').replace('-500', '') === 'pink' ? '#ec4899' :
                                                '#9ca3af'
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 max-[425px]:p-3 space-y-6 max-[425px]:space-y-3">
            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4">
                <CustomDropdown
                    label="District 1"
                    options={districts}
                    value={district1}
                    onChange={setDistrict1}
                />
                <CustomDropdown
                    label="District 2"
                    options={districts}
                    value={district2}
                    onChange={setDistrict2}
                />
            </div>

            {/* Overall Stats Comparison */}
            <div className="grid grid-cols-2 gap-4 max-[425px]:gap-2 bg-slate-800/50 p-4 max-[425px]:p-2 rounded-xl border border-white/5">
                <div className="text-center border-r border-white/10 pr-2">
                    <div className="text-3xl max-[425px]:text-2xl mb-1">{moodEmojiMap[data1.topMoods[0]]}</div>
                    <div className="text-xs max-[425px]:text-[10px] text-slate-400 uppercase">Top Mood</div>
                    <div className="text-xl max-[425px]:text-lg font-bold mt-2">{formatNumber(data1.count)}</div>
                    <div className="text-xs max-[425px]:text-[10px] text-slate-500">Total Votes</div>
                </div>
                <div className="text-center pl-2">
                    <div className="text-3xl max-[425px]:text-2xl mb-1">{moodEmojiMap[data2.topMoods[0]]}</div>
                    <div className="text-xs max-[425px]:text-[10px] text-slate-400 uppercase">Top Mood</div>
                    <div className="text-xl max-[425px]:text-lg font-bold mt-2">{formatNumber(data2.count)}</div>
                    <div className="text-xs max-[425px]:text-[10px] text-slate-500">Total Votes</div>
                </div>
            </div>

            {/* Detailed Mood Breakdown */}
            <div>
                <h4 className="text-sm font-bold text-slate-300 mb-4 text-center border-b border-white/10 pb-2">Mood Breakdown</h4>
                <div className="space-y-1">
                    {allMoods.map(mood => {
                        const count1 = moodsMap1[mood] || 0;
                        const count2 = moodsMap2[mood] || 0;
                        return renderMoodBar(mood, count1, data1.count, count2, data2.count);
                    })}
                </div>
            </div>
        </div>
    );
};

export default DistrictComparisonPanel;
