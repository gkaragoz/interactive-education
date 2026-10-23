import { gate, path, ramp, still } from './anim';
import { alleleColor, type LabelSpec } from './cross';
import type { Kit } from './kit';
import { addOrganism } from './organisms';
import { classInfo, gametesOf, lookOf, parseCross, squareOf } from './punnett';
import { EMPTY, mix } from './square';

const MATERNAL = '#d4186a';
const PATERNAL = '#1478b8';
const COLS = [-4.8, -1.6, 1.6, 4.8];

/**
 * Test cross AaBb x aabb (the last phase of the dihybrid track): the unknown dominant plant makes four gamete types,
 * the recessive plant only `ab`; each ab gamete meets one of them, and the offspring show 1 : 1 : 1 : 1.
 * Runs from `t0` for 8 s below the 16-square tally.
 */
export function buildTestCross(kit: Kit, t0: number): LabelSpec[] {
  const cross = parseCross('di', 'AaBb-aabb');
  const sq = squareOf(cross);
  const py = -26.5;
  const gy = -30.4;
  const oy = -34.6;
  const px = [-3, 5.5];
  addOrganism(kit, { kind: 'pea', yellow: true, round: true }, gate(still(px[0] as number, py), t0, t0 + 1.2));
  addOrganism(kit, { kind: 'pea', yellow: false, round: false }, gate(still(px[1] as number, py), t0 + 0.3, t0 + 1.5));

  const gamete = (types: readonly string[], x: number, y: number, appear: number, fuse: number, tx: number, ty: number, mother: boolean): void => {
    const frame = path([[appear, x, y, 0], [appear + 1, x, y, 1], [fuse, x, y, 1], [fuse + 1.2, tx, ty, 0.9, 0, 0.8], [fuse + 1.7, tx, ty, 0]]);
    kit.shape({ shape: 'bubble', anim: frame, size: [0.7, 0.7, 0.7], color: '#ffffff' });
    types.forEach((a, g) => {
      const dx = types.length === 1 ? 0 : g === 0 ? -0.22 : 0.22;
      kit.chromo({ single: true, anim: follow2(frame, dx), color: mother ? MATERNAL : PATERNAL, band: alleleColor(a) });
    });
    kit.token({ alleles: types, color: '#e8d9b0', scale: 1.5, anim: follow2(frame, 0, -1.0, 0.45) });
  };
  const follow2 = (frame: ReturnType<typeof path>, dx: number, dy = 0.1, dz = 0.1): ReturnType<typeof path> => {
    const p = { x: 0, y: 0, z: 0, s: 0 };
    return (t, o) => {
      frame(t, p);
      o.x = p.x + dx * p.s;
      o.y = p.y + dy * p.s;
      o.z = p.z + dz * p.s;
      o.s = p.s * (dz > 0.3 ? 1 : 0.5);
    };
  };

  const fuse = t0 + 3.0;
  const left = gametesOf(cross.parents[0]);
  left.forEach((g, i) => {
    const x = COLS[i] as number;
    gamete(g, x, gy, t0 + 1.4 + i * 0.12, fuse, x, oy + 0.4, true);
    const cell = sq.cells[i * sq.n] as (typeof sq.cells)[number];
    const full = mix(classInfo('di', cell.cls).color, '#ffffff', 0.35);
    const start = fuse + 0.9;
    kit.shape({ shape: 'tile', anim: gate(still(x, oy), t0 + 2.4, t0 + 3.2), size: [2.9, 2.9, 1], color: (t) => mix(EMPTY, full, ramp(t, start, start + 1.1)) });
    kit.tag({ alleles: cell.genes.flatMap((a) => [...a]), height: 0.6, maxWidth: 2.5, anim: gate(still(x, oy + 0.85, 1, 0.25), start + 0.5, start + 1.3) });
    addOrganism(kit, lookOf('di', cell.genes), gate(still(x, oy - 0.45, 1.5, 0.2), start + 0.6, start + 1.4), true);
    // the recessive parent's single gamete type, one copy per offspring
    const orb = path([[t0 + 2.0, px[1] as number, gy, 0], [t0 + 2.4, px[1] as number, gy, 1], [fuse - 0.7 + i * 0.08, px[1] as number, gy, 1], [fuse + 1.2 + i * 0.08, x + 0.8, oy + 0.4, 0.8, 0.3, 1.4], [fuse + 1.7 + i * 0.08, x + 0.8, oy + 0.4, 0]]);
    kit.shape({ shape: 'sphere', anim: orb, size: [0.28, 0.28, 0.28], color: alleleColor('b') });
  });
  gamete(['a', 'b'], px[1] as number, gy, t0 + 1.6, t0 + 4.2, px[1] as number, gy, false);
  kit.tag({ text: '1 : 1 : 1 : 1', height: 0.9, anim: gate(still(0, oy - 2.6, 1, 0.3), t0 + 6.0, t0 + 6.8), style: { size: 64 } });
  return [
    { id: 'tc1', t0: t0 + 0.4, t1: t0 + 3.4, text: 'Kontrol çaprazlaması: AaBb × aabb', pos: [0, py + 2.3, 0.4], level: 'ileri' },
    { id: 'tc2', t0: t0 + 1.8, t1: t0 + 5.4, text: 'aabb yalnızca ab gameti verir', pos: [px[1] as number, gy - 1.6, 0.4], level: 'ileri' },
    { id: 'tc3', t0: t0 + 6.4, t1: t0 + 8, text: 'Dört gamet tipi eşit: 1:1:1:1', pos: [0, oy - 3.6, 0.4], level: 'ileri' },
  ];
}
