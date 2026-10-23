import { lenOf, lobeA, MATERNAL, MATERNAL_ALT, nucleusPoints, PATERNAL, PATERNAL_ALT, platePoints, randomAngles, THICK } from './layout';
import { CELL_CH, CHR_CH, NUC_CH, POLE_CH, SPN_CH } from './plan';
import { AF1, cid, E_ANA1, GAP1, type MCtx, mk, NUC_R, POLE_REST, R_CELL, rotX, leftHomolog, XC } from './meioShared';

const PI = Math.PI;
const BQ = 0.55;
const BP = -0.2;
const SIS = 0.3;

/** Meiosis I (canonical 0..50): synapsis, crossing over, bivalents on the plate, homologs to the poles, two cells. */
export function buildMeiosis1(c: MCtx): void {
  const { plan, np } = c;
  const K = 2 * np;
  const rng = c.rng(11);
  const nuc = nucleusPoints(K, 1.15, rng);
  const syn = nucleusPoints(np, 0.85, rng);
  const clus = nucleusPoints(K, 1.0, rng);
  const rhoB = np === 2 ? 1.5 : 2.1;
  const plate = platePoints(np, rhoB, 0.3);

  plan.cells = [
    mk(c, CELL_CH, { on: 1, ext: R_CELL, a: lobeA(R_CELL), neck: 1 }).to(27).to(35, { ext: E_ANA1 }).to(38).to(43, { neck: 0, ext: 2 * AF1, a: AF1 }).to(45.5, { gap: GAP1 }).to(50),
    mk(c, CELL_CH, { on: 0 }),
  ];
  plan.furrow = [{ cell: 0, t0: 38.5, t1: 43 }];

  for (let p = 0; p < np; p++) {
    const together = c.nd && p === np - 1;
    const phi = plate[p]![2] + PI;
    const [py, pz] = plate[p] as [number, number, number];
    for (let h = 0; h < 2; h++) {
      const k = 2 * p + h;
      const L = lenOf(p);
      const left = h === leftHomolog(c, p);
      const sd = together ? 1 : left ? 0 : 1;
      const sg = sd === 0 ? -1 : 1;
      const lat = h ? 0.4 : -0.4;
      const [rx0, rz0, ry0] = randomAngles(c.rng(100 + k));
      const [rx1, rz1, ry1] = randomAngles(c.rng(200 + k));
      const dist = 0.65 * L * Math.sin(BQ) + THICK * 0.95;
      // arm-length geometry of the bivalent: centromeres sit `dist` from the middle, tips touch there
      const bx = together ? lat : sg * dist;
      for (let s = 0; s < 2; s++) {
        const zs = s ? SIS : -SIS;
        const fl = s ? 0.08 : -0.08;
        const n = nuc[k] as [number, number, number];
        const sy = syn[p] as [number, number, number];
        const cl = clus[k] as [number, number, number];
        const lateral = h ? 0.3 : -0.3;
        const sO = rotX(phi, lateral, 0, zs);
        const tr = mk(c, CHR_CH, { on: 1, side: sd, x: n[0] + (s ? 0.1 : 0), y: n[1], z: n[2] + (s ? 0.08 : 0), rx: rx0, rz: rz0, ry: ry0 + s * 0.5, len: L, thick: THICK });
        tr.to(8);
        // synapsis: the homologs find each other and lie side by side
        tr.to(11, { x: sy[0] + sO[0], y: sy[1] + sO[1], z: sy[2] + sO[2], rx: phi + fl, rz: 0, ry: 0 });
        // crossing over: the two inner chromatids (maternal sister 1 and paternal sister 0) swap their tips
        const swap = (h === 0 && s === 1) || (h === 1 && s === 0);
        tr.to(11.5);
        tr.to(14.2, { seg: swap ? 0.3 : 0 });
        // diplotene: homologs repel, held together at the chiasma: ring-shaped bivalent
        const dl = together ? 0 : sg * dist;
        const dO = rotX(phi, together ? lat : dl, 0, zs);
        tr.to(17.5, { x: sy[0] + dO[0], y: sy[1] + dO[1], z: sy[2] + dO[2], bq: together ? 0.15 : BQ, bp: together ? 0 : BP, ry: sd ? PI : 0, kin: 1 });
        // onto the plate, attached to spindle fibres from one pole each
        const ao = rotX(phi, bx, 0, zs);
        tr.to(17.9 + 0.35 * p, {}, 'linear');
        tr.to(21.5 + 0.3 * p, { x: ao[0], y: py + ao[1], z: pz + ao[2], att: 1 });
        tr.to(27);
        // anaphase I: whole homologs (still two chromatids each) travel to their pole
        const ax = rotX(phi, together ? 2.5 + lat : sg * 2.5, 0, zs);
        tr.to(30.2, { x: ax[0], y: py * 0.7 + ax[1], z: pz * 0.7 + ax[2], bq: 0.8, bp: 0.8 });
        const bxp = rotX(phi, together ? 4.1 + lat : sg * 4.1, 0, zs);
        tr.to(35, { x: bxp[0], y: py * 0.7 + bxp[1], z: pz * 0.7 + bxp[2] });
        tr.to(38, { att: 0 });
        // telophase I: a haploid nucleus forms at each pole
        const side = sg;
        tr.to(40, { x: side * 3.3 + cl[0] * 0.7 + s * 0.12, y: cl[1] * 0.7, z: cl[2] * 0.7, rx: rx1, rz: rz1, ry: ry1, bq: 0, bp: 0, kin: 0 });
        tr.to(43).to(45.5, { x: side * XC + cl[0] * 0.7 + s * 0.12 });
        tr.to(50);
        plan.chr.push(tr);
        const base = h ? PATERNAL : MATERNAL;
        plan.meta.push({ pair: p, h, s, tint: base, alt: swap ? (h ? MATERNAL_ALT : PATERNAL_ALT) : base, phase: (k * 1.3 + s * 2.7) % 6.28 });
      }
    }
    plan.chiasmata.push({ pair: p, t0: 12.5, t1: 21, ids: [cid(p, 0, 1), cid(p, 1, 0)] });
  }

  const nf = { cell: 0, y: 0, z: 0, scat: 1.2, nucl: 1 };
  plan.nuc = [
    mk(c, NUC_CH, { ...nf, on: 1, x: 0, r: 2.2, integ: 1 }).to(13).to(16, { nucl: 0 }).to(17.5).to(19.6, { integ: 0 }).to(34).to(37, { on: 0 }),
    mk(c, NUC_CH, { ...nf, on: 0, x: -3.3, r: NUC_R, integ: 0, nucl: 0, scat: 1.3 }).to(35).to(36, { on: 1 }).to(40, { integ: 1 }).to(43).to(45.5, { x: -XC }).to(50),
    mk(c, NUC_CH, { ...nf, on: 0, x: 3.3, r: NUC_R, integ: 0, nucl: 0, scat: 1.3 }).to(35).to(36, { on: 1 }).to(40, { integ: 1 }).to(43).to(45.5, { x: XC }).to(50),
  ];

  const P = (init: Record<string, number>): ReturnType<typeof mk> => mk(c, POLE_CH, { cell: 0, rad: 3.0, aster: 0.25, ...init });
  const both = (t: ReturnType<typeof mk>, a: number): ReturnType<typeof mk> =>
    t.to(9).to(18, { ang: a, rad: 3.4, aster: 1 }).to(29).to(35, { rad: 5.0 }).to(40, { aster: 0.3 }).to(43).to(45.5, { rad: XC + POLE_REST }).to(50);
  plan.poles = [both(P({ size: 1, ang: 1.75 }), PI), both(P({ size: 1, ang: 1.4 }), 0), P({ size: 0 }), P({ size: 0 })];
  plan.spn = [mk(c, SPN_CH, { ip: 0, ovl: 1.0 }).to(12).to(19, { ip: 1 }).to(33).to(35, { ovl: 0.5 }).to(36).to(40, { ip: 0 }), mk(c, SPN_CH, { ip: 0, ovl: 1 })];
  plan.loose = mk(c, ['v'], { v: 0.85 }).to(5).to(8, { v: 0.35 }).to(11, { v: 0.2 }).to(17.5, { v: 0 }).to(34).to(40, { v: 0.45 }).to(50);
}
