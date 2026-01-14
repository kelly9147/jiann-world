const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE_SIZE = 32;
const WORLD_SIZE = 1024;
const BASE_SPEED = 5;

const tileTypes = {
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
  mountain: { color: "#6b6b6b" },
  houseWall: { color: "#6a3f2a" },
  houseFloor: { color: "#a0734e" },
  houseDoor: { color: "#3f2a1b" },
  bed: { color: "#8f6bb3" },
  kitchen: { color: "#c29f6c" },
  furniture: { color: "#6f5a45" }
};

const tileset = {};
const input = new Set();
const towns = [];
const roads = new Map();
const boats = [];
const minimap = {
  canvas: null,
  ctx: null,
  size: 200,
  dirty: true,
  lastDraw: 0
};
const editor = {
  enabled: false,
  painting: false,
  brushSize: 1,
  selected: "tree",
  editBase: false
};

const TILE_INDEX = {
  sea: 0,
  river: 1,
  grass: 2,
  field: 3,
  forest: 4,
  tree: 5,
  road: 6,
  portNW: 7,
  portNE: 8,
  portSW: 9,
  portSE: 10,
  mountain: 11,
  houseWall: 12,
  houseFloor: 13,
  houseDoor: 14,
  bed: 15,
  kitchen: 16,
  furniture: 17
};

const INDEX_TILE = Object.keys(TILE_INDEX).reduce((acc, key) => {
  acc[TILE_INDEX[key]] = key;
  return acc;
}, {});

let worldMap = null;
let worldSeed = 0;
let baseMap = null;
const WORLD_VERSION = "v8";

const player = {
  x: WORLD_SIZE / 2,
  y: WORLD_SIZE / 2
};

const playerPrev = {
  x: WORLD_SIZE / 2,
  y: WORLD_SIZE / 2
};

let playerSpeed = 0;
let jumpOffset = 0;
let jumpVelocity = 0;
let swingTimer = 0;
let equipped = false;
let crouched = false;
let onBoat = false;
let activeBoat = -1;

const camera = {
  x: 0,
  y: 0
};

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function hash2d(x, y, seed = 1337) {
  let h = x * 374761393 + y * 668265263 + seed * 982451653;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y, scale, seed) {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const xf = smoothstep(sx - x0);
  const yf = smoothstep(sy - y0);
  const v00 = hash2d(x0, y0, seed);
  const v10 = hash2d(x0 + 1, y0, seed);
  const v01 = hash2d(x0, y0 + 1, seed);
  const v11 = hash2d(x0 + 1, y0 + 1, seed);
  const v0 = lerp(v00, v10, xf);
  const v1 = lerp(v01, v11, xf);
  return lerp(v0, v1, yf);
}

function fbm(x, y, seed) {
  let value = 0;
  let amp = 0.6;
  let scale = 180;
  for (let i = 0; i < 4; i += 1) {
    value += valueNoise(x, y, scale, seed + i * 101) * amp;
    amp *= 0.5;
    scale *= 0.5;
  }
  return value;
}

function generateTowns(seed, count = 12) {
  let attempts = 0;
  while (towns.length < count && attempts < count * 30) {
    const i = attempts + 1;
    const x =
      Math.floor(hash2d(i * 31, i * 17, 4001 + seed) * (WORLD_SIZE - 200)) + 100;
    const y =
      Math.floor(hash2d(i * 19, i * 29, 4002 + seed) * (WORLD_SIZE - 200)) + 100;
    if (tileAt(x, y) !== "sea" && tileAt(x, y) !== "mountain") {
      towns.push({ x, y });
    }
    attempts += 1;
  }
}

function markRoad(x, y) {
  roads.set(`${x},${y}`, true);
}

function paintRoadBrush(x, y, size = 0) {
  for (let dy = -size; dy <= size; dy += 1) {
    for (let dx = -size; dx <= size; dx += 1) {
      markRoad(x + dx, y + dy);
    }
  }
}

function buildRoads() {
  const connections = [];
  for (let i = 0; i < towns.length; i += 1) {
    const a = towns[i];
    const distances = towns
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
    const a = towns[ai];
    const b = towns[bi];
    let x = a.x;
    let y = a.y;
    let steps = 0;
    while (x !== b.x || y !== b.y) {
      const dx = Math.sign(b.x - x);
      const dy = Math.sign(b.y - y);
      if (dx !== 0 && dy !== 0) {
        const choice = hash2d(x, y, 5050 + worldSeed + steps);
        if (choice < 0.5) x += dx;
        else y += dy;
      } else if (dx !== 0) {
        x += dx;
      } else if (dy !== 0) {
        y += dy;
      }
      paintRoadBrush(x, y, 0);
      steps += 1;
    }
  });
}

function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return "sea";
  if (worldMap) {
    return INDEX_TILE[worldMap[y * WORLD_SIZE + x]] || "sea";
  }
  return "grass";
}

