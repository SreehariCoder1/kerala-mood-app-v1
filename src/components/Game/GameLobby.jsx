import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Mood selection removed


const GameLobby = ({ onFindMatch, connectionStatus }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-white min-h-[500px]">
            <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent"
            >
                Mood Duel Arena
            </motion.h1>

            <div className="text-center">
                <p className="mb-6 text-gray-300">
                    {connectionStatus === 'connected'
                        ? 'Server Online ready for battle!'
                        : `Status: ${connectionStatus}`}
                </p>

                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFindMatch()}
                    disabled={connectionStatus !== 'connected'}
                    className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    FIND MATCH
                </motion.button>
            </div>
        </div >
    );
};

export default GameLobby;
