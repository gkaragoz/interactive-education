import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import type { ModuleLabel } from '../../../scene';
import { camAt, type CamKey } from '../kit/cam';
import { RADIUS, RISE, TWIST, rungSide, setGroove } from '../kit/duplex';
import { hop, tumble } from '../kit/fly';
import { clamp01, easeBack, hash, seg, smooth, win } from '../kit/math';
import { Nucs } from '../kit/nucs';
import { baseColor } from '../kit/palette';
import { PrimSet, unitGeometries } from '../kit/prims';
import { COMPLEMENT_DNA } from '../sequence';
import type { TrackEnv, TrackRuntime } from '../types';
import { yapiLabels, type YapiPoints } from './yapiLabels';

// dna-yapisi: one nucleotide, the four bases, a single strand, base pairing, the twist into a double helix, antiparallel
// arrows and the zoom out to gene, chromatin and chromosome. Strand A is the native nucleotide chain (5' top, 3' bottom).

export const YAPI_SEQ = 'ATGCGATC';
const COMP = [...YAPI_SEQ].map((b) => COMPLEMENT_DNA[b] as string);
export const YAPI_N = YAPI_SEQ.length;
const N = YAPI_N;
const TOP = ((N - 1) / 2) * RISE;
export const yapiY = (i: number): number => TOP - i * RISE;
const STRAND_A = new Color('#7b5aa6');
const STRAND_B = new Color('#3f8fa8');
const GENE = new Color('#8f5bd6');
const SUGAR_B = new Color('#a6d8e6');
const PHOS_B = new Color('#58a9c4');
const ROW_X = [-4.5, -1.5, 1.5, 4.5];
export const yapiArrA = (i: number): number => (i < 4 ? 8.4 + 0.15 * i : 8.6 + 0.95 * (i - 3));
export const yapiArrB = (i: number): number => 14.6 + 1.1 * i;
const FLY = 1.9;

const CAM: CamKey[] = [
  { t: 0, p: [2.5, 1.2, 9.5], l: [0.7, -0.1, 0] },
  { t: 4.5, p: [1.2, 1.0, 10], l: [0.7, -0.1, 0] },
  { t: 6.5, p: [0, 1.5, 15], l: [0, 0, 0] },
  { t: 9, p: [2, 1.2, 12], l: [0, 0, 0] },
  { t: 14, p: [4, 1.2, 11.5], l: [0.8, 0, 0] },
  { t: 24, p: [4, 1.2, 11.5], l: [0, 0, 0] },
  { t: 30, p: [5, 2.2, 11], l: [0, 0, 0] },
  { t: 37, p: [-5, 2, 11.5], l: [0, 0, 0] },
  { t: 38.6, p: [-3, 2, 12], l: [0, 0, 0] },
  { t: 40, p: [0, 2.5, 22], l: [0, 0, 0] },
  { t: 44, p: [0, 3.5, 24], l: [0, 0, 0] },
];

/** Twist weight (0 ladder .. 1 helix) and global spin of the helix at time t. */
const twist = (t: number): number => win(t, 24, 30);
const spin = (t: number): number => {
  const u = Math.max(0, t - 24);
  return 0.35 * u * smooth(u / 3);
};
export const yapiPhi = (t: number, i: number): number => twist(t) * TWIST * i + spin(t);

const pos = new Vector3();
const pos2 = new Vector3();
const lift = new Vector3();
const mid = new Vector3();
const quat = new Quaternion();
const quat2 = new Quaternion();
const _m = new Matrix4();

