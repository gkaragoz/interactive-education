import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import { camAt, type CamKey } from '../kit/cam';
import { RADIUS, RISE, TWIST, rungSide, setGroove } from '../kit/duplex';
import { hop, tumble } from '../kit/fly';
import { easeBack, hash, seg, smooth, win } from '../kit/math';
import { Nucs } from '../kit/nucs';
import { NEW_HEX, OLD_HEX, PRIMER_HEX, baseColor } from '../kit/palette';
import { PartSet } from '../kit/partSet';
import { COMPLEMENT_DNA } from '../sequence';
import type { TrackEnv, TrackRuntime } from '../types';
import { repliLabels, type RepliPoints } from './repliLabels';
import { FLY, FRAG, FRAGS, REPLI_N, fragStart, forkTime, lagIndex, lagTime, leadIndex, leadTime, repliChart, sealTime } from './repliTiming';

// replikasyon: helicase opens a fork, DNA polymerase adds complementary nucleotides (leading strand continuous, lagging
// strand in Okazaki fragments), result: two helices each with one old and one new strand. Local frame: DNA axis Y
// (base pair i at y = -i * RISE); the frame turns it to run left to right with the fork moving right.

const N = REPLI_N;
export const REPLI_SEQ = 'ATGCGTACCGATTGCA';
const OLD_S = new Color('#b4acf0');
const OLD_P = new Color(OLD_HEX);
const AMB_S = new Color('#f6d48a');
const AMB_P = new Color('#e0912a');
const LINK_AMB = new Color('#e0912a');
const NEW_S = new Color('#b8f09a');
const NEW_P = new Color(NEW_HEX);
const LINK_OLD = new Color(OLD_HEX);
const LINK_NEW = new Color(NEW_HEX);
const PRIMER = new Color(PRIMER_HEX);
const FLASH = new Color('#fff7c2');
const DEF_S = new Color('#ece2cf');
const DEF_P = new Color('#cdbca2');
const DMAX = 2.6;

const CAM: CamKey[] = [
  { t: 0, p: [0, 1.5, 15], l: [0, 0, 0] },
  { t: 6, p: [-3.2, 1.5, 14.5], l: [-3.4, 0, 0] },
  { t: 14, p: [-1.5, 2.5, 16], l: [-2.4, 0.2, 0] },
  { t: 24, p: [1.5, 2.8, 17], l: [0.5, 0, 0] },
  { t: 32, p: [2.5, 2.5, 18], l: [1.2, 0, 0] },
  { t: 38, p: [0, 2.5, 20], l: [0, 0, 0] },
  { t: 48, p: [-3, 3.5, 22], l: [0, 0, 0] },
  { t: 56, p: [3, 3.5, 22], l: [0, 0, 0] },
];

const frameLocal = (x: number): number => (x - (N - 1) / 2) * RISE;
const dsepAt = (t: number, idx: number, dmax: number): number => dmax * win(t, forkTime(idx), forkTime(idx) + 6);

const A = new Vector3();
const B = new Vector3();
const H = new Vector3();
const C = new Vector3();
const lift = new Vector3();
const q1 = new Quaternion();
const q2 = new Quaternion();
const cs = new Color();
const cp = new Color();
const m1 = new Matrix4();
const m2 = new Matrix4();
const one = new Vector3();
const qId = new Quaternion();