function isWater(type) {
  return type === "sea" || type === "river";
}

function isLand(type) {
  return !isWater(type);
}

function isPortTile(type) {
  return type === "portNW" || type === "portNE" || type === "portSW" || type === "portSE";
}

function baseTileAt(x, y) {
  if (!baseMap) return "grass";
  if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return "sea";
  return INDEX_TILE[baseMap[y * WORLD_SIZE + x]] || "grass";
}

function setTile(x, y, type) {
  if (!worldMap) return;
  if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
  worldMap[y * WORLD_SIZE + x] = TILE_INDEX[type];
}

function eraseTile(x, y) {
  if (!worldMap) return;
  if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
  const baseType = baseMap ? baseMap[y * WORLD_SIZE + x] : TILE_INDEX.grass;
  worldMap[y * WORLD_SIZE + x] = baseType;
}

function setBaseTile(x, y, type) {
  if (!baseMap) return;
  if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
  baseMap[y * WORLD_SIZE + x] = TILE_INDEX[type];
}

function eraseBaseTile(x, y) {
  if (!baseMap || !worldMap) return;
  if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
  baseMap[y * WORLD_SIZE + x] = TILE_INDEX.grass;
  worldMap[y * WORLD_SIZE + x] = TILE_INDEX.grass;
}

function generateBaseTerrain(seed) {
  baseMap = new Uint8Array(WORLD_SIZE * WORLD_SIZE);
  worldMap = new Uint8Array(WORLD_SIZE * WORLD_SIZE);
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
      if (height < 0.24) type = "sea";
      else if (height < 0.34 && moisture > 0.52) type = "river";
      else if (riverNoise > 0.86 && height < 0.66) type = "river";
      else if (height > 0.7) type = "mountain";
      else if (moisture > 0.56) type = "field";
      else if (moisture > 0.45 && forestNoise > 0.4) type = "forest";

      if (type === "grass" || type === "field" || type === "forest") {
        const clustered = treeCluster > 0.45 && treeScatter > 0.25;
        const scattered = treeNoise > 0.42 || treeScatter > 0.7;
        if (clustered || scattered) type = "tree";
      }

      const idx = TILE_INDEX[type];
      baseMap[y * WORLD_SIZE + x] = idx;
      worldMap[y * WORLD_SIZE + x] = idx;
    }
  }
}