export async function createYapi(env: TrackEnv): Promise<TrackRuntime> {
  const { ctx, root, lib, ileri } = env;
  const nucs = await Nucs.create(ctx.assets, root, 24, 40, 40, ctx.quality);
  const g = unitGeometries(ctx.quality === 'low' ? 0 : 1);
  const clay = lib.get('dna-prim', 'clay');
  const arrows = new PrimSet(root, g.cylinder, clay, 4, 33);
  const heads = new PrimSet(root, g.cone, clay, 4, 33);
  const tube = new PrimSet(root, g.torus, clay, 2, 33);
  const chromatin = await ctx.assets.instances('chromatin', 1, '#9b7bd0');
  const chromosome = await ctx.assets.instances('chromosome', 1, '#b79ad8');
  chromatin.setTint(0, '#ffffff');
  chromosome.setTint(0, '#d9c4ee');
  root.add(chromatin.group, chromosome.group);

  const slotA = new Int32Array(N).fill(-1);
  const slotB = new Int32Array(N).fill(-1);
  const P: YapiPoints = { slotA, slotB, nucs, shrink: 0, bracket: 0, arrow: 0, chromatin: 0, chromosome: 0 };

  const seek = (t: number): void => {
    setGroove(ileri ? 0.62 * twist(t) : 0);
    nucs.begin();
    arrows.begin();
    heads.begin();
    tube.begin();
    slotA.fill(-1);
    slotB.fill(-1);
    const z = win(t, 39.2, 41.4);
    const sc = 1 - 0.58 * z;
    P.shrink = z;
    nucs.frame.makeScale(sc, sc, sc).setPosition(-7.2 * z, 0, 0);

    // strand A: hero nucleotide, the row of four bases, then the vertical strand
    for (let i = 0; i < N; i++) {
      rungSide(-1, yapiPhi(t, i), RADIUS, pos, quat);
      pos.y += yapiY(i);
      let scale = 1;
      if (i < 4) {
        const toSlot = win(t, 7 + 0.15 * i, 8.4 + 0.15 * i);
        const grow = i === 0 ? clamp01(easeBack(seg(t, 0, 1.6))) : t < 4.9 + 0.35 * i ? 0 : clamp01(easeBack(seg(t, 4.9 + 0.35 * i, 5.8 + 0.35 * i)));
        const toRow = i === 0 ? win(t, 4.6, 6.2) : 1;
        pos2.set(0, 0, 0).lerp(mid.set(ROW_X[i] as number, 0, 0), toRow);
        pos.lerpVectors(pos2, pos, toSlot);
        const big = i === 0 ? 3 - toRow : 2;
        scale = (big + (1 - big) * toSlot) * grow;
        const ry = (i === 0 ? 0.55 : 0.5) * Math.sin(t * 0.55 + i) * (1 - toSlot);
        quat2.set(0, Math.sin(ry / 2), 0, Math.cos(ry / 2));
        quat.copy(quat2.slerp(quat, toSlot));
      } else {
        const ta = yapiArrA(i);
        const s = seg(t, ta - FLY, ta);
        pos2.set(-11.5, yapiY(i) + (hash(i) - 0.5) * 4, 3 * (hash(i, 2) - 0.5));
        lift.set(0, 1.2, 1.5);
        hop(mid, pos2, pos, s, lift);
        tumble(quat2, i, t);
        quat.copy(quat2.slerp(quat, smooth(seg(s, 0.45, 1))));
        pos.copy(mid);
        scale = t < ta - FLY ? 0 : easeBack(seg(s, 0, 0.25));
      }
      slotA[i] = nucs.place(pos, quat, scale, baseColor(YAPI_SEQ[i] as string));
    }

    // strand B: the complementary nucleotides arrive from the right
    for (let i = 0; i < N; i++) {
      const ta = yapiArrB(i);
      if (t < ta - FLY) continue;
      rungSide(1, yapiPhi(t, i), RADIUS, pos, quat);
      pos.y += yapiY(i);
      const s = seg(t, ta - FLY, ta);
      pos2.set(9 + 2.5 * hash(i + 9), yapiY(i) + (hash(i + 3) - 0.5) * 4, 3.5 * (hash(i + 5) - 0.5));
      lift.set(0, 1.0, 1.6);
      hop(mid, pos2, pos, s, lift);
      tumble(quat2, i + 20, t);
      quat.copy(quat2.slerp(quat, smooth(seg(s, 0.45, 1))));
      slotB[i] = nucs.place(mid, quat, easeBack(seg(s, 0, 0.25)), baseColor(COMP[i] as string), SUGAR_B, PHOS_B);
    }

    for (let i = 0; i < N - 1; i++) {
      const a0 = slotA[i] as number;
      const a1 = slotA[i + 1] as number;
      if (a0 >= 0 && a1 >= 0) nucs.link(a0, a1, STRAND_A, win(t, yapiArrA(i + 1) - 0.1, yapiArrA(i + 1) + 0.6));
      const b0 = slotB[i] as number;
      const b1 = slotB[i + 1] as number;
      if (b0 >= 0 && b1 >= 0) nucs.link(b1, b0, STRAND_B, win(t, yapiArrB(i + 1) - 0.1, yapiArrB(i + 1) + 0.6));
    }
    for (let i = 0; i < N; i++) {
      const a = slotA[i] as number;
      const b = slotB[i] as number;
      if (a >= 0 && b >= 0) nucs.bond(a, b, YAPI_SEQ[i] === 'A' || YAPI_SEQ[i] === 'T' ? 2 : 3, win(t, yapiArrB(i) - 0.15, yapiArrB(i) + 0.5));
    }

    // antiparallel arrows (İleri only)
    P.arrow = ileri ? win(t, 31.5, 33) * (1 - win(t, 38.4, 39.2)) : 0;
    if (P.arrow > 0.01) {
      const top = yapiY(0) + 0.45;
      const bot = yapiY(N - 1) - 0.45;
      const k = P.arrow;
      arrows.between(-2.3, top, 0, -2.3, top - (top - bot - 0.4) * k, 0, 0.045, STRAND_A);
      heads.between(-2.3, top - (top - bot - 0.4) * k, 0, -2.3, top - (top - bot) * k, 0, 0.14, STRAND_A);
      arrows.between(2.3, bot, 0, 2.3, bot + (top - bot - 0.4) * k, 0, 0.045, STRAND_B);
      heads.between(2.3, bot + (top - bot - 0.4) * k, 0, 2.3, bot + (top - bot) * k, 0, 0.14, STRAND_B);
    }
    // the gene: a translucent tube round base pairs 2..5
    P.bracket = win(t, 38.3, 39.2);
    if (P.bracket > 0.01) {
      const f = nucs.frame.elements;
      const s = f[0] as number;
      const r = 2.0 * P.bracket * s;
      tube.ring(f[12] as number, (yapiY(2) + 0.45) * s, 0, r, GENE);
      tube.ring(f[12] as number, (yapiY(5) - 0.45) * s, 0, r, GENE);
    }
    nucs.end();
    arrows.end();
    heads.end();
    tube.end();

    P.chromatin = easeBack(seg(t, 40.4, 41.6));
    P.chromosome = easeBack(seg(t, 41.8, 43));
    chromatin.setMatrix(0, _m.makeScale(2.1 * clamp01(P.chromatin), 2.1 * clamp01(P.chromatin), 2.1 * clamp01(P.chromatin)));
    const c = 3.3 * clamp01(P.chromosome);
    chromosome.setMatrix(0, _m.makeScale(c, c, c).setPosition(7.2, 0, 0));
    chromatin.commit();
    chromosome.commit();
  };

  return {
    duration: 44,
    seek,
    cameraAt: (t) => camAt(CAM, t),
    labelsAt: (t): ModuleLabel[] => yapiLabels(t, ileri, P),
    chartAt: (t) => {
      let paired = 0;
      let linkedB = 0;
      for (let i = 0; i < N; i++) {
        paired += win(t, yapiArrB(i) - 0.15, yapiArrB(i) + 0.5);
        if (i < N - 1) linkedB += win(t, yapiArrB(i + 1) - 0.1, yapiArrB(i + 1) + 0.6);
      }
      return { 'baz-cifti': paired, 'zincir-sayisi': win(t, 7.5, 9.5) + linkedB / (N - 1) };
    },
    dispose: () => {
      nucs.dispose();
      arrows.dispose();
      heads.dispose();
      tube.dispose();
      chromatin.dispose();
      chromosome.dispose();
    },
  };
}
