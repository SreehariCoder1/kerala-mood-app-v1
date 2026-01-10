import React, { useEffect, useRef } from 'react';

const GameArena = ({ socket, gameId, initialGameState, playerId, onGameOver }) => {
    const canvasRef = useRef(null);
    const gameStateRef = useRef(initialGameState); // Stores latest server state
    const keysRef = useRef({});
    const animationFrameRef = useRef();

    // Draw Helper
    const drawEmoji = (ctx, emoji, x, y, size) => {
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y);
    };

    useEffect(() => {
        // --- Input Listeners ---
        const handleKeyDown = (e) => (keysRef.current[e.key.toLowerCase()] = true);
        const handleKeyUp = (e) => (keysRef.current[e.key.toLowerCase()] = false);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // --- Socket Listeners ---
        socket.on('game:state', (newState) => {
            // Simple state overwrite (interpolation could be added here for smoother 60fps on 30hz server)
            gameStateRef.current = newState;
        });

        socket.on('game:over', (data) => {
            onGameOver(data);
        });

        // --- Input Loop (Send inputs to server) ---
        const inputInterval = setInterval(() => {
            const inputs = {
                w: keysRef.current['w'] || keysRef.current['arrowup'],
                s: keysRef.current['s'] || keysRef.current['arrowdown'],
                a: keysRef.current['a'] || keysRef.current['arrowleft'],
                d: keysRef.current['d'] || keysRef.current['arrowright']
            };
            // Optimization: Only emit if something pressed (or keep sending for authoritative flow)
            socket.emit('game:input', { gameId, inputs });
        }, 1000 / 30); // Send inputs at 30Hz

        // --- Click to Shoot ---
        const handleMouseDown = (e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            socket.emit('game:shoot', { gameId, targetX: x, targetY: y });
        };
        window.addEventListener('mousedown', handleMouseDown);


        // --- Render Loop (Interpolation ideally, but raw state for now) ---
        const loop = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i < width; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
            for (let i = 0; i < height; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }

            const state = gameStateRef.current;
            if (!state) return;

            // Draw Players
            Object.keys(state.players).forEach(pid => {
                const p = state.players[pid];

                // HP Bar
                ctx.fillStyle = 'red';
                ctx.fillRect(p.x - 25, p.y - 40, 50, 5);
                ctx.fillStyle = 'green';
                ctx.fillRect(p.x - 25, p.y - 40, 50 * (Math.max(0, p.hp) / 100), 5);

                // Avatar
                const emoji = p.mood?.emoji || '😐';
                drawEmoji(ctx, emoji, p.x, p.y, 40);

                // Name
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText(pid === playerId ? 'YOU' : 'ENEMY', p.x, p.y + 35);
            });

            // Draw Projectiles
            state.projectiles.forEach(proj => {
                drawEmoji(ctx, '🔥', proj.x, proj.y, 20);
            });

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            cancelAnimationFrame(animationFrameRef.current);
            clearInterval(inputInterval);
            socket.off('game:state');
            socket.off('game:over');
        };
    }, [socket, gameId, playerId, onGameOver]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black/90 text-white">
            <div className="mb-4 flex justify-between w-full max-w-[800px]">
                <div>WASD to Move</div>
                <div>CLICK to Shoot</div>
            </div>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border-4 border-white/20 rounded-lg bg-gray-800 shadow-2xl cursor-crosshair"
            />
        </div>
    );
};

export default GameArena;