export async function createReplikasyon(env: TrackEnv): Promise<TrackRuntime> {
  const { ctx, root, ileri } = env;
  const nucs = await Nucs.create(ctx.assets, root, 72, 110, 170, ctx.quality);
  nucs.frame.makeRotationZ(Math.PI / 2).setPosition(-((N - 1) / 2) * RISE, 0, 0);
  const helicase = await PartSet.create(ctx.assets, 'helicase', 1, { ghost: 0.4, lod: ctx.quality === 'low' ? 1 : 0 });
  const poly = await PartSet.create(ctx.assets, 'dna-polymerase', 5, { lod: ctx.quality === 'low' ? 1 : 0 });
  root.add(helicase.group, poly.group);

  const oldA = new Int32Array(N);
  const oldB = new Int32Array(N);
  const newA = new Int32Array(N);
  const newB = new Int32Array(N);
  const pairA = new Float32Array(N);
  const pairB = new Float32Array(N);
  const phiAs = new Float32Array(N);
  const phiBs = new Float32Array(N);
  const P: RepliPoints = { nucs, oldA, oldB, newA, newB, fork: new Vector3(), helicase: new Vector3(), lead: new Vector3(), lag: [0, 1, 2, 3].map(() => new Vector3()), lagOn: [false, false, false, false], leadOn: false, forkOn: false, dmax: DMAX };

  const toWorld = (v: Vector3): Vector3 => v.applyMatrix4(nucs.frame);
  const matrixFor = (out: Matrix4, p: Vector3, s: number, ry = 0): Matrix4 => {
    q1.set(0, Math.sin(ry / 2), 0, Math.cos(ry / 2));
    m1.compose(p, q1, one.set(s, s, s));
    return out.multiplyMatrices(nucs.frame, m1);
  };

  /** Colours of sugar and phosphate: strand role, primer and the "just attached" blend. */
  const tints = (isNew: boolean, primer: boolean, t: number, ta: number, amber = false): void => {
    if (!isNew) {
      cs.copy(amber ? AMB_S : OLD_S);
      cp.copy(amber ? AMB_P : OLD_P);
      return;
    }
    const k = win(t, ta - 0.4, ta + 0.3);
    cs.copy(primer && ileri ? PRIMER : NEW_S);
    cp.copy(primer && ileri ? PRIMER : NEW_P);
    if (primer && ileri) {
      const r = win(t, 38, 40);
      cs.lerp(NEW_S, r);
      cp.lerp(NEW_P, r);
    }
    cs.lerpColors(DEF_S, cs, k);
    cp.lerpColors(DEF_P, cp, k);
  };

  /** One new nucleotide: hovering behind the DNA, flying in, then snapped on. Returns its slot (or -1). */
  const placeNew = (t: number, i: number, lead: boolean, final: Vector3, finalQ: Quaternion, ta: number, letter: string, primer: boolean): number => {
    const k = (lead ? 0 : N) + i;
    // only a handful of nucleotides are about at any time: each shows up shortly before its flight
    const appear = ta - FLY - 1.6 - 0.8 * hash(k, 7);
    if (t < appear) return -1;
    const flight = seg(t, ta - FLY, ta);
    H.set((lead ? 1 : -1) * (1.4 + 2 * hash(k, 4)), -i * RISE + (hash(k, 5) - 0.5) * 3, -3.2 - 2.5 * hash(k, 6));
    H.y += 0.18 * Math.sin(t * 1.3 + k * 1.7);
    H.x += 0.14 * Math.sin(t * 0.9 + k);
    tumble(q2, k, t);
    let s = 0.9 * easeBack(seg(t, appear, appear + 0.8));
    if (t >= ta - FLY) {
      lift.set(lead ? 1.5 : -1.5, 1.2, 1.4);
      A.copy(H);
      hop(C, A, final, flight, lift);
      q2.slerp(finalQ, smooth(seg(flight, 0.4, 1)));
      s = 0.9 + 0.1 * flight;
      A.copy(C);
    } else A.copy(H);
    tints(true, primer, t, ta);
    const slot = nucs.place(A, q2, s, baseColor(letter), cs, cp);
    return slot;
  };

  const seek = (t: number): void => {
    setGroove(0);
    nucs.begin();
    poly.begin();
    helicase.begin();
    const dmax = DMAX + 1.7 * win(t, 38, 48);
    P.dmax = dmax;
    // twist phase per daughter rung: the helix keeps its twist only between paired rungs, so neighbours never differ by
    // more than one twist step (no stretched bonds) and an unpaired old nucleotide lies flat
    let accA = 0;
    let accB = 0;
    for (let i = 0; i < N; i++) {
      const open = win(t, forkTime(i), forkTime(i) + 1.6);
      pairA[i] = 1 - open * (1 - win(t, lagTime(i), lagTime(i) + 1.5));
      pairB[i] = 1 - open * (1 - win(t, leadTime(i), leadTime(i) + 1.5));
      if (i > 0) {
        accA += TWIST * Math.min(pairA[i - 1] as number, pairA[i] as number);
        accB += TWIST * Math.min(pairB[i - 1] as number, pairB[i] as number);
      }
      phiAs[i] = accA;
      phiBs[i] = accB;
    }
    for (let i = 0; i < N; i++) {
      const dsep = dsepAt(t, i, dmax);
      const ta = { lead: leadTime(i), lag: lagTime(i) };
      const phiA = phiAs[i] as number;
      const phiB = phiBs[i] as number;
      const y = -i * RISE;
      const a = REPLI_SEQ[i] as string;
      const b = COMPLEMENT_DNA[a] as string;
      // old strands
      rungSide(-1, phiA, RADIUS, A, q1);
      A.x -= dsep;
      A.y += y;
      tints(false, false, t, 0);
      oldA[i] = nucs.place(A, q1, 1, baseColor(a), cs, cp);
      tints(false, false, t, 0, true);
      rungSide(1, phiB, RADIUS, A, q1);
      A.x += dsep;
      A.y += y;
      oldB[i] = nucs.place(A, q1, 1, baseColor(b), cs, cp);
      // new strands: B' (leading, pairs with old B) and A' (lagging, pairs with old A)
      rungSide(-1, phiB, RADIUS, B, q2);
      B.x += dsep;
      B.y += y;
      newB[i] = placeNew(t, i, true, B, q2, ta.lead, a, i < 2);
      rungSide(1, phiA, RADIUS, B, q2);
      B.x -= dsep;
      B.y += y;
      newA[i] = placeNew(t, i, false, B, q2, ta.lag, b, i % FRAG >= FRAG - 2);
    }
    // bonds and backbones
    for (let i = 0; i < N; i++) {
      nucs.bond(oldA[i] as number, oldB[i] as number, REPLI_SEQ[i] === 'A' || REPLI_SEQ[i] === 'T' ? 2 : 3, 1 - win(t, forkTime(i), forkTime(i) + 1.2));
      const dots = REPLI_SEQ[i] === 'A' || REPLI_SEQ[i] === 'T' ? 2 : 3;
      nucs.bond(oldB[i] as number, newB[i] as number, dots, win(t, leadTime(i), leadTime(i) + 0.7));
      nucs.bond(oldA[i] as number, newA[i] as number, dots, win(t, lagTime(i), lagTime(i) + 0.7));
      if (i < N - 1) {
        nucs.link(oldA[i] as number, oldA[i + 1] as number, LINK_OLD);
        nucs.link(oldB[i + 1] as number, oldB[i] as number, LINK_AMB);
        nucs.link(newB[i] as number, newB[i + 1] as number, LINK_NEW, win(t, Math.max(leadTime(i), leadTime(i + 1)), leadTime(i + 1) + 0.6));
      }
      if (i > 0) {
        const sameFrag = Math.floor(i / FRAG) === Math.floor((i - 1) / FRAG);
        if (sameFrag) nucs.link(newA[i] as number, newA[i - 1] as number, LINK_NEW, win(t, Math.max(lagTime(i), lagTime(i - 1)), lagTime(i - 1) + 0.6));
        else {
          const f = i / FRAG;
          const k = win(t, sealTime(f) - 0.7, sealTime(f));
          nucs.link(newA[i] as number, newA[i - 1] as number, cs.lerpColors(FLASH, LINK_NEW, win(t, sealTime(f), sealTime(f) + 1.2)), k, 0.065);
        }
      }
    }
    // enzymes
    const forkIdx = Math.min(Math.max((t - 7) / 1.3, 0), N + 0.5);
    P.forkOn = t > 4.5 && t < 31.5;
    A.set(0, -(forkIdx + 1.4) * RISE, 0);
    const hs = easeBack(seg(t, 4.5, 6.5)) * (1 - win(t, 29, 31.2)) * 1.35;
    if (hs > 0.02) {
      helicase.push(matrixFor(m2, A, hs, t * 0.7));
    }
    P.helicase.copy(A);
    P.helicase.x += 2.3;
    toWorld(P.helicase);
    P.fork.set(0, -forkIdx * RISE, 0);
    toWorld(P.fork);

    const li = Math.min(Math.max(leadIndex(t), -0.4), N - 0.6);
    const ls = easeBack(seg(t, leadTime(0) - 2.6, leadTime(0) - 0.9)) * (1 - win(t, leadTime(N - 1) + 0.8, leadTime(N - 1) + 2.4));
    P.leadOn = ls > 0.5;
    A.set(dsepAt(t, li, dmax), -li * RISE, -0.55);
    if (ls > 0.02) poly.push(matrixFor(m2, A, 1.05 * ls));
    P.lead.set(A.x + 2.6, A.y, 0);
    toWorld(P.lead);
    for (let f = 0; f < FRAGS; f++) {
      const idx = Math.min(Math.max(lagIndex(t, f), f * FRAG - 0.4), f * FRAG + FRAG - 0.6);
      const sc = easeBack(seg(t, fragStart(f) - 1.9, fragStart(f) - 0.6)) * (1 - win(t, fragStart(f) + FRAG + 0.4, fragStart(f) + FRAG + 1.6));
      P.lagOn[f] = sc > 0.5;
      A.set(-dsepAt(t, idx, dmax), -idx * RISE, -0.55);
      if (sc > 0.02) poly.push(matrixFor(m2, A, 1.05 * sc));
      (P.lag[f] as Vector3).set(A.x - 2.6, A.y, 0);
      toWorld(P.lag[f] as Vector3);
    }
    nucs.end();
    poly.end();
    helicase.end();
  };

  void qId;
  void frameLocal;
  return {
    duration: 56,
    seek,
    cameraAt: (t) => camAt(CAM, t),
    labelsAt: (t) => repliLabels(t, ileri, P),
    chartAt: repliChart,
    dispose: () => {
      nucs.dispose();
      poly.dispose();
      helicase.dispose();
    },
  };
}
