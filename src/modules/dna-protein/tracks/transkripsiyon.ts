import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import { camAt, type CamKey } from '../kit/cam';
import { RADIUS, RISE, TWIST, rungSide, setGroove } from '../kit/duplex';
import { hop, tumble } from '../kit/fly';
import { easeBack, hash, seg, smooth, win } from '../kit/math';
import { Nucs } from '../kit/nucs';
import { RNA_HEX, baseColor } from '../kit/palette';
import { Envelope } from '../kit/envelope';
import { PartSet } from '../kit/partSet';
import { PrimSet, unitGeometries } from '../kit/prims';
import { genePlan, type GenePlan } from '../sequence';
import type { TrackEnv, TrackRuntime } from '../types';
import { mrnaPose } from './mrnaPath';
import { buildTranslationPlan } from './translasyonPlan';
import { FLY_T, TRANS_N, addTime, polPos, transChart } from './transTiming';
import { transLabels, type TransPoints } from './transLabels';

// transkripsiyon: RNA polymerase moves along the template strand, a bubble opens, mRNA grows with U, the DNA closes behind
// it; then the mRNA leaves through a nuclear pore (5' end first). DNA axis horizontal, template at the top.

const N = TRANS_N;
export const WALL_X = -8.5;
export const WALL_Z = -4.5;
export const FREE_Y = -3.5;
const SUGAR_A = new Color('#c9b3ec');
const PHOS_A = new Color('#9b7fd0');
const SUGAR_B = new Color('#a6d8e6');
const PHOS_B = new Color('#58a9c4');
const SUGAR_R = new Color('#f2c6df');
const PHOS_R = new Color(RNA_HEX);
const LINK_A = new Color('#7b5aa6');
const LINK_B = new Color('#3f8fa8');
const LINK_R = new Color(RNA_HEX);
const Q_POL = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
const qFree = new Quaternion();
const E = new Vector3();

const xOf = (j: number): number => (j - (N - 1) / 2) * RISE;
const A = new Vector3();
const B = new Vector3();
const C = new Vector3();
const D = new Vector3();
const lift = new Vector3();
const q1 = new Quaternion();
const q2 = new Quaternion();
const qf = new Quaternion();
const m1 = new Matrix4();
const one = new Vector3();
const cc = new Color();

const CAM: CamKey[] = [
  { t: 0, p: [0, 1.8, 17], l: [0, -1.2, 0] },
  { t: 6, p: [-3.5, 2, 15], l: [-4, -1, 0] },
  { t: 11, p: [-2.4, 2, 12.5], l: [xOf(1.5), -1.4, 0] },
  { t: 20, p: [xOf(7) + 1, 2, 13.5], l: [xOf(7), -1.6, 0] },
  { t: 28, p: [xOf(12) + 1, 2.2, 14], l: [xOf(12), -1.8, 0] },
  { t: 32, p: [-2, 2, 18], l: [-2, -1.8, 0] },
  { t: 35, p: [-4, 0.5, 17], l: [-6, -3, -1] },
  { t: 40, p: [-2.5, 0.2, 9.5], l: [-8, -3.2, -3] },
  { t: 44, p: [-4.5, -0.5, 9], l: [-8.5, -3.3, -3.5] },
];

