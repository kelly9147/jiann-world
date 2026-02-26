import {
  BASE_SPEED,
  WORLD_SIZE,
  TILE_SIZE,
  WORLD_VERSION,
  TILE_TYPES,
  TILE_INDEX
} from "./js/constants.js";
import { hexToRgb } from "./js/utils.js";
import {
  state,
  initState,
  tileAt,
  isPortTile,
  isWalkableOnFoot,
  isWalkable,
  isWater
} from "./js/gameState.js";
import {
  paintAt,
  buildTileset,
  buildPalette,
  setBrushSize,
  drawBoat,
  drawPlayer
} from "./js/graphics.js";
import {
  findSpawn,
  generateNewWorld
} from "./js/worldGen.js";


// --- Persistence ---

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
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Failed to decode world data:", e);
    return null;
  }
}

function serializeBoats() {
  if (!state.boats.length) return "";
  return state.boats.map((boat) => `${boat.x},${boat.y}`).join(";");
}

function deserializeBoats(value) {
  state.boats.length = 0;
  if (!value) return;
  value.split(";").forEach((entry) => {
    const [x, y] = entry.split(",").map((item) => Number(item));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      state.boats.push({ x, y });
    }
  });
}

async function saveWorld() {
  if (!state.worldMap || !state.baseMap) return;
  const data = `${WORLD_VERSION}:${encodeMap(state.baseMap)}:${encodeMap(state.worldMap)}:${serializeBoats()}`;
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

  try {
    state.baseMap = decodeWorld(parts[1]);
    state.worldMap = decodeWorld(parts[2]);
    deserializeBoats(parts[3] || "");

    if (
      !state.baseMap ||
      !state.worldMap ||
      state.baseMap.length !== WORLD_SIZE * WORLD_SIZE ||
      state.worldMap.length !== WORLD_SIZE * WORLD_SIZE
    ) {
      throw new Error("Invalid map data");
    }
    return true;
  } catch (e) {
    console.warn("World save corrupted, forcing regen:", e);
    state.worldMap = null;
    state.baseMap = null;
    return false;
  }
}

async function initWorld() {
  const loaded = await loadWorld();
  if (!loaded) {
    generateNewWorld();
    await saveWorld();
  }
  state.onBoat = false;
  state.activeBoat = -1;
}

// --- Boat Logic ---

function findNearbyBoat(x, y, radius = 1.5) {
  for (let i = 0; i < state.boats.length; i += 1) {
    const boat = state.boats[i];
    const dx = boat.x - x;
    const dy = boat.y - y;
    if (Math.hypot(dx, dy) <= radius) return i;
  }
  return -1;
}

function tryBoardBoat() {
  if (state.onBoat) return false;
  const px = Math.floor(state.player.x);
  const py = Math.floor(state.player.y);
  const idx = findNearbyBoat(px, py);
  if (idx === -1) return false;
  const boat = state.boats[idx];
  const tile = tileAt(boat.x, boat.y);
  if (!isWater(tile) && !isPortTile(tile)) return false;
  state.onBoat = true;
  state.activeBoat = idx;
  state.player.x = boat.x;
  state.player.y = boat.y;
  return true;
}

function tryDisembark() {
  if (!state.onBoat) return false;
  const px = Math.floor(state.player.x);
  const py = Math.floor(state.player.y);
  const candidates = [
    { x: px + 1, y: py },
    { x: px - 1, y: py },
    { x: px, y: py + 1 },
    { x: px, y: py - 1 }
  ];
  const land = candidates.find((pos) => isWalkableOnFoot(tileAt(pos.x, pos.y)));
  if (!land) return false;
  state.onBoat = false;
  state.activeBoat = -1;
  state.player.x = land.x;
  state.player.y = land.y;
  return true;
}

// --- Rendering & Update ---

function resize() {
  const dpr = window.devicePixelRatio || 1;
  state.canvas.width = Math.floor(window.innerWidth * dpr);
  state.canvas.height = Math.floor(window.innerHeight * dpr);
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.ctx.imageSmoothingEnabled = false;
}

