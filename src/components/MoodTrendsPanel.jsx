import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

const moodColors = {
    happy: '#FACC15',   // yellow-400
    excited: '#EC4899', // pink-500
    neutral: '#9CA3AF', // gray-400
    sad: '#2563EB',     // blue-600
    angry: '#EF4444'    // red-500
};

const MoodTrendsPanel = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${config.API_URL}/moods/history`);
                setData(res.data);
            } catch (error) {
                console.error("Failed to fetch mood history", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading trends...</div>;

    if (!data || data.length === 0) return <div className="p-8 text-center text-slate-400">No trend data available.</div>;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-lg text-sm">
                    <p className="text-slate-300 font-bold mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-3 w-full text-white space-y-4">
            <div>
                <h3 className="text-[10px] font-bold mb-2 text-center text-slate-300 uppercase tracking-widest">Mood Trends (7 Days)</h3>
                <div className="h-36 w-full pr-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="displayDate" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} tickMargin={5} />
                            <YAxis stroke="#6B7280" fontSize={9} allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="happy" stroke={moodColors.happy} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="excited" stroke={moodColors.excited} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="neutral" stroke={moodColors.neutral} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="sad" stroke={moodColors.sad} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                            <Line type="monotone" dataKey="angry" stroke={moodColors.angry} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <h3 className="text-[10px] font-bold mb-2 text-center text-slate-300 uppercase tracking-widest">Votes per Day</h3>
                <div className="h-28 w-full pr-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="displayDate" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} tickMargin={5} />
                            <YAxis stroke="#6B7280" fontSize={9} allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '10px', padding: '4px' }}
                            />
                            <Bar dataKey="totalVotes" fill="#818cf8" radius={[2, 2, 0, 0]} name="Votes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default MoodTrendsPanel;
