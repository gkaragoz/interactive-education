import type { Rng } from '../../core';
import { KeyTrack } from './keys';
import { lobeA, lenOf, MATERNAL, PATERNAL, nucleusPoints, platePoints, randomAngles, THICK } from './layout';
import { CAM_CH, CELL_CH, CHR_CH, NUC_CH, Plan, POLE_CH, SPN_CH } from './plan';
import { chartMitosis } from './charts';
import { mitosisLabels } from './labelsMitosis';

const R = 4;
const PI = Math.PI;

/** Mitosis, 45 s: G1, S, G2, prophase .. telophase, cytokinesis, two daughter cells. Times follow the track data. */
export function buildMitosis(np: number, rng: Rng): Plan {
  const plan = new Plan();
  plan.np = np;
  plan.duration = 45;
  const K = 2 * np;
  const E1 = 1.4 * R;
  const af = Math.cbrt((E1 * R * R) / 2);
  const ext = 2 * af;

  plan.cells = [
    new KeyTrack(CELL_CH, { on: 1, ext: R, a: lobeA(R), neck: 1 }).to(26).to(31, { ext: E1 }).to(37).to(41.8, { neck: 0, ext, a: af }).to(45, { gap: 0.5 }),
    new KeyTrack(CELL_CH, { on: 0 }),
  ];
  plan.furrow = [{ cell: 0, t0: 37.5, t1: 42 }];

  const nuc = nucleusPoints(K, 1.2, rng);
  const plate = platePoints(K, 1.75);
  const nuc2 = nucleusPoints(K, 1.0, rng);
  for (let k = 0; k < K; k++) {
    const pair = k >> 1;
    const h = k & 1;
    const L = lenOf(pair);
    const [rx0, rz0, ry0] = randomAngles(rng);
    const [rx1, rz1, ry1] = randomAngles(rng);
    const [py, pz, th] = plate[k] as [number, number, number];
    const p = nuc[k] as [number, number, number];
    const n2 = nuc2[k] as [number, number, number];
    for (let s = 0; s < 2; s++) {
      const sg = s ? 1 : -1;
      const t0 = 17.2 + 0.22 * k;
      const o = s ? 0.1 : 0;
      const tr = new KeyTrack(CHR_CH, { on: s ? 0 : 1, side: s, x: p[0] + o, y: p[1] + o * 0.5, z: p[2], rx: rx0, rz: rz0, ry: ry0 + (s ? 0.6 : 0), len: L, thick: THICK });
      tr.to(4.5).to(7.5, { on: 1 }).to(15).to(17, { rz: rz0 - sg * 0.1, kin: 1 }, 'linear');
      tr.to(t0, {}, 'linear');
      tr.to(t0 + 3, { x: sg * 0.1, y: py, z: pz, rx: th + PI, rz: -sg * 0.1, ry: s ? PI : 0, att: 1 });
      tr.to(26).to(29.2, { x: sg * 2.5, y: py * 0.7, z: pz * 0.7, rz: 0, bq: 0.8, bp: 0.8 });
      tr.to(31, { x: sg * 4.1 }).to(34, { att: 0 });
      tr.to(37, { x: sg * 3.4 + n2[0] * 0.7, y: n2[1] * 0.7, z: n2[2] * 0.7, rx: rx1, rz: rz1, ry: ry1, bq: 0, bp: 0, kin: 0 });
      tr.to(41.8).to(45, { x: sg * 3.9 + n2[0] * 0.7 });
      plan.chr.push(tr);
      plan.meta.push({ pair, h, s, tint: h ? PATERNAL : MATERNAL, alt: h ? PATERNAL : MATERNAL, phase: (k * 1.7 + s * 3.1) % 6.28 });
    }
    plan.splitAt.set(`${pair},${h}`, 26);
  }

  const mk = (init: Record<string, number>): KeyTrack => new KeyTrack(NUC_CH, init);
  const nucFull = { cell: 0, y: 0, z: 0, scat: 1.2, nucl: 1 };
  plan.nuc = [
    mk({ ...nucFull, on: 1, x: 0, r: 2.2, integ: 1 }).to(14).to(16.5, { nucl: 0 }).to(17.2).to(19.4, { integ: 0 }).to(29).to(33, { on: 0 }).to(45),
    mk({ ...nucFull, on: 0, x: -3.4, r: 1.5, integ: 0, nucl: 0, scat: 1.3 }).to(31).to(32, { on: 1 }).to(37, { integ: 1, nucl: 0 }).to(41.8).to(45, { x: -3.9 }),
    mk({ ...nucFull, on: 0, x: 3.4, r: 1.5, integ: 0, nucl: 0, scat: 1.3 }).to(31).to(32, { on: 1 }).to(37, { integ: 1, nucl: 0 }).to(41.8).to(45, { x: 3.9 }),
  ];
  while (plan.nuc.length < 7) plan.nuc.push(mk({ on: 0, r: 1 }));

  const P = (init: Record<string, number>): KeyTrack => new KeyTrack(POLE_CH, { cell: 0, rad: 3.1, aster: 0.25, ...init });
  plan.poles = [
    P({ size: 1, ang: 1.75 }).to(11.5).to(17, { ang: PI, rad: 3.4, aster: 1 }).to(28).to(31, { rad: 5.0 }).to(36, { aster: 0.3 }).to(41.8, { rad: 5.1 }).to(45, { rad: 5.7 }),
    P({ size: 0, ang: 1.4 }).to(4.5).to(7.5, { size: 1 }).to(11.5).to(17, { ang: 0, rad: 3.4, aster: 1 }).to(28).to(31, { rad: 5.0 }).to(36, { aster: 0.3 }).to(41.8, { rad: 5.1 }).to(45, { rad: 5.7 }),
    P({ size: 0 }),
    P({ size: 0 }),
  ];
  plan.spn = [new KeyTrack(SPN_CH, { ip: 0, ovl: 1.0 }).to(13).to(18, { ip: 1 }).to(28).to(31, { ovl: 0.5 }).to(33).to(36, { ip: 0 }), new KeyTrack(SPN_CH, { ip: 0, ovl: 1 })];
  plan.loose = new KeyTrack(['v'], { v: 1 }).to(11).to(17, { v: 0 }).to(33).to(36.5, { v: 1 });

  const C = (px: number, py: number, pz: number, tx = 0, ty = 0, tz = 0): Record<string, number> => ({ px, py, pz, tx, ty, tz });
  plan.cam = new KeyTrack(CAM_CH, C(0, 2, 16.8)).to(10, C(-1.6, 2, 16.8)).to(17, C(0, 2.4, 16.8)).to(21, C(5.6, 3.6, 16)).to(26, C(5.6, 3.6, 16)).to(31, C(0, 1.6, 20)).to(37, C(0, 1.2, 20.8)).to(45, C(0, 1.2, 23.2));
  plan.chart = chartMitosis(np);
  plan.labels = mitosisLabels;
  return plan;
}