function applyTownsAndRoads(seed) {
  towns.length = 0;
  roads.clear();
  boats.length = 0;
  generateTowns(seed);
  buildRoads();

  const HOUSE_WIDTH = 10;
  const HOUSE_HEIGHT = 6;

  function isHouseTile(type) {
    return (
      type === "houseWall" ||
      type === "houseFloor" ||
      type === "houseDoor" ||
      type === "bed" ||
      type === "kitchen" ||
      type === "furniture"
    );
  }

  function isBuildableBase(x, y) {
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return false;
    const base = tileAt(x, y);
    return (
      base !== "sea" &&
      base !== "river" &&
      base !== "mountain" &&
      base !== "road" &&
      !isPortTile(base)
    );
  }

  function canPlaceHouse(startX, startY) {
    if (startX < 0 || startY < 0) return false;
    if (startX + HOUSE_WIDTH > WORLD_SIZE || startY + HOUSE_HEIGHT > WORLD_SIZE) return false;
    for (let dy = 0; dy < HOUSE_HEIGHT; dy += 1) {
      for (let dx = 0; dx < HOUSE_WIDTH; dx += 1) {
        if (!isBuildableBase(startX + dx, startY + dy)) return false;
      }
    }
    return true;
  }

  function placeHouse(startX, startY, doorSide, town) {
    for (let dy = 0; dy < HOUSE_HEIGHT; dy += 1) {
      for (let dx = 0; dx < HOUSE_WIDTH; dx += 1) {
        const x = startX + dx;
        const y = startY + dy;
        const isWall =
          dx === 0 || dy === 0 || dx === HOUSE_WIDTH - 1 || dy === HOUSE_HEIGHT - 1;
        setTile(x, y, isWall ? "houseWall" : "houseFloor");
      }
    }

    let doorX = startX + Math.floor(HOUSE_WIDTH / 2);
    let doorY = startY + HOUSE_HEIGHT - 1;
    if (doorSide === "north") doorY = startY;
    if (doorSide === "west") {
      doorX = startX;
      doorY = startY + Math.floor(HOUSE_HEIGHT / 2);
    }
    if (doorSide === "east") {
      doorX = startX + HOUSE_WIDTH - 1;
      doorY = startY + Math.floor(HOUSE_HEIGHT / 2);
    }
    setTile(doorX, doorY, "houseDoor");

    const interior = [];
    for (let dy = 1; dy < HOUSE_HEIGHT - 1; dy += 1) {
      for (let dx = 1; dx < HOUSE_WIDTH - 1; dx += 1) {
        interior.push({ x: startX + dx, y: startY + dy });
      }
    }

    function placeItem(type, seedOffset) {
      const pick =
        Math.floor(hash2d(town.x + seedOffset, town.y + seedOffset, 9100 + seed) *
        interior.length);
      const spot = interior[pick];
      if (spot) setTile(spot.x, spot.y, type);
    }

    placeItem("bed", 11);
    placeItem("kitchen", 23);
    placeItem("furniture", 37);
  }

  function findRoadNear(town) {
    for (let r = 2; r <= 16; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const x = town.x + dx;
          const y = town.y + dy;
          if (roads.has(`${x},${y}`)) return { x, y };
        }
      }
    }
    return null;
  }

  function findCoastNear(town) {
    for (let r = 3; r <= 24; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const x = town.x + dx;
          const y = town.y + dy;
          const type = tileAt(x, y);
          if (!isLand(type) || type === "mountain") continue;
          if (roads.has(`${x},${y}`)) continue;
          const neighbors = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 }
          ];
          const waterNeighbor = neighbors.find((pos) => isWater(tileAt(pos.x, pos.y)));
          if (waterNeighbor) return { x, y, water: waterNeighbor };
        }
      }
    }
    return null;
  }

  function canPlacePort(startX, startY) {
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        if (!isBuildableBase(startX + dx, startY + dy)) return false;
      }
    }
    return true;
  }

  function placePort(startX, startY) {
    setTile(startX, startY, "portNW");
    setTile(startX + 1, startY, "portNE");
    setTile(startX, startY + 1, "portSW");
    setTile(startX + 1, startY + 1, "portSE");
  }

  for (const town of towns) {
    let placed = false;
    const road = findRoadNear(town);
    if (road) {
      const candidates = [
        { side: "north", doorX: road.x, doorY: road.y + 1 },
        { side: "south", doorX: road.x, doorY: road.y - 1 },
        { side: "west", doorX: road.x + 1, doorY: road.y },
        { side: "east", doorX: road.x - 1, doorY: road.y }
      ];
      for (const candidate of candidates) {
        let startX = candidate.doorX - Math.floor(HOUSE_WIDTH / 2);
        let startY = candidate.doorY - (HOUSE_HEIGHT - 1);
        if (candidate.side === "north") startY = candidate.doorY;
        if (candidate.side === "west") {
          startX = candidate.doorX;
          startY = candidate.doorY - Math.floor(HOUSE_HEIGHT / 2);
        }
        if (candidate.side === "east") {
          startX = candidate.doorX - (HOUSE_WIDTH - 1);
          startY = candidate.doorY - Math.floor(HOUSE_HEIGHT / 2);
        }

        if (canPlaceHouse(startX, startY)) {
          placeHouse(startX, startY, candidate.side, town);
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      const startX = town.x - Math.floor(HOUSE_WIDTH / 2);
      const startY = town.y - Math.floor(HOUSE_HEIGHT / 2);
      if (canPlaceHouse(startX, startY)) {
        placeHouse(startX, startY, "south", town);
      }
    }

    const coast = findCoastNear(town);
    if (coast) {
      const base = tileAt(coast.x, coast.y);
      if (isLand(base) && !isHouseTile(base)) {
        let portPlaced = false;
        const portCandidates = [
          { x: coast.x, y: coast.y },
          { x: coast.x - 1, y: coast.y },
          { x: coast.x, y: coast.y - 1 },
          { x: coast.x - 1, y: coast.y - 1 }
        ];
        for (const candidate of portCandidates) {
          if (canPlacePort(candidate.x, candidate.y)) {
            placePort(candidate.x, candidate.y);
            portPlaced = true;
            break;
          }
        }
        if (!portPlaced) {
          setTile(coast.x, coast.y, "portNW");
        }
        const exists = boats.some(
          (boat) => boat.x === coast.water.x && boat.y === coast.water.y
        );
        if (!exists) boats.push({ x: coast.water.x, y: coast.water.y });
      }
    }
  }

  roads.forEach((_, key) => {
    const [x, y] = key.split(",").map((value) => Number(value));
    const type = tileAt(x, y);
    if (type !== "sea" && type !== "river" && !isHouseTile(type) && !isPortTile(type)) {
      setTile(x, y, "road");
    }
  });
}

function encodeMap(buffer) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function decodeWorld(encoded) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function serializeBoats() {
  if (!boats.length) return "";
  return boats.map((boat) => `${boat.x},${boat.y}`).join(";");
}

function deserializeBoats(value) {
  boats.length = 0;
  if (!value) return;
  value.split(";").forEach((entry) => {
    const [x, y] = entry.split(",").map((item) => Number(item));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      boats.push({ x, y });
    }
  });
}

