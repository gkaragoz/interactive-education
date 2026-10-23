import { BoxGeometry, Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial, type Material, PlaneGeometry, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { ModuleContext } from '../../scene';
import { COLORS, Fader, lathe, paint, rodMatrix, surfaces, unitRod, unitSphere } from './kit';
import { hash01 } from './math';
import { headOffset, headPose, THIN_LEN, type SarcState } from './sarcModel';
import { partnersOf, SLAB, THICK, THICK_R, THIN, THIN_R } from './sarcLattice';

const RINGS = 8;
const RING_GAP = 0.08;
const RING_START = 0.14;
const BEAD_GAP = 0.036;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);
/** Distance from a thick filament axis to a neighbouring thin filament axis. */
const PARTNER_DIST = 0.2656;

export interface SarcView {
  group: Group;
  fader: Fader;
  /** Poses everything from the sarcomere state (pure: same state, same pose). */
  pose(s: SarcState): void;
  dispose(): void;
}

interface Head {
  k: number;
  h: number;
  x: number;
  dy: number;
  dz: number;
  offset: number;
}

function buildHeads(): Head[] {
  const heads: Head[] = [];
  let id = 0;
  THICK.forEach((_, k) => {
    const ps = partnersOf(k);
    for (const h of [-1, 1]) {
      for (let r = 0; r < RINGS; r++) {
        const used = new Set<number>();
        for (let s = 0; s < 2; s++) {
          const idx = (r + s * Math.max(1, Math.floor(ps.length / 2)) + (h > 0 ? 0 : 1)) % ps.length;
          if (used.has(idx)) continue;
          used.add(idx);
          const p = ps[idx]!;
          heads.push({ k, h, x: h * (RING_START + r * RING_GAP), dy: p[0], dz: p[1], offset: headOffset(id++) });
        }
      }
    }
  });
  return heads;
}
export const HEAD_COUNT = buildHeads().length;

