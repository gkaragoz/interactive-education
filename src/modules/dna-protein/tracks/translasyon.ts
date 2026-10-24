import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import { camAt, type CamKey } from '../kit/cam';
import { hop, tumble } from '../kit/fly';
import { easeBack, hash, seg, smooth, win } from '../kit/math';
import { Nucs } from '../kit/nucs';
import { RNA_HEX, baseColor } from '../kit/palette';
import { PartSet } from '../kit/partSet';
import { PrimSet, unitGeometries } from '../kit/prims';
import { aaColor } from '../kit/palette';
import { genePlan } from '../sequence';
import type { TrackEnv, TrackRuntime } from '../types';
import { ANTI_Y, FOLD_CENTER, S_T, beadPos, bondGrow } from './translChain';
import { translLabels, type TranslPoints } from './translLabels';
import { buildTranslationPlan, type TranslationPlan } from './translasyonPlan';
import { CODON_PITCH, T_INIT, T_LARGE, T_SCAN, T_SMALL, bondTime, chainLength, dockTime, exitTime, slide, stopTimes } from './translTiming';

// translasyon: the ribosome (fixed at the origin) reads the mRNA that slides through it. Everything derives from the
// translation plan (translateMrna on the example gene's mRNA) and the times in translTiming.

const S_R = 4.4; // ribosome scale: the A/P/E sites (0.34 apart in the asset) match the codon pitch of 1.5
const MRNA_Y = -0.25;
const NT = 0.62; // mRNA nucleotide scale
const NT_PITCH = CODON_PITCH / 3;
const SUGAR_R = new Color('#f2c6df');
const PHOS_R = new Color(RNA_HEX);
const LINK_R = new Color(RNA_HEX);
const LINK_PEP = new Color('#c8963c');
const FLASH = new Color('#fff0b0');
const STOP = new Color('#c0392b');
const Q_R90 = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
const X = new Vector3(1, 0, 0);
const OCHRE_L = new Color('#e0a030');
const OCHRE_S = new Color('#d9822b');
const TEAL = new Color('#20c9a6');
const STUB = new Color('#c99a4a');
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

const CAM: CamKey[] = [
  { t: 0, p: [1.5, 2.5, 19], l: [1.5, 0, 0] },
  { t: 7, p: [1, 3, 21], l: [0, 1.4, 0] },
  { t: 16, p: [0, 3.2, 21], l: [0, 1.8, 0] },
  { t: 28, p: [-2, 3.4, 21], l: [0, 2.2, 0] },
  { t: 40, p: [1, 3.6, 22], l: [-0.3, 2.8, 0] },
  { t: 48, p: [-1, 4.2, 22], l: [-1, 3.8, 0] },
  { t: 51, p: [-1.5, 5.6, 13], l: [-2.2, 5.8, 0] },
  { t: 56, p: [-1.8, 5.9, 9.5], l: [-2.2, 6.2, 0] },
];

const A = new Vector3();
const B = new Vector3();
const C = new Vector3();
const lift = new Vector3();
const q1 = new Quaternion();
const q2 = new Quaternion();
const m1 = new Matrix4();
const m2 = new Matrix4();
const one = new Vector3();

