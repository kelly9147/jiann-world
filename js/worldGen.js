import { WORLD_SIZE, TILE_INDEX, HOUSE_WIDTH, HOUSE_HEIGHT } from './constants.js';
import { hash2d, fbm, valueNoise } from './utils.js';
import { state, tileAt, setTile, isLand, isWater, isPortTile, isHouseTile, isWalkable } from './gameState.js';

function isBuildableBaseGen(x, y) {
    // Using imported helpers. `isBuildableBase` from gameState checks tileAt.
    // Actually, wait, `isBuildableBase` was defined in renderer.js using `tileAt`.
    // I should define it here or reuse logic.
    // The logic: `const base = tileAt(x, y); return isLand(base) && base !== "mountain" && base !== "road" && !isPortTile(base);`
    // I can just reuse `isBuildableBase` from gameState? No, I defined `isBuildableBase` in existing `renderer.js` not in `gameState` output above?
    // Let me check my gameState.js output thought process...
    // I did NOT put `isBuildableBase` in `gameState.js` output in thought. I only put `isWater`, `isLand`, `isPortTile`, `isHouseTile`, `isWalkable`, `isWalkableOnFoot`.
    // So I must define `isBuildableBase` here.
    const base = tileAt(x, y);
    return isLand(base) && base !== "mountain" && base !== "road" && !isPortTile(base);
}

function canPlaceHouse(startX, startY) {
    if (startX < 0 || startY < 0 || startX + HOUSE_WIDTH > WORLD_SIZE || startY + HOUSE_HEIGHT > WORLD_SIZE) return false;
    for (let dy = 0; dy < HOUSE_HEIGHT; dy++) {
        for (let dx = 0; dx < HOUSE_WIDTH; dx++) {
            if (!isBuildableBaseGen(startX + dx, startY + dy)) return false;
        }
    }
    return true;
}

function placeHouse(startX, startY, doorSide, town) {
    for (let dy = 0; dy < HOUSE_HEIGHT; dy++) {
        for (let dx = 0; dx < HOUSE_WIDTH; dx++) {
            const isWall = dx === 0 || dy === 0 || dx === HOUSE_WIDTH - 1 || dy === HOUSE_HEIGHT - 1;
            setTile(startX + dx, startY + dy, isWall ? "houseWall" : "houseFloor");
        }
    }

    let doorX = startX + Math.floor(HOUSE_WIDTH / 2);
    let doorY = startY + HOUSE_HEIGHT - 1;
    if (doorSide === "north") doorY = startY;
    else if (doorSide === "west") { doorX = startX; doorY = startY + Math.floor(HOUSE_HEIGHT / 2); }
    else if (doorSide === "east") { doorX = startX + HOUSE_WIDTH - 1; doorY = startY + Math.floor(HOUSE_HEIGHT / 2); }
    setTile(doorX, doorY, "houseDoor");

    const interior = [];
    for (let dy = 1; dy < HOUSE_HEIGHT - 1; dy++) {
        for (let dx = 1; dx < HOUSE_WIDTH - 1; dx++) interior.push({ x: startX + dx, y: startY + dy });
    }

    const placeItem = (type, seedOffset) => {
        const pick = Math.floor(hash2d(town.x + seedOffset, town.y + seedOffset, 9100 + state.worldSeed) * interior.length);
        const spot = interior[pick];
        if (spot) setTile(spot.x, spot.y, type);
    };
    placeItem("bed", 11);
    placeItem("kitchen", 23);
    placeItem("furniture", 37);
}

function markRoad(x, y) {
    state.roads.set(`${x},${y}`, true);
}

function paintRoadBrush(x, y, size = 0) {
    for (let dy = -size; dy <= size; dy += 1) {
        for (let dx = -size; dx <= size; dx += 1) {
            markRoad(x + dx, y + dy);
        }
    }
}

function findRoadNear(town) {
    for (let r = 2; r <= 16; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = town.x + dx, y = town.y + dy;
                if (state.roads.has(`${x},${y}`)) return { x, y };
            }
        }
    }
    return null;
}

function findCoastNear(town) {
    for (let r = 3; r <= 24; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = town.x + dx, y = town.y + dy;
                const type = tileAt(x, y);
                if (!isLand(type) || type === "mountain" || state.roads.has(`${x},${y}`)) continue;
                const neighbors = [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
                const water = neighbors.find(p => isWater(tileAt(p.x, p.y)));
                if (water) return { x, y, water };
            }
        }
    }
    return null;
}

