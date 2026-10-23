import { Color, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, SphereGeometry, Vector3, Matrix4 } from 'three';
import { mulberry32 } from '../../../core';
import type { Kit, TrackRig } from '../kit';
import { cameraPath, ramp, smooth } from '../math';
import { COLORS } from '../palette';
import { makePump, type Pump } from '../proteins';
import { fixedHome, makeWander, Walker, type Leg } from '../walker';
import { allLegs, emptyChart, homeOn } from './common';
import { netFlux } from '../crossings';

export const ACTIVE_DURATION = 46;
const PX = [-2.6, 2.6];
const PZ = -0.55;
const CYCLES = [
  { pump: 0, s: 7 },
  { pump: 1, s: 14 },
  { pump: 0, s: 20 },
  { pump: 1, s: 27 },
];
const NA = 48;
const K = 48;
const ATP = 8;
const NA_SITES: [number, number][] = [[-0.24, 0.16], [0.24, 0.16], [0, -0.22]];
const K_SITES: [number, number][] = [[-0.2, 0], [0.2, 0]];
const H_ATP = 3.8;
const P_REL = 9.4;
const SPEED: Record<string, number> = { dusuk: 0.6, orta: 1, yuksek: 1.5 };

const cyclesOf = (pump: number): { s: number }[] => CYCLES.filter((c) => c.pump === pump);
/** 0 open to the inside .. 1 open to the outside. */
export const flipAt = (pump: number, t: number): number => cyclesOf(pump).reduce((a, c) => a + ramp(t - c.s, 4.6, 6.4) - ramp(t - c.s, 10.2, 12), 0);
/** 0 domain open .. 1 closed on ATP. */
export const domainAt = (pump: number, t: number): number => cyclesOf(pump).reduce((a, c) => a + ramp(t - c.s, 2.2, 3.6) - ramp(t - c.s, P_REL, 10.4), 0);
/** Number of ATP molecules split by time t. */
export const atpUsed = (t: number): number => CYCLES.filter((c) => c.s + H_ATP <= t).length;

