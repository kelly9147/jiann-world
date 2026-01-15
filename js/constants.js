export const TILE_SIZE = 32;
export const WORLD_SIZE = 1024;
export const BASE_SPEED = 5;
export const WORLD_VERSION = "v8";
export const HOUSE_WIDTH = 10;
export const HOUSE_HEIGHT = 6;

export const TILE_TYPES = {
    sea: { color: "#1b3d6d" },
    river: { color: "#2c6fba" },
    grass: { color: "#2e7d32" },
    field: { color: "#6fa146" },
    forest: { color: "#1f5a2b" },
    tree: { color: "#2b6b33" },
    road: { color: "#9d7b4f" },
    portNW: { color: "#7c6a54" },
    portNE: { color: "#7c6a54" },
    portSW: { color: "#7c6a54" },
    portSE: { color: "#7c6a54" },
    portN: { color: "#7c6a54" },
    portS: { color: "#7c6a54" },
    portW: { color: "#7c6a54" },
    portE: { color: "#7c6a54" },
    portC: { color: "#7c6a54" },
    portBoat: { color: "#7c6a54" },
    mountain: { color: "#6b6b6b" },
    houseWall: { color: "#6a3f2a" },
    houseFloor: { color: "#a0734e" },
    houseDoor: { color: "#3f2a1b" },
    bed: { color: "#8f6bb3" },
    kitchen: { color: "#c29f6c" },
    furniture: { color: "#6f5a45" }
};

export const TILE_INDEX = {
    sea: 0, river: 1, grass: 2, field: 3, forest: 4, tree: 5, road: 6,
    portNW: 7, portNE: 8, portSW: 9, portSE: 10,
    portN: 18, portS: 19, portW: 20, portE: 21, portC: 22, portBoat: 23,
    mountain: 11,
    houseWall: 12, houseFloor: 13, houseDoor: 14, bed: 15, kitchen: 16, furniture: 17
};

export const INDEX_TILE = Object.keys(TILE_INDEX).reduce((acc, key) => {
    acc[TILE_INDEX[key]] = key;
    return acc;
}, {});

export const SOLID_TILES = ["houseWall", "mountain", "tree", "furniture", "kitchen", "bed"];