export async function createTranslasyon(env: TrackEnv): Promise<TrackRuntime> {
  const { ctx, root, lib, ileri } = env;
  let plan: TranslationPlan = buildTranslationPlan(genePlan(env.options['gene-example'] ?? 'mfgk').mrna);
  const lod = ctx.quality === 'low' ? 1 : 0;
  const nucs = await Nucs.create(ctx.assets, root, 20, 24, 80, ctx.quality);
  const ribo = await PartSet.create(ctx.assets, 'ribosome-subunits', 1, { ghost: 0.5, lod });
  const trna = await PartSet.create(ctx.assets, 'trna', 6, { lod, ghost: 1, order: 60 });
  const beads = await PartSet.create(ctx.assets, 'amino-acid', 8, { lod, ghost: 1, order: 61 });
  root.add(ribo.group, trna.group, beads.group);
  const g = unitGeometries(ctx.quality === 'low' ? 0 : 1);
  const clay = lib.get('dna-prim', 'clay');
  const spheres = new PrimSet(root, g.sphere, clay, 24, 34);
  const rods = new PrimSet(root, g.cylinder, clay, 10, 33);

  const NMAX = 15;
  const slotM = new Int32Array(NMAX);
  const P: TranslPoints = { plan, nucs, slotM, anti: [0, 1, 2, 3, 4, 5].map(() => new Vector3()), antiOn: [false, false, false, false, false, false], bead: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new Vector3()), beadOn: [false, false, false, false, false, false, false, false], small: new Vector3(), large: new Vector3(), stop: new Vector3(), stopOn: false, shift: 0 };
  const ball = [0, 1, 2, 3, 4, 5].map(() => new Vector3());
  const ballOn = [false, false, false, false, false, false];

  const mrnaShift = (t: number): number => 6.5 - 0.5 * win(t, 0, 6) - 6 * win(t, T_SCAN[0], T_SCAN[1]);
  /** x of the centre of codon k at time t. */
  const codonX = (k: number, t: number): number => CODON_PITCH * k - slide(t, plan.peptide.length) + mrnaShift(t);

  const seek = (t: number): void => {
    const n = plan.peptide.length;
    const st = stopTimes(n);
    nucs.begin();
    ribo.begin();
    trna.begin();
    beads.begin();
    spheres.begin();
    rods.begin();
    const sep = win(t, st.separate, st.separate + 2.8);
    const gone = win(t, st.separate + 1.4, st.separate + 3.2);
    P.shift = slide(t, n);

    // --- mRNA (leaves with the subunits at the end)
    const leaveX = -6 * win(t, st.separate + 0.5, st.separate + 5);
    const mScale = NT * (1 - win(t, st.separate + 2.5, st.separate + 5));
    const mrna = plan.mrna;
    for (let i = 0; i < Math.min(mrna.length, NMAX); i++) {
      A.set(-0.5 + NT_PITCH * i - slide(t, n) + mrnaShift(t) + leaveX, MRNA_Y, 0);
      slotM[i] = nucs.placeWorld(A, Q_R90, mScale, baseColor(mrna[i] as string), SUGAR_R, PHOS_R);
    }
    for (let i = 0; i < Math.min(mrna.length, NMAX) - 1; i++) nucs.link(slotM[i] as number, slotM[i + 1] as number, LINK_R, 1);

    // --- ribosome subunits
    const smallS = 1;
    const fS = seg(t, T_SMALL[0], T_SMALL[1]);
    A.set(-3, -2.8, -0.5);
    B.set(0, MRNA_Y, 0);
    lift.set(0, 1, 1);
    hop(C, A, B, fS, lift);
    C.x += -7 * sep;
    C.y += -8 * sep;
    P.small.copy(C);
    const sS = S_R * smallS * (1 - gone);
    const ri = ribo.push(m1.compose(C, q1.identity(), one.set(sS, sS, sS)));
    ribo.tint(ri, OCHRE_S, 'small');
    ribo.tint(ri, OCHRE_L, 'large');
    const fL = seg(t, T_LARGE[0], T_LARGE[1]);
    A.set(-2, 11, -2);
    B.set(0, MRNA_Y, 0);
    lift.set(0, 1, 0);
    hop(C, A, B, fL, lift);
    C.x += 7 * sep;
    C.y += 9 * sep;
    P.large.copy(C);
    const sL = S_R * easeBack(seg(t, T_LARGE[0], T_LARGE[0] + 0.8)) * (1 - gone);
    m2.compose(C, q1.identity(), one.set(sL, sL, sL));
    ribo.setPart(0, 'large', m2);
    ribo.setPart(0, 'sites', ileri ? m2 : HIDDEN);
    if (t < T_LARGE[0]) {
      ribo.setPart(0, 'large', HIDDEN);
      ribo.setPart(0, 'sites', HIDDEN);
    }

    // --- tRNAs (the amino-acid ball and the asset's own anticodon are replaced by beads and coloured spheres)
    for (let k = 0; k < 6; k++) {
      P.antiOn[k] = false;
      ballOn[k] = false;
    }
    for (let k = 0; k < n; k++) {
      const tdock = k === 0 ? T_INIT[1] : dockTime(k);
      const tstart = k === 0 ? T_INIT[0] : tdock - 2.4;
      const tx = exitTime(k, n);
      if (t < tstart || t > tx + 1.9) continue;
      const step = plan.steps[k];
      if (!step) continue;
      const h = hash(k, 9);
      const cx = codonX(k, Math.min(t, tx));
      A.set(cx - 0.88 * S_T, ANTI_Y + 0.18 * S_T, 0.15);
      tumble(q2, k + 70, t);
      let sc = S_T;
      if (t < tdock) {
        B.set(k === 0 ? -7 - 2 * h : 8 + 2 * h, 7.5 + 2 * h, -3.5);
        lift.set(k === 0 ? -1 : 1, 1.5, 1);
        const f = seg(t, tstart, tdock);
        hop(C, B, A, f, lift);
        q1.identity();
        q2.slerp(q1, smooth(seg(f, 0.35, 1)));
        A.copy(C);
        sc = S_T * easeBack(seg(t, tstart, tstart + 0.7));
      } else if (t > tx) {
        const f = seg(t, tx, tx + 1.8);
        B.set(-9 - 2 * h, 8 + 2 * h, -3.5);
        lift.set(-1, 1.5, 1);
        hop(C, A, B, f, lift);
        tumble(q1, k + 70, t);
        q2.identity().slerp(q1, smooth(f));
        A.copy(C);
        sc = S_T * (1 - win(t, tx + 1.0, tx + 1.9));
      } else q2.identity();
      m1.compose(A, q2, one.set(sc, sc, sc));
      const idx = trna.push(m1);
      trna.tint(idx, TEAL);
      trna.hidePart(idx, 'amino-acid');
      trna.hidePart(idx, 'anticodon');
      // anticodon spheres and the amino-acid spot, from the tRNA pose
      C.set(0.88 * S_T, -0.18 * S_T, 0).multiplyScalar(sc / S_T).applyQuaternion(q2).add(A);
      (P.anti[k] as Vector3).copy(C);
      P.antiOn[k] = true;
      const anti = step.anticodon;
      for (let d = -1; d <= 1; d++) {
        B.set(d * NT_PITCH * (sc / S_T), 0, 0).applyQuaternion(q2).add(C);
        spheres.sphere(B.x, B.y, B.z, 0.16 * (sc / S_T), baseColor(anti[d + 1] as string));
        const slot = slotM[3 * k + d + 1] as number;
        const show = win(t, tdock - 0.4, tdock + 0.5) * (1 - win(t, tx - 0.2, tx + 0.3));
        if (slot >= 0 && show > 0.02) {
          nucs.point(slot, 'tip', A);
          for (let u = 1; u <= 2; u++) spheres.sphere(B.x + (A.x - B.x) * (u / 3), B.y + (A.y - B.y) * (u / 3), B.z + (A.z - B.z) * (u / 3), 0.04 * show, FLASH);
        }
      }
      (ball[k] as Vector3).set(0, 1.27 * S_T, 0).multiplyScalar(sc / S_T).applyQuaternion(q2).add(C.set(cx - 0.88 * S_T, ANTI_Y + 0.18 * S_T, 0.15));
      ballOn[k] = true;
    }
    trna.end();

    // --- the growing chain
    for (let j = 0; j < 8; j++) P.beadOn[j] = false;
    for (let j = 0; j < n; j++) {
      const p = beadPos(j, t, n, A);
      if (!p) continue;
      const arriving = j >= 1 && t < dockTime(j);
      if (arriving) {
        if (!ballOn[j]) continue;
        A.copy(ball[j] as Vector3);
      }
      (P.bead[j] as Vector3).copy(A);
      P.beadOn[j] = true;
    }
    for (let j = 0; j < n; j++) {
      if (!P.beadOn[j]) continue;
      const pj = P.bead[j] as Vector3;
      const next = P.beadOn[j + 1] ? (P.bead[j + 1] as Vector3) : null;
      const prev = j > 0 && P.beadOn[j - 1] ? (P.bead[j - 1] as Vector3) : null;
      if (next) B.copy(next).sub(pj);
      else if (prev) B.copy(pj).sub(prev);
      else B.set(1, 0, 0);
      if (B.lengthSq() < 1e-6) B.set(1, 0, 0);
      q1.setFromUnitVectors(X, B.normalize());
      const popIn = easeBack(seg(t, j === 0 ? 11.6 : dockTime(j) - 2.0, j === 0 ? 12.6 : dockTime(j) - 1.2));
      const s = 1.35 * popIn;
      const idx = beads.push(m1.compose(pj, q1, one.set(s, s, s)));
      beads.tint(idx, (plan.steps[j] as { color: Color }).color, 'residue');
      beads.tint(idx, STUB, 'stubs');
      if (next) {
        const gk = j + 1 < n ? bondGrow(t, j + 1) : 0;
        if (gk > 0.01) rods.between(pj.x, pj.y, pj.z, pj.x + (next.x - pj.x) * gk, pj.y + (next.y - pj.y) * gk, pj.z + (next.z - pj.z) * gk, 0.1, LINK_PEP);
      }
    }
    // side chains (R groups) stand out of the folded chain: an alpha-helix-like coil, each residue coloured like its amino acid
    const fold = win(t, 48.6, 54);
    if (fold > 0.05) {
      for (let j = 0; j < n; j++) {
        if (!P.beadOn[j]) continue;
        const pj = P.bead[j] as Vector3;
        B.set(pj.x - FOLD_CENTER.x, 0, pj.z - FOLD_CENTER.z);
        if (B.lengthSq() < 1e-6) B.set(1, 0, 0);
        B.normalize().multiplyScalar(0.62 * fold);
        const aa = plan.peptide[j] as string;
        const r = (aa === 'Gly' ? 0.17 : aa === 'Trp' || aa === 'Phe' || aa === 'Tyr' ? 0.34 : 0.26) * fold;
        spheres.sphere(pj.x + B.x, pj.y + B.y, pj.z + B.z, r, aaColor(aa));
        rods.between(pj.x, pj.y, pj.z, pj.x + B.x, pj.y + B.y, pj.z + B.z, 0.05 * fold, STUB);
      }
    }
    // flash at each new peptide bond
    for (let k = 1; k < n; k++) {
      const bt = bondTime(k);
      const f = win(t, bt - 0.3, bt) * (1 - win(t, bt, bt + 0.9));
      if (f > 0.02 && P.beadOn[k] && P.beadOn[k - 1]) {
        A.copy(P.bead[k] as Vector3).add(P.bead[k - 1] as Vector3).multiplyScalar(0.5);
        spheres.sphere(A.x, A.y, A.z, 0.62 * f, FLASH);
      }
    }
    // stop codon marker at the A site
    const stopS = easeBack(seg(t, st.stopStart + 0.3, st.stopStart + 2.4)) * (1 - win(t, st.leave + 1.5, st.leave + 3));
    P.stopOn = stopS > 0.5;
    P.stop.set(codonX(n, t), ANTI_Y + 0.9, 0.15);
    if (stopS > 0.02 && plan.stopped) spheres.sphere(P.stop.x, P.stop.y, P.stop.z, 0.55 * stopS, STOP);
    nucs.end();
    ribo.end();
    beads.end();
    spheres.end();
    rods.end();
  };

  return {
    duration: 56,
    seek,
    cameraAt: (t) => camAt(CAM, t),
    labelsAt: (t) => translLabels(t, ileri, P),
    chartAt: (t) => ({ 'polipeptit-uzunlugu': chainLength(t, plan.peptide.length) }),
    setOptions: (o) => {
      plan = buildTranslationPlan(genePlan(o['gene-example'] ?? 'mfgk').mrna);
      P.plan = plan;
    },
    dispose: () => {
      nucs.dispose();
      ribo.dispose();
      trna.dispose();
      beads.dispose();
      spheres.dispose();
      rods.dispose();
    },
  };
}