async function saveWorld() {
  if (!worldMap || !baseMap) return;
  const data = `${WORLD_VERSION}:${encodeMap(baseMap)}:${encodeMap(worldMap)}:${serializeBoats()}`;
  if (window.worldApi) {
    await window.worldApi.saveWorld(data);
  }
}

async function loadWorld() {
  if (!window.worldApi) return false;
  const saved = await window.worldApi.loadWorld();
  if (!saved) return false;
  const parts = saved.split(":");
  if (parts.length < 3 || parts[0] !== WORLD_VERSION) return false;
  baseMap = decodeWorld(parts[1]);
  worldMap = decodeWorld(parts[2]);
  deserializeBoats(parts[3] || "");
  if (
    !baseMap ||
    !worldMap ||
    baseMap.length !== WORLD_SIZE * WORLD_SIZE ||
    worldMap.length !== WORLD_SIZE * WORLD_SIZE
  ) {
    worldMap = null;
    baseMap = null;
    return false;
  }
  return true;
}

function randomSeed() {
  if (window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

function generateNewWorld() {
  worldSeed = randomSeed();
  generateBaseTerrain(worldSeed);
  applyTownsAndRoads(worldSeed);
}

function findSpawn() {
  const preferred = towns[0];
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
    const x = Math.floor(hash2d(r, r * 3, 8801 + worldSeed) * WORLD_SIZE);
    const y = Math.floor(hash2d(r * 5, r * 7, 8802 + worldSeed) * WORLD_SIZE);
    if (isWalkable(x, y)) return { x, y };
  }
  return { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
}

async function initWorld() {
  const loaded = await loadWorld();
  if (!loaded) {
    generateNewWorld();
    await saveWorld();
  }
  onBoat = false;
  activeBoat = -1;
}

function makeTileSprite(type) {
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = TILE_SIZE;
  tileCanvas.height = TILE_SIZE;
  const tctx = tileCanvas.getContext("2d");

  tctx.fillStyle = tileTypes[type].color;
  tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  if (type === "grass" || type === "field" || type === "forest" || type === "tree") {
    tctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < 6; i += 1) {
      const seedBase =
        type === "grass" ? 900 : type === "field" ? 901 : type === "forest" ? 904 : 907;
      const x = Math.floor(hash2d(i, i * 13, seedBase) * 30);
      const y = Math.floor(hash2d(i * 7, i * 11, seedBase + 2) * 30);
      tctx.fillRect(x, y, 2, 2);
    }
  }

  if (type === "sea" || type === "river") {
    tctx.strokeStyle = "rgba(255,255,255,0.12)";
    tctx.lineWidth = 2;
    tctx.beginPath();
    tctx.moveTo(0, TILE_SIZE * 0.35);
    tctx.bezierCurveTo(8, 8, 24, 24, TILE_SIZE, TILE_SIZE * 0.65);
    tctx.stroke();
  }

  if (type === "mountain") {
    tctx.fillStyle = "rgba(0,0,0,0.22)";
    tctx.beginPath();
    tctx.moveTo(4, TILE_SIZE - 4);
    tctx.lineTo(TILE_SIZE * 0.5, 8);
    tctx.lineTo(TILE_SIZE - 4, TILE_SIZE - 6);
    tctx.closePath();
    tctx.fill();
  }

  if (type === "forest") {
    tctx.fillStyle = "rgba(0,0,0,0.25)";
    tctx.beginPath();
    tctx.arc(10, 14, 6, 0, Math.PI * 2);
    tctx.arc(22, 18, 6, 0, Math.PI * 2);
    tctx.fill();
  }

  if (type === "tree") {
    tctx.fillStyle = "#1b4a26";
    tctx.beginPath();
    tctx.arc(16, 12, 8, 0, Math.PI * 2);
    tctx.fill();
    tctx.fillStyle = "#3a2b1b";
    tctx.fillRect(14, 18, 4, 8);
  }

  if (type === "road") {
    tctx.fillStyle = "rgba(0,0,0,0.2)";
    tctx.fillRect(0, TILE_SIZE * 0.45, TILE_SIZE, 3);
  }

  if (type === "portNW" || type === "portNE" || type === "portSW" || type === "portSE") {
    tctx.fillStyle = "#5f442f";
    tctx.fillRect(0, TILE_SIZE * 0.18, TILE_SIZE, 20);
    tctx.fillStyle = "#b08a5f";
    tctx.fillRect(2, TILE_SIZE * 0.2, TILE_SIZE - 4, 6);
    tctx.fillStyle = "rgba(0,0,0,0.25)";
    if (type === "portNW" || type === "portNE") {
      tctx.fillRect(0, TILE_SIZE * 0.18, TILE_SIZE, 3);
    }
    if (type === "portSW" || type === "portSE") {
      tctx.fillRect(0, TILE_SIZE * 0.72, TILE_SIZE, 3);
    }
    if (type === "portNW" || type === "portSW") {
      tctx.fillRect(0, TILE_SIZE * 0.18, 3, 14);
    }
    if (type === "portNE" || type === "portSE") {
      tctx.fillRect(TILE_SIZE - 3, TILE_SIZE * 0.18, 3, 14);
    }
  }

  if (type === "houseWall") {
    tctx.fillStyle = "#5a3826";
    tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    tctx.fillStyle = "rgba(255,255,255,0.08)";
    tctx.fillRect(4, 6, TILE_SIZE - 8, 4);
  }

  if (type === "houseFloor") {
    tctx.fillStyle = "#a0734e";
    tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    tctx.fillStyle = "rgba(0,0,0,0.15)";
    tctx.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }

  if (type === "houseDoor") {
    tctx.fillStyle = "#3b2618";
    tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    tctx.fillStyle = "#6b4a2a";
    tctx.fillRect(8, 6, 16, 20);
    tctx.fillStyle = "#d9b88a";
    tctx.fillRect(20, 16, 3, 3);
  }

  if (type === "bed") {
    tctx.fillStyle = "#8f6bb3";
    tctx.fillRect(4, 6, 24, 14);
    tctx.fillStyle = "#ede3f6";
    tctx.fillRect(6, 8, 10, 6);
    tctx.fillStyle = "#5a3f73";
    tctx.fillRect(4, 20, 24, 6);
  }

  if (type === "kitchen") {
    tctx.fillStyle = "#c29f6c";
    tctx.fillRect(4, 6, 24, 18);
    tctx.fillStyle = "#8f6e3e";
    tctx.fillRect(6, 8, 8, 6);
    tctx.fillStyle = "#6b4a2a";
    tctx.fillRect(18, 8, 8, 12);
  }

  if (type === "furniture") {
    tctx.fillStyle = "#6f5a45";
    tctx.fillRect(6, 8, 20, 16);
    tctx.fillStyle = "#3f3124";
    tctx.fillRect(10, 12, 12, 4);
  }

  return tileCanvas;
}

function buildTileset() {
  Object.keys(tileTypes).forEach((type) => {
    tileset[type] = makeTileSprite(type);
  });
}

function buildPalette() {
  const palette = document.getElementById("palette");
  if (!palette) return;

  const tileOrder = [
    "erase",
    "grass",
    "field",
    "forest",
    "tree",
    "road",
    "portNW",
    "portNE",
    "portSW",
    "portSE",
    "mountain",
    "river",
    "sea",
    "houseWall",
    "houseFloor",
    "houseDoor",
    "bed",
    "kitchen",
    "furniture"
  ];

  palette.innerHTML = "";
  tileOrder.forEach((type) => {
    const swatch = document.createElement("button");
    swatch.className = "tile-swatch";
    const label = document.createElement("div");
    label.textContent = type;
    if (type !== "erase") {
      const preview = document.createElement("canvas");
      preview.width = TILE_SIZE;
      preview.height = TILE_SIZE;
      const pctx = preview.getContext("2d");
      pctx.drawImage(tileset[type], 0, 0);
      swatch.appendChild(preview);
    } else {
      const preview = document.createElement("canvas");
      preview.width = TILE_SIZE;
      preview.height = TILE_SIZE;
      const pctx = preview.getContext("2d");
      pctx.fillStyle = "#2a2a2a";
      pctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      pctx.strokeStyle = "#e2c88d";
      pctx.lineWidth = 3;
      pctx.beginPath();
      pctx.moveTo(6, 6);
      pctx.lineTo(26, 26);
      pctx.moveTo(26, 6);
      pctx.lineTo(6, 26);
      pctx.stroke();
      swatch.appendChild(preview);
    }
    swatch.appendChild(label);
    swatch.addEventListener("click", () => {
      editor.selected = type;
      document.querySelectorAll(".tile-swatch").forEach((node) => {
        node.classList.toggle("active", node.querySelector("div").textContent === type);
      });
    });
    swatch.classList.toggle("active", type === editor.selected);
    palette.appendChild(swatch);
  });
  if (!palette.querySelector(".tile-swatch.active")) {
    const first = palette.querySelector(".tile-swatch");
    if (first) {
      first.classList.add("active");
      const label = first.querySelector("div");
      if (label) editor.selected = label.textContent;
    }
  }
}

function setBrushSize(value) {
  editor.brushSize = Math.max(1, Math.min(5, Number(value)));
}

function paintAt(x, y) {
  const half = editor.brushSize - 1;
  for (let dy = -half; dy <= half; dy += 1) {
    for (let dx = -half; dx <= half; dx += 1) {
      if (editor.selected === "erase") {
        if (editor.editBase) {
          eraseBaseTile(x + dx, y + dy);
        } else {
          eraseTile(x + dx, y + dy);
        }
      } else {
        if (!TILE_INDEX[editor.selected] && TILE_INDEX[editor.selected] !== 0) return;
        setTile(x + dx, y + dy, editor.selected);
        if (editor.editBase) setBaseTile(x + dx, y + dy, editor.selected);
      }
    }
  }
  minimap.dirty = true;
}

function drawPlayer(screenX, screenY, time, state) {
  const x = Math.round(screenX);
  const y = Math.round(screenY - state.jumpOffset);
  const s = 2;
  const walk = Math.min(1, playerSpeed / (BASE_SPEED * 2));
  const walkSwing = Math.sin(time * 0.02) * 3 * walk * s;
  const swing = walkSwing + state.swing * 6 * s;
  const crouchScale = state.crouch ? 0.75 : 1;

  ctx.fillStyle = "#2b1f14";
  ctx.fillRect(x - 5 * s + swing, y + 8 * s * crouchScale, 3 * s, 6 * s * crouchScale);
  ctx.fillRect(x + 1 * s - swing, y + 8 * s * crouchScale, 3 * s, 6 * s * crouchScale);

  ctx.fillStyle = "#6e3b2d";
  ctx.fillRect(x - 8 * s, y - 4 * s * crouchScale, 16 * s, 14 * s * crouchScale);

  ctx.fillStyle = "#c9b29b";
  ctx.fillRect(x - 10 * s, y - 2 * s * crouchScale + swing, 4 * s, 8 * s * crouchScale);
  ctx.fillRect(x + 6 * s, y - 2 * s * crouchScale - swing, 4 * s, 8 * s * crouchScale);

  ctx.fillStyle = "#f1d6b5";
  ctx.beginPath();
  ctx.arc(x, y - 8 * s * crouchScale, 5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2f2a24";
  ctx.fillRect(x - 6 * s, y - 14 * s * crouchScale, 12 * s, 4 * s);
  ctx.fillRect(x - 4 * s, y - 20 * s * crouchScale, 8 * s, 6 * s);

  ctx.fillStyle = "#3b2b1e";
  ctx.beginPath();
  ctx.arc(x - 2 * s, y - 9 * s * crouchScale, 1 * s, 0, Math.PI * 2);
  ctx.arc(x + 2 * s, y - 9 * s * crouchScale, 1 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b9d7e6";
  ctx.fillRect(x - 5 * s, y + 1 * s * crouchScale, 10 * s, 7 * s * crouchScale);

  ctx.fillStyle = "#5c3a2c";
  ctx.fillRect(x - 8 * s, y - 6 * s * crouchScale, 16 * s, 4 * s);

  if (state.equipped) {
    ctx.strokeStyle = "#d9d1c4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10 * s, y + 6 * s * crouchScale - swing);
    ctx.lineTo(x + 18 * s, y + 2 * s * crouchScale - swing);
    ctx.stroke();
  }
}

function drawBoat(screenX, screenY) {
  const x = Math.round(screenX);
  const y = Math.round(screenY);
  const s = 3.2;
  ctx.fillStyle = "#5b3a22";
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y + 6 * s);
  ctx.lineTo(x + 10 * s, y + 6 * s);
  ctx.lineTo(x + 6 * s, y + 12 * s);
  ctx.lineTo(x - 6 * s, y + 12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9b7a54";
  ctx.fillRect(x - 6 * s, y + 2 * s, 12 * s, 4 * s);
}

function isWalkable(x, y) {
  const type = tileAt(Math.floor(x), Math.floor(y));
  if (onBoat) {
    return isWater(type) || type === "port";
  }
  return !isWater(type);
}

function findNearbyBoat(x, y, radius = 1.5) {
  for (let i = 0; i < boats.length; i += 1) {
    const boat = boats[i];
    const dx = boat.x - x;
    const dy = boat.y - y;
    if (Math.hypot(dx, dy) <= radius) return i;
  }
  return -1;
}

function tryBoardBoat() {
  if (onBoat) return false;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  const idx = findNearbyBoat(px, py);
  if (idx === -1) return false;
  const boat = boats[idx];
  const tile = tileAt(boat.x, boat.y);
  if (!isWater(tile) && tile !== "port") return false;
  onBoat = true;
  activeBoat = idx;
  player.x = boat.x;
  player.y = boat.y;
  return true;
}

function tryDisembark() {
  if (!onBoat) return false;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  const candidates = [
    { x: px + 1, y: py },
    { x: px - 1, y: py },
    { x: px, y: py + 1 },
    { x: px, y: py - 1 }
  ];
  const land = candidates.find((pos) => !isWater(tileAt(pos.x, pos.y)));
  if (!land) return false;
  onBoat = false;
  activeBoat = -1;
  player.x = land.x;
  player.y = land.y;
  return true;
}

function update(dt) {
  let dx = 0;
  let dy = 0;
  const speed = BASE_SPEED * (input.has("ShiftLeft") || input.has("ShiftRight") ? 2 : 1);

  if (input.has("ArrowUp") || input.has("KeyW")) dy -= 1;
  if (input.has("ArrowDown") || input.has("KeyS")) dy += 1;
  if (input.has("ArrowLeft") || input.has("KeyA")) dx -= 1;
  if (input.has("ArrowRight") || input.has("KeyD")) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    const nextX = player.x + (dx / length) * speed * dt;
    const nextY = player.y + (dy / length) * speed * dt;
    if (isWalkable(nextX, player.y)) player.x = nextX;
    if (isWalkable(player.x, nextY)) player.y = nextY;
  }

  player.x = Math.max(0, Math.min(WORLD_SIZE - 1, player.x));
  player.y = Math.max(0, Math.min(WORLD_SIZE - 1, player.y));

  if (onBoat && boats[activeBoat]) {
    boats[activeBoat].x = Math.floor(player.x);
    boats[activeBoat].y = Math.floor(player.y);
  }

  if (dt > 0) {
    const movedX = player.x - playerPrev.x;
    const movedY = player.y - playerPrev.y;
    playerSpeed = Math.hypot(movedX, movedY) / dt;
    playerPrev.x = player.x;
    playerPrev.y = player.y;
  }

  if (swingTimer > 0) {
    swingTimer = Math.max(0, swingTimer - dt);
  }

  if (jumpOffset > 0 || jumpVelocity > 0) {
    jumpVelocity -= 900 * dt;
    jumpOffset += jumpVelocity * dt;
    if (jumpOffset <= 0) {
      jumpOffset = 0;
      jumpVelocity = 0;
    }
  }

  camera.x = player.x * TILE_SIZE - window.innerWidth / 2;
  camera.y = player.y * TILE_SIZE - window.innerHeight / 2;
  camera.x = Math.max(0, Math.min(camera.x, WORLD_SIZE * TILE_SIZE - window.innerWidth));
  camera.y = Math.max(0, Math.min(camera.y, WORLD_SIZE * TILE_SIZE - window.innerHeight));
}

function render(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const startX = Math.floor(camera.x / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endX = Math.min(WORLD_SIZE, startX + Math.ceil(window.innerWidth / TILE_SIZE) + 2);
  const endY = Math.min(WORLD_SIZE, startY + Math.ceil(window.innerHeight / TILE_SIZE) + 2);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const type = tileAt(x, y);
      const sprite = tileset[type];
      const screenX = x * TILE_SIZE - camera.x;
      const screenY = y * TILE_SIZE - camera.y;
      ctx.drawImage(sprite, screenX, screenY);
    }
  }

  boats.forEach((boat) => {
    if (
      boat.x >= startX &&
      boat.x <= endX &&
      boat.y >= startY &&
      boat.y <= endY
    ) {
      const screenX = boat.x * TILE_SIZE - camera.x + TILE_SIZE / 2;
      const screenY = boat.y * TILE_SIZE - camera.y + TILE_SIZE / 2;
      drawBoat(screenX, screenY);
    }
  });

  const swingPhase = swingTimer > 0 ? 1 - swingTimer / 0.35 : 0;
  const swingAmount = swingTimer > 0 ? Math.sin(swingPhase * Math.PI) : 0;
  drawPlayer(
    player.x * TILE_SIZE - camera.x + TILE_SIZE / 2,
    player.y * TILE_SIZE - camera.y + TILE_SIZE / 2,
    time,
    {
      jumpOffset,
      swing: swingAmount,
      crouch: crouched,
      equipped
    }
  );

  drawMiniMap(time);
}

let lastTime = performance.now();
function loop(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000);
  lastTime = time;
  update(dt);
  render(time);
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  input.add(event.code);
  if (event.code === "Space" && !event.repeat) {
    if (jumpOffset === 0 && !crouched) {
      jumpVelocity = 260;
    }
  }
  if (event.code === "KeyZ" && !event.repeat) {
    if (onBoat) {
      if (!tryDisembark()) {
        swingTimer = 0.35;
      } else {
        saveWorld();
      }
    } else if (!tryBoardBoat()) {
      swingTimer = 0.35;
    } else {
      saveWorld();
    }
  }
  if (event.code === "KeyE" && !event.repeat) {
    equipped = !equipped;
  }
  if (event.code === "KeyX" && !event.repeat) {
    crouched = !crouched;
  }
  if (event.code === "KeyF") {
    editor.enabled = !editor.enabled;
    const toggle = document.getElementById("toggle-edit");
    if (toggle) {
      toggle.textContent = editor.enabled ? "Edit: On" : "Edit: Off";
      toggle.classList.toggle("active", editor.enabled);
    }
  }
});