/** Active transport: two Na+/K+ pumps. Each turn binds 3 Na+ and an ATP, splits it, flips, frees the Na+, takes 2 K+ and flips back. */
export async function createActive(kit: Kit): Promise<TrackRig> {
  const pumps: Pump[] = await Promise.all(PX.map((x) => makePump(kit.ctx, x, PZ)));
  kit.root.add(...pumps.map((p) => p.group));
  const patch = kit.patch({
    xHalf: 8.6,
    zFront: 0,
    zBack: -3.8,
    seed: 9,
    exclude: (x, z) => pumps.some((p) => Math.hypot(x - p.x, z - p.z) < p.clear),
  });
  kit.backdrop(9.2, -3.8, 5.8, -5.8);
  kit.bokeh(9.2, 5.8, -5.8, -3.8);
  const pool = kit.pool(NA + K + ATP * 2);
  for (let i = 0; i < NA; i++) pool.setColor(i, COLORS.sodium);
  for (let i = 0; i < K; i++) pool.setColor(NA + i, COLORS.potassium);
  for (let i = 0; i < ATP; i++) pool.setColor(NA + K + i, COLORS.atp);
  for (let i = 0; i < ATP; i++) pool.setColor(NA + K + ATP + i, COLORS.phosphate);
  // halos: the five binding sites of each pump (3 Na+, 2 K+) glow in the colour of the ion that sits there; one more flashes at the ATP
  const haloGeo = new SphereGeometry(1, 14, 10);
  const haloMat = new MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
  const halos = new InstancedMesh(haloGeo, haloMat, 12);
  halos.instanceMatrix.setUsage(DynamicDrawUsage);
  halos.frustumCulled = false;
  halos.renderOrder = 40;
  kit.root.add(halos);
  const hm = new Matrix4();
  const hc = new Color();
  let na: Walker[] = [];
  let naLegs: ReturnType<typeof allLegs> = [];
  let kk: Walker[] = [];
  let atp: Walker[] = [];
  let phos: (Walker | null)[] = [];
  const atpState: number[] = new Array<number>(ATP).fill(-1);
  const tmp = new Vector3();
  const tmp2 = new Vector3();

  const domainTop = (p: number, t: number): number => pumps[p]!.atpY(domainAt(p, t)) - 0.2;
  const atpSite = (p: number): Leg['site'] => (t, out) => out.set(PX[p]!, domainTop(p, t) + 0.2, PZ + 0.75);
  const pSite = (p: number): Leg['site'] => (t, out) => out.set(PX[p]! + 0.85, pumps[p]!.atpY(domainAt(p, t)) + 0.35, PZ + 0.6);
  const ionSite = (p: number, off: [number, number]): Leg['site'] => (t, out) => out.set(PX[p]! + off[0] * 0.5, -0.4 + 0.8 * flipAt(p, t) + off[1] * 0.5, PZ + 0.66);

  const build = (o: Record<string, string>): void => {
    const speed = SPEED[o.sicaklik ?? 'orta'] ?? 1;
    const amp = kit.wander;
    const mk = (seed: number, side0: 0 | 1, nearX?: number): Walker => {
      const r = mulberry32(seed);
      return new Walker(makeWander(r, amp), [homeOn(r, side0, nearX, 3.2)], speed, side0);
    };
    const addLeg = (w: Walker, seed: number, leg: Omit<Leg, 'gate'>, toSide: 0 | 1, nearX: number): void => {
      w.legs.push({ ...leg, gate: -1 });
      w.homes.push(homeOn(mulberry32(seed), toSide, nearX, 3));
    };
    na = Array.from({ length: NA }, (_, i) => {
      const cyc = i < 12 ? CYCLES[Math.floor(i / 3)] : undefined;
      const w = mk(100 + i, i < 14 ? 1 : 0, cyc ? PX[cyc.pump] : undefined);
      if (cyc) {
        const k = i % 3;
        const s = cyc.s;
        addLeg(w, 300 + i, { t0: s + 0.2 + 0.3 * k, tIn: s + 2.3 + 0.1 * k, tOut: s + 6.6 + 0.1 * k, t1: s + 8.6, tCross: s + 5.6, dir: -1, site: ionSite(cyc.pump, NA_SITES[k]!) }, 0, PX[cyc.pump]! + (k - 1) * 1.4);
      }
      return w;
    });
    naLegs = allLegs(na);
    kk = Array.from({ length: K }, (_, i) => {
      const cyc = i < 8 ? CYCLES[Math.floor(i / 2)] : undefined;
      const w = mk(500 + i, i < 14 ? 0 : 1, cyc ? PX[cyc.pump] : undefined);
      if (cyc) {
        const k = i % 2;
        const s = cyc.s;
        addLeg(w, 700 + i, { t0: s + 6.8 + 0.2 * k, tIn: s + 8.6 + 0.2 * k, tOut: s + 12.6 + 0.1 * k, t1: s + 13.9, tCross: s + 11.1, dir: 1, site: ionSite(cyc.pump, K_SITES[k]!) }, 1, PX[cyc.pump]! + (k - 0.5) * 2);
      }
      return w;
    });
    atp = Array.from({ length: ATP }, (_, i) => {
      const cyc = CYCLES[i];
      const w = mk(900 + i, 1, cyc ? PX[cyc.pump] : undefined);
      if (cyc) addLeg(w, 1100 + i, { t0: cyc.s + 0.6, tIn: cyc.s + 2.6, tOut: cyc.s + 10, t1: cyc.s + 11.4, tCross: cyc.s + H_ATP, dir: 1, site: atpSite(cyc.pump) }, 1, PX[cyc.pump]!);
      return w;
    });
    phos = Array.from({ length: ATP }, (_, i) => {
      const cyc = CYCLES[i];
      if (!cyc) return null;
      const r = mulberry32(1300 + i);
      const w = new Walker(makeWander(r, amp), [fixedHome(0, 0, 0), homeOn(r, 1, PX[cyc.pump]!, 3.5)], speed, 1);
      const t = cyc.s + P_REL;
      w.legs.push({ t0: t, tIn: t, tOut: t, t1: t + 1.6, tCross: t, dir: 1, gate: -1, site: pSite(cyc.pump) });
      return w;
    });
  };
  build(kit.ctx.options);

  const camera = cameraPath([
    { t: 0, pos: [0, 5.2, 23.5], target: [0, -0.2, -1.8] },
    { t: 6, pos: [0, 5, 22.5], target: [0, -0.2, -1.8] },
    { t: 8.5, pos: [0, 3.2, 16.5], target: [0, -0.6, -0.9] },
    { t: 40, pos: [0, 3.2, 16.5], target: [0, -0.6, -0.9] },
    { t: 43, pos: [0, 5.2, 23.5], target: [0, -0.2, -1.8] },
    { t: ACTIVE_DURATION, pos: [0, 5.2, 23.5], target: [0, -0.2, -1.8] },
  ]);
  const off = new Vector3(0.2, 0.17, 0.05);

  return {
    duration: ACTIVE_DURATION,
    seek(t) {
      patch.pose(t);
      pumps.forEach((p, i) => p.setState(flipAt(i, t), domainAt(i, t)));
      na.forEach((w, i) => pool.set(i, w.posAt(t, tmp), 0.14));
      kk.forEach((w, i) => pool.set(NA + i, w.posAt(t, tmp), 0.14));
      atp.forEach((w, i) => {
        const body = w.posAt(t, tmp);
        pool.set(NA + K + i, body, 0.24);
        const split = CYCLES[i] ? t >= CYCLES[i]!.s + H_ATP : false;
        const state = split ? 1 : 0;
        if (atpState[i] !== state) {
          atpState[i] = state;
          pool.setColor(NA + K + i, split ? COLORS.adp : COLORS.atp);
        }
        const cyc = CYCLES[i];
        const pw = phos[i];
        let p = tmp2.copy(body).add(off);
        if (cyc && pw) {
          const th = cyc.s + H_ATP;
          if (t >= th) {
            const site = pSite(cyc.pump);
            if (t < cyc.s + P_REL) {
              const target = new Vector3();
              site(t, target);
              p = t < th + 0.9 ? p.lerp(target, smooth((t - th) / 0.9)) : p.copy(target);
            } else p = pw.posAt(t, tmp2);
          }
        }
        pool.set(NA + K + ATP + i, p, 0.1);
      });
      pool.commit();
      const q = new Vector3();
      let slot = 0;
      const put = (pos: Vector3, scale: number, color: string, glow: number): void => {
        hm.makeScale(scale, scale, scale);
        hm.setPosition(pos);
        halos.setMatrixAt(slot, hm);
        halos.setColorAt(slot, hc.set(color).multiplyScalar(glow));
        slot++;
      };
      for (let p = 0; p < PX.length; p++) {
        const mine = cyclesOf(p);
        const lit = (from: number, to: number): number => mine.reduce((a, c) => a + (t >= c.s + from && t <= c.s + to ? 1 : 0), 0);
        NA_SITES.forEach((off, k) => {
          ionSite(p, off)(t, q);
          const on = lit(2.3 + 0.1 * k, 6.6 + 0.1 * k);
          put(q, 0.3 + 0.05 * on * (1 + Math.sin(t * 6)), '#ff4a3d', on ? 1 : 0.6);
        });
        K_SITES.forEach((off) => {
          ionSite(p, off)(t, q);
          const on = lit(8.6, 12.7);
          put(q, 0.3 + 0.05 * on * (1 + Math.sin(t * 6)), '#6a5cff', on ? 1 : 0.6);
        });
        const flash = mine.reduce((a, c) => (t >= c.s + H_ATP && t <= c.s + H_ATP + 1 ? Math.sin((Math.PI * (t - c.s - H_ATP)) / 1) : a), 0);
        atpSite(p)(t, q);
        put(q, 0.01 + 0.55 * flash, '#ffd84a', 1);
      }
      halos.instanceMatrix.needsUpdate = true;
      if (halos.instanceColor) halos.instanceColor.needsUpdate = true;
    },
    cameraAt: camera,
    labelsAt(t) {
      const ileri = kit.ctx.level === 'ileri';
      const out = [
        { text: 'Hücre dışı', world: [1.2, 3.5, -1.5] as [number, number, number], anchorId: 'out' },
        { text: 'Hücre içi', world: [1.2, -4.0, -1.5] as [number, number, number], anchorId: 'in' },
        { text: ileri ? 'Na⁺/K⁺ pompası' : 'Pompa protein', world: [PX[1]! + 0.4, 1.4, PZ] as [number, number, number], anchorId: 'pump' },
      ];
      if (t < 7) out.push({ text: 'Na⁺ dışarıda çok', world: [4.8, 3.8, -1.6], anchorId: 'na' }, { text: 'K⁺ içeride çok', world: [4.8, -3.8, -1.6], anchorId: 'k' });
      else {
        for (let i = 0; i < CYCLES.length; i++) {
          const c = CYCLES[i]!;
          const u = t - c.s;
          if (u > 0.6 && u < 11.4) {
            const body = atp[i]!.posAt(t, tmp);
            out.push({ text: u < H_ATP ? 'ATP' : 'ADP', world: [body.x, body.y - 0.55, body.z], anchorId: 'atp' });
            if (u >= H_ATP && u < P_REL && ileri) {
              const site = pSite(c.pump);
              const q = new Vector3();
              site(t, q);
              out.push({ text: 'P (fosfat)', world: [q.x + 0.5, q.y - 0.2, q.z], anchorId: 'phos' });
            }
            break;
          }
        }
      }
      return out;
    },
    chartAt(t) {
      let inside = 0;
      for (const w of na) if (w.sideAt(t) === 1) inside++;
      return { ...emptyChart(), 'molekul-ic': inside, 'molekul-dis': NA - inside, 'derisim-farki': Math.abs(NA - 2 * inside), 'net-gecis': netFlux(naLegs, t, 3), 'harcanan-atp': atpUsed(t) };
    },
    setOptions: build,
    dispose() {
      halos.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      halos.removeFromParent();
      pumps.forEach((p) => p.dispose());
    },
  };
}

