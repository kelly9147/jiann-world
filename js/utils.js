export function hash2d(x, y, seed = 1337) {
    let h = x * 374761393 + y * 668265263 + seed * 982451653;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

export function valueNoise(x, y, scale, seed) {
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

export function fbm(x, y, seed) {
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

export function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return { r, g, b };
}
