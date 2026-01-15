import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export const loadMapCollisions = () => {
    try {
        // Adjusted path: one level deeper in 'game' folder, so need one more '../'
        const mapPath = path.resolve(__dirname, '../../../public/game/maps/mood_game_map_v1.tmj');
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

export const checkMapCollision = (x, y, size) => {
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