/** The full 3D sarcomere slab: five thick filaments with heads, thin filaments, Z discs, M line and band markers. */
export function createSarcomereView(ctx: ModuleContext): SarcView {
  const fader = new Fader();
  const solid = surfaces(ctx).solid(fader);
  const group = new Group();
  group.name = 'sarcomere';
  const owned: Array<{ dispose(): void }> = [];
  const heads = buildHeads();
  const beadsPer = ctx.quality === 'low' ? 18 : Math.round(THIN_LEN / BEAD_GAP);
  const strands = ctx.quality === 'low' ? 1 : 2;
  const m4 = new Matrix4();
  const col = new Color();
  const col2 = new Color();

  const inst = (geo: BufferGeometry, n: number, shadow = false, material: Material = solid): InstancedMesh => {
    const mesh = new InstancedMesh(geo, material, n);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = shadow;
    for (let i = 0; i < n; i++) {
      mesh.setMatrixAt(i, HIDDEN);
      mesh.setColorAt(i, col.set('#ffffff'));
    }
    group.add(mesh);
    owned.push(geo, mesh);
    return mesh;
  };

  // thick filaments (static)
  const thickGeo = lathe([[0.04, -0.8], [0.062, -0.74], [0.07, -0.62], [0.07, -0.12], [0.058, -0.08], [0.058, 0.08], [0.07, 0.12], [0.07, 0.62], [0.062, 0.74], [0.04, 0.8]], 18).rotateZ(Math.PI / 2);
  paint(thickGeo, COLORS.thick);
  const thick = inst(thickGeo, THICK.length, true);
  THICK.forEach((p, k) => thick.setMatrixAt(k, m4.makeTranslation(0, p[0], p[1])));
  thick.instanceMatrix.needsUpdate = true;

  const lever = inst(paint(unitRod(6)), heads.length);
  const blob = inst(paint(unitSphere(10)), heads.length);
  const rods = inst(paint(unitRod(6), '#2a8ba3'), THIN.length * 2);
  const beads = inst(paint(unitSphere(8)), THIN.length * 2 * strands * beadsPer);
  const disc = inst(paint(new CylinderGeometry(1, 1, 1, 40).rotateZ(Math.PI / 2)), 3, false, surfaces(ctx).glass(fader, 0.5, 0.95));
  disc.renderOrder = 60;
  disc.setColorAt(0, col.set(COLORS.zline));
  disc.setColorAt(1, col.set(COLORS.zline));
  disc.setColorAt(2, col.set(COLORS.mline));

  // band tints behind the slab and the bracket bars under it
  const flat = fader.add(new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }), 0.2);
  const bars = fader.add(new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), 1);
  const tintGeo = paint(new PlaneGeometry(1, 1));
  const tints = new InstancedMesh(tintGeo, flat, 4);
  tints.frustumCulled = false;
  tints.renderOrder = 1;
  [COLORS.bandA, COLORS.bandI, COLORS.bandI, COLORS.bandH].forEach((c, i) => tints.setColorAt(i, col.set(c)));
  const barGeo = paint(new BoxGeometry(1, 1, 1));
  const marks = new InstancedMesh(barGeo, bars, 6);
  marks.frustumCulled = false;
  [COLORS.bandA, COLORS.bandI, COLORS.bandI, COLORS.bandH, COLORS.zline, COLORS.zline].forEach((c, i) => marks.setColorAt(i, col.set(c)));
  group.add(tints, marks);
  owned.push(tintGeo, barGeo, tints, marks);

  const tip = new Vector3();
  const base = new Vector3();
  const mid = new Vector3();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const sc = new Vector3();
  const axis = new Vector3();
  const qx = new Quaternion();
  const zFront = SLAB.cz + SLAB.hz;
  const zBack = SLAB.cz - SLAB.hz - 0.3;
  const yLo = -SLAB.hy - 0.12;
  const yHi = SLAB.hy + 0.12;
  const sides = [-1, 1];
  /** Bead and lever colours never change: set them on the first pose only. */
  let coloured = false;

  function pose(s: SarcState): void {
    const half = s.L / 2;
    let bi = 0;
    THIN.forEach((p, i) => {
      sides.forEach((h, side) => {
        base.set(h * half, p[0], p[1]);
        tip.set(h * (half - THIN_LEN), p[0], p[1]);
        rods.setMatrixAt(i * 2 + side, rodMatrix(m4, base, tip, 0.011));
        for (let st = 0; st < strands; st++) {
          for (let b = 0; b < beadsPer; b++) {
            const along = (b + 0.5) * (THIN_LEN / beadsPer);
            const ang = (along / 0.4) * Math.PI * 2 + st * Math.PI + i;
            mid.set(h * (half - along), p[0] + Math.cos(ang) * 0.016, p[1] + Math.sin(ang) * 0.016);
            const r = THIN_R * 0.78;
            beads.setMatrixAt(bi, m4.compose(mid, q.identity(), sc.set(r, r, r)));
            if (!coloured) beads.setColorAt(bi, col.set(b % 2 === 0 ? COLORS.bead : COLORS.thin));
            bi++;
          }
        }
      });
    });
    heads.forEach((hd, i) => {
      const t = THICK[hd.k]!;
      const hp = headPose(s.slide, hd.offset, s.engage);
      base.set(hd.x, t[0] + hd.dy * THICK_R * 0.85, t[1] + hd.dz * THICK_R * 0.85);
      const radial = PARTNER_DIST - THIN_R - 0.03 - hp.lift;
      tip.set(hd.x + hd.h * hp.delta, t[0] + hd.dy * radial, t[1] + hd.dz * radial);
      mid.copy(tip).sub(base).normalize();
      q.setFromUnitVectors(up, mid);
      // the motor domain swings further than the lever (exaggerated pivot): extra tilt about d x x, toward +x
      axis.set(0, hd.dz, -hd.dy);
      q.premultiply(qx.setFromAxisAngle(axis, 1.1 * Math.atan2(hd.h * hp.delta, radial)));
      mid.copy(tip).sub(base).normalize().multiplyScalar(-0.028).add(tip);
      lever.setMatrixAt(i, rodMatrix(m4, base, mid, 0.01));
      blob.setMatrixAt(i, m4.compose(tip, q, sc.set(0.03, 0.046, 0.03)));
      col.set(COLORS.head).lerp(col2.set('#ffc15a'), hp.attached ? 0.6 * s.engage : 0).multiplyScalar(0.94 + 0.12 * hash01(i));
      blob.setColorAt(i, col);
      if (!coloured) lever.setColorAt(i, col.set('#e0643f'));
    });
    const dy = SLAB.hy + 0.1;
    const dz = SLAB.hz + 0.1;
    disc.setMatrixAt(0, m4.compose(base.set(-half - 0.025, SLAB.cy, SLAB.cz), q.identity(), sc.set(0.03, dy, dz)));
    disc.setMatrixAt(1, m4.compose(base.set(half + 0.025, SLAB.cy, SLAB.cz), q.identity(), sc.set(0.03, dy, dz)));
    disc.setMatrixAt(2, m4.compose(base.set(0, SLAB.cy, SLAB.cz), q.identity(), sc.set(0.04, dy * 0.92, dz * 0.92)));
    const a = s.A / 2;
    const tint = (i: number, x0: number, x1: number): void => {
      tints.setMatrixAt(i, m4.compose(base.set((x0 + x1) / 2, (yLo + yHi) / 2, zBack), q.identity(), sc.set(Math.max(x1 - x0, 1e-4), yHi - yLo, 1)));
    };
    tint(0, -a, a);
    tint(1, -half, -a);
    tint(2, a, half);
    tint(3, -s.H / 2, s.H / 2);
    const bar = (i: number, x0: number, x1: number, y: number): void => {
      marks.setMatrixAt(i, m4.compose(base.set((x0 + x1) / 2, y, zFront + 0.12), q.identity(), sc.set(Math.max(x1 - x0 - 0.02, 1e-4), 0.05, 0.05)));
    };
    const y0 = yLo - 0.12;
    bar(0, -a, a, y0);
    bar(1, -half, -a, y0);
    bar(2, a, half, y0);
    bar(3, -s.H / 2, s.H / 2, y0 - 0.12);
    bar(4, -half, half, y0 - 0.24);
    marks.setMatrixAt(5, HIDDEN);
    for (const m of [rods, beads, lever, blob, disc, tints, marks]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor && (m === blob || !coloured)) m.instanceColor.needsUpdate = true;
    }
    coloured = true;
  }

  return {
    group,
    fader,
    pose,
    dispose: () => {
      owned.forEach((o) => o.dispose());
      fader.dispose();
      group.removeFromParent();
    },
  };
}
