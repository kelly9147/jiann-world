import { TILE_SIZE, TILE_TYPES, TILE_INDEX, BASE_SPEED, WORLD_SIZE } from './constants.js';
import { hash2d } from './utils.js';
import { state, setTile, setBaseTile, eraseTile, eraseBaseTile } from './gameState.js'; // Ensure paintAt logic works

export function drawPortTile(tctx, type) {
    // 1. 기본 바닥면 (연한 갈색)
    tctx.fillStyle = "#b08a5f";
    tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    // 바닥 나무 질감 (미세한 격자)
    tctx.strokeStyle = "rgba(0,0,0,0.05)";
    tctx.lineWidth = 1;
    for (let i = 8; i < TILE_SIZE; i += 8) {
        tctx.beginPath(); tctx.moveTo(i, 0); tctx.lineTo(i, TILE_SIZE); tctx.stroke();
        tctx.beginPath(); tctx.moveTo(0, i); tctx.lineTo(TILE_SIZE, i); tctx.stroke();
    }

    // 2. 바깥쪽 벽 두르기 (진한 갈색)
    tctx.fillStyle = "#3e2716";
    const wallThin = 6;
    const wallThick = 12;

    if (type.includes("N")) tctx.fillRect(0, 0, TILE_SIZE, wallThin);
    if (type.includes("S")) tctx.fillRect(0, TILE_SIZE - wallThick, TILE_SIZE, wallThick);
    if (type.includes("W")) tctx.fillRect(0, 0, wallThin, TILE_SIZE);
    if (type.includes("E")) tctx.fillRect(TILE_SIZE - wallThin, 0, wallThin, TILE_SIZE);

    // 'portBoat' 타일에 중앙 배치된 거대 배 그림
    if (type === "portBoat") {
        // 배 그림자
        tctx.fillStyle = "rgba(0,0,0,0.25)";
        tctx.beginPath();
        tctx.ellipse(16, 28, 14, 5, 0, 0, Math.PI * 2);
        tctx.fill();

        // 거대 배 본체
        tctx.fillStyle = "#5d3a1a";
        tctx.beginPath();
        tctx.moveTo(2, 18);
        tctx.lineTo(30, 18);
        tctx.lineTo(26, 28);
        tctx.lineTo(6, 28);
        tctx.closePath();
        tctx.fill();

        // 돛대
        tctx.fillStyle = "#2a180b";
        tctx.fillRect(14, 2, 4, 16);

        // 거대 돛
        tctx.fillStyle = "#f8f9fa";
        tctx.beginPath();
        tctx.moveTo(18, 2);
        tctx.lineTo(32, 10);
        tctx.lineTo(18, 16);
        tctx.closePath();
        tctx.fill();
    }
}

export function drawHouseTile(tctx, type) {
    if (type === "houseWall") {
        tctx.fillStyle = "#5a3826";
        tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        tctx.fillStyle = "rgba(255,255,255,0.08)";
        tctx.fillRect(4, 6, TILE_SIZE - 8, 4);
    } else if (type === "houseFloor") {
        tctx.fillStyle = "#a0734e";
        tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        tctx.fillStyle = "rgba(0,0,0,0.15)";
        tctx.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    } else if (type === "houseDoor") {
        tctx.fillStyle = "#3b2618";
        tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        tctx.fillStyle = "#6b4a2a";
        tctx.fillRect(8, 6, 16, 20);
        tctx.fillStyle = "#d9b88a";
        tctx.fillRect(20, 16, 3, 3);
    } else if (type === "bed") {
        tctx.fillStyle = "#8f6bb3";
        tctx.fillRect(4, 6, 24, 14);
        tctx.fillStyle = "#ede3f6";
        tctx.fillRect(6, 8, 10, 6);
        tctx.fillStyle = "#5a3f73";
        tctx.fillRect(4, 20, 24, 6);
    } else if (type === "kitchen") {
        tctx.fillStyle = "#c29f6c";
        tctx.fillRect(4, 6, 24, 18);
        tctx.fillStyle = "#8f6e3e";
        tctx.fillRect(6, 8, 8, 6);
        tctx.fillStyle = "#6b4a2a";
        tctx.fillRect(18, 8, 8, 12);
    } else if (type === "furniture") {
        tctx.fillStyle = "#6f5a45";
        tctx.fillRect(6, 8, 20, 16);
        tctx.fillStyle = "#3f3124";
        tctx.fillRect(10, 12, 12, 4);
    }
}

