export const TILE_SIZE = 32;
export const WORLD_SIZE = 1024;
export const BASE_SPEED = 5;
export const WORLD_VERSION = "v12";
export const HOUSE_WIDTH = 10;
export const HOUSE_HEIGHT = 6;

export const TILE_TYPES = {
    sea: { color: "#2f6f91" },
    river: { color: "#4d8fa8" },
    coast: { color: "#c8b884" },
    grass: { color: "#6f8f45" },
    field: { color: "#8d9959" },
    forest: { color: "#4f713e" },
    tree: { color: "#3f6f38" },
    road: { color: "#a98f62" },
    portNW: { color: "#9b7448" },
    portNE: { color: "#9b7448" },
    portSW: { color: "#9b7448" },
    portSE: { color: "#9b7448" },
    portN: { color: "#9b7448" },
    portS: { color: "#9b7448" },
    portW: { color: "#9b7448" },
    portE: { color: "#9b7448" },
    portC: { color: "#8a633b" },
    portBoat: { color: "#8a633b" },
    mountain: { color: "#7f8474" },
    houseWall: { color: "#b2473d" },// Temple Red
    houseFloor: { color: "#b9ad95" },// Stone floor
    houseDoor: { color: "#5d4037" }, // Dark wood slider
    bed: { color: "#9d7b91" },
    kitchen: { color: "#b89b61" },
    furniture: { color: "#9b6f58" }
};

export const TILE_INDEX = {
    sea: 0, river: 1, grass: 2, field: 3, forest: 4, tree: 5, road: 6,
    portNW: 7, portNE: 8, portSW: 9, portSE: 10,
    portN: 18, portS: 19, portW: 20, portE: 21, portC: 22, portBoat: 23,
    mountain: 11,
    houseWall: 12, houseFloor: 13, houseDoor: 14, bed: 15, kitchen: 16, furniture: 17,
    coast: 24
};

export const INDEX_TILE = Object.keys(TILE_INDEX).reduce((acc, key) => {
    acc[TILE_INDEX[key]] = key;
    return acc;
}, {});

export const SOLID_TILES = ["houseWall", "mountain", "tree", "furniture", "kitchen", "bed"];
