import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import GameHUD from './ui/GameHUD';

const GameArena = ({ socket, gameId, initialGameState, playerId, onGameOver }) => {
    const gameContainerRef = useRef(null);
    const gameInstanceRef = useRef(null);

    const [gameStats, setGameStats] = useState({ timeLeft: 20, myKills: 0, enemyKills: 0 });

    useEffect(() => {
        if (!gameContainerRef.current) return;

        const onGameState = (state) => {
            if (state) {
                const myId = socket.id;
                // scores map: { [socketId]: kills }
                // We need to identify which is 'my' score and which is 'enemy'
                let myKills = 0;
                let enemyKills = 0;

                if (state.players && state.players[myId]) {
                    myKills = state.players[myId].kills || 0;
                }

                // Find enemy
                Object.values(state.players || {}).forEach(p => {
                    if (p.id !== myId) {
                        enemyKills = p.kills || 0;
                    }
                });

                setGameStats({
                    timeLeft: state.timeLeft || 0,
                    myKills,
                    enemyKills
                });
            }
        };

        socket.on('game:state', onGameState);

        const config = {
            type: Phaser.AUTO,
            parent: gameContainerRef.current,
            // Full Screen Config
            width: window.innerWidth,
            height: window.innerHeight,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            backgroundColor: '#000000',
            scene: [MainScene],
            physics: {
                default: 'arcade',
                arcade: { debug: false }
            },
            pixelArt: false,
            antialias: true,
            render: { roundPixels: true }
        };

        const game = new Phaser.Game(config);
        gameInstanceRef.current = game;

        game.scene.start('MainScene', {
            socket,
            gameId,
            playerId,
            initialGameState,
            onGameOver
        });

        return () => {
            socket.off('game:state', onGameState);
            socket.off('game:over');
            socket.off('game:shoot_effect');
            game.destroy(true);
        };
    }, []);

    return (
        <div className="fixed inset-0 w-full h-full bg-black">
            <GameHUD
                timeLeft={gameStats.timeLeft}
                myKills={gameStats.myKills}
                enemyKills={gameStats.enemyKills}
            />
            <div ref={gameContainerRef} className="w-full h-full overflow-hidden" />
        </div>
    );
};

export default GameArena;

