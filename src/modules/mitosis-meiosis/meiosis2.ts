import { lobeA, nucleusPoints, platePoints } from './layout';
import { AF1, AF2, cellOf, cid, E_ANA2, GAP2, type MCtx, mk, NUC_R, POLE_REST, XC, XC2 } from './meioShared';
import { NUC_CH } from './plan';

const PI = Math.PI;
const RHO = [0, 0, 1.1, 1.5, 1.7, 1.9];

/**
 * Meiosis II (canonical 50..90), continuing the keys of meiosis I: the two cells swap frames (no visible change), turn
 * their spindle axis, break down the envelope, line the chromosomes up, split the sister chromatids and divide again.
 */
export function buildMeiosis2(c: MCtx): void {
  const { plan, np } = c;
  const lists: [number, number][][] = [[], []];
  for (let p = 0; p < np; p++) for (let h = 0; h < 2; h++) lists[cellOf(c, p, h)]!.push([p, h]);
  const n2 = nucleusPoints(2 * np, 0.9, c.rng(31));

  // cells: two spheres where the daughters were, then each divides along a spindle perpendicular to the first
  const cells = plan.cells;
  cells[0]!.jump(50, { on: 1, x: -XC, ext: AF1, a: lobeA(AF1), neck: 1, gap: 0 });
  cells[1]!.jump(50, { on: 1, x: XC, ext: AF1, a: lobeA(AF1), neck: 1, gap: 0 });
  for (const cell of cells) {
    cell.to(53, { rot: PI / 2 }).to(67).to(75, { ext: E_ANA2 }).to(77).to(83, { neck: 0, ext: 2 * AF2, a: AF2 }).to(85.5, { gap: GAP2 }).to(90);
  }
  plan.furrow.push({ cell: 0, t0: 77.5, t1: 83 }, { cell: 1, t0: 77.5, t1: 83 });

  for (let cc = 0; cc < 2; cc++) {
    const list = lists[cc] as [number, number][];
    const n = list.length;
    const plate = platePoints(n, RHO[Math.min(n, RHO.length - 1)] as number, 0);
    const cx = cc ? XC : -XC;
    list.forEach(([p, h], j) => {
      const k = 2 * p + h;
      const nu = n2[k] as [number, number, number];
      const [py, pz, th] = plate[j] as [number, number, number];
      const ta = 59.5 + 0.35 * j;
      for (let s = 0; s < 2; s++) {
        const tr = plan.chr[cid(p, h, s)]!;
        const sg = s ? 1 : -1;
        tr.jump(50, { cell: cc, x: tr.last('x') - cx });
        tr.to(56).to(ta, { kin: 1, side: s }, 'linear');
        tr.to(ta + 3, { x: sg * 0.1, y: py, z: pz, rx: th + PI, rz: -sg * 0.1, ry: s ? PI : 0, att: 1 });
        tr.to(67).to(70.2, { x: sg * 2.1, y: py * 0.7, z: pz * 0.7, rz: 0, bq: 0.8, bp: 0.8 });
        tr.to(75, { x: sg * 2.8 }).to(78, { att: 0 });
        tr.to(80.5, { x: sg * 2.6 + nu[0] * 0.5, y: nu[1] * 0.5, z: nu[2] * 0.5, rx: nu[0] * 3, rz: nu[1] * 0.8, ry: nu[2] * 3, bq: 0, bp: 0, kin: 0 });
        tr.to(83).to(85.5, { x: sg * XC2 + nu[0] * 0.5 }).to(90);
      }
    });
  }

  // poles: the carried centrosome stays, its partner appears beside it and swings to the other side
  const poles = plan.poles;
  poles[0]!.jump(50, { cell: 0, ang: PI, rad: POLE_REST }).to(56).to(61, { rad: 3.0, aster: 1 }).to(69).to(75, { rad: 3.7 }).to(80, { aster: 0.3 }).to(83).to(85.5, { rad: XC2 + 1.9 }).to(90);
  poles[1]!.jump(50, { size: 0, cell: 0, ang: PI - 0.4, rad: POLE_REST }).to(51).to(53, { size: 1, aster: 0.25 }).to(56).to(61, { ang: 0, rad: 3.0, aster: 1 }).to(69).to(75, { rad: 3.7 }).to(80, { aster: 0.3 }).to(83).to(85.5, { rad: XC2 + 1.9 }).to(90);
  poles[2]!.jump(50, { size: 0, cell: 1, ang: 0.4, rad: POLE_REST }).to(51).to(53, { size: 1, aster: 0.25 }).to(56).to(61, { ang: PI, rad: 3.0, aster: 1 }).to(69).to(75, { rad: 3.7 }).to(80, { aster: 0.3 }).to(83).to(85.5, { rad: XC2 + 1.9 }).to(90);
  poles[3]!.jump(50, { size: 1, cell: 1, ang: 0, rad: POLE_REST, aster: 0.3 }).to(56).to(61, { rad: 3.0, aster: 1 }).to(69).to(75, { rad: 3.7 }).to(80, { aster: 0.3 }).to(83).to(85.5, { rad: XC2 + 1.9 }).to(90);
  for (const sp of plan.spn) sp.to(56).to(61, { ip: 1 }).to(73).to(75, { ovl: 0.5 }).to(76).to(80, { ip: 0 }).to(90);

  // nuclei: the two carried nuclei break down; each cell then forms two daughter nuclei
  plan.nuc[1]!.jump(50, { cell: 0, x: 0, y: 0, z: 0, r: NUC_R, integ: 1, on: 1, nucl: 0 }).to(58.5).to(60.8, { integ: 0 }).to(75).to(79, { on: 0 }).to(90);
  plan.nuc[2]!.jump(50, { cell: 1, x: 0, y: 0, z: 0, r: NUC_R, integ: 1, on: 1, nucl: 0 }).to(58.5).to(60.8, { integ: 0 }).to(75).to(79, { on: 0 }).to(90);
  for (let i = 3; i < 7; i++) {
    const cc = i < 5 ? 0 : 1;
    const sg = i % 2 === 1 ? -1 : 1;
    plan.nuc[i] = mk(c, NUC_CH, { cell: cc, on: 0, x: sg * 2.6, y: 0, z: 0, r: 1.5, integ: 0, scat: 1.1, nucl: 0 }).to(75).to(76, { on: 1 }).to(80.5, { integ: 1 }).to(83).to(85.5, { x: sg * XC2 }).to(90);
  }
}
