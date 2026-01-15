import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TICK_RATE = 90; // Reduced from 60 to save CPU
const ACCELERATION = 1.0;
const FRICTION = 0.90;
const MAX_SPEED = 8;
const MAP_WIDTH = 2048;
const MAP_HEIGHT = 2048;
const PLAYER_SIZE = 40;
const PROJ_SPEED = 12;
const PROJ_SIZE = 15;

// --- SPATIAL GRID FOR COLLISIONS ---
// --- SPATIAL GRID FOR COLLISIONS ---
const CELL_SIZE = 256;
const collisionGrid = {}; // key: "x,y", value: [rects]

const addToGrid = (rect) => {
    const startCol = Math.floor(rect.x / CELL_SIZE);
    const endCol = Math.floor((rect.x + rect.w) / CELL_SIZE);
    const startRow = Math.floor(rect.y / CELL_SIZE);
    const endRow = Math.floor((rect.y + rect.h) / CELL_SIZE);

    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            const key = `${c},${r}`;
            if (!collisionGrid[key]) collisionGrid[key] = [];
            collisionGrid[key].push(rect);
        }
    }
};

const loadMapCollisions = () => {
    try {
        const mapPath = path.resolve(__dirname, '../../public/game/maps/mood_game_map_v1.tmj');
        if (fs.existsSync(mapPath)) {
            console.log('Loading map collisions from:', mapPath);
            const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

            const tileWidth = mapData.tilewidth;
            const tileHeight = mapData.tileheight;

            // 1. Build a lookup for Tile Collisions: { gid: [ {x,y,w,h}, ... ] }
            const tileCollisionLookup = {};

            if (mapData.tilesets) {
                mapData.tilesets.forEach(tileset => {
                    const firstGid = tileset.firstgid;
                    if (tileset.tiles) {
                        tileset.tiles.forEach(tile => {
                            const globalId = firstGid + tile.id;
                            const collisions = [];

                            // Check for ObjectGroup (Tiled Collision Editor)
                            if (tile.objectgroup && tile.objectgroup.objects) {
                                tile.objectgroup.objects.forEach(obj => {
                                    collisions.push({
                                        x: obj.x,
                                        y: obj.y,
                                        w: obj.width,
                                        h: obj.height
                                    });
                                });
                            }
                            // Check for Custom Property "collides"
                            else if (tile.properties) {
                                const collidesProp = tile.properties.find(p => p.name === 'collides' && p.value === true);
                                if (collidesProp) {
                                    // Default to full tile
                                    collisions.push({
                                        x: 0,
                                        y: 0,
                                        w: tileset.tilewidth || tileWidth,
                                        h: tileset.tileheight || tileHeight
                                    });
                                }
                            }

                            if (collisions.length > 0) {
                                tileCollisionLookup[globalId] = collisions;
                            }
                        });
                    }
                });
            }

            // 2. Iterate Layers to place collisions in world
            let totalRects = 0;
            if (mapData.layers) {
                mapData.layers.forEach(layer => {
                    if (layer.type === 'tilelayer' && layer.data) {
                        layer.data.forEach((gidWithFlags, index) => {
                            const gid = gidWithFlags & ~(0xE0000000);
                            if (gid === 0) return;

                            if (tileCollisionLookup[gid]) {
                                const col = index % layer.width;
                                const row = Math.floor(index / layer.width);
                                const worldX = col * tileWidth;
                                const worldY = row * tileHeight;

                                tileCollisionLookup[gid].forEach(rect => {
                                    const worldRect = {
                                        x: worldX + rect.x,
                                        y: worldY + rect.y,
                                        w: rect.w,
                                        h: rect.h
                                    };
                                    addToGrid(worldRect);
                                    totalRects++;
                                });
                            }
                        });
                    }
                });
            }

            console.log(`Loaded ${totalRects} collision zones into spatial grid.`);

        } else {
            console.error('Map file not found for collision loading:', mapPath);
        }
    } catch (err) {
        console.error('Error loading map collisions:', err);
    }
};

// Initialize Collisions
loadMapCollisions();


