
import { GameState, TICK_RATE, PROJ_SPEED_EXPORT as PROJ_SPEED } from './GameState.js';
import { loadMapCollisions } from './CollisionHandler.js';

const queue = [];
const games = {};

// Initialize Collisions
loadMapCollisions();

export const setupGameHandler = (io) => {
    setInterval(() => {
        Object.keys(games).forEach(gameId => {
            const game = games[gameId];
            const result = game.update();

            if (result?.gameOver) {
                io.to(gameId).emit('game:over', {
                    winner: result.winner,
                    scores: result.scores
                });
                delete games[gameId];
            } else {
                io.to(gameId).emit('game:state', {
                    players: game.players,
                    projectiles: game.projectiles,
                    timeLeft: game.timeLeft,
                    scores: {
                        [Object.keys(game.players)[0]]: game.players[Object.keys(game.players)[0]].kills,
                        [Object.keys(game.players)[1]]: game.players[Object.keys(game.players)[1]].kills
                    }
                });
            }
        });
    }, 1000 / TICK_RATE);


    io.on('connection', (socket) => {
        socket.playerData = {};

        socket.on('game:join_queue', (data) => {
            socket.playerData = { ...data, id: socket.id };

            if (queue.length > 0) {
                const opponent = queue.shift();
                const gameId = `game_${socket.id}_${opponent.id}`;

                socket.join(gameId);
                opponent.join(gameId);

                games[gameId] = new GameState(socket.playerData, opponent.playerData);

                io.to(gameId).emit('game:start', {
                    gameId,
                    myId: socket.id,
                    gameState: games[gameId]
                });

                console.log(`Match started`);
            } else {
                queue.push(socket);
                socket.emit('game:waiting');
            }
        });

        socket.on('game:input', ({ gameId, inputs }) => {
            const game = games[gameId];
            if (game && game.players[socket.id]) {
                game.players[socket.id].inputs = inputs;
            }
        });

        socket.on('game:shoot', ({ gameId, targetX, targetY, soundType }) => {
            const game = games[gameId];
            if (game && game.players[socket.id]) {
                const p = game.players[socket.id];
                p.action = 'shoot';
                p.actionTimer = 20;

                const dx = targetX - p.x;
                const dy = targetY - p.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                // Enforce Facing Direction
                if ((p.facing === 1 && dx < 0) || (p.facing === -1 && dx > 0)) {
                    return;
                }

                if (len > 0) {
                    // CHANGE BULLET STARTING POSITION HERE
                    let spawnX = p.x;
                    let spawnY = p.y;

                    if (p.facing === 1) {
                        // RIGHT FACING OFFSET
                        spawnX += 20;
                        spawnY += 0;
                    } else {
                        // LEFT FACING OFFSET
                        spawnX -= 20;
                        spawnY += 0;
                    }

                    game.projectiles.push({
                        x: spawnX,
                        y: spawnY,
                        startX: spawnX,
                        startY: spawnY,
                        vx: (dx / len) * PROJ_SPEED,
                        vy: (dy / len) * PROJ_SPEED,
                        owner: socket.id
                    });

                    // Broadcast shoot effect if soundType is provided
                    if (soundType) {
                        io.to(gameId).emit('game:shoot_effect', {
                            playerId: socket.id,
                            type: soundType
                        });
                    }
                }
            }
        });

        socket.on('disconnect', () => {
            const qIdx = queue.indexOf(socket);
            if (qIdx !== -1) queue.splice(qIdx, 1);

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