export function makeTileSprite(type) {
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = TILE_SIZE;
    tileCanvas.height = TILE_SIZE;
    const tctx = tileCanvas.getContext("2d");

    tctx.fillStyle = TILE_TYPES[type].color;
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

    if (type.startsWith("port")) {
        drawPortTile(tctx, type);
    } else if (["houseWall", "houseFloor", "houseDoor", "bed", "kitchen", "furniture"].includes(type)) {
        drawHouseTile(tctx, type);
    }

    return tileCanvas;
}

export function buildTileset() {
    Object.keys(TILE_TYPES).forEach((type) => {
        state.tileset[type] = makeTileSprite(type);
    });
}

export function buildPalette() {
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
        "portN",
        "portNE",
        "portW",
        "portC",
        "portBoat",
        "portE",
        "portSW",
        "portS",
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
            pctx.drawImage(state.tileset[type], 0, 0);
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
            state.editor.selected = type;
            document.querySelectorAll(".tile-swatch").forEach((node) => {
                node.classList.toggle("active", node.querySelector("div").textContent === type);
            });
        });
        swatch.classList.toggle("active", type === state.editor.selected);
        palette.appendChild(swatch);
    });
    if (!palette.querySelector(".tile-swatch.active")) {
        const first = palette.querySelector(".tile-swatch");
        if (first) {
            first.classList.add("active");
            const label = first.querySelector("div");
            if (label) state.editor.selected = label.textContent;
        }
    }
}

export function drawBoat(ctx, screenX, screenY, camera) {
    // Using passed ctx or global? Renderer uses global ctx but let's pass it for purity if possible.
    // Actually render loop uses global ctx.
    // Let's use global ctx for consistency with original or pass it.
    // Original `drawBoat` used global `ctx`.
    // I should probably import `state.ctx` from gameState.
    const x = Math.round(screenX);
    const y = Math.round(screenY);
    const s = 3.2;
    state.ctx.fillStyle = "#5b3a22";
    state.ctx.beginPath();
    state.ctx.moveTo(x - 10 * s, y + 6 * s);
    state.ctx.lineTo(x + 10 * s, y + 6 * s);
    state.ctx.lineTo(x + 6 * s, y + 12 * s);
    state.ctx.lineTo(x - 6 * s, y + 12 * s);
    state.ctx.closePath();
    state.ctx.fill();
    state.ctx.fillStyle = "#9b7a54";
    state.ctx.fillRect(x - 6 * s, y + 2 * s, 12 * s, 4 * s);
}

export function drawPlayer(screenX, screenY, time, playerState) {
    const ctx = state.ctx;
    const x = Math.round(screenX);
    const y = Math.round(screenY - playerState.jumpOffset);
    const s = 2;
    const walk = Math.min(1, state.playerSpeed / (BASE_SPEED * 2));
    const walkSwing = Math.sin(time * 0.02) * 3 * walk * s;
    const swing = walkSwing + playerState.swing * 6 * s;
    const crouchScale = playerState.crouch ? 0.75 : 1;

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

export function setBrushSize(value) {
    state.editor.brushSize = Math.max(1, Math.min(5, Number(value)));
}

export function paintAt(x, y) {
    const half = state.editor.brushSize - 1;
    for (let dy = -half; dy <= half; dy += 1) {
        for (let dx = -half; dx <= half; dx += 1) {
            if (state.editor.selected === "erase") {
                if (state.editor.editBase) {
                    eraseBaseTile(x + dx, y + dy);
                } else {
                    eraseTile(x + dx, y + dy);
                }
            } else {
                if (!TILE_INDEX[state.editor.selected] && TILE_INDEX[state.editor.selected] !== 0) return;
                setTile(x + dx, y + dy, state.editor.selected);
                if (state.editor.editBase) setBaseTile(x + dx, y + dy, state.editor.selected);
            }
        }
    }
    state.minimap.dirty = true;
}
