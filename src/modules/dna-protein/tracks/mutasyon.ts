import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import { camAt, type CamKey } from '../kit/cam';
import { RADIUS, RISE, TWIST, rungSide, setGroove } from '../kit/duplex';
import { easeBack, pulse, seg, win } from '../kit/math';
import { Nucs } from '../kit/nucs';
import { PartSet } from '../kit/partSet';
import { RNA_HEX, aaColor, baseColor } from '../kit/palette';
import { PrimSet, unitGeometries } from '../kit/prims';
import { mutationPlan, type MutationPlan } from '../sequence';
import type { TrackEnv, TrackRuntime } from '../types';
import { mutLabels, type MutPoints } from './mutLabels';
import { buildTranslationPlan } from './translasyonPlan';

// mutasyon (İleri): the same gene ('melh') as a board: DNA on top, mRNA below it, the protein row under that. One base is
// damaged by UV light, the repair fails, the change becomes permanent and then shows in the mRNA and in the protein.

const N = 15;
export const MUT_DNA_Y = 4.6;
export const MUT_RNA_Y = 1.2;
export const MUT_PEP_Y = -2.3;
export const MUT_OLD_Y = -4.7;
const xOf = (j: number): number => (j - (N - 1) / 2) * RISE;
const SUGAR_A = new Color('#c9b3ec');
const PHOS_A = new Color('#9b7fd0');
const SUGAR_B = new Color('#a6d8e6');
const PHOS_B = new Color('#58a9c4');
const SUGAR_R = new Color('#f2c6df');
const PHOS_R = new Color(RNA_HEX);
const LINK_A = new Color('#7b5aa6');
const LINK_B = new Color('#3f8fa8');
const LINK_R = new Color(RNA_HEX);
const LINK_PEP = new Color('#c8963c');
const DAMAGE = new Color('#6b4a3a');
const UV = new Color('#ffd23f');
const GLOW = new Color('#ff7b3a');
const OK = new Color('#7ad07a');
const BAD = new Color('#e0553a');
const STOP = new Color('#b94a4a');
const GREY = new Color('#b8b0a4');
const HI = new Color('#ff8a3c');
const Q_R90 = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);

const A = new Vector3();
const B = new Vector3();
const q1 = new Quaternion();
const m1 = new Matrix4();
const one = new Vector3();
const c1 = new Color();
const c2 = new Color();

