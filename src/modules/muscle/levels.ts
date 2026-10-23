import { CircleGeometry, Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';
import type { ModuleContext } from '../../scene';
import { COLORS, Fader, axisTube, lathe, paint, surfaces, unitSphere } from './kit';
import { hash01 } from './math';

/** Radius of the tube that stands for a fascicle / fibre at its own zoom level, and the child tubes drawn inside. */
export const TUBE_R = 3.4;
export const CHILD_R = 0.68;
/** Tubes are cut at CUT_X (the cut face shows the bundle of children) and run on to FAR_X, out of view. */
export const CUT_X = -7;
export const FAR_X = 90;
/** The lower levels are turned by this angle about the vertical so their cut faces and their length are both visible. */
export const YAW = 0.66;

export interface Level {
  group: Group;
  fader: Fader;
  /** Called with every seek: the sarcomere length factor L / 2.4 (the muscle and fascicle shorten and thicken with it). */
  contract(ratio: number): void;
  dispose(): void;
}

/** Hexagonal packing positions (y, z) for `rings` rings around the centre (19 for 2, 37 for 3). */
export function hexPositions(rings: number, spacing: number): Array<[number, number]> {
  const out: Array<[number, number]> = [[0, 0]];
  for (let r = 1; r <= rings; r++) {
    for (let k = 0; k < 6 * r; k++) {
      const side = Math.floor(k / r);
      const i = k % r;
      const a0 = (side * Math.PI) / 3;
      const a1 = ((side + 1) * Math.PI) / 3;
      out.push([(Math.cos(a0) * r + (Math.cos(a1) - Math.cos(a0)) * i) * spacing, (Math.sin(a0) * r + (Math.sin(a1) - Math.sin(a0)) * i) * spacing]);
    }
  }
  return out;
}

/** Instanced mesh helper: `n` copies of `geo`, placed with `place(i, matrix)`, tinted with `tint(i)`. */
export function instanced(geo: BufferGeometry, mat: Material, n: number, place: (i: number, m: Matrix4) => void, tint?: (i: number) => string): InstancedMesh {
  const mesh = new InstancedMesh(geo, mat, n);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  const m = new Matrix4();
  const c = new Color();
  for (let i = 0; i < n; i++) {
    place(i, m.identity());
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(tint ? tint(i) : '#ffffff'));
  }
  return mesh;
}

const Q = new Quaternion();
const V = new Vector3();
const S = new Vector3();
export const compose = (m: Matrix4, x: number, y: number, z: number, sx: number, sy: number, sz: number): Matrix4 => m.compose(V.set(x, y, z), Q, S.set(sx, sy, sz));
/** A unit tube (from `axisTube(1, 1, ...)`) running from x0 to x1 at (y, z) with radius r. */
export const tubeMatrix = (m: Matrix4, x0: number, x1: number, y: number, z: number, r: number): Matrix4 => compose(m, (x0 + x1) / 2, y, z, x1 - x0, r, r);

/** The flat pale disc behind the children on a cut face (connective tissue between the circles). */
export function cutFace(radius: number, x: number, color: string, material: Material): Mesh {
  const geo = paint(new CircleGeometry(radius, 48).rotateY(-Math.PI / 2), color);
  const mesh = new Mesh(geo, material);
  mesh.position.x = x + 0.04;
  return mesh;
}

/** Profile of a muscle belly: widest at x = 0, pointed at x = +-9 (the part left of BELLY_X0 is cut away). */
const BELLY_X0 = -3;
const BELLY_X1 = 9;
const bellyR = (x: number): number => (TUBE_R + 0.2) * Math.pow(Math.max(Math.sin((Math.PI * (x + 9)) / 18), 0), 0.45);