function update(dt) {
  let dx = 0;
  let dy = 0;
  const speed = BASE_SPEED * (state.input.has("ShiftLeft") || state.input.has("ShiftRight") ? 2 : 1);

  if (state.input.has("ArrowUp") || state.input.has("KeyW")) dy -= 1;
  if (state.input.has("ArrowDown") || state.input.has("KeyS")) dy += 1;
  if (state.input.has("ArrowLeft") || state.input.has("KeyA")) dx -= 1;
  if (state.input.has("ArrowRight") || state.input.has("KeyD")) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    const nextX = state.player.x + (dx / length) * speed * dt;
    const nextY = state.player.y + (dy / length) * speed * dt;
    if (isWalkable(nextX, state.player.y)) state.player.x = nextX;
    if (isWalkable(state.player.x, nextY)) state.player.y = nextY;
  }

  state.player.x = Math.max(0, Math.min(WORLD_SIZE - 1, state.player.x));
  state.player.y = Math.max(0, Math.min(WORLD_SIZE - 1, state.player.y));

  if (state.onBoat && state.boats[state.activeBoat]) {
    state.boats[state.activeBoat].x = Math.floor(state.player.x);
    state.boats[state.activeBoat].y = Math.floor(state.player.y);
  }

  if (dt > 0) {
    const movedX = state.player.x - state.playerPrev.x;
    const movedY = state.player.y - state.playerPrev.y;
    state.playerSpeed = Math.hypot(movedX, movedY) / dt;
    state.playerPrev.x = state.player.x;
    state.playerPrev.y = state.player.y;
  }

  if (state.swingTimer > 0) {
    state.swingTimer = Math.max(0, state.swingTimer - dt);
  }

  if (state.jumpOffset > 0 || state.jumpVelocity > 0) {
    state.jumpVelocity -= 900 * dt;
    state.jumpOffset += state.jumpVelocity * dt;
    if (state.jumpOffset <= 0) {
      state.jumpOffset = 0;
      state.jumpVelocity = 0;
    }
  }

  state.camera.x = state.player.x * TILE_SIZE - window.innerWidth / 2;
  state.camera.y = state.player.y * TILE_SIZE - window.innerHeight / 2;
  state.camera.x = Math.max(0, Math.min(state.camera.x, WORLD_SIZE * TILE_SIZE - window.innerWidth));
  state.camera.y = Math.max(0, Math.min(state.camera.y, WORLD_SIZE * TILE_SIZE - window.innerHeight));
}

function setupMiniMap() {
  state.minimap.canvas = document.getElementById("minimap");
  if (!state.minimap.canvas) return;
  state.minimap.ctx = state.minimap.canvas.getContext("2d");
  state.minimap.size = state.minimap.canvas.width;
  state.minimap.dirty = true;
}

