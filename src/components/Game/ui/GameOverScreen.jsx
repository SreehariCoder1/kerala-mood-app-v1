import React from 'react';

const GameOverScreen = ({ winner, scores, socketId, onPlayAgain }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white bg-black/80 absolute inset-0 z-50">
            <h1 className="text-6xl font-black mb-8">
                {winner === 'tie'
                    ? 'IT\'S A TIE! 🤝'
                    : (winner === socketId ? 'VICTORY 🏆' : 'DEFEAT 💀')
                }
            </h1>
            <p className="mb-4 text-2xl font-bold">
                Final Score: You {scores ? scores[socketId] : 0} - {scores ? (Object.values(scores).find((s, i) => Object.keys(scores)[i] !== socketId)) : 0} Enemy
            </p>
            <p className="mb-8 text-xl text-gray-300">
                {winner === 'tie'
                    ? 'What a match! Evenly matched moods.'
                    : (winner === socketId ? 'You dominated the arena!' : 'Better luck next time!')
                }
            </p>
            <button
                onClick={onPlayAgain}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
            >
                Play Again
            </button>
        </div>
    );
};

export default GameOverScreen;
