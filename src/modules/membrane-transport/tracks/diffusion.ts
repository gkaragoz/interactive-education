import { Vector3 } from 'three';
import { LIPID_SPACING } from '../bilayer';
import { netFlux, simulateCrossings } from '../crossings';
import type { Kit, TrackRig } from '../kit';
import { cameraPath } from '../math';
import { COLORS } from '../palette';
import { makeWander, Walker } from '../walker';
import { mulberry32 } from '../../../core';
import { allLegs, bestBy, buildWalkers, countInside, countOutside, deviationFrom, emptyChart, homeOn, legOf, passSite } from './common';

export const DIFFUSION_DURATION = 44;
const START = 5.5;
const N = 48;
const BIG = 6;
const OUT_COUNT: Record<string, number> = { kucuk: 28, orta: 36, buyuk: 44 };
const SPEED: Record<string, number> = { dusuk: 0.6, orta: 1, yuksek: 1.5 };

/** Simple diffusion: small molecules cross the lipid bilayer by themselves, down their concentration gradient. */
export function createDiffusion(kit: Kit): TrackRig {
  const pool = kit.pool(N + BIG);
  const patch = kit.patch({ xHalf: 12.5, zFront: 0, zBack: -3.8, seed: 3 });
  kit.backdrop(9.2, -3.8, 5.8, -5.8);
  kit.bokeh(9.2, 5.8, -5.8, -3.8);
  for (let i = 0; i < N; i++) pool.setColor(i, COLORS.solute);
  for (let i = N; i < N + BIG; i++) pool.setColor(i, COLORS.big);
  let solute: Walker[] = [];
  let big: Walker[] = [];
  let legs: ReturnType<typeof allLegs> = [];
  const tmp = new Vector3();

  const build = (o: Record<string, string>): void => {
    const outN = OUT_COUNT[o['derisim-farki'] ?? 'orta'] ?? 36;
    const speed = SPEED[o.sicaklik ?? 'orta'] ?? 1;
    const sides = Array.from({ length: N }, (_, i) => (i < outN ? 0 : 1) as 0 | 1);
    const nx = Math.floor(7 / LIPID_SPACING);
    const k = 0.075 * speed;
    const in0 = N - outN;
    const transits = bestBy(
      40,
      (seed) =>
        simulateCrossings({
          sides,
          rate: () => k,
          tStart: START,
          tEnd: DIFFUSION_DURATION,
          pick: (_m, r) => ({
            index: -1,
            kind: 'gap',
            x: (Math.floor(r() * 2 * nx) - nx + 0.5) * LIPID_SPACING,
            z: -(1 + Math.floor(r() * 6) + 0.5) * LIPID_SPACING,
          }),
          timing: () => ({ approach: 0.5, ride: 0.8, leave: 0.5, reset: 0 }),
          rng: kit.ctx.rng(11 + seed),
        }),
      deviationFrom(in0, (t) => N / 2 + (in0 - N / 2) * Math.exp(-2 * k * Math.max(0, t - START)), DIFFUSION_DURATION),
    );
    solute = buildWalkers(
      sides.map((s) => ({ side0: s, amp: kit.wander, speed })),
      transits,
      (tr) => legOf(tr, passSite(tr.gate.x, tr.gate.z, tr.tIn, tr.tOut, tr.dir)),
      101,
    );
    legs = allLegs(solute);
    big = Array.from({ length: BIG }, (_, i) => {
      const r = mulberry32(900 + i);
      const w = new Walker(makeWander(r, kit.wander * 0.8), [homeOn(r, 0, -6 + i * 2.4, 1.5)], speed, 0);
      w.bounce = { period: 2.2 + r(), phase: r() * 6, floor: 0.95, height: 0.7 + r() * 0.8 };
      return w;
    });
  };
  build(kit.ctx.options);

  const camera = cameraPath([
    { t: 0, pos: [0, 5.2, 23.5], target: [0, -0.2, -1.8] },
    { t: 6, pos: [0, 4.6, 22], target: [0, -0.2, -1.8] },
    { t: 20, pos: [0, 4, 20.5], target: [0, -0.1, -1.8] },
    { t: DIFFUSION_DURATION, pos: [0, 5, 23], target: [0, -0.2, -1.8] },
  ]);

  return {
    duration: DIFFUSION_DURATION,
    seek(t) {
      patch.pose(t);
      solute.forEach((w, i) => pool.set(i, w.posAt(t, tmp), 0.12));
      big.forEach((w, i) => pool.set(N + i, w.posAt(t, tmp), 0.21));
      pool.commit();
    },
    cameraAt: camera,
    labelsAt(t) {
      const ileri = kit.ctx.level === 'ileri';
      const out = [
        { text: 'Hücre dışı', world: [1.2, 3.5, -1.5] as [number, number, number], anchorId: 'out' },
        { text: 'Hücre içi', world: [1.2, -4.0, -1.5] as [number, number, number], anchorId: 'in' },
        { text: ileri ? 'Fosfolipit çift katman' : 'Hücre zarı', world: [6.4, 0.1, 0.4] as [number, number, number], anchorId: 'mem' },
      ];
      if (t < START + 0.5) {
        out.push({ text: 'Çok molekül', world: [-3.6, 3.6, -1.6], anchorId: 'many' }, { text: 'Az molekül', world: [-3.6, -3.6, -1.6], anchorId: 'few' });
      } else if (t < 32) out.push({ text: 'Net geçiş: çoktan aza', world: [3.2, 3.4, -1.6], anchorId: 'flow' });
      else out.push({ text: 'Dinamik denge', world: [3.2, 3.4, -1.6], anchorId: 'flow' });
      if (t > 3) {
        const p = big[0]!.posAt(t, tmp);
        out.push({ text: 'Büyük molekül geçemez', world: [p.x, p.y + 0.55, p.z], anchorId: 'big' });
      }
      return out;
    },
    chartAt(t) {
      const inside = countInside(solute, t);
      const outside = countOutside(solute, t);
      return { ...emptyChart(), 'molekul-ic': inside, 'molekul-dis': outside, 'derisim-farki': Math.abs(outside - inside), 'net-gecis': netFlux(legs, t) };
    },
    setOptions(o) {
      build(o);
    },
    dispose() {
      /* the kit owns pool and patch */
    },
  };
}

