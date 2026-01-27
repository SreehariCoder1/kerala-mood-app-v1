import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import GameLobby from './GameLobby';
import GameArena from './GameArena';
import SearchingScreen from './ui/SearchingScreen';
import GameOverScreen from './ui/GameOverScreen';
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

        let socketUrl = config.API_URL;
        // Strip /api if present for socket connection usually
        if (socketUrl.endsWith('/api')) {
            socketUrl = socketUrl.replace('/api', '');
        }

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection Error:', err);
            toast.error(`Connection Error: ${err.message}`);
            setIsConnected(false);
        });

        newSocket.on('disconnect', () => {
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
                <SearchingScreen />
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
                <GameOverScreen
                    winner={gameOverData.winner}
                    scores={gameOverData.scores}
                    socketId={socket.id}
                    onPlayAgain={handleBackToLobby}
                />
            )}
        </div>
    );
};

export default Game;