window.addEventListener("keyup", (event) => {
  input.delete(event.code);
});

window.addEventListener("resize", resize);

resize();
initWorld().then(() => {
  const spawn = findSpawn();
  player.x = spawn.x;
  player.y = spawn.y;
  buildTileset();
  buildPalette();
  setupMiniMap();
  const slider = document.getElementById("brush-size");
  if (slider) setBrushSize(slider.value);
  requestAnimationFrame(loop);
});

if (window.worldApi) {
  window.worldApi.onRegenerate(async () => {
    generateNewWorld();
    await saveWorld();
    const spawn = findSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
    onBoat = false;
    activeBoat = -1;
    minimap.dirty = true;
  });
}

const toggleEdit = document.getElementById("toggle-edit");
if (toggleEdit) {
  toggleEdit.addEventListener("click", () => {
    editor.enabled = !editor.enabled;
    toggleEdit.textContent = editor.enabled ? "Edit: On" : "Edit: Off";
    toggleEdit.classList.toggle("active", editor.enabled);
  });
}

const toggleBase = document.getElementById("toggle-base");
if (toggleBase) {
  toggleBase.addEventListener("click", () => {
    editor.editBase = !editor.editBase;
    toggleBase.textContent = editor.editBase ? "Base: On" : "Base: Off";
    toggleBase.classList.toggle("active", editor.editBase);
  });
}