/** Level 1: the muscle belly (glass sheath, cut open) with a bundle of 19 fascicles inside it, and a tendon. */
export function createMuscleLevel(ctx: ModuleContext): Level {
  const fader = new Fader();
  const sf = surfaces(ctx);
  const solid = sf.solid(fader);
  const glass = sf.glass(fader, 0.1, 0.9);
  const group = new Group();
  group.name = 'level-muscle';
  const inner = new Group();
  group.add(inner);
  const seg = ctx.quality === 'low' ? 14 : 28;
  const prof: Array<[number, number]> = [];
  for (let i = 0; i <= 30; i++) {
    const x = BELLY_X0 + ((BELLY_X1 - BELLY_X0) * i) / 30;
    prof.push([bellyR(x), x]);
  }
  const shellGeo = paint(lathe(prof, seg).rotateZ(-Math.PI / 2), '#f6bfae');
  const shell = new Mesh(shellGeo, glass);
  shell.renderOrder = 50;
  inner.add(shell);
  const face = cutFace(bellyR(BELLY_X0), BELLY_X0, '#f2c9b8', solid);
  inner.add(face);
  const tubeGeo = paint(axisTube(1, 1, 18, false));
  const capGeo = paint(unitSphere(14));
  const pos = hexPositions(2, 1.3);
  const ends = pos.map(([y, z]) => {
    const need = Math.hypot(y, z) + CHILD_R * 1.1;
    let x = BELLY_X1;
    while (x > BELLY_X0 + 1 && bellyR(x) < need) x -= 0.1;
    return x;
  });
  const radiusOf = (i: number): number => CHILD_R * (i === 0 ? 1.12 : 1);
  const tint = (i: number): string => (i === 0 ? '#ff7f5e' : hash01(i) > 0.5 ? '#e4735c' : '#dd6b58');
  const tubes = instanced(tubeGeo, solid, pos.length, (i, m) => tubeMatrix(m, BELLY_X0, ends[i]!, pos[i]![0], pos[i]![1], radiusOf(i)), tint);
  const caps = instanced(capGeo, solid, pos.length, (i, m) => compose(m, ends[i]!, pos[i]![0], pos[i]![1], radiusOf(i), radiusOf(i), radiusOf(i)), tint);
  inner.add(tubes, caps);
  const tendonGeo = paint(axisTube(1, 1, 14, false), COLORS.tendon);
  const tendon = new Mesh(tendonGeo, solid);
  tendon.scale.set(5, 0.75, 0.75);
  group.add(tendon);
  return {
    group,
    fader,
    contract: (ratio) => {
      inner.scale.set(ratio, Math.pow(ratio, -0.5), Math.pow(ratio, -0.5));
      const len = 5 + (1 - ratio) * 12 * 0.8;
      tendon.scale.x = len;
      tendon.position.x = BELLY_X1 * ratio + len / 2 - 0.3;
    },
    dispose: () => {
      [shellGeo, tubeGeo, capGeo, tendonGeo, face.geometry, tubes, caps].forEach((o) => o.dispose());
      fader.dispose();
    },
  };
}

/** Level 2: the fascicle (glass sheath, cut open) with 19 fibres. */
export function createFascicleLevel(ctx: ModuleContext): Level {
  const fader = new Fader();
  const sf = surfaces(ctx);
  const solid = sf.solid(fader);
  const glass = sf.glass(fader, 0.1, 0.9);
  const group = new Group();
  group.name = 'level-fascicle';
  const shellGeo = paint(axisTube(1, 1, ctx.quality === 'low' ? 16 : 32, true), '#f4c8b8');
  const shell = new Mesh(shellGeo, glass);
  tubeMatrix(new Matrix4(), CUT_X, FAR_X, 0, 0, TUBE_R).decompose(shell.position, shell.quaternion, shell.scale);
  shell.renderOrder = 50;
  group.add(shell);
  const face = cutFace(TUBE_R, CUT_X, '#f3cdbc', solid);
  group.add(face);
  const pos = hexPositions(2, 1.3);
  const fibreGeo = paint(axisTube(1, 1, 20, false));
  const radiusOf = (i: number): number => CHILD_R * (i === 0 ? 1.12 : 1);
  const fibres = instanced(fibreGeo, solid, pos.length, (i, m) => tubeMatrix(m, CUT_X, FAR_X, pos[i]![0], pos[i]![1], radiusOf(i)), (i) => (i === 0 ? '#ff9a78' : hash01(i + 40) > 0.5 ? '#f0a58f' : '#e8957f'));
  group.add(fibres);
  return {
    group,
    fader,
    contract: () => undefined,
    dispose: () => {
      [shellGeo, face.geometry, fibreGeo, fibres].forEach((o) => o.dispose());
      fader.dispose();
    },
  };
}
