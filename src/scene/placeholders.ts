import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32, hashString } from '../core';
import type { AssetPart, OrganelleAsset } from './assetTypes';
import { disposeAsset } from './assetTypes';
import type { SurfaceKind } from './materials';

export type ShellShape = 'ellipsoid' | 'rounded-box' | 'capsule';

interface Piece {
  geometry: BufferGeometry;
  matrix?: Matrix4;
  /** Multiplies the base colour (e.g. nucleolus darker). */
  tint?: number;
  kind?: SurfaceKind;
  flip?: boolean;
  alpha?: number;
  name?: string;
}

const LOD_SEGMENTS = [1, 0.6, 0.35];

const mat = (p: [number, number, number], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]): Matrix4 =>
  new Matrix4().compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(...r)), new Vector3(...s));

const seg = (n: number, k: number, min = 6): number => Math.max(min, Math.round(n * k));

/** Box-projected UVs (0..1 per 2 µm), the same convention as the authored assets. */
function boxProjectUV(geometry: BufferGeometry): void {
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const [x, y, z] = [pos.getX(i) / 2, pos.getY(i) / 2, pos.getZ(i) / 2];
    if (nx >= ny && nx >= nz) uv.set([y, z], i * 2);
    else if (ny >= nz) uv.set([x, z], i * 2);
    else uv.set([x, y], i * 2);
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

function bake(pieces: Piece[], kind: SurfaceKind, baseColor: Color, name: string): BufferGeometry | null {
  const parts: BufferGeometry[] = [];
  for (const piece of pieces) {
    if ((piece.kind ?? 'clay') !== kind) continue;
    let g = piece.geometry.clone();
    if (piece.matrix) g.applyMatrix4(piece.matrix);
    if (g.index) g = g.toNonIndexed();
    if (piece.flip) {
      const p = g.getAttribute('position');
      const n = g.getAttribute('normal');
      for (let i = 0; i < p.count; i += 3) {
        const [ax, ay, az] = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, ax, ay, az);
      }
      for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    }
    g.deleteAttribute('uv');
    boxProjectUV(g);
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const comps = kind === 'gel' ? 4 : 3;
    const col = new Float32Array(pos.count * comps);
    const tint = piece.tint ?? 1;
    const rng = mulberry32(hashString(name));
    const hueShift = rng() * 0.1;
    for (let i = 0; i < pos.count; i++) {
      // Baked "ambient occlusion": surfaces facing down are a little darker, plus slow colour drift.
      const shade = (0.78 + 0.22 * (nor.getY(i) * 0.5 + 0.5)) * tint;
      const drift = 1 + 0.06 * Math.sin(pos.getX(i) * 0.9 + pos.getZ(i) * 0.7 + hueShift * 20);
      col[i * comps] = baseColor.r * shade * drift;
      col[i * comps + 1] = baseColor.g * shade * drift;
      col[i * comps + 2] = baseColor.b * shade * drift;
      if (comps === 4) col[i * comps + 3] = piece.alpha ?? 0.5;
    }
    g.setAttribute('color', new Float32BufferAttribute(col, comps));
    parts.push(g);
    if (g !== piece.geometry) piece.geometry.dispose();
  }
  if (parts.length === 0) return null;
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const p of parts) p.dispose();
  if (!merged) return null;
  merged.computeBoundingSphere();
  merged.name = name;
  return merged;
}

function wobbleSphere(r: number, wseg: number, hseg: number, amp: number, seed: number): BufferGeometry {
  const g = new SphereGeometry(r, wseg, hseg);
  const p = g.getAttribute('position');
  const rng = mulberry32(seed);
  const [a, b, c] = [rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < p.count; i++) {
    const v = new Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const k = 1 + amp * (Math.sin(v.x * 1.3 + a) * Math.sin(v.y * 1.1 + b) + Math.sin(v.z * 1.7 + c)) * 0.5;
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function stack(n: number, w: number, d: number, t: number, bend: number, k: number): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const g = new CapsuleGeometry(t, w, seg(4, k, 3), seg(14, k, 8));
    const y = (i - (n - 1) / 2) * t * 2.9;
    pieces.push({ geometry: g, matrix: mat([0, y, 0], [0, 0, Math.PI / 2], [1, 1, d / w]), tint: 0.9 + 0.04 * (i % 3) });
    if (bend) pieces[pieces.length - 1]!.matrix!.premultiply(new Matrix4().makeRotationX(0.04 * (i - n / 2) * bend));
  }
  return pieces;
}

