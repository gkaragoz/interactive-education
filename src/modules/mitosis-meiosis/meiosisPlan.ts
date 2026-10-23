import type { Rng } from '../../core';
import { chartMeiosis1, chartMeiosis2, chartNondisjunction } from './charts';
import { KeyTrack } from './keys';
import { meiosisLabels } from './labelsMeiosis';
import { buildMeiosis1 } from './meiosis1';
import { buildMeiosis2 } from './meiosis2';
import { type MCtx, mk } from './meioShared';
import { CAM_CH, Plan } from './plan';

export type MeiosisMode = 'm1' | 'm2' | 'nd';

/** Piecewise-linear time map from canonical to track time through `(canonical, real)` anchors. */
export function pieceWarp(anchors: [number, number][]): (t: number) => number {
  return (t) => {
    const first = anchors[0] as [number, number];
    if (t <= first[0]) return first[1] + (t - first[0]);
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1] as [number, number];
      const b = anchors[i] as [number, number];
      if (t <= b[0]) return a[1] + ((t - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
    }
    const last = anchors[anchors.length - 1] as [number, number];
    return last[1] + (t - last[0]);
  };
}

const ND_WARP = pieceWarp([
  [0, 0], [5, 4], [19, 12], [27, 19], [35, 29], [45, 36], [50, 36], [53, 36.8], [60, 39], [67, 40.8], [75, 42.5], [85, 46], [90, 55],
]);

/** Meiosis I (`m1`), meiosis II (`m2`) or the non-disjunction variant (`nd`), all from one choreography. */
export function buildMeiosis(mode: MeiosisMode, np: number, assort: number, rng: (seed: number) => Rng): Plan {
  const plan = new Plan();
  plan.np = np;
  const warp = mode === 'm1' ? (t: number) => t : mode === 'm2' ? (t: number) => t - 50 : ND_WARP;
  plan.duration = mode === 'm1' ? 50 : mode === 'm2' ? 40 : 55;
  const c: MCtx = { plan, np, assort, nd: mode === 'nd', warp, rng };
  buildMeiosis1(c);
  buildMeiosis2(c);
  if (mode !== 'm2') plan.ghostWin = [warp(21.8), warp(27)];
  plan.furrow = plan.furrow.map((f) => ({ ...f, t0: warp(f.t0), t1: warp(f.t1) }));
  plan.chiasmata = plan.chiasmata.map((x) => ({ ...x, t0: warp(12.8), t1: warp(26.8) }));
  plan.loose.to(53).to(60, { v: 0 }).to(77).to(81, { v: 0.45 }).to(90);

  const C = (px: number, py: number, pz: number, tx = 0, ty = 0, tz = 0): Record<string, number> => ({ px, py, pz, tx, ty, tz });
  const cam: KeyTrack = mk(c, CAM_CH, C(0, 2.5, 22));
  cam.to(8, C(0, 2.5, 22)).to(10.5, C(2.5, 1.5, 17, -0.3, 0, 0)).to(15, C(2.5, 1.5, 17, -0.3, 0, 0)).to(18.5, C(0, 3, 22));
  cam.to(21.5, C(7, 4.5, 20)).to(27, C(7, 4.5, 20)).to(31, C(0, 2, 26)).to(38, C(0, 1.5, 27)).to(46, C(0, 1, 31)).to(52, C(0, 2, 31));
  cam.to(60, C(5, 10, 26)).to(67, C(5, 10, 26)).to(73, C(0, 2, 30)).to(85, C(0, 1, 33)).to(90);
  plan.cam = cam;
  plan.chart = mode === 'm1' ? chartMeiosis1(np) : mode === 'm2' ? chartMeiosis2(np) : chartNondisjunction(np);
  plan.labels = meiosisLabels(mode, warp, np);
  return plan;
}
