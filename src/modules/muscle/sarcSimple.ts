import { BoxGeometry, Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { ModuleContext } from '../../scene';
import { COLORS, Fader, lathe, paint, rodMatrix, surfaces, unitRod } from './kit';
import { THIN_LEN, type SarcState } from './sarcModel';

/** Rows of the simplified view: thin (actin) and thick (myosin) filaments alternate in one plane. */
const ROWS: ReadonlyArray<{ y: number; thick: boolean }> = [
  { y: 0.64, thick: false },
  { y: 0.32, thick: true },
  { y: 0, thick: false },
  { y: -0.32, thick: true },
  { y: -0.64, thick: false },
];
const THICK_R = 0.115;
const THIN_R = 0.05;

export interface SimpleSarc {
  group: Group;
  fader: Fader;
  pose(s: SarcState): void;
  dispose(): void;
}

/** The two-layer sarcomere for the Temel level: thick and thin filaments between two Z lines, nothing else. */
export function createSimpleSarcomere(ctx: ModuleContext): SimpleSarc {
  const fader = new Fader();
  const solid = surfaces(ctx).solid(fader);
  const group = new Group();
  group.name = 'sarcomere-simple';
  const owned: Array<{ dispose(): void }> = [];
  const col = new Color();
  const inst = (geo: BufferGeometry, n: number, colors: string[]): InstancedMesh => {
    const mesh = new InstancedMesh(geo, solid, n);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    colors.forEach((c, i) => mesh.setColorAt(i, col.set(c)));
    group.add(mesh);
    owned.push(geo, mesh);
    return mesh;
  };
  const thickRows = ROWS.filter((r) => r.thick);
  const thinRows = ROWS.filter((r) => !r.thick);
  const thickGeo = paint(lathe([[0.05, -0.8], [0.1, -0.74], [THICK_R, -0.6], [THICK_R, 0.6], [0.1, 0.74], [0.05, 0.8]], 18).rotateZ(Math.PI / 2));
  const thick = inst(thickGeo, thickRows.length, thickRows.map(() => COLORS.thick));
  thickRows.forEach((r, i) => thick.setMatrixAt(i, new Matrix4().makeTranslation(0, r.y, 0)));
  thick.instanceMatrix.needsUpdate = true;
  const thin = inst(paint(unitRod(10)), thinRows.length * 2, thinRows.flatMap(() => [COLORS.thin, COLORS.thin]));
  const zGeo = paint(new BoxGeometry(0.07, 1.7, 0.34));
  const zBars = inst(zGeo, 2, [COLORS.zline, COLORS.zline]);
  const braceGeo = paint(new BoxGeometry(1, 0.06, 0.06));
  const brace = inst(braceGeo, 1, [COLORS.zline]);
  const m4 = new Matrix4();
  const a = new Vector3();
  const b = new Vector3();
  const q = new Quaternion();
  const sc = new Vector3(1, 1, 1);
  function pose(s: SarcState): void {
    const half = s.L / 2;
    thinRows.forEach((r, i) => {
      [-1, 1].forEach((h, k) => {
        a.set(h * half, r.y, 0);
        b.set(h * (half - THIN_LEN), r.y, 0);
        thin.setMatrixAt(i * 2 + k, rodMatrix(m4, a, b, THIN_R));
      });
    });
    zBars.setMatrixAt(0, m4.compose(a.set(-half - 0.035, 0, 0), q, sc));
    zBars.setMatrixAt(1, m4.compose(a.set(half + 0.035, 0, 0), q, sc));
    brace.setMatrixAt(0, m4.compose(a.set(0, -1.05, 0), q, b.set(s.L, 1, 1)));
    for (const m of [thin, zBars, brace]) m.instanceMatrix.needsUpdate = true;
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