function drawMiniMap(time) {
  if (!state.minimap.ctx || !state.worldMap) return;
  const now = time || performance.now();
  if (!state.minimap.dirty && now - state.minimap.lastDraw < 250) return;
  state.minimap.lastDraw = now;
  state.minimap.dirty = false;

  const size = state.minimap.size;
  const scale = WORLD_SIZE / size;
  const image = state.minimap.ctx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y += 1) {
    const mapY = Math.floor(y * scale);
    for (let x = 0; x < size; x += 1) {
      const mapX = Math.floor(x * scale);
      const type = tileAt(mapX, mapY);
      const color = TILE_TYPES[type] ? TILE_TYPES[type].color : "#000000";
      const idx = (y * size + x) * 4;
      const rgb = hexToRgb(color);
      data[idx] = rgb.r;
      data[idx + 1] = rgb.g;
      data[idx + 2] = rgb.b;
      data[idx + 3] = 255;
    }
  }

  state.minimap.ctx.putImageData(image, 0, 0);

  state.boats.forEach((boat) => {
    const bx = Math.floor((boat.x / WORLD_SIZE) * size);
    const by = Math.floor((boat.y / WORLD_SIZE) * size);
    state.minimap.ctx.fillStyle = "#caa267";
    state.minimap.ctx.fillRect(bx, by, 2, 2);
  });

  for (let y = 0; y < size; y += 1) {
    const mapY = Math.floor(y * scale);
    for (let x = 0; x < size; x += 1) {
      const mapX = Math.floor(x * scale);
      if (isPortTile(tileAt(mapX, mapY))) {
        state.minimap.ctx.fillStyle = "#f6d08a";
        state.minimap.ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  const px = Math.floor((state.player.x / WORLD_SIZE) * size);
  const py = Math.floor((state.player.y / WORLD_SIZE) * size);
  state.minimap.ctx.fillStyle = "#f2f2f2";
  state.minimap.ctx.fillRect(px - 1, py - 1, 3, 3);
}

function render(time) {
  state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  const startX = Math.floor(state.camera.x / TILE_SIZE);
  const startY = Math.floor(state.camera.y / TILE_SIZE);
  const endX = Math.min(WORLD_SIZE, startX + Math.ceil(window.innerWidth / TILE_SIZE) + 2);
  const endY = Math.min(WORLD_SIZE, startY + Math.ceil(window.innerHeight / TILE_SIZE) + 2);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const type = tileAt(x, y);
      const sprite = state.tileset[type];
      const screenX = x * TILE_SIZE - state.camera.x;
      const screenY = y * TILE_SIZE - state.camera.y;
      state.ctx.drawImage(sprite, screenX, screenY);
    }
  }

  state.boats.forEach((boat) => {
    if (
      boat.x >= startX &&
      boat.x <= endX &&
      boat.y >= startY &&
      boat.y <= endY
    ) {
      const screenX = boat.x * TILE_SIZE - state.camera.x + TILE_SIZE / 2;
      const screenY = boat.y * TILE_SIZE - state.camera.y + TILE_SIZE / 2;
      drawBoat(state.ctx, screenX, screenY);
    }
  });

  const swingPhase = state.swingTimer > 0 ? 1 - state.swingTimer / 0.35 : 0;
  const swingAmount = state.swingTimer > 0 ? Math.sin(swingPhase * Math.PI) : 0;
  drawPlayer(
    state.player.x * TILE_SIZE - state.camera.x + TILE_SIZE / 2,
    state.player.y * TILE_SIZE - state.camera.y + TILE_SIZE / 2,
    time,
    {
      jumpOffset: state.jumpOffset,
      swing: swingAmount,
      crouch: state.crouched,
      equipped: state.equipped
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

// --- Init & Events ---

window.addEventListener("keydown", (event) => {
  state.input.add(event.code);
  if (event.code === "Space" && !event.repeat) {
    if (state.jumpOffset === 0 && !state.crouched) {
      state.jumpVelocity = 260;
    }
  }
  if (event.code === "KeyZ" && !event.repeat) {
    if (state.onBoat) {
      if (!tryDisembark()) {
        state.swingTimer = 0.35;
      } else {
        saveWorld();
      }
    } else if (!tryBoardBoat()) {
      state.swingTimer = 0.35;
    } else {
      saveWorld();
    }
  }
  if (event.code === "KeyE" && !event.repeat) {
    state.equipped = !state.equipped;
  }
  if (event.code === "KeyX" && !event.repeat) {
    state.crouched = !state.crouched;
  }
  if (event.code === "KeyF") {
    state.editor.enabled = !state.editor.enabled;
    const toggle = document.getElementById("toggle-edit");
    if (toggle) {
      toggle.textContent = state.editor.enabled ? "Edit: On" : "Edit: Off";
      toggle.classList.toggle("active", state.editor.enabled);
    }
  }
});

window.addEventListener("keyup", (event) => {
  state.input.delete(event.code);
});

window.addEventListener("resize", resize);

function exitGame() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.log(err));
  }
  document.getElementById("game-container").style.display = "none";
  document.getElementById("home-screen").style.display = "flex";
}

