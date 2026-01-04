import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';
import { districts as districtData } from '../data/districts';

const AnalyticsPanel = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Create a map for quick lookup
    const districtMap = districtData.reduce((acc, d) => {
        acc[d.id] = d.name;
        return acc;
    }, {});

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${config.API_URL}/moods/stats`);
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Helper to format district list with names
    const formatDistricts = (districtList) => {
        if (!districtList || districtList.length === 0) return '-';
        return districtList.map(id => districtMap[id] || id).join(', ');
    };

    if (loading || !stats) return (
        <div className="p-4 text-slate-400 text-center text-sm">Loading stats...</div>
    );

    const StatRow = ({ title, value, subtext, icon, color }) => (
        <div className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
            <div className="flex items-center space-x-3 shrink-0">
                <span className="text-xl">{icon}</span>
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</p>
                    {subtext && <p className="text-[10px] text-slate-500">{subtext}</p>}
                </div>
            </div>
            <div className="text-right max-w-[50%]">
                <p className="text-white font-bold text-sm leading-tight break-words">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="w-64">
            <StatRow
                title="Total Votes"
                value={stats.totalVotes}
                icon="🗳️"
                color="text-blue-400"
                subtext="Today's total"
            />
            <div className="my-2 border-t border-white/10 mx-2"></div>
            <StatRow
                title="Most Active"
                value={formatDistricts(stats.mostActive?.districts)}
                subtext={stats.mostActive ? `${stats.mostActive.count} votes` : ''}
                icon="⚡"
                color="text-purple-400"
            />
            <StatRow
                title="Happiest"
                value={formatDistricts(stats.happiest?.districts)}
                subtext={stats.happiest ? `${stats.happiest.count} votes` : ''}
                icon="😊"
                color="text-yellow-400"
            />
            <StatRow
                title="Excited"
                value={formatDistricts(stats.excited?.districts)}
                subtext={stats.excited ? `${stats.excited.count} votes` : ''}
                icon="🤩"
                color="text-pink-400"
            />
            <StatRow
                title="Neutral"
                value={formatDistricts(stats.neutral?.districts)}
                subtext={stats.neutral ? `${stats.neutral.count} votes` : ''}
                icon="😐"
                color="text-slate-400"
            />
            <StatRow
                title="Sad"
                value={formatDistricts(stats.sad?.districts)}
                subtext={stats.sad ? `${stats.sad.count} votes` : ''}
                icon="😢"
                color="text-blue-300"
            />
            <StatRow
                title="Angriest"
                value={formatDistricts(stats.angriest?.districts)}
                subtext={stats.angriest ? `${stats.angriest.count} votes` : ''}
                icon="😡"
                color="text-red-500"
            />
        </div>
    );
};

export default AnalyticsPanel;