const saveButton = document.getElementById("save-world");
if (saveButton) {
  saveButton.addEventListener("click", async () => {
    await saveWorld();
    const toast = document.getElementById("save-toast");
    if (!toast) return;
    toast.classList.add("visible");
    window.clearTimeout(toast.dataset.timerId);
    const timerId = window.setTimeout(() => {
      toast.classList.remove("visible");
    }, 1200);
    toast.dataset.timerId = String(timerId);
  });
}

const brushSlider = document.getElementById("brush-size");
if (brushSlider) {
  brushSlider.addEventListener("input", (event) => {
    setBrushSize(event.target.value);
  });
}

canvas.addEventListener("mousedown", (event) => {
  if (!editor.enabled) return;
  editor.painting = true;
  const rect = canvas.getBoundingClientRect();
  const worldX = event.clientX - rect.left + camera.x;
  const worldY = event.clientY - rect.top + camera.y;
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  paintAt(tileX, tileY);
});

canvas.addEventListener("mousemove", (event) => {
  if (!editor.enabled || !editor.painting) return;
  const rect = canvas.getBoundingClientRect();
  const worldX = event.clientX - rect.left + camera.x;
  const worldY = event.clientY - rect.top + camera.y;
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  paintAt(tileX, tileY);
});

window.addEventListener("mouseup", async () => {
  if (!editor.painting) return;
  editor.painting = false;
  await saveWorld();
  minimap.dirty = true;
});