function piecesFor(id: string, k: number): Piece[] {
  const S = (r: number, w = 28, h = 18): SphereGeometry => new SphereGeometry(r, seg(w, k, 8), seg(h, k, 6));
  switch (id) {
    case 'nucleus':
      return [{ geometry: wobbleSphere(3, seg(40, k, 10), seg(28, k, 8), 0.05, 7) }];
    case 'mitochondrion':
      return [{ geometry: new CapsuleGeometry(0.6, 2, seg(8, k, 4), seg(20, k, 8)), matrix: mat([0, 0, 0], [0, 0, Math.PI / 2]) }];
    case 'chloroplast':
      return [{ geometry: S(1, 32, 20), matrix: mat([0, 0, 0], [0, 0, 0], [2.5, 1.2, 1.2]) }];
    case 'golgi':
      return stack(5, 2.2, 1.4, 0.18, 1, k);
    case 'rough-er':
    case 'smooth-er': {
      const pieces: Piece[] = [];
      for (let i = 0; i < 4; i++) {
        pieces.push({ geometry: new CapsuleGeometry(0.2, 2.6, seg(4, k, 3), seg(12, k, 6)), matrix: mat([0, (i - 1.5) * 0.7, Math.sin(i * 1.7) * 0.4], [0, 0, Math.PI / 2], [1, 1, 3]) });
      }
      return id === 'smooth-er' ? [{ geometry: new TorusKnotGeometry(1.3, 0.25, seg(80, k, 24), seg(10, k, 5), 2, 3) }] : pieces;
    }
    case 'ribosome': {
      const rng = mulberry32(11);
      return Array.from({ length: 8 }, () => ({
        geometry: S(0.16, 10, 8),
        matrix: mat([(rng() - 0.5) * 0.9, (rng() - 0.5) * 0.9, (rng() - 0.5) * 0.9]),
      }));
    }
    case 'lysosome':
      return [{ geometry: S(0.55, 20, 14) }];
    case 'centrosome':
      return [
        { geometry: new CylinderGeometry(0.22, 0.22, 1.5, seg(14, k, 6)), matrix: mat([0, 0, 0.3]) },
        { geometry: new CylinderGeometry(0.22, 0.22, 1.5, seg(14, k, 6)), matrix: mat([0.3, 0, -0.3], [0, 0, Math.PI / 2]) },
      ];
    case 'vacuole':
      return [{ geometry: wobbleSphere(1, seg(36, k, 10), seg(26, k, 8), 0.04, 5), kind: 'gel', alpha: 0.55, matrix: mat([0, 0, 0], [0, 0, 0], [5, 7, 4]) }];
    case 'nucleoid':
      return [{ geometry: new TorusKnotGeometry(0.6, 0.18, seg(90, k, 24), seg(10, k, 5), 3, 5) }];
    case 'plasmid':
      return [{ geometry: new TorusGeometry(0.3, 0.07, seg(8, k, 4), seg(24, k, 8)) }];
    case 'flagellum': {
      const curve = new CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new Vector3(i * 0.9 - 3.6, Math.sin(i * 1.3) * 0.35, Math.cos(i * 1.3) * 0.2)));
      return [{ geometry: new TubeGeometry(curve, seg(60, k, 16), 0.07, seg(8, k, 4), false) }];
    }
    case 'cytoskeleton': {
      // A gently curved filament, 6 long.
      const curve = new CatmullRomCurve3(Array.from({ length: 7 }, (_, i) => new Vector3(i - 3, Math.sin(i * 0.9) * 0.25, Math.cos(i * 0.7) * 0.2)));
      return [{ geometry: new TubeGeometry(curve, seg(24, k, 8), 0.045, seg(6, k, 4), false), tint: 1.1 }];
    }
    case 'vesicle':
      return [{ geometry: S(0.34, 14, 10) }];
    case 'pilus':
      return [{ geometry: new CylinderGeometry(0.035, 0.035, 2, seg(8, k, 4)), matrix: mat([0, 0, 0], [0, 0, Math.PI / 2]) }];
    default:
      return [{ geometry: S(0.8) }];
  }
}

