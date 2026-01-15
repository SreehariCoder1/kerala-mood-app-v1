
import { checkMapCollision } from './CollisionHandler.js';

export const TICK_RATE = 90; // Reduced from 60 to save CPU
const ACCELERATION = 1.0;
const FRICTION = 0.90;
const MAX_SPEED = 8;
export const MAP_WIDTH = 2048;
export const MAP_HEIGHT = 2048;
const PLAYER_SIZE = 40;
const PROJ_SPEED = 12;
const PROJ_SIZE = 15;
const GAME_DURATION = 180; // 6 Minutes in seconds

export class GameState {
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

export const PROJ_SPEED_EXPORT = PROJ_SPEED; // Exported for SocketHandler if needed (it uses it to calculate velocity)
