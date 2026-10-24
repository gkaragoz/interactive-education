import { Vector3 } from 'three';
import { mulberry32 } from '../../../core';
import { netFlux, simulateCrossings, type Gate, type Transit } from '../crossings';
import type { Kit, TrackRig } from '../kit';
import { cameraPath, lerp, smooth } from '../math';
import { COLORS } from '../palette';
import { makeCarrier, makeChannel, type Carrier } from '../proteins';
import type { Walker } from '../walker';
import { allLegs, buildWalkers, countInside, countOutside, drawdown, bestBy, emptyChart, homeOn, legOf, passSite } from './common';

export const FACILITATED_DURATION = 48;
const ION_N = 20;
const GLU_A = 16;
const GLU_B = 16;
const ARRIVE = 30.5;
const B_START = 35;
const CH_X = [-5.4, -2.6];
const CA_X = [2.6, 5.4];
const PZ = -0.55;
const OUT_A: Record<string, number> = { kucuk: 8, orta: 12, buyuk: 15 };
const SPEED: Record<string, number> = { dusuk: 0.6, orta: 1, yuksek: 1.5 };

type Key = [number, number];

/** Carrier conformation over time: +1 open to the outside (rest), -1 open to the inside. */
function thetaKeys(list: Transit[]): Key[] {
  const keys: Key[] = [];
  for (const tr of [...list].sort((a, b) => a.t0 - b.t0)) {
    if (tr.dir > 0) keys.push([tr.tIn, 1], [tr.tOut, -1], [tr.t1, -1], [tr.t1 + 0.7, 1]);
    else keys.push([tr.t0, 1], [tr.tIn, -1], [tr.tOut, 1]);
  }
  return keys;
}
export function thetaAt(keys: readonly Key[], t: number): number {
  if (keys.length === 0 || t <= keys[0]![0]) return 1;
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]!;
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]!;
      return t1 === t0 ? v1 : lerp(v0, v1, smooth((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1]![1];
}

/** Facilitated diffusion: ions through channel proteins, glucose through carriers that flip and saturate. */
export async function createFacilitated(kit: Kit): Promise<TrackRig> {
  const channels = await Promise.all(CH_X.map((x) => makeChannel(kit.ctx, x, PZ)));
  const carriers: Carrier[] = await Promise.all(CA_X.map((x) => makeCarrier(kit.ctx, x, PZ)));
  const proteins = [...channels, ...carriers];
  kit.root.add(...proteins.map((p) => p.group));
  const patch = kit.patch({
    xHalf: 12.5,
    zFront: 0,
    zBack: -3.8,
    seed: 5,
    exclude: (x, z) => proteins.some((p) => Math.hypot(x - p.x, z - p.z) < p.clear),
  });
  kit.backdrop(9.2, -3.8, 5.8, -5.8);
  kit.bokeh(9.2, 5.8, -5.8, -3.8);
  const total = ION_N + GLU_A + GLU_B;
  const pool = kit.pool(total);
  for (let i = 0; i < ION_N; i++) pool.setColor(i, COLORS.ion);
  for (let i = ION_N; i < total; i++) pool.setColor(i, COLORS.big);
  let ions: Walker[] = [];
  let glucose: Walker[] = [];
  let keys: Key[][] = [[], []];
  let legs: ReturnType<typeof allLegs> = [];
  const tmp = new Vector3();

  const gate = (kind: 'channel' | 'carrier', i: number): Gate => ({
    index: i + (kind === 'carrier' ? 2 : 0),
    kind,
    x: (kind === 'carrier' ? CA_X : CH_X)[i]!,
    z: PZ + 0.66,
  });

  const build = (o: Record<string, string>): void => {
    const speed = SPEED[o.sicaklik ?? 'orta'] ?? 1;
    const outA = OUT_A[o['derisim-farki'] ?? 'orta'] ?? 12;
    // ions: 14 outside, 6 inside, channels only
    const ionSides = Array.from({ length: ION_N }, (_, i) => (i < 14 ? 0 : 1) as 0 | 1);
    const ionTr = bestBy(
      30,
      (seed) =>
        simulateCrossings({
          sides: ionSides,
          rate: () => 0.1 * speed,
          tStart: 6,
          tEnd: FACILITATED_DURATION,
          pick: (_m, r) => gate('channel', r() < 0.5 ? 0 : 1),
          timing: () => ({ approach: 0.5, ride: 1, leave: 0.4, reset: 0.1 }),
          rng: kit.ctx.rng(31 + seed),
        }),
      drawdown(ION_N - 14, FACILITATED_DURATION),
    );
    ions = buildWalkers(
      ionSides.map((s) => ({ side0: s, amp: kit.wander, speed })),
      ionTr,
      (tr) => legOf(tr, passSite(tr.gate.x, tr.gate.z, tr.tIn, tr.tOut, tr.dir, 0.95, 0.5)),
      201,
    );
    // glucose: group A from the start, group B drops in at ARRIVE
    const gSides = Array.from({ length: GLU_A + GLU_B }, (_, i) => (i < GLU_A ? (i < outA ? 0 : 1) : 0) as 0 | 1);
    const gluTr = bestBy(
      30,
      (seed) =>
        simulateCrossings({
          sides: gSides,
          rate: () => 0.085 * speed,
          startOf: (m) => (m < GLU_A ? 7 : B_START),
          tStart: 7,
          tEnd: FACILITATED_DURATION,
          pick: (_m, r) => gate('carrier', r() < 0.5 ? 0 : 1),
          timing: (_g, dir) => ({ approach: 0.7, ride: 1.4, leave: 0.5, reset: dir > 0 ? 0.7 : 0 }),
          rng: kit.ctx.rng(71 + seed),
        }),
      drawdown(GLU_A - outA, 32),
    );
    keys = [0, 1].map((i) => thetaKeys(gluTr.filter((tr) => tr.gate.index === i + 2)));
    glucose = buildWalkers(
      gSides.map((s, m) => {
        const r = mulberry32(555 + m);
        return {
          side0: s,
          amp: kit.wander,
          speed,
          home:
            m < GLU_A
              ? undefined
              : (() => {
                  const base = homeOn(r, 0, CA_X[m % 2]! + (r() - 0.5) * 6, 5);
                  const p = new Vector3();
                  return (t: number, out: Vector3) => {
                    base(t, p);
                    out.set(p.x, p.y + 9 * (1 - smooth((t - ARRIVE) / 3)), p.z);
                  };
                })(),
        };
      }),
      gluTr,
      (tr) => legOf(tr, passSite(tr.gate.x, tr.gate.z, tr.tIn, tr.tOut, tr.dir, 0.6)),
      301,
    );
    glucose.forEach((w, m) => {
      if (m >= GLU_A) w.from = ARRIVE - 0.01;
    });
    legs = allLegs(glucose);
  };
  build(kit.ctx.options);

  const camera = cameraPath([
    { t: 0, pos: [0, 5.2, 23.5], target: [0, -0.2, -1.8] },
    { t: 7, pos: [0, 4.6, 22], target: [0, -0.2, -1.8] },
    { t: 9, pos: [-3.6, 3.4, 15], target: [-3.8, -0.1, -1.2] },
    { t: 18, pos: [-3.6, 3.4, 15], target: [-3.8, -0.1, -1.2] },
    { t: 21, pos: [3.6, 3.4, 15], target: [3.8, -0.1, -1.2] },
    { t: 31, pos: [3.6, 3.6, 16], target: [3.8, 0, -1.2] },
    { t: 34, pos: [0, 5, 23], target: [0, -0.2, -1.8] },
    { t: FACILITATED_DURATION, pos: [0, 5.4, 24], target: [0, -0.2, -1.8] },
  ]);

  return {
    duration: FACILITATED_DURATION,
    seek(t) {
      patch.pose(t);
      carriers.forEach((c, i) => c.setTheta(thetaAt(keys[i]!, t)));
      ions.forEach((w, i) => pool.set(i, w.posAt(t, tmp), 0.13));
      glucose.forEach((w, i) => {
        if (w.visible(t)) pool.set(ION_N + i, w.posAt(t, tmp), 0.21);
        else pool.hide(ION_N + i);
      });
      pool.commit();
    },
    cameraAt: camera,
    labelsAt(t) {
      const ileri = kit.ctx.level === 'ileri';
      const out = [
        { text: 'Hücre dışı', world: [1.2, 3.5, -1.5] as [number, number, number], anchorId: 'out' },
        { text: 'Hücre içi', world: [1.2, -4.0, -1.5] as [number, number, number], anchorId: 'in' },
        { text: 'Kanal protein', world: [CH_X[0]! + 0.1, 1.4, PZ] as [number, number, number], anchorId: 'ch' },
        { text: 'Taşıyıcı protein', world: [CA_X[1]! - 0.1, 1.4, PZ] as [number, number, number], anchorId: 'ca' },
      ];
      if (t < 20) out.push({ text: ileri ? 'İyon (örn. K⁺)' : 'İyon', world: [-6.4, 3.4, -1.6], anchorId: 'ion' });
      if (t >= 19) out.push({ text: 'Glikoz', world: [4.6, 3.6, -1.6], anchorId: 'glu' });
      if (t >= B_START - 3 && t < B_START + 8) out.push({ text: 'Derişim artırıldı', world: [0, 4.8, -1.6], anchorId: 'more' });
      if (t >= B_START + 8) out.push({ text: 'Taşıyıcılar meşgul: hız artmıyor', world: [3.4, 3.2, -1.6], anchorId: 'sat' });
      return out;
    },
    chartAt(t) {
      const inside = countInside(glucose, t);
      const outside = countOutside(glucose, t);
      return { ...emptyChart(), 'molekul-ic': inside, 'molekul-dis': outside, 'derisim-farki': Math.abs(outside - inside), 'net-gecis': netFlux(legs, t, 3) };
    },
    setOptions: build,
    dispose() {
      proteins.forEach((p) => p.dispose());
    },
  };
}