/** Unit-sized closed shell geometry for the given outline: radius 1 along each half extent. */
function unitShell(shape: ShellShape, k: number, inset: number): BufferGeometry {
  const w = seg(48, k, 12);
  if (shape === 'ellipsoid') return new SphereGeometry(inset, w, seg(32, k, 8));
  if (shape === 'capsule') {
    // Longest axis X: total half length 1, radius 0.4 (the layout solver recomputes it from the real half extents).
    return new CapsuleGeometry(0.4 * inset, 2 * (1 - 0.4) * inset, seg(10, k, 4), seg(28, k, 10)).rotateZ(Math.PI / 2);
  }
  const g = new BoxGeometry(2 * inset, 2 * inset, 2 * inset, seg(14, k, 4), seg(14, k, 4), seg(14, k, 4));
  const p = g.getAttribute('position');
  const rho = 0.3 * inset;
  const inner = inset - rho;
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const c = new Vector3(Math.max(-inner, Math.min(inner, v.x)), Math.max(-inner, Math.min(inner, v.y)), Math.max(-inner, Math.min(inner, v.z)));
    const d = v.clone().sub(c).normalize().multiplyScalar(rho);
    v.copy(c).add(d);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function shellPieces(id: string, shape: ShellShape, k: number): Piece[] {
  const hollow = (outer: number, inner: number, alpha: number, tint = 1): Piece[] => [
    { geometry: unitShell(shape, k, outer), kind: 'gel', alpha, tint },
    { geometry: unitShell(shape, k, inner), kind: 'gel', alpha, tint, flip: true },
  ];
  switch (id) {
    case 'wall-plant':
      return hollow(1, 0.955, 0.62, 0.95);
    case 'membrane-plant':
      return hollow(0.94, 0.925, 0.4);
    case 'membrane-animal':
      return hollow(1, 0.975, 0.35);
    case 'envelope-bacterium':
      return [...hollow(1, 0.97, 0.18, 1.05), ...hollow(0.93, 0.9, 0.38, 0.95), ...hollow(0.86, 0.84, 0.45)];
    default:
      return hollow(1, 0.97, 0.4);
  }
}

export function isShellId(id: string): boolean {
  return /^(membrane|wall|envelope)-/.test(id);
}

/** Builds a primitive stand-in for an organelle, used while the GLB is missing so the app is fully usable without assets. */
export function makePlaceholderAsset(id: string, colorHex: string, shape: ShellShape = 'ellipsoid'): OrganelleAsset {
  const color = new Color(colorHex);
  const lods: AssetPart[][] = LOD_SEGMENTS.map((k, lodIndex) => {
    const pieces = isShellId(id) ? shellPieces(id, shape, k) : piecesFor(id, k);
    const parts: AssetPart[] = [];
    for (const kind of ['clay', 'gel'] as const) {
      const geometry = bake(pieces, kind, color, `${id}-${kind}-lod${lodIndex}`);
      if (geometry) parts.push({ name: `${id}-${kind}`, geometry, kind });
    }
    for (const p of pieces) p.geometry.dispose();
    return parts;
  });
  const box = new Vector3();
  let radius = 0;
  for (const part of lods[0] ?? []) {
    part.geometry.computeBoundingBox();
    const b = part.geometry.boundingBox;
    if (b) {
      box.max(new Vector3(Math.max(Math.abs(b.min.x), Math.abs(b.max.x)), Math.max(Math.abs(b.min.y), Math.abs(b.max.y)), Math.max(Math.abs(b.min.z), Math.abs(b.max.z))));
    }
    part.geometry.computeBoundingSphere();
    radius = Math.max(radius, part.geometry.boundingSphere?.radius ?? 0);
  }
  const asset: OrganelleAsset = {
    id,
    lods,
    boundsRadius: radius,
    halfExtents: [box.x, box.y, box.z],
    placeholder: true,
    meta: null,
    dispose: () => disposeAsset(asset),
  };
  return asset;
}

/**
 * Closed, outward-facing outline of a cell shell in absolute units (matches `shellSdf` in layout.ts): the cutaway uses
 * it to fill the cavity on the cut plane. Capsules run along the longest axis (X).
 */
export function shellProxyGeometry(shape: ShellShape, halfExtents: [number, number, number]): BufferGeometry {
  const [hx, hy, hz] = halfExtents;
  if (shape === 'ellipsoid') return new SphereGeometry(1, 40, 28).scale(hx, hy, hz);
  if (shape === 'capsule') {
    const radius = Math.min(hy, hz);
    return new CapsuleGeometry(radius, 2 * Math.max(hx - radius, 0), 8, 24).rotateZ(Math.PI / 2);
  }
  const rho = 0.3 * Math.min(hx, hy, hz);
  const g = new BoxGeometry(2 * hx, 2 * hy, 2 * hz, 14, 14, 14);
  const p = g.getAttribute('position');
  const inner = new Vector3(hx - rho, hy - rho, hz - rho);
  const v = new Vector3();
  const c = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    c.set(Math.max(-inner.x, Math.min(inner.x, v.x)), Math.max(-inner.y, Math.min(inner.y, v.y)), Math.max(-inner.z, Math.min(inner.z, v.z)));
    v.sub(c).normalize().multiplyScalar(rho).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
