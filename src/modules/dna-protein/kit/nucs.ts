import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import type { Group } from 'three';
import type { ModuleAssets } from '../../../scene';
import { PartSet } from './partSet';
import { PrimSet, unitGeometries } from './prims';
import { BASE_LEN, PHOS_COLOR, SUGAR_COLOR, WHITE } from './palette';

// Native nucleotide asset (docs/ASSETS.md): flat in XY, sugar at the origin, phosphate at (-0.38, 0.28), base reaching to
// (+0.9, -0.15). The 5'->3' chain of a native nucleotide runs DOWN the Y axis (the phosphate sits on its 5' side, above).
export const SUGAR_PT = new Vector3(-0.085, 0.035, 0);
export const PHOS_PT = new Vector3(-0.38, 0.28, 0);
export const TIP_PT = new Vector3(0.9, -0.15, 0);

const BASE_ROOT = new Vector3(0.1, -0.15, 0);
const _b = new Matrix4();
const _sc = new Matrix4();
const _tr = new Matrix4();
const _m = new Matrix4();
const _f = new Matrix4();
const _s = new Vector3();
const _v = new Vector3();

/**
 * Draws nucleotides (the `nucleotide` asset, base tinted per letter), backbone links and hydrogen-bond dots for one
 * track. `frame` maps the track's local coordinates to the world (e.g. DNA axis Y to screen X). Per frame:
 * `begin()`, `place` / `link` / `bond`, `end()`; the slot returned by `place` is only valid inside that frame.
 */
export class Nucs {
  readonly parts: PartSet;
  readonly links: PrimSet;
  readonly dots: PrimSet;
  readonly frame = new Matrix4();
  private readonly fq = new Quaternion();
  private readonly sugar: Float32Array;
  private readonly phos: Float32Array;
  private readonly tip: Float32Array;
  private readonly scale: Float32Array;

  private constructor(parts: PartSet, links: PrimSet, dots: PrimSet, cap: number) {
    this.parts = parts;
    this.links = links;
    this.dots = dots;
    this.sugar = new Float32Array(cap * 3);
    this.phos = new Float32Array(cap * 3);
    this.tip = new Float32Array(cap * 3);
    this.scale = new Float32Array(cap);
  }

  static async create(assets: ModuleAssets, root: Group, cap: number, linkCap: number, dotCap: number, quality: string): Promise<Nucs> {
    const parts = await PartSet.create(assets, 'nucleotide', cap, { lod: quality === 'low' ? 1 : 0 });
    const g = unitGeometries(quality === 'low' ? 0 : 1);
    const clay = assets.materials.get('dna-prim', 'clay');
    const links = new PrimSet(root, g.cylinder, clay, linkCap, 31);
    const dots = new PrimSet(root, g.sphere, clay, dotCap, 32);
    root.add(parts.group);
    return new Nucs(parts, links, dots, cap);
  }

  /** Rotation part of `frame` (the frame must not scale). */
  frameQuat(): Quaternion {
    return this.fq.setFromRotationMatrix(this.frame);
  }

  begin(): void {
    this.parts.begin();
    this.links.begin();
    this.dots.begin();
  }

  /** Places one nucleotide; `base` tints the base, `sugar` / `phos` (optional) tint the backbone parts. */
  place(pos: Vector3, quat: Quaternion, scale: number, base: Color, sugar: Color | null = null, phos: Color | null = null): number {
    if (scale <= 0.002) return -1;
    _m.compose(pos, quat, _s.setScalar(scale));
    _f.multiplyMatrices(this.frame, _m);
    return this.add(_f, scale, base, sugar, phos);
  }

  private add(mat: Matrix4, scale: number, base: Color, sugar: Color | null, phos: Color | null): number {
    const i = this.parts.push(mat);
    const len = BASE_LEN.get(base) ?? 1;
    if (len !== 1) {
      // purines are longer than pyrimidines: stretch the base part from its root so every pair spans the same width
      _b.makeTranslation(BASE_ROOT.x, BASE_ROOT.y, 0).premultiply(mat);
      _b.multiply(_sc.makeScale(len, 1, 1)).multiply(_tr.makeTranslation(-BASE_ROOT.x, -BASE_ROOT.y, 0));
      this.parts.setPart(i, 'base', _b);
    }
    this.parts.tint(i, base, 'base');
    this.parts.tint(i, sugar ?? SUGAR_COLOR, 'sugar');
    this.parts.tint(i, phos ?? PHOS_COLOR, 'phosphate');
    _v.copy(SUGAR_PT).applyMatrix4(mat).toArray(this.sugar, i * 3);
    _v.copy(PHOS_PT).applyMatrix4(mat).toArray(this.phos, i * 3);
    _v.copy(TIP_PT).sub(BASE_ROOT).multiplyScalar(len).add(BASE_ROOT).applyMatrix4(mat).toArray(this.tip, i * 3);
    this.scale[i] = scale;
    return i;
  }

  /** Like `place` but the pose is already in world coordinates (the track frame is not applied). */
  placeWorld(pos: Vector3, quat: Quaternion, scale: number, base: Color, sugar: Color | null = null, phos: Color | null = null): number {
    if (scale <= 0.002) return -1;
    _f.compose(pos, quat, _s.setScalar(scale));
    return this.add(_f, scale, base, sugar, phos);
  }

  /** Backbone bond from the sugar of `a` to the phosphate of `b` (its 3' neighbour); `grow` 0..1 draws part of it. */
  link(a: number, b: number, color: Color, grow = 1, r = 0.05): void {
    if (a < 0 || b < 0 || grow <= 0.01) return;
    const s = this.sugar;
    const p = this.phos;
    const k = Math.min(1, grow);
    const rr = r * Math.min(this.scale[a] as number, this.scale[b] as number);
    const ax = s[a * 3] as number;
    const ay = s[a * 3 + 1] as number;
    const az = s[a * 3 + 2] as number;
    this.links.between(ax, ay, az, ax + ((p[b * 3] as number) - ax) * k, ay + ((p[b * 3 + 1] as number) - ay) * k, az + ((p[b * 3 + 2] as number) - az) * k, rr, color);
  }

  /** Hydrogen-bond dots between the base tips of `a` and `b`. */
  bond(a: number, b: number, count: number, show = 1, r = 0.045): void {
    if (a < 0 || b < 0 || show <= 0.01) return;
    const t = this.tip;
    const rr = r * show * Math.min(this.scale[a] as number, this.scale[b] as number);
    for (let k = 0; k < count; k++) {
      const u = (k + 1) / (count + 1);
      const x = (t[a * 3] as number) * (1 - u) + (t[b * 3] as number) * u;
      const y = (t[a * 3 + 1] as number) * (1 - u) + (t[b * 3 + 1] as number) * u;
      const z = (t[a * 3 + 2] as number) * (1 - u) + (t[b * 3 + 2] as number) * u;
      this.dots.sphere(x, y, z, rr, WHITE);
    }
  }

  /** World position of a point of a slot (sugar, phosphate or base tip) written into `out`. */
  point(slot: number, which: 'sugar' | 'phos' | 'tip', out: Vector3): Vector3 {
    const arr = which === 'sugar' ? this.sugar : which === 'phos' ? this.phos : this.tip;
    return out.set(arr[slot * 3] as number, arr[slot * 3 + 1] as number, arr[slot * 3 + 2] as number);
  }

  end(): void {
    this.parts.end();
    this.links.end();
    this.dots.end();
  }

  dispose(): void {
    this.parts.dispose();
    this.links.dispose();
    this.dots.dispose();
  }
}
