import { CircleGeometry, Group, Mesh, SphereGeometry, Vector3 } from 'three';
import { mulberry32 } from '../../../core';
import type { DeformSite } from '../bilayer';
import { CupTable } from '../cup';
import type { Kit, TrackRig } from '../kit';
import { cameraPath, lerp, ramp, smooth, type CamKey } from '../math';
import { COLORS } from '../palette';
import { paint } from '../proteins';
import { makeWander, wanderAt } from '../walker';
import { emptyChart } from './common';

export const ENDO_DURATION = 56;
/** Sites on the membrane: phagocytosis (A), pinocytosis (B), exocytosis (C). */
const A = { cx: -10.5, rb: 2.2, zone: 7.6 };
const B = { cx: 0.6, rb: 1.2, zone: 4.6 };
const C = { cx: 11.5, rb: 1.5, zone: 5.6 };
const RP = 1.4;
const DROPLETS = 5;
const CARGO = 6;
const T_PIN_A = 12.8;
const T_PIN_B = 24.5;
const REL0 = 39.2;

export const pA = (t: number): number => ramp(t, 7, 14.5);
export const dropA = (t: number): number => 4.2 * ramp(t, 15.5, 19.5) + 1.5 * ramp(t, 19.5, 56);
export const pB = (t: number): number => ramp(t, 20.5, 25.5);
export const dropB = (t: number): number => 3.4 * ramp(t, 26, 30) + 1.2 * ramp(t, 30, 56);
export const pC = (t: number): number => 1 - ramp(t, 37, 42);
export const dropC = (t: number): number => 3 * (1 - ramp(t, 31, 37));
/** Cargo units inside the cell: the particle, the droplets and the secretion not yet released. */
export function cargoInside(t: number): number {
  let n = 0;
  if (t >= T_PIN_A) n += 1;
  if (t >= T_PIN_B) n += DROPLETS;
  for (let k = 0; k < CARGO; k++) if (t < REL0 + 0.5 * k + 1) n += 1;
  return n;
}

const tab = new CupTable();
const depth = (rb: number, p: number): number => (p <= 1e-3 ? 0 : tab.fill(rb, p, 0).depth);

