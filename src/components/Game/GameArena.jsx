import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    init(data) {
        this.socket = data.socket;
        this.gameId = data.gameId;
        this.playerId = data.playerId;
        this.initialState = data.initialGameState;
        this.onGameOver = data.onGameOver;
        this.playerContainers = {};
        this.projectileGraphics = null;
        this.serverState = null;
    }

    preload() {
        // Player Assets
        this.load.image('player', '/game/player.png');
        const sheetConfig = { frameWidth: 567, frameHeight: 556 };
        this.load.spritesheet('run', '/game/run.png', sheetConfig);
        this.load.spritesheet('idle', '/game/idle.png', sheetConfig);
        this.load.spritesheet('slide', '/game/slide.png', sheetConfig);
        this.load.spritesheet('shoot', '/game/shoot.png', sheetConfig);
        this.load.spritesheet('run_shoot', '/game/run&shoot.png', sheetConfig);

        // Map Assets - UPDATED for mood_game_map_v1.tmj
        this.load.tilemapTiledJSON('map', '/game/maps/mood_game_map_v1.tmj');

        const mapPath = '/game/maps/';
        // Load all potential tilesets
        this.load.image('tile_2', mapPath + 'tile_2.png');
        this.load.image('Block_A_01', mapPath + 'Block_A_01.png');
        this.load.image('Block_A_02', mapPath + 'Block_A_02.png');
        this.load.image('Block_B_02', mapPath + 'Block_B_02.png');
        this.load.image('Block_C_01', mapPath + 'Block_C_01.png');
        this.load.image('Hedge_A_01', mapPath + 'Hedge_A_01.png');
        this.load.image('Hedge_A_02', mapPath + 'Hedge_A_02.png');
        this.load.image('Flag_A', mapPath + 'Flag_A.png');
        this.load.image('Flag_B', mapPath + 'Flag_B.png');
        this.load.image('Tree_03', mapPath + 'Tree_03.png');
        this.load.image('Tree_01', mapPath + 'Tree_01.png');
        this.load.image('Tree_07', mapPath + 'Tree_07.png');
        this.load.image('Log', mapPath + 'Log.png');
        this.load.image('Markup_01', mapPath + 'Markup_01.png');

        // Sounds
        this.load.audio('single_shot', '/game/sounds/single_shot.mp3');
        this.load.audio('burst', '/game/sounds/burst.mp3');
    }

    create() {
        /* ---------------- MAP INTEGRATION ---------------- */
        const map = this.make.tilemap({ key: 'map' });

        // Add Tilesets matching "name" in game_map_v1.tmj
        const tilesets = [
            map.addTilesetImage('mood_game', 'tile_2'),
            map.addTilesetImage('block', 'Block_A_01'),
            map.addTilesetImage('small_block', 'Block_A_02'),
            map.addTilesetImage('small_grass_block', 'Block_B_02'),
            map.addTilesetImage('wood_block', 'Block_C_01'),
            map.addTilesetImage('hedge', 'Hedge_A_01'),
            map.addTilesetImage('hedge_2', 'Hedge_A_02'),
            map.addTilesetImage('map', 'Flag_A'),
            map.addTilesetImage('map_2', 'Flag_B'),
            map.addTilesetImage('tree', 'Tree_03'),
            map.addTilesetImage('tree_1', 'Tree_01'),
            map.addTilesetImage('tree_3', 'Tree_07'),
            map.addTilesetImage('markup', 'Markup_01'),
            map.addTilesetImage('log', 'Log')
        ];

        // Create Visual Tile Layers
        // Note: "collisions" layer is intentionally SKIPPED for rendering
        const botLayer = map.createLayer('Tile Layer 1', tilesets, 0, 0);
        const midLayer1 = map.createLayer('Tile Layer 2', tilesets, 0, 0);

        // createLayer returns null if layer name not found, so check map data if needed.
        // We know Tile Layer 1 and 2 exist from JSON inspection.

        // CREATE OBJECT LAYER (Visual Props)
        const objectLayer = map.getObjectLayer('Object Layer 1');
        if (objectLayer && objectLayer.objects) {
            objectLayer.objects.forEach(obj => {
                let key = '';

                // GID MAPPING (based on game_map_v1.tmj order)
                // Tree_03: gid 10
                // Tree_01: gid 11
                // Tree_07: gid 12
                // Markup_01: gid 13
                // Log: gid 14
                // Flag_A: gid 8
                // Flag_B: gid 9
                // Hedge_A_01: gid 6
                // Hedge_A_02: gid 7

                // Note: Tiled GIDs are global. We can check the tileset GID logic or just map known IDs.
                // In game_map_v1:
                // tile_2: 1
                // Block_A_01: 2
                // ...
                // Tree_03: 10
                // Tree_01: 11
                // Tree_07: 12
                // Markup: 13
                // Log: 14

                if (obj.gid === 10) key = 'Tree_03';
                else if (obj.gid === 11) key = 'Tree_01';
                else if (obj.gid === 12) key = 'Tree_07';
                else if (obj.gid === 13) key = 'Markup_01';
                else if (obj.gid === 14) key = 'Log';
                else if (obj.gid === 8) key = 'Flag_A';
                else if (obj.gid === 9) key = 'Flag_B';

                if (key) {
                    const sprite = this.add.image(obj.x, obj.y, key);
                    sprite.setOrigin(0, 1); // Tiled uses bottom-left
                    sprite.setDisplaySize(obj.width, obj.height);

                    // Depth Sort: Base on Bottom Y
                    sprite.setDepth(obj.y);
                }
            });
        }

        // Set World Bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        /* ---------------- CAMERA & RENDER QUALITY ---------------- */
        this.cameras.main.roundPixels = true;

        ['run', 'idle', 'slide', 'shoot', 'run_shoot', 'player'].forEach(key => {
            if (this.textures.exists(key)) {
                this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
            }
        });

        /* ---------------- ANIMATIONS ---------------- */
        const anims = [
            { key: 'run', rate: 20, repeat: -1 },
            { key: 'idle', rate: 20, repeat: -1 },
            { key: 'slide', rate: 20, repeat: 0 },
            { key: 'shoot', rate: 20, repeat: 0 },
            { key: 'run_shoot', rate: 20, repeat: -1 },
        ];

        anims.forEach(config => {
            if (!this.anims.exists(config.key)) {
                this.anims.create({
                    key: config.key,
                    frames: this.anims.generateFrameNumbers(config.key),
                    frameRate: config.rate,
                    repeat: config.repeat
                });
            }
        });

        /* ---------------- INPUT ---------------- */
        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT
        });

        /* ---------------- SOCKET ---------------- */
        this.socket.on('game:state', (state) => {
            this.serverState = state;
        });

        this.socket.on('game:over', (data) => {
            if (this.onGameOver) this.onGameOver(data);
        });

        /* ---------------- INPUT LOOP ---------------- */
        this.time.addEvent({
            delay: 1000 / 30,
            loop: true,
            callback: () => {
                const inputs = {
                    w: this.keys.w.isDown || this.keys.up.isDown,
                    s: this.keys.s.isDown || this.keys.down.isDown,
                    a: this.keys.a.isDown || this.keys.left.isDown,
                    d: this.keys.d.isDown || this.keys.right.isDown
                };

                this.socket.emit('game:input', {
                    gameId: this.gameId,
                    inputs
                });
            }
        });

        /* ---------------- SHOOT ---------------- */
        /* ---------------- SHOOT ---------------- */
        this.burstInterval = null;
        this.secondShotTimer = null;

        const performShoot = (pointer) => {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.socket.emit('game:shoot', {
                gameId: this.gameId,
                targetX: worldPoint.x,
                targetY: worldPoint.y
            });
        };

        const startBurst = (pointer) => {
            // Bullet 1
            performShoot(pointer);
            // this.sound.play('single_shot');

            // Bullet 2 (after 150ms)
            this.secondShotTimer = setTimeout(() => {
                performShoot(pointer);
                // this.sound.play('burst');
            }, 150);
        };

        this.input.on('pointerdown', (pointer) => {
            // Immediate Burst Start
            startBurst(pointer);
            this.sound.play('single_shot');

            // Cycle: Start a new burst every 650ms (150ms burst + 500ms pause)
            this.burstInterval = setInterval(() => {
                startBurst(pointer);
                this.sound.play('burst');
            }, 650);
        });

        // Cancel burst if released early
        const cancelBurst = () => {
            if (this.burstInterval) {
                clearInterval(this.burstInterval);
                this.burstInterval = null;
            }
            if (this.secondShotTimer) {
                clearTimeout(this.secondShotTimer);
                this.secondShotTimer = null;
            }
        };

        this.input.on('pointerup', cancelBurst);
        this.input.on('pointerout', cancelBurst);

        this.projectileGraphics = this.add.graphics();
    }

    update(time, delta) {
        if (!this.serverState) return;

        /* ---------------- PROJECTILES ---------------- */
        this.projectileGraphics.clear();
        this.serverState.projectiles.forEach(p => {
            this.projectileGraphics.fillStyle(0xffaa00, 1);
            this.projectileGraphics.fillCircle(p.x, p.y, 6);
            this.projectileGraphics.lineStyle(2, 0xffffff, 0.5);
            this.projectileGraphics.strokeCircle(p.x, p.y, 6);
        });

        /* ---------------- PLAYERS ---------------- */
        const activeIds = Object.keys(this.serverState.players);

        Object.keys(this.playerContainers).forEach(id => {
            if (!activeIds.includes(id)) {
                this.playerContainers[id].container.destroy();
                delete this.playerContainers[id];
            }
        });

        activeIds.forEach(id => {
            const p = this.serverState.players[id];
            let pObj = this.playerContainers[id];

            if (!pObj) {
                const container = this.add.container(p.x, p.y);

                const sprite = this.add.sprite(0, 0, 'idle');
                sprite.setOrigin(0.5);
                sprite.setScale(0.12);

                // Hitbox Visualization (Head Only)
                // Center roughly at head height (y: -20 to -30 depending on sprite scale)
                const hitbox = this.add.circle(-2.5, -14, 15, 0xff0000, 0.4);

                const name = this.add.text(
                    0,
                    45,
                    id === this.playerId ? 'YOU' : 'ENEMY',
                    { fontSize: '12px', color: '#ffffff' }
                ).setOrigin(0.5);

                const hpBg = this.add.rectangle(0, -55, 40, 6, 0xff0000);
                const hpFg = this.add.rectangle(0, -55, 40, 6, 0x00ff00);
                hpFg.setOrigin(0.5);

                // Render Order: Sprite -> Hitbox (on top) -> Name -> UI
                container.add([sprite, hitbox, name, hpBg, hpFg]);

                pObj = {
                    container,
                    sprite,
                    hpFg,
                    lastX: p.x,
                    lastY: p.y,
                    animState: 'idle',
                    lastHp: p.hp
                };

                container.setDepth(p.y);

                this.playerContainers[id] = pObj;
            }

            /* ---------------- SMOOTH MOVEMENT ---------------- */
            const lerp = Math.min(1, delta / 80);
            pObj.container.x = Phaser.Math.Linear(pObj.container.x, p.x, lerp);
            pObj.container.y = Phaser.Math.Linear(pObj.container.y, p.y, lerp);

            pObj.container.setDepth(pObj.container.y);

            /* ---------------- HP ---------------- */
            if (p.hp < pObj.lastHp) {
                pObj.sprite.setTint(0xff0000);
                this.time.delayedCall(100, () => {
                    if (pObj.sprite && pObj.sprite.scene) pObj.sprite.clearTint();
                });
            }
            pObj.lastHp = p.hp;

            pObj.hpFg.width = 40 * (Math.max(0, p.hp) / 100);

            /* ---------------- FACING ---------------- */
            if (p.x !== pObj.lastX) {
                const dx = p.x - pObj.lastX;
                if (dx < -0.1) pObj.sprite.setFlipX(true);
                if (dx > 0.1) pObj.sprite.setFlipX(false);
            }

            /* ---------------- STATE MACHINE ---------------- */
            const speed = Math.hypot(p.vx || 0, p.vy || 0);
            const hasInput = p.inputs && (p.inputs.w || p.inputs.s || p.inputs.a || p.inputs.d);
            let newState = 'idle';

            if (p.action === 'shoot') {
                if (speed > 0.1 && hasInput) {
                    newState = 'run_shoot';
                } else {
                    newState = 'shoot';
                }
            } else if (speed > 0.1) {
                if (hasInput) {
                    newState = 'run';
                } else {
                    newState = 'slide';
                }
            } else {
                newState = 'idle';
            }

            if (pObj.animState !== newState) {
                if (this.textures.exists(newState)) {
                    pObj.sprite.play(newState, false);
                } else {
                    pObj.sprite.play('idle', true);
                }
                pObj.animState = newState;
            }

            // Hitbox Adjustment for Sliding
            if (newState === 'slide') {
                if (pObj.sprite.flipX) {
                    // Sliding LEFT
                    pObj.container.list[1].setPosition(16, 0);
                } else {
                    // Sliding RIGHT
                    pObj.container.list[1].setPosition(-16, 0);
                }
            } else {
                pObj.container.list[1].setPosition(-2.5, -14); // Standard head position
            }

            if (newState === 'run' || newState === 'run_shoot') {
                pObj.container.y += Math.sin(time * 0.02) * 0.3;
            }

            pObj.lastX = p.x;
            pObj.lastY = p.y;
        });

        // Camera Follow
        if (this.playerContainers[this.playerId]) {
            this.cameras.main.startFollow(this.playerContainers[this.playerId].container, true, 0.1, 0.1);
        }
    }
}

const GameArena = ({ socket, gameId, initialGameState, playerId, onGameOver }) => {
    const gameContainerRef = useRef(null);
    const gameInstanceRef = useRef(null);

    useEffect(() => {
        if (!gameContainerRef.current) return;

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
            socket.off('game:state');
            socket.off('game:over');
            game.destroy(true);
        };
    }, []);

    return (
        <div className="fixed inset-0 w-full h-full bg-black">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
                <div className="text-xl font-bold mb-2 text-white drop-shadow-md">Game On!</div>
                <div className="text-sm text-gray-300 drop-shadow-md">
                    WASD / Arrows to Move · Click to Shoot
                </div>
            </div>
            <div ref={gameContainerRef} className="w-full h-full overflow-hidden" />
        </div>
    );
};

export default GameArena;