export async function createMutasyon(env: TrackEnv): Promise<TrackRuntime> {
  const { ctx, root, lib, ileri } = env;
  let mp: MutationPlan = mutationPlan(env.options['mutation-type'] ?? 'yanlis-anlamli');
  const nucs = await Nucs.create(ctx.assets, root, 48, 70, 120, ctx.quality);
  nucs.frame.makeRotationZ(Math.PI / 2).setPosition(-((N - 1) / 2) * RISE, MUT_DNA_Y, 0);
  const beads = await PartSet.create(ctx.assets, 'amino-acid', 12, { lod: ctx.quality === 'low' ? 1 : 0 });
  root.add(beads.group);
  const g = unitGeometries(ctx.quality === 'low' ? 0 : 1);
  const clay = lib.get('dna-prim', 'clay');
  const spheres = new PrimSet(root, g.sphere, clay, 30, 34);
  const rods = new PrimSet(root, g.cylinder, clay, 40, 33);
  const cones = new PrimSet(root, g.cone, clay, 8, 33);
  const rings = new PrimSet(root, g.torus, clay, 8, 33);

  const slotA = new Int32Array(N);
  const slotB = new Int32Array(N);
  const slotR = new Int32Array(N);
  const pairW = new Float32Array(N);
  const phi = new Float32Array(N);
  const P: MutPoints = { nucs, slotB, slotR, mp, site: new Vector3(), pepNew: new Vector3(), pepOld: new Vector3(), dimer: false };

  const aaOf = (steps: ReturnType<typeof buildTranslationPlan>['steps'], k: number): Color => (steps[k] as { color: Color }).color;
  let planOld = buildTranslationPlan(mp.before.mrna);
  let planNew = buildTranslationPlan(mp.mutatedMrna);
  const ci = (): number => mp.example.codonIndex;
  const letterColor = (from: string, to: string, d1: number, d2: number, out: Color): Color => out.copy(baseColor(from)).lerp(DAMAGE, d1).lerp(baseColor(to), d2);

  const seek = (t: number): void => {
    setGroove(0);
    nucs.begin();
    beads.begin();
    spheres.begin();
    rods.begin();
    cones.begin();
    rings.begin();
    const pos = mp.position;
    const d1 = win(t, 7.6, 9.6);
    const d2 = win(t, 24.2, 27);
    const bub = pulse(t, 22.6, 24, 27.2, 28.6);
    for (let i = 0; i < N; i++) {
      const w = Math.exp(-(((i - pos) / 1.3) ** 2));
      pairW[i] = 1 - bub * w;
    }
    let acc = 0;
    for (let i = 0; i < N; i++) {
      if (i > 0) acc += TWIST * Math.min(pairW[i - 1] as number, pairW[i] as number);
      phi[i] = acc;
    }
    for (let i = 0; i < N; i++) {
      const open = 1 - (pairW[i] as number);
      const y = -i * RISE;
      const tFrom = mp.before.template[i] as string;
      const tTo = i === pos ? mp.templateTo : tFrom;
      const cFrom = mp.before.coding[i] as string;
      const cTo = i === pos ? (mp.mutatedMrna[i] === 'U' ? 'T' : (mp.mutatedMrna[i] as string)) : cFrom;
      const dd1 = i === pos ? d1 : 0;
      const dd2 = i === pos ? d2 : 0;
      rungSide(-1, phi[i] as number, RADIUS, A, q1);
      A.x -= 2.2 * open;
      A.z -= 1.4 * open;
      A.y += y;
      slotA[i] = nucs.place(A, q1, 1, letterColor(cFrom, cTo, i === pos ? d1 * 0.4 : 0, dd2, c1), SUGAR_A, PHOS_A);
      rungSide(1, phi[i] as number, RADIUS, A, q1);
      A.x += 0.8 * open;
      A.y += y;
      slotB[i] = nucs.place(A, q1, 1, letterColor(tFrom, tTo, dd1, dd2, c2), SUGAR_B, PHOS_B);
    }
    for (let i = 0; i < N; i++) {
      const tNow = i === pos && d2 > 0.5 ? mp.templateTo : (mp.before.template[i] as string);
      const dots = tNow === 'A' || tNow === 'T' ? 2 : 3;
      nucs.bond(slotA[i] as number, slotB[i] as number, dots, pairW[i] as number);
      if (i < N - 1) {
        nucs.link(slotA[i] as number, slotA[i + 1] as number, LINK_A);
        nucs.link(slotB[i + 1] as number, slotB[i] as number, LINK_B);
      }
    }
    // the site (world) and the UV damage
    A.set(-RADIUS, -pos * RISE, 0);
    P.site.copy(A).applyMatrix4(nucs.frame);
    P.site.y += 0.4;
    P.dimer = mp.before.template[pos] === 'T' && (mp.before.template[pos + 1] === 'T' || mp.before.template[pos - 1] === 'T');
    const rays = pulse(t, 6.2, 7.4, 12.4, 13.6);
    if (rays > 0.01) {
      for (let r = 0; r < 4; r++) {
        const f = (t * 0.55 + r * 0.25) % 1;
        const dist = 7 * (1 - f);
        const sx = P.site.x + 0.55 * dist + (r - 1.5) * 0.8;
        const sy = P.site.y + 0.85 * dist;
        const len = 1.6;
        const k = rays * Math.min(1, f * 5) * (1 - win(f, 0.85, 1));
        if (k > 0.02) {
          rods.between(sx, sy, 0.6, sx - 0.55 * len, sy - 0.85 * len, 0.6, 0.07 * k, UV);
          cones.between(sx - 0.55 * len, sy - 0.85 * len, 0.6, sx - 0.55 * (len + 0.5), sy - 0.85 * (len + 0.5), 0.6, 0.2 * k, UV);
        }
      }
    }
    const dmg = pulse(t, 8.2, 9.8, 24.2, 26.4);
    if (dmg > 0.01) {
      const glowK = 0.5 + 0.12 * Math.sin(t * 5);
      rings.ringFace(P.site.x, P.site.y - 0.3, 0.9, (0.75 + 0.2 * glowK) * dmg, GLOW);
      if (P.dimer) {
        const other = mp.before.template[pos + 1] === 'T' ? pos + 1 : pos - 1;
        nucs.point(slotB[pos] as number, 'tip', A);
        nucs.point(slotB[other] as number, 'tip', B);
        rods.between(A.x, A.y, A.z, B.x, B.y, B.z, 0.1 * dmg, BAD);
      }
    }
    // failed repair: a ring with orbiting helpers that closes in, then breaks off
    const rep = pulse(t, 14.2, 15.8, 20.6, 21.8);
    if (rep > 0.01) {
      const fail = win(t, 19.6, 20.6);
      c1.copy(OK).lerp(BAD, fail);
      rings.ringFace(P.site.x, P.site.y - 0.3, 0.9, 1.5 * rep * (1 - 0.15 * Math.sin(t * 3)), c1);
      for (let r = 0; r < 3; r++) {
        const a = t * 2.2 + r * 2.094;
        spheres.sphere(P.site.x + 1.5 * Math.cos(a), P.site.y - 0.3 + 1.5 * Math.sin(a), 0.9, 0.2 * rep, c1);
      }
    }
    // mRNA row
    const mfl = pulse(t, 30.4, 31.4, 31.8, 33.2);
    for (let j = 0; j < N; j++) {
      const from = mp.before.mrna[j] as string;
      const to = j === pos ? mp.mrnaTo : from;
      const m = j === pos ? win(t, 30.8, 32.4) : 0;
      c1.copy(baseColor(from)).lerp(GLOW, m * (1 - m) * 1.2).lerp(baseColor(to), m);
      A.set(xOf(j), MUT_RNA_Y, 0);
      slotR[j] = nucs.placeWorld(A, Q_R90, 1, c1, SUGAR_R, PHOS_R);
    }
    for (let j = 0; j < N - 1; j++) nucs.link(slotR[j] as number, slotR[j + 1] as number, LINK_R);
    if (mfl > 0.01) {
      nucs.point(slotR[pos] as number, 'tip', A);
      rings.ringFace(A.x, A.y - 0.2, 0.7, 0.7 * mfl, GLOW);
    }
    // codon bars over the mRNA
    const eff = win(t, 33.2, 35);
    for (let c = 0; c < 5; c++) {
      const base = aaOf(planOld.steps, c);
      let col: Color = base;
      if (c === ci()) col = c1.copy(base).lerp(planNew.steps[c] ? aaOf(planNew.steps, c) : STOP, eff);
      else if (mp.after.stopped && c > ci() && c < 5 && !planNew.steps[c]) col = c1.copy(base).lerp(GREY, eff);
      rods.between(xOf(3 * c) - 0.1, MUT_RNA_Y + 1.25, 0, xOf(3 * c + 2) + 0.1, MUT_RNA_Y + 1.25, 0, 0.07, col);
    }
    // peptide row: beads, links, stop marker
    const nOld = mp.before.aminoAcids.length;
    const nNew = mp.after.peptide.length;
    const shown = (k: number): number => 0.45 + 0.55 * easeBack(seg(t, 1.6 + 0.4 * k, 2.4 + 0.4 * k));
    for (let k = 0; k < nOld; k++) {
      const x = xOf(3 * k + 1);
      let col: Color = aaColor(mp.before.aminoAcids[k] as string);
      let scale = 2.4 * shown(k);
      if (k === ci()) {
        if (mp.after.stopped && k >= nNew) scale *= 1 - eff;
        else if (planNew.steps[k]) col = c2.copy(aaColor(mp.before.aminoAcids[k] as string)).lerp(aaColor(mp.after.peptide[k] as string), eff);
      } else if (k > ci() && k >= nNew && mp.after.stopped) scale *= 1 - eff;
      if (k === ci()) scale *= 1 + 0.25 * pulse(t, 33.2, 34.2, 34.8, 36);
      A.set(x, MUT_PEP_Y, 0);
      q1.identity();
      const idx = beads.push(m1.compose(A, q1, one.set(scale, scale, scale)));
      beads.tint(idx, col, 'residue', 'stubs');
      if (k === ci()) P.pepNew.copy(A);
      if (k < nOld - 1 && scale > 0.05) {
        const nextScale = k + 1 === ci() && mp.after.stopped ? 1 - eff : k + 1 > ci() && mp.after.stopped && k + 1 >= nNew ? 1 - eff : 1;
        const gk = Math.min(shown(k + 1), nextScale);
        if (gk > 0.02) rods.between(x, MUT_PEP_Y, 0, x + (xOf(3 * k + 4) - x) * gk, MUT_PEP_Y, 0, 0.09, LINK_PEP);
      }
    }
    // stop marker: the original stop codon, or the new premature one
    const stopIdx = mp.after.stopped ? nNew : nOld;
    const stopX = xOf(3 * (mp.after.stopped && stopIdx < nOld ? stopIdx : nOld) + 1);
    const origStop = shown(nOld) * (mp.after.stopped && nNew < nOld ? 1 - eff : 1);
    spheres.sphere(xOf(3 * nOld + 1), MUT_PEP_Y, 0, 0.5 * origStop, STOP);
    if (mp.after.stopped && nNew < nOld) spheres.sphere(stopX, MUT_PEP_Y, 0, 0.62 * eff, STOP);
    // the normal protein kept below for comparison
    const cmp = win(t, 34.6, 36.2);
    if (cmp > 0.01) {
      for (let k = 0; k < nOld; k++) {
        A.set(xOf(3 * k + 1), MUT_OLD_Y + (MUT_PEP_Y - MUT_OLD_Y) * (1 - cmp), 0);
        q1.identity();
        const s = 2.4 * cmp;
        const idx = beads.push(m1.compose(A, q1, one.set(s, s, s)));
        beads.tint(idx, aaColor(mp.before.aminoAcids[k] as string), 'residue', 'stubs');
        if (k < nOld - 1) rods.between(A.x, A.y, A.z, xOf(3 * k + 4), A.y, A.z, 0.09 * cmp, LINK_PEP);
      }
      P.pepOld.set(xOf(3 * ci() + 1), MUT_OLD_Y, 0);
    }
    // ring round the changed amino acid
    const hi = win(t, 35.2, 36.4);
    if (hi > 0.01 && (nNew <= ci() || mp.after.peptide[ci()] !== mp.before.aminoAcids[ci()])) rings.ringFace(P.pepNew.x, P.pepNew.y, 0.5, 1.5 * hi, HI);
    nucs.end();
    beads.end();
    spheres.end();
    rods.end();
    cones.end();
    rings.end();
  };

  const camKeys = (): CamKey[] => {
    const sx = xOf(mp.position);
    return [
      { t: 0, p: [0, 0.5, 20], l: [0, 0.2, 0] },
      { t: 6, p: [sx * 0.6, 3.5, 15], l: [sx * 0.6, 3.2, 0] },
      { t: 12, p: [sx + 2, 4, 11.5], l: [sx, 3.6, 0] },
      { t: 22, p: [sx + 2, 4, 11.5], l: [sx, 3.6, 0] },
      { t: 29, p: [sx * 0.5, 2.5, 17], l: [sx * 0.4, 2.4, 0] },
      { t: 32, p: [0, 0.8, 20], l: [0, 0.2, 0] },
      { t: 40, p: [0, -0.2, 21], l: [0, -0.2, 0] },
    ];
  };
  let keys = camKeys();

  return {
    duration: 40,
    seek,
    cameraAt: (t) => camAt(keys, t),
    labelsAt: (t) => mutLabels(t, ileri, P, planOld, planNew),
    chartAt: (t) => ({ 'dogru-aa-orani': 100 - win(t, 33.2, 35.4) * (100 - (100 * mp.unchanged) / mp.before.aminoAcids.length) }),
    setOptions: (o) => {
      mp = mutationPlan(o['mutation-type'] ?? 'yanlis-anlamli');
      P.mp = mp;
      planOld = buildTranslationPlan(mp.before.mrna);
      planNew = buildTranslationPlan(mp.mutatedMrna);
      keys = camKeys();
    },
    dispose: () => {
      nucs.dispose();
      beads.dispose();
      spheres.dispose();
      rods.dispose();
      cones.dispose();
      rings.dispose();
    },
  };
}