/** Endocytosis and exocytosis: the bilayer is wrapped around the cargo by the area-preserving map and pinched off, or opened again. */
export function createEndo(kit: Kit): TrackRig {
  const patch = kit.patch({ xHalf: 22, zFront: 0, zBack: -8.4, seed: 21, spacing: kit.detail === 0 ? 0.56 : 0.48 });
  kit.backdrop(23, -8.4, 7.5, -8.5);
  kit.bokeh(22, 7.5, -8.5, -8.4);
  const pool = kit.pool(DROPLETS + CARGO);
  for (let i = 0; i < DROPLETS; i++) pool.setColor(i, COLORS.droplet);
  for (let i = 0; i < CARGO; i++) pool.setColor(DROPLETS + i, COLORS.solute);
  const ileriLevel = kit.ctx.level === 'ileri';
  const particleMat = kit.clay.clone();
  const half = new Mesh(paint(new SphereGeometry(RP, 40, 26, Math.PI, Math.PI), '#5f9a2e', 0.25), particleMat);
  const cap = new Mesh(paint(new CircleGeometry(RP, 40), '#8dbb4f', 0.05), particleMat);
  const particle = new Group();
  particle.add(half, cap);
  // a few dark specks on the cut face (the "inside" of the bacterium-like particle)
  const specks: Mesh[] = [[-0.4, 0.3, 0.2], [0.35, -0.2, 0.17], [0.05, 0.55, 0.13]].map(([x, y, r]) => {
    const m = new Mesh(paint(new CircleGeometry(r!, 14), '#355a1f', 0.05), particleMat);
    m.position.set(x!, y!, 0.02);
    particle.add(m);
    return m;
  });
  kit.root.add(particle);
  // lysosome (İleri): meets the phagosome after the vesicle has formed, fuses and the particle is digested
  const lyso = new Group();
  const lysoMat = kit.clay.clone();
  const lysoHalf = new Mesh(paint(new SphereGeometry(1.1, 28, 20, Math.PI, Math.PI), '#9a6fb0', 0.25), lysoMat);
  const lysoCap = new Mesh(paint(new CircleGeometry(1.1, 28), '#b78ccb', 0.05), lysoMat);
  lyso.add(lysoHalf, lysoCap);
  lyso.visible = false;
  if (ileriLevel) kit.root.add(lyso);
  const rng = mulberry32(77);
  const dropW = Array.from({ length: DROPLETS }, (_, i) => makeWander(mulberry32(300 + i), 0.3));
  const dropOut = Array.from({ length: DROPLETS }, () => new Vector3(B.cx + (rng() - 0.5) * 2.4, 1.2 + rng() * 1.6, -0.2 - rng() * 1.4));
  const dropIn = Array.from({ length: DROPLETS }, () => new Vector3((rng() - 0.5) * 0.4, 0.16 + rng() * 0.2, -0.1 - rng() * 0.4));
  const cargoW = Array.from({ length: CARGO }, (_, i) => makeWander(mulberry32(400 + i), 0.05));
  const cargoOutW = Array.from({ length: CARGO }, (_, i) => makeWander(mulberry32(500 + i), 0.28));
  const cargoIn = Array.from({ length: CARGO }, () => new Vector3((rng() - 0.5) * 0.7, (rng() - 0.5) * 0.7, -0.1 - rng() * 0.4));
  const cargoOut = Array.from({ length: CARGO }, (_, k) => new Vector3(C.cx + (k - 2.5) * 0.7, 2.4 + 0.25 * k, -0.5 - 0.35 * (k % 3)));
  const tmp = new Vector3();
  const tmp2 = new Vector3();

  const sites = (t: number): DeformSite[] => [
    { ...A, cz: 0, p: pA(t), drop: dropA(t) },
    { ...B, cz: 0, p: pB(t), drop: dropB(t) },
    { ...C, cz: 0, p: pC(t), drop: dropC(t) },
  ];
  const particleY = (t: number): number => -depth(A.rb, pA(t)) + 0.71 + RP - dropA(t) + 3.2 * (1 - ramp(t, 0, 5)) + (t < 5 ? 0.12 * Math.sin(t * 1.7) : 0);
  const lumenBottom = (s: typeof B, p: number, drop: number): number => -depth(s.rb, p) - drop + 0.71;
  const exoCenter = (t: number): number => -depth(C.rb, pC(t)) + C.rb - dropC(t);

  const keys: CamKey[] = [
    { t: 0, pos: [-1, 6, 38], target: [0, -1.2, -2] },
    { t: 4, pos: [-1, 6, 38], target: [0, -1.2, -2] },
    { t: 6.5, pos: [-10.5, 4, 21], target: [-10.5, -1.6, -1] },
    { t: 18, pos: [-10.5, 4, 21], target: [-10.5, -2.4, -1] },
    { t: 21, pos: [0.6, 3.2, 18], target: [0.6, -1.8, -1] },
    { t: 29, pos: [0.6, 3.2, 18], target: [0.6, -2.4, -1] },
    { t: 32, pos: [11.5, 3.4, 19], target: [11.5, -2, -1] },
    { t: 43, pos: [11.5, 3.4, 19], target: [11.5, -1.4, -1] },
    { t: 47, pos: [0, 6, 40], target: [0, -1.5, -2] },
    { t: ENDO_DURATION, pos: [0, 6, 40], target: [0, -1.5, -2] },
  ];
  const ileriKeys = [
    ...keys.filter((k) => k.t <= 43),
    { t: 45.5, pos: [-8.5, 3, 21] as [number, number, number], target: [-9.5, -6.6, -1] as [number, number, number] },
    { t: ENDO_DURATION, pos: [-8.5, 3, 21] as [number, number, number], target: [-9.5, -6.9, -1] as [number, number, number] },
  ];
  const camera = cameraPath(ileriLevel ? ileriKeys : keys);

  return {
    duration: ENDO_DURATION,
    seek(t) {
      patch.pose(t, sites(t));
      const py = particleY(t);
      particle.position.set(A.cx, py, 0);
      const digest = ileriLevel ? ramp(t, 50, 54.5) : 0;
      particle.scale.setScalar(1 - 0.55 * digest);
      particleMat.color.setRGB(1 - 0.25 * digest, 1 - 0.5 * digest, 1 - 0.65 * digest);
      lyso.visible = ileriLevel && t >= 43.5;
      const near = ramp(t, 44, 48.5);
      const merge = ramp(t, 49, 52);
      lyso.position.set(A.cx + lerp(9, 3.7, near) - 2.6 * merge, py - 0.2 + (1 - near) * -1.5, 0);
      lyso.scale.setScalar(1 - 0.5 * merge);
      const pBnow = pB(t);
      const w = smooth((pBnow - 0.1) / 0.4);
      const base = lumenBottom(B, pBnow, dropB(t));
      for (let i = 0; i < DROPLETS; i++) {
        wanderAt(dropW[i]!, t, tmp2);
        tmp.copy(dropOut[i]!).add(tmp2);
        const target = new Vector3(B.cx + dropIn[i]!.x, base + dropIn[i]!.y, dropIn[i]!.z).addScaledVector(tmp2, 0.12);
        pool.set(i, tmp.lerp(target, w), 0.1);
      }
      const cy = exoCenter(t);
      for (let k = 0; k < CARGO; k++) {
        wanderAt(cargoW[k]!, t, tmp2);
        const inside = new Vector3(C.cx + cargoIn[k]!.x, cy + cargoIn[k]!.y, cargoIn[k]!.z).add(tmp2);
        const tk = REL0 + 0.5 * k;
        const u = smooth((t - tk) / 2.2);
        wanderAt(cargoOutW[k]!, t, tmp2);
        pool.set(DROPLETS + k, u <= 0 ? inside : inside.lerp(tmp.copy(cargoOut[k]!).add(tmp2), u), 0.13);
      }
      pool.commit();
    },
    cameraAt: camera,
    labelsAt(t) {
      const ileri = kit.ctx.level === 'ileri';
      const camX = camera(t).target[0];
      const out: { text: string; world: [number, number, number]; anchorId: string }[] = t >= 44 && ileri ? [] : [
        { text: 'Hücre dışı', world: [camX + 4.4, 3.6, -1], anchorId: 'out' },
        { text: 'Hücre içi', world: [camX + 4.4, -4.6, -1], anchorId: 'in' },
      ];
      const py = particleY(t);
      if (t < 5) {
        out.push({ text: 'Katı parçacık', world: [A.cx, py + 1.9, 0], anchorId: 'particle' }, { text: 'Sıvı damlacıkları', world: [B.cx, 3.6, -0.5], anchorId: 'drops' }, { text: 'Dolu vezikül', world: [C.cx, exoCenter(t) - 2.0, 0], anchorId: 'vesicle' });
      } else if (t < 19) {
        out.push({ text: 'Fagositoz', world: [A.cx, 3.6, 0], anchorId: 'title' });
        if (t < T_PIN_A) out.push({ text: 'Parçacık', world: [A.cx, py + 1.9, 0], anchorId: 'particle' });
        else out.push({ text: ileri ? 'Fagozom (vezikül)' : 'Vezikül', world: [A.cx, py - 1.9, 0], anchorId: 'particle' });
      } else if (t < 30) {
        out.push({ text: 'Pinositoz', world: [B.cx, 3.4, 0], anchorId: 'title' });
        if (t < T_PIN_B) out.push({ text: 'Sıvı damlacıkları', world: [B.cx, 2.6, -0.4], anchorId: 'drops' });
        else out.push({ text: 'Vezikül', world: [B.cx, lumenBottom(B, 1, dropB(t)) - 0.9, 0], anchorId: 'drops' });
      } else if (t < 44) {
        out.push({ text: 'Ekzositoz', world: [C.cx, 3.4, 0], anchorId: 'title' });
        out.push({ text: t < 37 ? 'Dolu vezikül' : 'Zarla kaynaşma', world: [C.cx + 2.6, exoCenter(t) + (t < 37 ? 0 : 0.4), 0], anchorId: 'vesicle' });
        if (t > REL0 + 0.5) out.push({ text: 'İçerik dışarı salınır', world: [C.cx, 3.0, -0.4], anchorId: 'released' });
      } else {
        if (ileri) {
          const ly = particleY(t);
          out.push({ text: t < 49 ? 'Lizozom yaklaşır' : t < 52 ? 'Lizozom ile kaynaşma' : 'Sindirim', world: [A.cx + 3.5, ly + 1.6, 0], anchorId: 'lyso' });
        } else out.push({ text: 'Endositoz: içeri', world: [(A.cx + B.cx) / 2, 4.2, 0], anchorId: 'endo' }, { text: 'Ekzositoz: dışarı', world: [C.cx, 4.2, 0], anchorId: 'exo' });
      }
      return out;
    },
    chartAt(t) {
      const inside = cargoInside(t);
      const total = 1 + DROPLETS + CARGO;
      return { ...emptyChart(), 'molekul-ic': inside, 'molekul-dis': total - inside, 'derisim-farki': Math.abs(total - 2 * inside) };
    },
    setOptions() {
      /* no options apply to this track */
    },
    dispose() {
      half.geometry.dispose();
      cap.geometry.dispose();
      specks.forEach((m) => m.geometry.dispose());
      lysoHalf.geometry.dispose();
      lysoCap.geometry.dispose();
      particleMat.dispose();
      lysoMat.dispose();
      particle.removeFromParent();
      lyso.removeFromParent();
    },
  };
}