export function generateBaseTerrain(seed) {
    state.baseMap = new Uint8Array(WORLD_SIZE * WORLD_SIZE);
    state.worldMap = new Uint8Array(WORLD_SIZE * WORLD_SIZE);
    for (let y = 0; y < WORLD_SIZE; y += 1) {
        for (let x = 0; x < WORLD_SIZE; x += 1) {
            const height = fbm(x, y, 1201 + seed);
            const moisture = fbm(x + 200, y - 200, 2201 + seed);
            const riverNoise = valueNoise(x, y, 32, 3401 + seed);
            const forestNoise = valueNoise(x + 500, y - 300, 48, 4601 + seed);
            const treeNoise = valueNoise(x - 200, y + 700, 10, 5701 + seed);
            const treeCluster = valueNoise(x + 1200, y - 900, 54, 5751 + seed);
            const treeScatter = hash2d(x, y, 5851 + seed);

            let type = "grass";
            if (height < state.seaLevelThreshold) type = "sea";
            else if (height < state.seaLevelThreshold + 0.1 && moisture > 0.52) type = "river";
            else if (riverNoise > 0.86 && height < 0.66) type = "river";
            else if (height > 0.7) type = "mountain";
            else if (moisture > 0.56) type = "field";

            if (type === "grass" || type === "field") {
                const clustered = treeCluster > 0.45 && treeScatter > 0.25;
                const scattered = treeNoise > 0.42 || treeScatter > 0.7;
                if (clustered || scattered) type = "tree";
            }

            const idx = TILE_INDEX[type];
            state.baseMap[y * WORLD_SIZE + x] = idx;
            state.worldMap[y * WORLD_SIZE + x] = idx;
        }
    }
}

export function generateTowns(seed, count = 12) {
    let attempts = 0;
    while (state.towns.length < count && attempts < count * 30) {
        const i = attempts + 1;
        const x =
            Math.floor(hash2d(i * 31, i * 17, 4001 + seed) * (WORLD_SIZE - 200)) + 100;
        const y =
            Math.floor(hash2d(i * 19, i * 29, 4002 + seed) * (WORLD_SIZE - 200)) + 100;
        if (tileAt(x, y) !== "sea" && tileAt(x, y) !== "mountain") {
            state.towns.push({ x, y });
        }
        attempts += 1;
    }
}

export function buildRoads() {
    const connections = [];
    for (let i = 0; i < state.towns.length; i += 1) {
        const a = state.towns[i];
        const distances = state.towns
            .map((b, idx) => ({
                idx,
                dist: Math.hypot(a.x - b.x, a.y - b.y)
            }))
            .filter((entry) => entry.idx !== i)
            .sort((m, n) => m.dist - n.dist)
            .slice(0, 2);
        distances.forEach((entry) => {
            connections.push([i, entry.idx]);
        });
    }

    connections.forEach(([ai, bi]) => {
        const a = state.towns[ai];
        const b = state.towns[bi];
        let x = a.x;
        let y = a.y;
        let steps = 0;
        while (x !== b.x || y !== b.y) {
            const dx = Math.sign(b.x - x);
            const dy = Math.sign(b.y - y);
            if (dx !== 0 && dy !== 0) {
                const choice = hash2d(x, y, 5050 + state.worldSeed + steps);
                if (choice < 0.5) x += dx;
                else y += dy;
            } else if (dx !== 0) {
                x += dx;
            } else if (dy !== 0) {
                y += dy;
            }

            // Draw a slightly thicker path near towns to ensure it meets the houses
            const distToA = Math.hypot(x - a.x, y - a.y);
            const distToB = Math.hypot(x - b.x, y - b.y);

            if (distToA < 8 || distToB < 8) {
                paintRoadBrush(x, y, 1);
            } else {
                paintRoadBrush(x, y, 0);
            }
            steps += 1;
        }
    });
}

export function placePort(startX, startY) {
    const sizes = [8, 6, 4, 2];
    let placed = false;

    for (const size of sizes) {
        for (let offset = 0; offset < size; offset++) {
            const sx = startX - offset;
            const sy = startY - offset;

            const canPlace = (tx, ty, s) => {
                if (tx < 0 || ty < 0 || tx + s >= WORLD_SIZE || ty + s >= WORLD_SIZE) return false;
                for (let dy = -4; dy < s + 4; dy++) {
                    for (let dx = -4; dx < s + 4; dx++) {
                        const checkX = tx + dx;
                        const checkY = ty + dy;
                        if (checkX < 0 || checkY < 0 || checkX >= WORLD_SIZE || checkY >= WORLD_SIZE) continue;
                        const tile = tileAt(checkX, checkY);

                        // Core area constraints (the actual port footprint)
                        if (dx >= 0 && dx < s && dy >= 0 && dy < s) {
                            if (isWater(tile) || tile === "mountain" || tile === "road" || isHouseTile(tile)) return false;
                        }

                        // Buffer constraints (keep distance from house doors)
                        if (tile === "houseDoor") {
                            return false;
                        }
                    }
                }
                return true;
            };

            if (canPlace(sx, sy, size)) {
                for (let dy = 0; dy < size; dy++) {
                    for (let dx = 0; dx < size; dx++) {
                        let type = "portC";
                        if (dx === 0 && dy === 0) type = "portNW";
                        else if (dx === size - 1 && dy === 0) type = "portNE";
                        else if (dx === 0 && dy === size - 1) type = "portSW";
                        else if (dx === size - 1 && dy === size - 1) type = "portSE";
                        else if (dy === 0) type = "portN";
                        else if (dy === size - 1) type = "portS";
                        else if (dx === 0) type = "portW";
                        else if (dx === size - 1) type = "portE";

                        if (dx === Math.floor(size / 2) && dy === Math.floor(size / 2)) {
                            type = "portBoat";
                        }

                        setTile(sx + dx, sy + dy, type);
                    }
                }
                placed = true;
                break;
            }
        }
        if (placed) break;
    }

    if (!placed) {
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) setTile(startX + dx, startY + dy, "portC");
        }
        setTile(startX, startY, "portNW");
        setTile(startX + 1, startY, "portNE");
        setTile(startX, startY + 1, "portSW");
        setTile(startX + 1, startY + 1, "portSE");
    }
}

