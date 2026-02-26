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
    tctx.lineWidth = 2;
    tctx.strokeStyle = "#000000";

    if (type === "houseWall") {
        // Red Japanese Temple Wall
        tctx.fillStyle = "#ef5350";
        tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        // White stucco trim
        tctx.fillStyle = "#ffffff";
        tctx.fillRect(0, TILE_SIZE - 12, TILE_SIZE, 12);
        tctx.strokeRect(0, TILE_SIZE - 12, TILE_SIZE, 12);
        // Wooden pillars
        tctx.fillStyle = "#4e342e";
        tctx.fillRect(2, 0, 4, TILE_SIZE);
        tctx.strokeRect(2, 0, 4, TILE_SIZE);
        tctx.fillRect(TILE_SIZE - 6, 0, 4, TILE_SIZE);
        tctx.strokeRect(TILE_SIZE - 6, 0, 4, TILE_SIZE);
    } else if (type === "houseFloor") {
        // Tatami mat style / Bamboo
        tctx.fillStyle = "#dce775";
        tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        tctx.strokeStyle = "rgba(0,0,0,0.1)";
        tctx.lineWidth = 1;
        for (let i = 4; i < TILE_SIZE; i += 4) {
            tctx.strokeRect(i, 2, 8, TILE_SIZE - 4);
        }
    } else if (type === "houseDoor") {
        // Shoji Screen Door
        tctx.fillStyle = "#4e342e";
        tctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        tctx.fillStyle = "#fff8e1"; // paper
        tctx.fillRect(4, 4, 10, 24);
        tctx.strokeRect(4, 4, 10, 24);
        tctx.fillRect(18, 4, 10, 24);
        tctx.strokeRect(18, 4, 10, 24);
        // grid lines
        tctx.fillStyle = "#4e342e";
        for (let i = 10; i < 28; i += 6) {
            tctx.fillRect(4, i, 10, 2);
            tctx.fillRect(18, i, 10, 2);
        }
    } else if (type === "bed") {
        // Futon
        tctx.fillStyle = "#d7ccc8";
        tctx.fillRect(4, 4, 24, 24);
        tctx.strokeRect(4, 4, 24, 24);
        tctx.fillStyle = "#29b6f6"; // blanket
        tctx.fillRect(4, 12, 24, 16);
        tctx.strokeRect(4, 12, 24, 16);
        tctx.fillStyle = "#ffffff"; // pillow
        tctx.fillRect(10, 6, 12, 4);
        tctx.strokeRect(10, 6, 12, 4);
    } else if (type === "kitchen") {
        // Wooden counter
        tctx.fillStyle = "#ffb74d";
        tctx.fillRect(2, 8, 28, 16);
        tctx.strokeRect(2, 8, 28, 16);
        tctx.fillStyle = "#37474f"; // stove
        tctx.fillRect(4, 10, 8, 8);
        tctx.strokeRect(4, 10, 8, 8);
    } else if (type === "furniture") {
        // Low table
        tctx.fillStyle = "#6d4c41";
        tctx.fillRect(4, 8, 24, 16);
        tctx.strokeRect(4, 8, 24, 16);
        tctx.fillStyle = "#5d4037"; // table border
        tctx.fillRect(4, 8, 24, 4);
        // tea cup?
        tctx.fillStyle = "#9ccc65";
        tctx.fillRect(14, 4, 4, 4);
        tctx.strokeRect(14, 4, 4, 4);
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
        tctx.strokeStyle = "#000000";
        tctx.lineWidth = 2;
        tctx.lineJoin = "round";

        tctx.fillStyle = "#90a4ae";
        tctx.beginPath();
        tctx.moveTo(4, TILE_SIZE - 4);
        tctx.lineTo(TILE_SIZE * 0.5, 6);
        tctx.lineTo(TILE_SIZE - 4, TILE_SIZE - 4);
        tctx.closePath();
        tctx.fill();
        tctx.stroke();

        tctx.fillStyle = "#cfd8dc"; // snow cap
        tctx.beginPath();
        tctx.moveTo(TILE_SIZE * 0.5, 6);
        tctx.lineTo(11, 14);
        tctx.lineTo(21, 14);
        tctx.closePath();
        tctx.fill();
        tctx.stroke();
    }

    if (type === "forest") {
        // Cherry blossoms (sakura)
        tctx.strokeStyle = "#000000";
        tctx.lineWidth = 2;

        tctx.beginPath();
        tctx.arc(12, 14, 8, 0, Math.PI * 2);
        tctx.arc(20, 14, 8, 0, Math.PI * 2);
        tctx.arc(16, 8, 8, 0, Math.PI * 2);
        tctx.fillStyle = "#f8bbd0"; // light pink
        tctx.fill();
        tctx.stroke();

        // petals
        tctx.fillStyle = "#ff80ab";
        tctx.beginPath();
        tctx.arc(10, 16, 4, 0, Math.PI * 2);
        tctx.arc(22, 16, 4, 0, Math.PI * 2);
        tctx.fill();
    }

    if (type === "tree") {
        tctx.strokeStyle = "#000000";
        tctx.lineWidth = 2;

        tctx.fillStyle = "#6d4c41"; // trunk
        tctx.fillRect(14, 20, 4, 8);
        tctx.strokeRect(14, 20, 4, 8);

        // Bamboo/Pine
        tctx.fillStyle = "#2e7d32";
        tctx.beginPath();
        tctx.moveTo(16, 4);
        tctx.lineTo(6, 20);
        tctx.lineTo(26, 20);
        tctx.closePath();
        tctx.fill();
        tctx.stroke();
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
    state.ctx.lineWidth = 2;
    state.ctx.strokeStyle = "#000000";
    state.ctx.fillStyle = "#5b3a22";
    state.ctx.beginPath();
    state.ctx.moveTo(x - 10 * s, y + 6 * s);
    state.ctx.lineTo(x + 10 * s, y + 6 * s);
    state.ctx.lineTo(x + 6 * s, y + 12 * s);
    state.ctx.lineTo(x - 6 * s, y + 12 * s);
    state.ctx.closePath();
    state.ctx.fill();
    state.ctx.stroke();
    state.ctx.fillStyle = "#9b7a54";
    state.ctx.fillRect(x - 6 * s, y + 2 * s, 12 * s, 4 * s);
    state.ctx.strokeRect(x - 6 * s, y + 2 * s, 12 * s, 4 * s);
}

