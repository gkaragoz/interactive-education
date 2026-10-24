import { Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import { mulberry32 } from '../../../core';
import { netFlux, simulateCrossings } from '../crossings';
import type { Kit, TrackRig } from '../kit';
import { cameraPath, lerp, ramp, smooth } from '../math';
import { COLORS } from '../palette';
import { makeWander, Walker, type HomeFn, type Leg } from '../walker';
import { allLegs, emptyChart } from './common';
import { createAnimalCell, createPlantCell, type CellView } from './osmosisCell';

export const OSMOSIS_DURATION = 54;
const V0 = 30;
const S_IN = 9;
const W_IN0 = V0 - S_IN;
const W_OUT = 26;
const EXCH = 6;
const BX = [-16, 0, 16];
const WATER_R = 0.09;
const SOLUTE_R = 0.27;
const COMPARE_FROM = 44;
const START = [6, 20, 30];
const PLANT_CAP = 1.12;
/** Solute fraction of the outside solution: [hypotonic, isotonic, hypertonic] per "derisim-farki" choice. */
const C_OUT: Record<string, [number, number, number]> = { kucuk: [0.25, 0.3, 0.35], orta: [0.21, 0.3, 0.42], buyuk: [0.12, 0.3, 0.5] };
const BOX = new Vector3(5.4, 3.6, 2.4);

/** Cell volume over local time: dV/dt = alpha (c_in - c_out), c_in = S/V (the bath is much larger than the cell). */
function volumeTable(cOut: number, plant: boolean): Float64Array {
  const n = 1300;
  const table = new Float64Array(n);
  let v = V0;
  for (let i = 0; i < n; i++) {
    table[i] = v;
    v += 0.05 * 14 * (S_IN / v - cOut);
    v = Math.max(18, plant ? Math.min(v, V0 * PLANT_CAP) : v);
  }
  return table;
}
const tableAt = (table: Float64Array, tau: number): number => {
  if (tau <= 0) return table[0]!;
  const f = Math.min(tau / 0.05, table.length - 1.001);
  const i = Math.floor(f);
  return lerp(table[i]!, table[i + 1]!, f - i);
};

interface Beaker {
  cx: number;
  start: number;
  table: Float64Array;
  cOut: number;
  water: Walker[];
  legs: ReturnType<typeof allLegs>;
  solutes: Walker[];
  waterRadius: number;
  /** Time the animal cell bursts (Infinity: it does not). */
  burst: number;
}

/** Osmosis: three cells (hypotonic, isotonic, hypertonic) that take their turns; water crosses, the solute does not. */
const UP = new Vector3(0, 1, 0);
/** Directions of the aquaporin-like water channels in each membrane. */
const AQ = Array.from({ length: 6 }, (_, k) => new Vector3(Math.cos(k * 1.05 + 0.3), Math.sin(k * 1.05 + 0.3), 0.3 + 0.25 * Math.sin(k * 2.1)).normalize());

export async function createOsmosis(kit: Kit): Promise<TrackRig> {
  const mats = kit.ctx.assets.materials;
  const perBeaker = W_IN0 + W_OUT + EXCH + 20 + S_IN;
  const pool = kit.pool(perBeaker * 3 + 2);
  const LEG = perBeaker * 3;
  pool.setColor(LEG, COLORS.water);
  pool.setColor(LEG + 1, COLORS.solute);
  let plant = kit.ctx.options['hucre-turu'] === 'bitki';
  let cells: CellView[] = [];
  let beakers: Beaker[] = [];
  const glass: Mesh[] = [];
  const tints = ['#3f8fc0', '#8aa878', '#c9792a'];
  BX.forEach((cx, i) => {
    const m = kit.glow(tints[i]!, 15, 11, 0.2);
    m.position.set(cx, 0, -3);
    glass.push(m);
  });
  const aq: Object3D[][] = await Promise.all(BX.map(async () => Promise.all(AQ.map(async () => {
    const m = await kit.ctx.assets.loadGlb('channel-protein');
    kit.root.add(m);
    return m;
  }))));
  const qa = new Quaternion();
  const tmp = new Vector3();
  const radial = new Vector3();

  const buildCells = (): void => {
    cells.forEach((c) => c.dispose());
    cells = BX.map((cx) => {
      const c = plant
        ? createPlantCell(mats.shell('wall-plant'), mats.shell('membrane-plant'), mats.get('vacuole', 'gel'), kit.clay, kit.detail)
        : createAnimalCell(mats.shell('membrane-animal'), kit.clay, kit.detail);
      c.group.position.set(cx, 0, 0);
      kit.root.add(c.group);
      return c;
    });
  };

  const sRatio = (b: Beaker, t: number): number => Math.sqrt(tableAt(b.table, t - b.start) / V0);

  const build = (o: Record<string, string>): void => {
    const nowPlant = o['hucre-turu'] === 'bitki';
    if (nowPlant !== plant || cells.length === 0) {
      plant = nowPlant;
      buildCells();
    }
    const c = C_OUT[o['derisim-farki'] ?? 'orta'] ?? C_OUT.orta!;
    const speed = { dusuk: 0.6, orta: 1, yuksek: 1.5 }[o.sicaklik as 'orta'] ?? 1;
    beakers = BX.map((cx, bi) => {
      const rng = mulberry32(4000 + bi * 97);
      const cOut = c[bi]!;
      const table = volumeTable(cOut, plant);
      const b: Beaker = { cx, start: START[bi]!, table, cOut, water: [], legs: [], solutes: [], waterRadius: WATER_R, burst: Infinity };
      if (kit.ctx.level === 'ileri' && !plant && bi === 0) {
        const k = table.findIndex((v) => v >= 1.5 * V0);
        if (k >= 0) b.burst = b.start + k * 0.05;
      }
      const view = cells[bi]!;
      const unit = (): Vector3 => new Vector3(rng() * 2 - 1, rng() * 2 - 1, (rng() * 2 - 1) * 0.8).normalize();
      const insideHome = (u: Vector3, frac: number): HomeFn => (t, out) => {
        const spread = ramp(t, b.burst, b.burst + 2);
        const r = view.radius(u, sRatio(b, t)) * frac + spread * (1.2 + 2.6 * frac);
        out.copy(u).multiplyScalar(r);
        if (spread > 0) {
          out.x = Math.max(-BOX.x, Math.min(BOX.x, out.x));
          out.y = Math.max(-BOX.y, Math.min(BOX.y, out.y));
          out.z = Math.max(-BOX.z, Math.min(BOX.z, out.z));
        }
        out.add(radial.set(cx, 0, 0));
      };
      const outsideHome = (u: Vector3, d: number): HomeFn => (t, out) => {
        const r = view.radius(u, sRatio(b, t)) + d;
        out.copy(u).multiplyScalar(r);
        out.x = Math.max(-BOX.x, Math.min(BOX.x, out.x)) + cx;
        out.y = Math.max(-BOX.y, Math.min(BOX.y, out.y));
        out.z = Math.max(-BOX.z, Math.min(BOX.z, out.z));
      };
      const dirs: Vector3[] = [];
      const site = (u: Vector3, dir: 1 | -1, tIn: number, tOut: number): Leg['site'] => (t, out) => {
        const r = view.radius(u, sRatio(b, t));
        const k = smooth((t - tIn) / Math.max(tOut - tIn, 1e-6));
        out.copy(u).multiplyScalar(r + 0.45 * (dir > 0 ? 1 - 2 * k : -1 + 2 * k));
        out.x += cx;
      };
      const makeLeg = (u: Vector3, dir: 1 | -1, tc: number, tIn: number, tOut: number, t0: number, t1: number): Leg => ({ t0, tIn, tOut, t1, tCross: tc, dir, gate: -1, site: site(u, dir, tIn, tOut) });
      const wander = (i: number): ReturnType<typeof makeWander> => makeWander(mulberry32(7000 + bi * 1000 + i), kit.wander * 0.9);
      // ordered water: particle j is inside while the water content W_in(t) is above j + 0.5
      const nW = W_IN0 + W_OUT;
      for (let j = 0; j < nW; j++) {
        const u = j % 3 !== 0 ? AQ[j % 6]!.clone() : unit();
        dirs.push(u);
        const inside0 = j < W_IN0;
        const w = new Walker(wander(j), [inside0 ? insideHome(u, Math.cbrt(rng()) * 0.8) : outsideHome(u, 0.6 + rng() * 2.6)], speed, inside0 ? 1 : 0);
        let tau = -1;
        for (let k = 0; k < b.table.length; k++) {
          const win = b.table[k]! - S_IN;
          if (inside0 ? win <= j + 0.5 : win > j + 0.5) {
            tau = k * 0.05;
            break;
          }
        }
        if (tau >= 0) {
          const tc = b.start + tau;
          const dir: 1 | -1 = inside0 ? -1 : 1;
          w.legs.push(makeLeg(u, dir, tc, tc - 0.45, tc + 0.45, tc - 0.9, tc + 0.9));
          w.homes.push(inside0 ? outsideHome(u, 0.6 + rng() * 2.6) : insideHome(u, Math.cbrt(rng()) * 0.8));
        }
        b.water.push(w);
      }
      // exchangers: random two-way swaps that keep the water moving in the isotonic case too
      const exSides = Array.from({ length: EXCH }, (_, i) => (i % 2) as 0 | 1);
      const ex = simulateCrossings({
        sides: exSides,
        rate: () => 0.1 * speed,
        tStart: b.start,
        tEnd: OSMOSIS_DURATION,
        pick: () => ({ index: -1, kind: 'gap', x: 0, z: 0 }),
        timing: () => ({ approach: 0.45, ride: 0.9, leave: 0.45, reset: 0 }),
        rng: kit.ctx.rng(90 + bi),
      });
      exSides.forEach((s, m) => {
        const u = m % 3 !== 0 ? AQ[m % 6]!.clone() : unit();
        const mk = (side: 0 | 1): HomeFn => (side === 0 ? outsideHome(u, 0.6 + rng() * 2.6) : insideHome(u, Math.cbrt(rng()) * 0.8));
        let side = s;
        const w = new Walker(wander(500 + m), [mk(s)], speed, s);
        for (const tr of ex.filter((e) => e.mol === m)) {
          w.legs.push(makeLeg(u, tr.dir, (tr.tIn + tr.tOut) / 2, tr.tIn, tr.tOut, tr.t0, tr.t1));
          side = side === 0 ? 1 : 0;
          w.homes.push(mk(side));
        }
        b.water.push(w);
      });
      // solutes: they never cross
      const sOut = Math.round(40 * cOut);
      for (let i = 0; i < S_IN + sOut; i++) {
        const u = unit();
        const inside = i < S_IN;
        b.solutes.push(new Walker(wander(800 + i), [inside ? insideHome(u, Math.cbrt(rng()) * 0.78) : outsideHome(u, 0.7 + rng() * 2.8)], speed, inside ? 1 : 0));
      }
      b.legs = allLegs(b.water);
      return b;
    });
    for (let i = 0; i < pool.capacity; i++) pool.hide(i);
    // colours: fixed per slot
    beakers.forEach((b, bi) => {
      const base = bi * perBeaker;
      b.water.forEach((_, i) => pool.setColor(base + i, COLORS.water));
      b.solutes.forEach((_, i) => pool.setColor(base + W_IN0 + W_OUT + EXCH + i, COLORS.solute));
    });
  };
  build(kit.ctx.options);

  const focus = (t: number): number => (t < START[1]! ? 0 : t < START[2]! ? 1 : 2);
  const cut = (cx: number, from: number, to: number): { t: number; pos: [number, number, number]; target: [number, number, number] }[] => [
    { t: from, pos: [cx, 2.4, 15.5], target: [cx, -0.2, 0] },
    { t: to, pos: [cx + 0.6, 2.8, 14.8], target: [cx, -0.2, 0] },
  ];
  const camera = cameraPath([
    ...cut(BX[0]!, 0, 19),
    ...cut(BX[1]!, 19.8, 29),
    ...cut(BX[2]!, 29.8, 43.2),
    { t: 44.5, pos: [0, 5, 34], target: [0, -0.4, 0] },
    { t: OSMOSIS_DURATION, pos: [0, 5, 34], target: [0, -0.4, 0] },
  ]);

  return {
    duration: OSMOSIS_DURATION,
    seek(t) {
      const compare = t >= COMPARE_FROM;
      const f = focus(t);
      beakers.forEach((b, bi) => {
        const pop = 1 + 0.22 * ramp(t, b.burst - 0.7, b.burst + 0.3);
        cells[bi]!.update(sRatio(b, t) * pop);
        const alive = t < b.burst + 0.3;
        cells[bi]!.group.visible = (compare || bi === f) && alive;
        glass[bi]!.visible = compare || bi === f;
        aq[bi]!.forEach((m, k) => {
          const u = AQ[k]!;
          m.visible = (compare || bi === f) && alive;
          m.position.copy(u).multiplyScalar(cells[bi]!.radius(u, sRatio(b, t) * pop)).add(radial.set(b.cx, 0, 0));
          m.quaternion.copy(qa.setFromUnitVectors(UP, u));
          m.scale.setScalar(0.55);
        });
        const base = bi * perBeaker;
        const show = !compare && bi === f;
        b.water.forEach((w, i) => (show ? pool.set(base + i, w.posAt(t, tmp), b.waterRadius) : pool.hide(base + i)));
        b.solutes.forEach((w, i) => (show ? pool.set(base + W_IN0 + W_OUT + EXCH + i, w.posAt(t, tmp), SOLUTE_R) : pool.hide(base + W_IN0 + W_OUT + EXCH + i)));
      });
      if (compare) {
        pool.hide(LEG);
        pool.hide(LEG + 1);
      } else {
        const cx = BX[f]!;
        pool.set(LEG, tmp.set(cx + 4.3, 3.1, 0.2), 0.16);
        pool.set(LEG + 1, tmp.set(cx + 4.3, 2.3, 0.2), SOLUTE_R * 1.1);
      }
      pool.commit();
    },
    cameraAt: camera,
    labelsAt(t) {
      const ileri = kit.ctx.level === 'ileri';
      const names = ileri ? ['Hipotonik ortam', 'İzotonik ortam', 'Hipertonik ortam'] : ['Hipotonik (seyreltik)', 'İzotonik (eşit)', 'Hipertonik (derişik)'];
      type L = { text: string; world: [number, number, number]; anchorId: string };
      if (t >= COMPARE_FROM) {
        const pct = [0, 1, 2].map((i) => Math.round((tableAt(beakers[i]!.table, 99) / V0) * 100));
        return BX.map((cx, i): L => ({ text: `${names[i]}: hacim %${pct[i]}`, world: [cx, 4.3, 0], anchorId: `cmp-${i}` }));
      }
      const f = focus(t);
      const cx = BX[f]!;
      const b = beakers[f]!;
      const tau = t - b.start;
      const out: L[] = [
        { text: names[f]!, world: [cx, 3.2, 0], anchorId: 'sol' },
        { text: 'Su (küçük, mavi)', world: [cx + 5.0, 3.1, 0.2], anchorId: 'lw' },
        { text: 'Çözünen madde (büyük, altın)', world: [cx + 5.0, 2.3, 0.2], anchorId: 'ls' },
        ...(ileri && t < b.burst ? [{ text: 'Akuaporin (su kanalı)', world: [cx + AQ[0]!.x * 3.1, AQ[0]!.y * 3.1, 0.6] as [number, number, number], anchorId: 'aqp' }] : []),
        { text: plant ? 'Hücre duvarı' : 'Hücre zarı', world: [cx + (plant ? 3.0 : 2.3), 1.5, 0.4], anchorId: 'wall' },
      ];
      if (ileri && b.burst < Infinity && t > b.burst) out.push({ text: 'Hücre patladı (lizis)', world: [cx, -3.2, 0.5], anchorId: 'msg' });
      else if (tau > 4) {
        const msg = f === 1 ? 'Su iki yöne eşit geçer' : f === 0 ? (plant ? 'Turgor basıncı artar' : 'Su girer, hücre şişer') : plant ? 'Plazmoliz: zar duvardan ayrılır' : 'Su çıkar, hücre büzülür';
        out.push({ text: msg, world: [cx, -3.4, 0.5], anchorId: 'msg' });
      }
      if (f === 1 && tau <= 4 && t >= 6) out.push({ text: 'Çözünen madde zardan geçmez', world: [cx, -3.4, 0.5], anchorId: 'msg' });
      return out.slice(0, 6);
    },
    chartAt(t) {
      const f = focus(t);
      const b = beakers[f]!;
      let inside = 0;
      for (const w of b.water) if (w.sideAt(t) === 1) inside++;
      const v = tableAt(b.table, t - b.start);
      const cIn = S_IN / v;
      return {
        ...emptyChart(),
        'molekul-ic': inside,
        'molekul-dis': b.water.length - inside,
        'derisim-farki': Math.abs(cIn - b.cOut) * 100,
        'net-gecis': netFlux(b.legs, t, 2.5),
        'hucre-hacmi': Math.min(180, (v / V0) * 100),
      };
    },
    setOptions: build,
    dispose() {
      cells.forEach((c) => c.dispose());
      aq.flat().forEach((m) => m.removeFromParent());
    },
  };
}