function setupMiniMap() {
  minimap.canvas = document.getElementById("minimap");
  if (!minimap.canvas) return;
  minimap.ctx = minimap.canvas.getContext("2d");
  minimap.size = minimap.canvas.width;
  minimap.dirty = true;
}

function drawMiniMap(time) {
  if (!minimap.ctx || !worldMap) return;
  const now = time || performance.now();
  if (!minimap.dirty && now - minimap.lastDraw < 250) return;
  minimap.lastDraw = now;
  minimap.dirty = false;

  const size = minimap.size;
  const scale = WORLD_SIZE / size;
  const image = minimap.ctx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y += 1) {
    const mapY = Math.floor(y * scale);
    for (let x = 0; x < size; x += 1) {
      const mapX = Math.floor(x * scale);
      const type = tileAt(mapX, mapY);
      const color = tileTypes[type] ? tileTypes[type].color : "#000000";
      const idx = (y * size + x) * 4;
      const rgb = hexToRgb(color);
      data[idx] = rgb.r;
      data[idx + 1] = rgb.g;
      data[idx + 2] = rgb.b;
      data[idx + 3] = 255;
    }
  }

  minimap.ctx.putImageData(image, 0, 0);

  boats.forEach((boat) => {
    const bx = Math.floor((boat.x / WORLD_SIZE) * size);
    const by = Math.floor((boat.y / WORLD_SIZE) * size);
    minimap.ctx.fillStyle = "#caa267";
    minimap.ctx.fillRect(bx, by, 2, 2);
  });

  for (let y = 0; y < size; y += 1) {
    const mapY = Math.floor(y * scale);
    for (let x = 0; x < size; x += 1) {
      const mapX = Math.floor(x * scale);
      if (isPortTile(tileAt(mapX, mapY))) {
        minimap.ctx.fillStyle = "#f6d08a";
        minimap.ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  const px = Math.floor((player.x / WORLD_SIZE) * size);
  const py = Math.floor((player.y / WORLD_SIZE) * size);
  minimap.ctx.fillStyle = "#f2f2f2";
  minimap.ctx.fillRect(px - 1, py - 1, 3, 3);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}
