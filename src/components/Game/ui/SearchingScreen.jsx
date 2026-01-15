import React from 'react';

const SearchingScreen = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mb-4"></div>
            <h2 className="text-2xl font-bold animate-pulse">Searching for Opponent...</h2>
            <p className="text-gray-400">Preparing battle arena...</p>
        </div>
    );
};

export default SearchingScreen;
