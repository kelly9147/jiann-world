export const TILE_SIZE = 32;
export const WORLD_SIZE = 1024;
export const BASE_SPEED = 5;
export const WORLD_VERSION = "v10";
export const HOUSE_WIDTH = 10;
export const HOUSE_HEIGHT = 6;

export const TILE_TYPES = {
    sea: { color: "#29b6f6" },     // Bright crisp blue
    river: { color: "#4fc3f7" },   // Lighter blue
    grass: { color: "#9ccc65" },   // Lush green
    field: { color: "#dce775" },   // Yellow-green field
    forest: { color: "#f48fb1" },  // Sakura pink
    tree: { color: "#66bb6a" },    // Vibrant green
    road: { color: "#fff59d" },    // Sandy path
    portNW: { color: "#ffcc80" },  // Light wood/bamboo docks
    portNE: { color: "#ffcc80" },
    portSW: { color: "#ffcc80" },
    portSE: { color: "#ffcc80" },
    portN: { color: "#ffcc80" },
    portS: { color: "#ffcc80" },
    portW: { color: "#ffcc80" },
    portE: { color: "#ffcc80" },
    portC: { color: "#ffb74d" },
    portBoat: { color: "#ffb74d" },
    mountain: { color: "#b0bec5" },// Blue-gray rocks
    houseWall: { color: "#ef5350" },// Temple Red
    houseFloor: { color: "#d7ccc8" },// Stone floor
    houseDoor: { color: "#5d4037" }, // Dark wood slider
    bed: { color: "#ce93d8" },     // Pastel purple
    kitchen: { color: "#ffe082" }, // Warm yellow
    furniture: { color: "#ffab91" }// Peach/coral
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