function startGame(useFullscreen = false) {
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("game-container").style.display = "block";

  if (useFullscreen && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.log("Error attempting to enable fullscreen:", err);
    });
  }

  initState();
  resize();
  initWorld().then(() => {
    const spawn = findSpawn();
    state.player.x = spawn.x;
    state.player.y = spawn.y;
    buildTileset();
    buildPalette();
    setupMiniMap();
    setupUI();
    requestAnimationFrame(loop);
  });
}

function initApp() {
  const btn1 = document.getElementById("start-btn-1");
  const btn2 = document.getElementById("start-btn-2");
  if (btn1) btn1.addEventListener("click", () => startGame(true));
  if (btn2) btn2.addEventListener("click", () => startGame(true));

  const exitBtn = document.getElementById("exit-btn");
  if (exitBtn) {
    exitBtn.addEventListener("click", exitGame);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

if (window.worldApi) {
  window.worldApi.onRegenerate(async () => {
    generateNewWorld();
    await saveWorld();
    const spawn = findSpawn();
    state.player.x = spawn.x;
    state.player.y = spawn.y;
    state.onBoat = false;
    state.activeBoat = -1;
    state.minimap.dirty = true;
  });
}

function setupUI() {
  const toggleEdit = document.getElementById("toggle-edit");
  if (toggleEdit) {
    toggleEdit.addEventListener("click", () => {
      state.editor.enabled = !state.editor.enabled;
      toggleEdit.textContent = state.editor.enabled ? "Edit: On" : "Edit: Off";
      toggleEdit.classList.toggle("active", state.editor.enabled);
    });
  }

  const toggleBase = document.getElementById("toggle-base");
  if (toggleBase) {
    toggleBase.addEventListener("click", () => {
      state.editor.editBase = !state.editor.editBase;
      toggleBase.textContent = state.editor.editBase ? "Base: On" : "Base: Off";
      toggleBase.classList.toggle("active", state.editor.editBase);
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

  const canvas = state.canvas; // 여기서 안전하게 state.canvas 사용
  if (canvas) {
    canvas.addEventListener("mousedown", (event) => {
      if (!state.editor.enabled) return;
      state.editor.painting = true;
      const rect = canvas.getBoundingClientRect();
      const worldX = event.clientX - rect.left + state.camera.x;
      const worldY = event.clientY - rect.top + state.camera.y;
      const tileX = Math.floor(worldX / TILE_SIZE);
      const tileY = Math.floor(worldY / TILE_SIZE);
      paintAt(tileX, tileY);
    });

    canvas.addEventListener("mousemove", (event) => {
      if (!state.editor.enabled || !state.editor.painting) return;
      const rect = canvas.getBoundingClientRect();
      const worldX = event.clientX - rect.left + state.camera.x;
      const worldY = event.clientY - rect.top + state.camera.y;
      const tileX = Math.floor(worldX / TILE_SIZE);
      const tileY = Math.floor(worldY / TILE_SIZE);
      paintAt(tileX, tileY);
    });
  }

  window.addEventListener("mouseup", async () => {
    if (!state.editor.painting) return;
    state.editor.painting = false;
    await saveWorld();
    state.minimap.dirty = true;
  });

  const seaInput = document.getElementById("sea-level");
  if (seaInput) {
    seaInput.addEventListener("input", (e) => {
      state.seaLevelThreshold = parseInt(e.target.value, 10) / 100;
    });
  }

  const regenBtn = document.getElementById("regen-world");
  if (regenBtn) {
    regenBtn.addEventListener("click", () => {
      generateNewWorld();
      state.minimap.dirty = true;
    });
  }

  const minimapCanvas = document.getElementById("minimap");
  if (minimapCanvas) {
    minimapCanvas.addEventListener("click", () => {
      minimapCanvas.classList.toggle("expanded");
    });
  }
}