export async function createTranskripsiyon(env: TrackEnv): Promise<TrackRuntime> {
  const { ctx, root, lib, ileri } = env;
  let plan: GenePlan = genePlan(env.options['gene-example'] ?? 'mfgk');
  let aaCol = buildTranslationPlan(plan.mrna).steps.map((s) => s.color);
  const nucs = await Nucs.create(ctx.assets, root, 60, 90, 130, ctx.quality);
  nucs.frame.makeRotationZ(Math.PI / 2).setPosition(-((N - 1) / 2) * RISE, 0, 0);
  const lod = ctx.quality === 'low' ? 1 : 0;
  const pol = await PartSet.create(ctx.assets, 'rna-polymerase', 1, { ghost: 0.3, lod });
  const wall = new Envelope(lib.get('dna-prim', 'clay'), ctx.quality);
  wall.group.position.set(WALL_X, FREE_Y + 0.35, WALL_Z);
  wall.group.scale.setScalar(0.001);
  root.add(pol.group, wall.group);
  const g = unitGeometries(ctx.quality === 'low' ? 0 : 1);
  const bars = new PrimSet(root, g.cylinder, lib.get('dna-prim', 'clay'), 6, 34);

  const slotA = new Int32Array(N);
  const slotB = new Int32Array(N);
  const slotR = new Int32Array(N);
  const pairW = new Float32Array(N);
  const phi = new Float32Array(N);
  const P: TransPoints = { nucs, slotA, slotB, slotR, pol: new Vector3(), pore: new Vector3(WALL_X, FREE_Y + 0.35, WALL_Z), polOn: false, free: 0, shift: 0, codonPos: [0, 1, 2, 3, 4].map(() => new Vector3()), plan };

  const toWorld = (v: Vector3): Vector3 => v.applyMatrix4(nucs.frame);

  const seek = (t: number): void => {
    setGroove(0);
    nucs.begin();
    pol.begin();
    bars.begin();
    const p = polPos(t);
    const bub = win(t, 8.8, 11);
    for (let i = 0; i < N; i++) {
      const w = smooth((Math.abs(i - p) - 1.1) / 1.4);
      pairW[i] = 1 - bub * (1 - w);
    }
    let acc = 0;
    for (let i = 0; i < N; i++) {
      if (i > 0) acc += TWIST * Math.min(pairW[i - 1] as number, pairW[i] as number);
      phi[i] = acc;
    }
    const shift = -17 * win(t, 33.8, 43.2);
    P.shift = shift;
    for (let i = 0; i < N; i++) {
      const open = 1 - (pairW[i] as number);
      const y = -i * RISE;
      rungSide(-1, phi[i] as number, RADIUS, A, q1);
      A.x -= 2.5 * open;
      A.z -= 1.6 * open;
      A.y += y;
      slotA[i] = nucs.place(A, q1, 1, baseColor(plan.coding[i] as string), SUGAR_A, PHOS_A);
      rungSide(1, phi[i] as number, RADIUS, A, q1);
      A.y += y;
      slotB[i] = nucs.place(A, q1, 1, baseColor(plan.template[i] as string), SUGAR_B, PHOS_B);
    }
    // mRNA: hovering behind, flying in, paired in the bubble, peeling off into the free strand
    let free = 0;
    for (let j = 0; j < N; j++) {
      const ta = addTime(j);
      const late = ta - FLY_T - 2.2 - 1.3 * hash(j, 3);
      const appear = ta < 17 ? Math.min(late, 4 + 2 * hash(j)) : late;
      slotR[j] = -1;
      if (t < appear) continue;
      // paired pose (world): the nucleotide takes the place of the displaced coding-strand base
      A.set(-RADIUS, -j * RISE, 0);
      toWorld(A);
      qf.copy(nucs.frameQuat());
      const peel = win(polPos(t) - j, 1.7, 4.6);
      // free pose: row below the DNA, bases up
      mrnaPose(xOf(j) + shift - WALL_X, WALL_X, FREE_Y, 1.3 * (1 - win(t, 31.5, 35)), C, qFree);
      const fly = seg(t, ta - FLY_T, ta);
      let s = 0.9;
      if (t < ta - FLY_T) {
        // hovering
        B.set(xOf(j) + (hash(j, 4) - 0.5) * 2.4, -(2.6 + 1.6 * hash(j, 5)) + 0.2 * Math.sin(t * 1.2 + j), -(3.2 + 2.5 * hash(j, 6)));
        tumble(q2, j + 40, t);
        s = 0.9 * easeBack(seg(t, appear, appear + 0.8));
        D.copy(B);
      } else {
        B.set(xOf(j) + (hash(j, 4) - 0.5) * 2.4, -(2.6 + 1.6 * hash(j, 5)), -(3.2 + 2.5 * hash(j, 6)));
        lift.set(0, -0.9, 1.6);
        hop(D, B, A, fly, lift);
        tumble(q2, j + 40, t);
        q1.copy(qf);
        q2.slerp(q1, smooth(seg(fly, 0.4, 1)));
        s = 0.9 + 0.1 * fly;
        if (peel > 0) {
          lift.set(0, -0.3, 0.8);
          hop(D, A, C, peel, lift);
          q2.copy(qf).slerp(qFree, smooth(peel));
          free += peel;
          s = 1;
        }
      }
      cc.copy(baseColor(plan.mrna[j] as string));
      slotR[j] = nucs.placeWorld(D, q2, s, cc, SUGAR_R, PHOS_R);
    }
    P.free = free;
    for (let i = 0; i < N; i++) {
      const dots = plan.template[i] === 'A' || plan.template[i] === 'T' ? 2 : 3;
      nucs.bond(slotA[i] as number, slotB[i] as number, dots, pairW[i] as number);
      const r = slotR[i] as number;
      if (r >= 0) nucs.bond(slotB[i] as number, r, dots, win(t, addTime(i), addTime(i) + 0.5) * (1 - win(polPos(t) - i, 1.5, 2.6)));
      if (i < N - 1) {
        nucs.link(slotA[i] as number, slotA[i + 1] as number, LINK_A);
        nucs.link(slotB[i + 1] as number, slotB[i] as number, LINK_B);
        nucs.link(slotR[i] as number, slotR[i + 1] as number, LINK_R, win(t, addTime(i + 1), addTime(i + 1) + 0.5));
      }
    }
    // polymerase
    const ps = easeBack(seg(t, 6.2, 8.8)) * (1 - win(t, 31.2, 32.8));
    P.polOn = ps > 0.5;
    if (ps > 0.02) {
      const land = seg(t, 6.2, 9);
      const site = Math.min(Math.max(p, 0.5), N + 1);
      A.set(-0.2, -site * RISE, -0.5);
      toWorld(A);
      B.set(-5.5, 7, -5);
      lift.set(0, 2, 0);
      hop(C, B, A, land, lift);
      const out = win(t, 31.2, 32.8);
      C.x += 6 * out;
      C.y += 5 * out;
      m1.compose(C, q1.copy(Q_POL).premultiply(nucs.frameQuat()), one.set(1.2 * ps, 1.2 * ps, 1.2 * ps));
      pol.push(m1);
      P.pol.copy(C);
    }
    // nuclear envelope with the pore: grows out of the pore once the mRNA is done
    wall.group.scale.setScalar(Math.max(0.001, win(t, 29.5, 33)));
    // codon bars over the finished mRNA, coloured like the amino acid they will give
    const z0 = 1.3 * (1 - win(t, 31.5, 35));
    for (let c = 0; c < N / 3; c++) {
      const j0 = c * 3;
      const k = win(polPos(t) - (j0 + 2), 3.4, 4.6);
      mrnaPose(xOf(j0) + shift - WALL_X, WALL_X, FREE_Y + 1.25, z0, A, q1);
      mrnaPose(xOf(j0 + 2) + shift - WALL_X, WALL_X, FREE_Y + 1.25, z0, B, q1);
      (P.codonPos[c] as Vector3).copy(A).add(B).multiplyScalar(0.5);
      if (k > 0.02) {
        E.copy(A).lerp(B, 0.5);
        A.lerp(E, 1 - k);
        B.lerp(E, 1 - k);
        bars.between(A.x, A.y, A.z, B.x, B.y, B.z, 0.07, aaCol[c] ?? cc);
      }
    }
    nucs.end();
    pol.end();
    bars.end();
  };

  return {
    duration: 44,
    seek,
    cameraAt: (t) => camAt(CAM, t),
    labelsAt: (t) => transLabels(t, ileri, P),
    chartAt: transChart,
    setOptions: (o) => {
      plan = genePlan(o['gene-example'] ?? 'mfgk');
      P.plan = plan;
      aaCol = buildTranslationPlan(plan.mrna).steps.map((s) => s.color);
    },
    dispose: () => {
      nucs.dispose();
      pol.dispose();
      wall.dispose();
      bars.dispose();
    },
  };
}
