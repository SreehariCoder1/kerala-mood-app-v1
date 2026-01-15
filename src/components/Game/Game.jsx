import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import GameLobby from './GameLobby';
import GameArena from './GameArena';
import config from '../../config';
import { toast } from 'react-hot-toast';

const Game = () => {
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState('LOBBY'); // LOBBY, SEARCHING, PLAYING, GAMEOVER
    const [gameData, setGameData] = useState(null); // { gameId, opponent, initialGameState }
    const [gameOverData, setGameOverData] = useState(null);

    // Connect to Socket
    useEffect(() => {
        // Ensure we are using the correct base URL without /api suffix if the socket expects root
        // But usually socket.io client handles it.
        // If config.API_URL is http://localhost:5001/api, socket should probably connect to http://localhost:5001

        let socketUrl = config.API_URL;
        // Strip /api if present for socket connection usually
        if (socketUrl.endsWith('/api')) {
            socketUrl = socketUrl.replace('/api', '');
        }

        console.log('Connecting to Game Server at:', socketUrl);

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to game server with ID:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection Error:', err);
            // toast.error(`Connection Error: ${err.message}`);
            setIsConnected(false);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected');
            setIsConnected(false);
        });

        newSocket.on('game:waiting', () => {
            setGameState('SEARCHING');
        });

        newSocket.on('game:start', (data) => {
            setGameData(data);
            setGameState('PLAYING');
            toast.success('Match Found! Battle Start!');
        });

        newSocket.on('game:opponent_left', () => {
            toast.error('Opponent Left!');
            setGameState('LOBBY');
            setGameData(null);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const handleFindMatch = () => {
        if (!socket) return;
        setGameState('SEARCHING');
        socket.emit('game:join_queue', {});
    };

    const handleGameOver = (data) => {
        setGameOverData(data);
        setGameState('GAMEOVER');
    };

    const handleBackToLobby = () => {
        setGameState('LOBBY');
        setGameData(null);
        setGameOverData(null);
    };

    return (
        <div className="min-h-screen bg-slate-900 overflow-hidden relative font-sans">
            {/* Background Particles or texture could go here */}

            {/* Back Button */}
            <button
                onClick={() => navigate('/map')}
                className="absolute top-4 left-4 z-[60] text-white/50 hover:text-white flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Map
            </button>

            {gameState === 'LOBBY' && (
                <GameLobby
                    onFindMatch={handleFindMatch}
                    connectionStatus={isConnected ? 'connected' : 'connecting...'}
                />
            )}

            {gameState === 'SEARCHING' && (
                <div className="flex flex-col items-center justify-center min-h-screen text-white">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mb-4"></div>
                    <h2 className="text-2xl font-bold animate-pulse">Searching for Opponent...</h2>
                    <p className="text-gray-400">Preparing battle arena...</p>
                </div>
            )}

            {gameState === 'PLAYING' && gameData && (
                <GameArena
                    socket={socket}
                    gameId={gameData.gameId}
                    initialGameState={gameData.gameState}
                    playerId={socket.id}
                    onGameOver={handleGameOver}
                />
            )}

            {gameState === 'GAMEOVER' && gameOverData && (
                <div className="flex flex-col items-center justify-center min-h-screen text-white bg-black/80 absolute inset-0 z-50">
                    <h1 className="text-6xl font-black mb-8">
                        {gameOverData.winner === 'tie'
                            ? 'IT\'S A TIE! 🤝'
                            : (gameOverData.winner === socket.id ? 'VICTORY 🏆' : 'DEFEAT 💀')
                        }
                    </h1>
                    <p className="mb-4 text-2xl font-bold">
                        Final Score: You {gameOverData.scores ? gameOverData.scores[socket.id] : 0} - {gameOverData.scores ? (Object.values(gameOverData.scores).find((s, i) => Object.keys(gameOverData.scores)[i] !== socket.id)) : 0} Enemy
                    </p>
                    <p className="mb-8 text-xl text-gray-300">
                        {gameOverData.winner === 'tie'
                            ? 'What a match! Evenly matched moods.'
                            : (gameOverData.winner === socket.id ? 'You dominated the arena!' : 'Better luck next time!')
                        }
                    </p>
                    <button
                        onClick={handleBackToLobby}
                        className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                    >
                        Play Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default Game;
