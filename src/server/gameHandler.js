const TICK_RATE = 30;
const PLAYER_SPEED = 5;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 40;
const PROJ_SPEED = 10;
const PROJ_SIZE = 15;

const queue = [];
const games = {}; // { gameId: { players, projectiles, lastTick } }

class GameState {
    constructor(player1, player2) {
        this.players = {
            [player1.id]: {
                id: player1.id,
                hp: 100,
                x: 100,
                y: 100,
                mood: player1.mood,
                inputs: {}
            },
            [player2.id]: {
                id: player2.id,
                hp: 100,
                x: 700,
                y: 500,
                mood: player2.mood,
                inputs: {}
            }
        };
        this.projectiles = [];
        this.lastUpdateTime = Date.now();
        this.ended = false;
    }

    update() {
        if (this.ended) return;

        const now = Date.now();
        // const dt = (now - this.lastUpdateTime) / 1000; // Delta time in seconds
        this.lastUpdateTime = now;

        // 1. Process Inputs & Move Players
        Object.values(this.players).forEach(p => {
            if (p.inputs.w) p.y = Math.max(25, p.y - PLAYER_SPEED);
            if (p.inputs.s) p.y = Math.min(MAP_HEIGHT - 25, p.y + PLAYER_SPEED);
            if (p.inputs.a) p.x = Math.max(25, p.x - PLAYER_SPEED);
            if (p.inputs.d) p.x = Math.min(MAP_WIDTH - 25, p.x + PLAYER_SPEED);
        });

        // 2. Move Projectiles
        this.projectiles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
        });

        // 3. Cleanup Projectiles (out of bounds)
        this.projectiles = this.projectiles.filter(p =>
            p.x > 0 && p.x < MAP_WIDTH && p.y > 0 && p.y < MAP_HEIGHT && !p.hit
        );

        // 4. Collision Detection
        this.projectiles.forEach(proj => {
            Object.values(this.players).forEach(player => {
                if (proj.owner !== player.id) {
                    const dx = proj.x - player.x;
                    const dy = proj.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < (PLAYER_SIZE / 2 + PROJ_SIZE / 2)) {
                        // HIT!
                        if (!proj.hit) {
                            player.hp -= 10;
                            proj.hit = true;
                        }
                    }
                }
            });
        });

        // 5. Check Win Condition
        const alivePlayers = Object.values(this.players).filter(p => p.hp > 0);
        if (alivePlayers.length < 2) {
            this.ended = true;
            return {
                gameOver: true,
                winner: alivePlayers.length === 1 ? alivePlayers[0].id : null
            };
        }

        return null;
    }
}

export const setupGameHandler = (io) => {

    // Server Tick Loop
    setInterval(() => {
        Object.keys(games).forEach(gameId => {
            const game = games[gameId];
            const result = game.update();

            if (result?.gameOver) {
                io.to(gameId).emit('game:over', { winner: result.winner });
                delete games[gameId];
            } else {
                // Broadcast State Snapshot
                io.to(gameId).emit('game:state', {
                    players: game.players,
                    projectiles: game.projectiles
                });
            }
        });
    }, 1000 / TICK_RATE);


    io.on('connection', (socket) => {

        socket.playerData = {}; // Initialize

        // --- Matchmaking ---
        socket.on('game:join_queue', (data) => {
            socket.playerData = { ...data, id: socket.id };

            if (queue.length > 0) {
                const opponent = queue.shift();
                const gameId = `game_${socket.id}_${opponent.id}`;

                socket.join(gameId);
                opponent.join(gameId);

                games[gameId] = new GameState(socket.playerData, opponent.playerData);

                // Notify start
                io.to(gameId).emit('game:start', {
                    gameId,
                    myId: socket.id, // Inform client of their ID explicitly if needed
                    gameState: games[gameId]
                });

                console.log(`Match started: ${gameId}`);
            } else {
                queue.push(socket);
                socket.emit('game:waiting');
            }
        });

        // --- Inputs ---
        socket.on('game:input', ({ gameId, inputs }) => {
            const game = games[gameId];
            if (game && game.players[socket.id]) {
                game.players[socket.id].inputs = inputs;
            }
        });

        socket.on('game:shoot', ({ gameId, targetX, targetY }) => {
            const game = games[gameId];
            if (game && game.players[socket.id]) {
                const p = game.players[socket.id];

                // Calculate normalized vector
                const dx = targetX - p.x;
                const dy = targetY - p.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len > 0) {
                    game.projectiles.push({
                        x: p.x,
                        y: p.y,
                        vx: (dx / len) * PROJ_SPEED,
                        vy: (dy / len) * PROJ_SPEED,
                        owner: socket.id
                    });
                }
            }
        });

        // --- Cleanup ---
        socket.on('disconnect', () => {
            // Remove from queue
            const qIdx = queue.indexOf(socket);
            if (qIdx !== -1) queue.splice(qIdx, 1);

            // End active games
            for (const [gid, g] of Object.entries(games)) {
                if (g.players[socket.id]) {
                    io.to(gid).emit('game:opponent_left');
                    delete games[gid];
                    break;
                }
            }
        });
    });
};