const LUCKY_PALETTE = {
    '.': null,
    'K': '#1a1a1a', // Outline
    'O': '#f57c00', // Orange fur
    'B': '#37474f', // Black/dark gray fur
    'W': '#ffffff', // White fur
    'P': '#f48fb1', // Pink for nose/ears
    'R': '#d32f2f', // Red scarf
    'Y': '#fbc02d', // Yellow for bell/accents
    'L': '#1976d2', // Blue clothes
    'E': '#000000', // Eyes
    'S': '#90a4ae', // Sword blade
};

// 16x16 Base Frame
const LUCKY_IDLE = [
    "....KK......KK..",
    "...KOOK....KBBK.",
    "...KOPK....KPBK.",
    "..KOWWKKKKKKWWBK",
    "..KOWWWWWWWWWWBK",
    ".KWWWWWWWWWWWWBK",
    ".KWWWEWWWWWEWWBK",
    ".KWWWWWWPWWWWWBK",
    "..KWWWWWWWWWWWK.",
    "...KKKKKRRYKKK..",
    "...KLLRRRRRLLK..",
    "...KWLLLLLLLWK..",
    "....KWWK.KWWK...",
    "....KKK...KKK...",
    "................",
    "................"
];

const LUCKY_WALK = [
    "....KK......KK..",
    "...KOOK....KBBK.",
    "...KOPK....KPBK.",
    "..KOWWKKKKKKWWBK",
    "..KOWWWWWWWWWWBK",
    ".KWWWWWWWWWWWWBK",
    ".KWWWEWWWWWEWWBK",
    ".KWWWWWWPWWWWWBK",
    "..KWWWWWWWWWWWK.",
    "...KKKKKRRYKKK..",
    "...KLLRRRRRLLK..",
    "...KWLLLLLLLWK..",
    "....KWWK...KK...",
    "....KKK.........",
    "................",
    "................"
];


const LUCKY_WALK_2 = [
    "....KK......KK..",
    "...KOOK....KBBK.",
    "...KOPK....KPBK.",
    "..KOWWKKKKKKWWBK",
    "..KOWWWWWWWWWWBK",
    ".KWWWWWWWWWWWWBK",
    ".KWWWEWWWWWEWWBK",
    ".KWWWWWWPWWWWWBK",
    "..KWWWWWWWWWWWK.",
    "...KKKKKRRYKKK..",
    "...KLLRRRRRLLK..",
    "...KWLLLLLLLWK..",
    "......KK.KWWK...",
    ".........KKK....",
    "................",
    "................"
];

function drawSprite(ctx, x, y, spriteArr, scale, flip = false) {
    const height = spriteArr.length;
    const width = spriteArr[0].length;
    const px = Math.floor(x - (width * scale) / 2);
    const py = Math.floor(y - height * scale + scale * 4);

    ctx.save();
    if (flip) {
        ctx.translate(px + width * scale, py);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(px, py);
    }

    for (let r = 0; r < height; r++) {
        const row = spriteArr[r];
        for (let c = 0; c < width; c++) {
            const char = row[c];
            if (LUCKY_PALETTE[char]) {
                ctx.fillStyle = LUCKY_PALETTE[char];
                ctx.fillRect(c * scale, r * scale, scale, scale);
            }
        }
    }
    ctx.restore();
}

export function drawPlayer(screenX, screenY, time, playerState) {
    const ctx = state.ctx;
    const s = 3; // pixel scale factor - increased for bigger Lucky!

    // Jump and wobble
    const curY = Math.round(screenY - playerState.jumpOffset);

    // Animation timing
    const walk = Math.min(1, state.playerSpeed / (BASE_SPEED * 2));
    const isWalking = walk > 0.1;

    // Alternating 4-step walk cycle
    const walkPhase = Math.floor(time * 0.008) % 4;
    let frame = LUCKY_IDLE;

    if (isWalking) {
        if (walkPhase === 0) frame = LUCKY_WALK;
        else if (walkPhase === 1) frame = LUCKY_IDLE;
        else if (walkPhase === 2) frame = LUCKY_WALK_2;
        else if (walkPhase === 3) frame = LUCKY_IDLE;
    }

    drawSprite(ctx, screenX, curY + (playerState.crouch ? 6 : 0), frame, s, false);

    if (state.equipped) {
        const swing = playerState.swing * 15;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = LUCKY_PALETTE['K'];
        ctx.beginPath();
        ctx.moveTo(screenX + 10, curY - 5 - swing);
        ctx.lineTo(screenX + 25, curY - 15 - swing);
        ctx.stroke();

        ctx.strokeStyle = LUCKY_PALETTE['S'];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(screenX + 11, curY - 6 - swing);
        ctx.lineTo(screenX + 24, curY - 14 - swing);
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