export function applyTownsAndRoads(seed) {
    state.towns.length = 0; state.roads.clear(); state.boats.length = 0;
    generateTowns(seed);
    buildRoads();

    for (const town of state.towns) {
        let placed = false;
        const road = findRoadNear(town);
        if (road) {
            const sides = [
                { s: "north", x: road.x, y: road.y + 1 }, { s: "south", x: road.x, y: road.y - 1 },
                { s: "west", x: road.x + 1, y: road.y }, { s: "east", x: road.x - 1, y: road.y }
            ];
            for (const c of sides) {
                let sx = c.x - Math.floor(HOUSE_WIDTH / 2), sy = c.y - (HOUSE_HEIGHT - 1);
                if (c.s === "north") sy = c.y;
                else if (c.s === "west") { sx = c.x; sy = c.y - Math.floor(HOUSE_HEIGHT / 2); }
                else if (c.s === "east") { sx = c.x - (HOUSE_WIDTH - 1); sy = c.y - Math.floor(HOUSE_HEIGHT / 2); }

                if (canPlaceHouse(sx, sy)) {
                    placeHouse(sx, sy, c.s, town);
                    placed = true; break;
                }
            }
        }
        if (!placed) {
            const sx = town.x - Math.floor(HOUSE_WIDTH / 2), sy = town.y - Math.floor(HOUSE_HEIGHT / 2);
            if (canPlaceHouse(sx, sy)) placeHouse(sx, sy, "south", town);
        }

        const coast = findCoastNear(town);
        if (coast && isLand(tileAt(coast.x, coast.y)) && !isHouseTile(tileAt(coast.x, coast.y))) {
            placePort(coast.x, coast.y);
            if (!state.boats.some(b => b.x === coast.water.x && b.y === coast.water.y)) {
                state.boats.push({ x: coast.water.x, y: coast.water.y });
            }
        }
    }

    state.roads.forEach((_, key) => {
        const [x, y] = key.split(",").map(Number);
        const type = tileAt(x, y);
        // Ensure roads don't wipe out houses, water, or ports, but allowed to connect exactly to the house bounds.
        if (!isWater(type) && !isHouseTile(type) && !isPortTile(type)) {
            setTile(x, y, "road");
        }
    });

    // Final pass: Ensure a road tile sits exactly adjacent to the house door
    for (const town of state.towns) {
        for (let dy = -10; dy <= 10; dy++) {
            for (let dx = -10; dx <= 10; dx++) {
                const x = town.x + dx;
                const y = town.y + dy;
                if (tileAt(x, y) === "houseDoor") {
                    // Check neighbors and force a road right outside the door
                    const nb = [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]];
                    nb.forEach(([nx, ny]) => {
                        const nType = tileAt(nx, ny);
                        if (nType === "grass" || nType === "field" || nType === "tree" || nType === "road") {
                            setTile(nx, ny, "road");
                        }
                    });
                }
            }
        }
    }
}

function randomSeed() {
    if (window.crypto && window.crypto.getRandomValues) {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return values[0];
    }
    return Math.floor(Math.random() * 0xffffffff);
}

export function generateNewWorld() {
    state.worldSeed = randomSeed();
    generateBaseTerrain(state.worldSeed);
    applyTownsAndRoads(state.worldSeed);
}

export function findSpawn() {
    const preferred = state.towns[0];
    if (preferred) {
        for (let r = 0; r < 20; r += 1) {
            for (let dy = -r; dy <= r; dy += 1) {
                for (let dx = -r; dx <= r; dx += 1) {
                    const x = preferred.x + dx;
                    const y = preferred.y + dy;
                    if (isWalkable(x, y)) return { x, y };
                }
            }
        }
    }

    for (let r = 0; r < 200; r += 1) {
        const x = Math.floor(hash2d(r, r * 3, 8801 + state.worldSeed) * WORLD_SIZE);
        const y = Math.floor(hash2d(r * 5, r * 7, 8802 + state.worldSeed) * WORLD_SIZE);
        if (isWalkable(x, y)) return { x, y };
    }
    return { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
}