const checkMapCollision = (x, y, size) => {
    // Player Rect
    const pLeft = x - size / 2;
    const pRight = x + size / 2;
    const pTop = y - size / 2;
    const pBottom = y + size / 2;

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    const key = `${col},${row}`;

    // Also check neighbors if we are on the edge, or just simple check:
    // Ideally we check grid cells that the Player Rect touches.
    // For simplicity with point/small-size checks, we can check 9 neighbors or just calculate touched cells.

    // Robust check: determine loop range for grid keys
    const startCol = Math.floor(pLeft / CELL_SIZE);
    const endCol = Math.floor(pRight / CELL_SIZE);
    const startRow = Math.floor(pTop / CELL_SIZE);
    const endRow = Math.floor(pBottom / CELL_SIZE);

    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            const cellKey = `${c},${r}`;
            const cellRects = collisionGrid[cellKey];
            if (cellRects) {
                for (const rect of cellRects) {
                    if (pRight > rect.x && pLeft < rect.x + rect.w &&
                        pBottom > rect.y && pTop < rect.y + rect.h) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
};


const queue = [];
const games = {};

const GAME_DURATION = 360; // 6 Minutes in seconds

class GameState {
    constructor(player1, player2) {
        this.players = {
            [player1.id]: {
                id: player1.id,
                hp: 100,
                x: 100,
                y: 1024,
                spawnX: 100,
                spawnY: 1024,
                vx: 0,
                vy: 0,
                mood: player1.mood,
                action: null,
                actionTimer: 0,
                inputs: {},
                facing: 1,
                kills: 0,
                deaths: 0
            },
            [player2.id]: {
                id: player2.id,
                hp: 100,
                x: 1948,
                y: 1024,
                spawnX: 1948,
                spawnY: 1024,
                vx: 0,
                vy: 0,
                mood: player2.mood,
                action: null,
                actionTimer: 0,
                inputs: {},
                facing: -1,
                kills: 0,
                deaths: 0
            }
        };
        this.projectiles = [];
        this.lastUpdateTime = Date.now();
        this.timeLeft = GAME_DURATION;
        this.ended = false;
    }

    update() {
        if (this.ended) return;

        const now = Date.now();
        this.lastUpdateTime = now;

        // Timer Logic (Decrement based on TICK_RATE calls ~ roughly 1/TICK_RATE seconds per call, 
        // but easier to just decrement by delta time or fixed step if loop is fixed)
        // Since the outer loop is setInterval(..., 1000/TICK_RATE), we decrement by 1/TICK_RATE
        this.timeLeft -= (1 / TICK_RATE);

        // 1. Process Inputs & Apply Physics
        Object.values(this.players).forEach(p => {
            if (p.inputs.w) p.vy -= ACCELERATION;
            if (p.inputs.s) p.vy += ACCELERATION;
            if (p.inputs.a) p.vx -= ACCELERATION;
            if (p.inputs.d) p.vx += ACCELERATION;

            if (p.actionTimer > 0) {
                p.actionTimer--;
                if (p.actionTimer <= 0) p.action = null;
            }

            p.vx *= FRICTION;
            p.vy *= FRICTION;

            const speed = Math.hypot(p.vx, p.vy);
            if (speed > MAX_SPEED) {
                const ratio = MAX_SPEED / speed;
                p.vx *= ratio;
                p.vy *= ratio;
            }

            if (Math.abs(p.vx) < 0.01) p.vx = 0;
            if (Math.abs(p.vy) < 0.01) p.vy = 0;

            let nextX = p.x + p.vx;
            let nextY = p.y + p.vy;

            // Boundary
            if (nextX < PLAYER_SIZE / 2) { nextX = PLAYER_SIZE / 2; p.vx *= -0.5; }
            if (nextX > MAP_WIDTH - PLAYER_SIZE / 2) { nextX = MAP_WIDTH - PLAYER_SIZE / 2; p.vx *= -0.5; }
            if (nextY < PLAYER_SIZE / 2) { nextY = PLAYER_SIZE / 2; p.vy *= -0.5; }
            if (nextY > MAP_HEIGHT - PLAYER_SIZE / 2) { nextY = MAP_HEIGHT - PLAYER_SIZE / 2; p.vy *= -0.5; }

            // Collisions
            if (checkMapCollision(nextX, p.y, PLAYER_SIZE)) {
                p.vx = 0;
                nextX = p.x;
            }
            if (checkMapCollision(nextX, nextY, PLAYER_SIZE)) {
                p.vy = 0;
                nextY = p.y;
            }

            p.x = nextX;
            p.y = nextY;

            // Update Facing
            if (p.vx > 0.1) p.facing = 1;
            else if (p.vx < -0.1) p.facing = -1;
        });

        // 2. Projectiles
        this.projectiles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
        });

        this.projectiles = this.projectiles.filter(p => {
            const travelled = Math.hypot(p.x - p.startX, p.y - p.startY);
            return p.x > 0 && p.x < MAP_WIDTH && p.y > 0 && p.y < MAP_HEIGHT && !p.hit && travelled < 1100;
        });

        // 3. Projectile Collisions
        this.projectiles.forEach(proj => {
            if (proj.hit) return;

            // Wall Hit
            if (checkMapCollision(proj.x, proj.y, 5)) {
                proj.hit = true;
                return;
            }

            // Player Hit
            Object.values(this.players).forEach(player => {
                if (proj.owner !== player.id) {
                    // Head Hitbox Logic
                    const speed = Math.hypot(player.vx || 0, player.vy || 0);
                    const hasInput = player.inputs && (player.inputs.w || player.inputs.s || player.inputs.a || player.inputs.d);
                    const isSliding = speed > 0.1 && !hasInput;

                    let offsetX = -2.5;
                    let offsetY = -14;

                    if (isSliding) {
                        if (player.facing === -1) {
                            // Sliding LEFT
                            offsetX = 16;
                            offsetY = 0;
                        } else {
                            // Sliding RIGHT
                            offsetX = -16;
                            offsetY = 0;
                        }
                    }

                    const headX = player.x + offsetX;
                    const headY = player.y + offsetY;
                    const headRadius = 15;

                    const dx = proj.x - headX;
                    const dy = proj.y - headY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < (headRadius + PROJ_SIZE / 2)) {
                        player.hp -= 10;
                        proj.hit = true;
                        player.vx += Math.sign(proj.vx) * 5;
                        player.vy += Math.sign(proj.vy) * 5;

                        // Check Death (Respawn Logic)
                        if (player.hp <= 0) {
                            // Find Killer
                            const killer = this.players[proj.owner];
                            if (killer) {
                                killer.kills++;
                            }
                            player.deaths++;

                            // Respawn Logic
                            let spawnPos = { x: player.spawnX, y: player.spawnY };

                            // 1. Identify Enemy Position
                            // We need to find the OTHER player.
                            const enemy = Object.values(this.players).find(p => p.id !== player.id);

                            if (enemy) {
                                let bestPos = null;
                                let maxDist = -1;

                                // Try 20 times to find a valid spot
                                for (let i = 0; i < 20; i++) {
                                    // Random pos within map (padded by 100px)
                                    const rx = Math.random() * (MAP_WIDTH - 200) + 100;
                                    const ry = Math.random() * (MAP_HEIGHT - 200) + 100;

                                    // Check Collision
                                    if (checkMapCollision(rx, ry, PLAYER_SIZE)) continue;

                                    // Check Distance
                                    const dist = Math.hypot(rx - enemy.x, ry - enemy.y);

                                    if (dist > 1500) {
                                        spawnPos = { x: rx, y: ry };
                                        break; // Perfect spot found
                                    }

                                    if (dist > maxDist) {
                                        maxDist = dist;
                                        bestPos = { x: rx, y: ry };
                                    }
                                }

                                // Fallback to best found if strict constraint failed
                                if (bestPos && maxDist > -1 && spawnPos.x === player.spawnX) {
                                    spawnPos = bestPos;
                                }
                            }

                            // Apply Spawn
                            player.hp = 100;
                            player.x = spawnPos.x;
                            player.y = spawnPos.y;
                            player.vx = 0;
                            player.vy = 0;
                        }
                    }
                }
            });
        });

        // 4. Time Check / Game Over
        if (this.timeLeft <= 0) {
            this.ended = true;

            const pIds = Object.keys(this.players);
            const p1 = this.players[pIds[0]];
            const p2 = this.players[pIds[1]];

            let winner = null;
            if (p1.kills > p2.kills) winner = p1.id;
            else if (p2.kills > p1.kills) winner = p2.id;
            else winner = 'tie'; // Tie

            return {
                gameOver: true,
                winner: winner,
                scores: {
                    [p1.id]: p1.kills,
                    [p2.id]: p2.kills
                }
            };
        }

        return null;
    }
}

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

                console.log(`Match started: ${gameId}`);
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
                // If facing Right (1), reject Left shots (dx < 0)
                // If facing Left (-1), reject Right shots (dx > 0)
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
