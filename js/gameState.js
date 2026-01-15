import { WORLD_SIZE, TILE_INDEX, INDEX_TILE, SOLID_TILES } from './constants.js';

export const state = {
    worldMap: null,
    baseMap: null,
    worldSeed: 0,
    player: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 },
    playerPrev: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 },
    playerSpeed: 0,
    jumpOffset: 0,
    jumpVelocity: 0,
    swingTimer: 0,
    equipped: false,
    crouched: false,
    onBoat: false,
    activeBoat: -1,
    camera: { x: 0, y: 0 },
    input: new Set(),
    towns: [],
    roads: new Map(),
    boats: [],
    tileset: {},
    minimap: { canvas: null, ctx: null, size: 200, dirty: true, lastDraw: 0 },
    editor: { enabled: false, painting: false, brushSize: 1, selected: "tree", editBase: false },
    seaLevelThreshold: 0.24,
    canvas: null,
    ctx: null
};

export function initState() {
    state.canvas = document.getElementById("game");
    if (state.canvas) {
        state.ctx = state.canvas.getContext("2d");
    }
}

export function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return "sea";
    if (state.worldMap) return INDEX_TILE[state.worldMap[y * WORLD_SIZE + x]] || "sea";
    return "grass";
}

export function setTile(x, y, type) {
    if (!state.worldMap) return;
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
    state.worldMap[y * WORLD_SIZE + x] = TILE_INDEX[type];
}

export function isWater(type) { return type === "sea" || type === "river"; }
export function isLand(type) { return !isWater(type); }
export function isPortTile(type) { return type.startsWith("port"); }
export function isHouseTile(type) {
    return ["houseWall", "houseFloor", "houseDoor", "bed", "kitchen", "furniture"].includes(type);
}

export function isWalkableOnFoot(type) {
    return !isWater(type) && !SOLID_TILES.includes(type);
}

export function isWalkable(x, y) {
    const type = tileAt(Math.floor(x), Math.floor(y));
    if (state.onBoat) return isWater(type) || isPortTile(type);
    return isWalkableOnFoot(type);
}

export function baseTileAt(x, y) {
    if (!state.baseMap) return "grass";
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return "sea";
    return INDEX_TILE[state.baseMap[y * WORLD_SIZE + x]] || "grass";
}

export function setBaseTile(x, y, type) {
    if (!state.baseMap) return;
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
    state.baseMap[y * WORLD_SIZE + x] = TILE_INDEX[type];
}

export function eraseTile(x, y) {
    if (!state.worldMap) return;
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
    const baseType = state.baseMap ? state.baseMap[y * WORLD_SIZE + x] : TILE_INDEX.grass;
    state.worldMap[y * WORLD_SIZE + x] = baseType;
}

export function eraseBaseTile(x, y) {
    if (!state.baseMap || !state.worldMap) return;
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
    state.baseMap[y * WORLD_SIZE + x] = TILE_INDEX.grass;
    state.worldMap[y * WORLD_SIZE + x] = TILE_INDEX.grass;
}
