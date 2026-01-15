import React from 'react';

const GameHUD = ({ timeLeft, myKills, enemyKills }) => {
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10 w-full max-w-lg">
            <div className="text-3xl font-black mb-2 text-white drop-shadow-md tracking-wider">
                {formatTime(timeLeft)}
            </div>

            <div className="flex justify-between items-center px-8 text-white font-bold text-xl drop-shadow-md">
                <div className="text-blue-400">YOU: {myKills}</div>
                <div className="text-red-500">ENEMY: {enemyKills}</div>
            </div>

            <div className="text-xs text-gray-400 mt-2 opacity-70">
                Highest Kills Wins · 6 Min Deathmatch
            </div>
        </div>
    );
};

export default GameHUD;
