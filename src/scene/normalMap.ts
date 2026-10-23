import { CanvasTexture, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping } from 'three';
import { mulberry32 } from '../core';

/** Periodic value noise: the lattice wraps, so the generated texture tiles without seams. */
function periodicNoise(size: number, cells: number, rng: () => number): Float32Array {
  const lattice = new Float32Array(cells * cells);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng();
  const out = new Float32Array(size * size);
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smooth(fx - x0);
      const ty = smooth(fy - y0);
      const at = (ix: number, iy: number): number => lattice[(iy % cells) * cells + (ix % cells)] ?? 0;
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      out[y * size + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}

/** Height field: a few octaves of periodic noise, 0..1. Deterministic for a seed. */
export function heightField(size: number, seed: number): Float32Array {
  const rng = mulberry32(seed);
  const height = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (const cells of [4, 8, 16, 32]) {
    const layer = periodicNoise(size, cells, rng);
    for (let i = 0; i < height.length; i++) height[i] = (height[i] ?? 0) + (layer[i] ?? 0) * amp;
    total += amp;
    amp *= 0.55;
  }
  for (let i = 0; i < height.length; i++) height[i] = (height[i] ?? 0) / total;
  return height;
}

/** Tangent-space normal map pixels (RGBA8) from a height field, with wrap-around differences. */
export function normalPixels(height: Float32Array, size: number, strength: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(size * size * 4);
  const hAt = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)] ?? 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * strength;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      px[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      px[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      px[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      px[o + 3] = 255;
    }
  }
  return px;
}

/** Shared tileable micro-normal texture that gives every clay surface its soft grain. */
export function createMicroNormalTexture(size = 256): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const pixels = normalPixels(heightField(size, 0x5eed), size, 5);
    ctx.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, size, size), 0, 0);
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = NoColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
