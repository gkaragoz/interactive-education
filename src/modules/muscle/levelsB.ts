import { CatmullRomCurve3, CircleGeometry, Group, Mesh, Quaternion, TubeGeometry, Vector3 } from 'three';
import type { ModuleContext } from '../../scene';
import { COLORS, Fader, axisTube, paint, surfaces, unitSphere } from './kit';
import { CUT_X, FAR_X, TUBE_R, compose, cutFace, hexPositions, instanced, tubeMatrix, type Level } from './levels';
import { clamp01, ramp } from './math';
import { stripeMaterial, type StripeUniforms } from './stripes';

/** Radius of the myofibril tube at its own level (its sarcomere pitch is `PITCH * L`, see zoom.ts). */
export const MYO_R = 1.9;

export interface FibreLevel extends Level {
  /** Moves the nerve impulse along the axon (0..1 travelling, >1 flash at the terminal). */
  impulse(p: number): void;
}
/** Position of the nerve terminal in the fibre level's frame (for a label). */
export const TERMINAL: [number, number, number] = [-1.2, 3.75, 0.2];

/** Level 3: a muscle fibre: sarcolemma (glass), 37 striped myofibrils, nuclei at the edge and a motor nerve ending. */
export function createFibreLevel(ctx: ModuleContext, u: StripeUniforms, perUnit: { value: number }): FibreLevel {
  const fader = new Fader();
  const sf = surfaces(ctx);
  const glass = sf.glass(fader, 0.1, 0.9);
  const solid = sf.solid(fader);
  const group = new Group();
  group.name = 'level-fibre';
  const shellGeo = paint(axisTube(1, 1, ctx.quality === 'low' ? 16 : 32, true), '#f7cdbd');
  const shell = new Mesh(shellGeo, glass);
  shell.scale.set(FAR_X - CUT_X, TUBE_R, TUBE_R);
  shell.position.x = (CUT_X + FAR_X) / 2;
  shell.renderOrder = 50;
  group.add(shell);
  group.add(cutFace(TUBE_R, CUT_X, '#f4d2c4', solid));

  const stripes = stripeMaterial(surfaces(ctx).solid(fader), u, perUnit);
  const pos = hexPositions(3, 0.82);
  const myoGeo = paint(axisTube(1, 1, 14, false));
  const myos = instanced(myoGeo, stripes, pos.length, (i, m) => tubeMatrix(m, CUT_X, FAR_X, pos[i]![0], pos[i]![1], 0.38));
  group.add(myos);

  // flattened nuclei pushed to the edge (a muscle fibre has many)
  const nucGeo = paint(unitSphere(14), COLORS.nucleus);
  const nuclei = [[-1, 2.95, 0.5], [3.5, -2.6, 1.6], [9, 1.2, -2.8], [-4, -2.2, -2.0]] as const;
  const nq = new Quaternion();
  const nuc = instanced(nucGeo, solid, nuclei.length, (i, m) => {
    const n = nuclei[i]!;
    nq.setFromAxisAngle(new Vector3(1, 0, 0), Math.atan2(n[2], n[1]));
    m.compose(new Vector3(n[0], n[1], n[2]), nq, new Vector3(1.3, 0.22, 0.5));
  });
  group.add(nuc);

  // motor neuron branch ending on the fibre
  const curve = new CatmullRomCurve3([new Vector3(-9, 11, -2), new Vector3(-5.2, 8.2, -1), new Vector3(-2.8, 5.8, 0), new Vector3(...TERMINAL)]);
  const axonGeo = paint(new TubeGeometry(curve, 40, 0.22, 8, false), COLORS.nerve);
  group.add(new Mesh(axonGeo, solid));
  const bulbGeo = paint(unitSphere(14), '#f7d46a');
  const bulb = new Mesh(bulbGeo, solid);
  bulb.position.set(...TERMINAL);
  bulb.scale.set(0.62, 0.34, 0.62);
  group.add(bulb);
  const pulseGeo = paint(unitSphere(12), '#fff3b0');
  const pulse = new Mesh(pulseGeo, solid);
  pulse.visible = false;
  group.add(pulse);
  const pt = new Vector3();

  return {
    group,
    fader,
    contract: () => undefined,
    impulse: (p) => {
      const travel = clamp01(p);
      pulse.visible = p > 0.001 && p < 1.04;
      curve.getPointAt(ramp(travel, 0, 1), pt);
      pulse.position.copy(pt);
      pulse.scale.setScalar(0.4 + 0.12 * Math.sin(travel * Math.PI));
      const flash = p > 1 ? 1 : 0;
      bulb.scale.set(0.62 * (1 + 0.35 * flash), 0.34 * (1 + 0.5 * flash), 0.62 * (1 + 0.35 * flash));
    },
    dispose: () => {
      [shellGeo, myoGeo, myos, nucGeo, nuc, axonGeo, bulbGeo, pulseGeo].forEach((o) => o.dispose());
      fader.dispose();
    },
  };
}

/** Level 4: one myofibril: a striped rod (Z lines, A bands, I and H zones) whose cut face shows the filament lattice. */
export function createMyofibrilLevel(ctx: ModuleContext, u: StripeUniforms, perUnit: { value: number }): Level {
  const fader = new Fader();
  const solid = surfaces(ctx).solid(fader);
  const group = new Group();
  group.name = 'level-myofibril';
  const mat = stripeMaterial(surfaces(ctx).solid(fader), u, perUnit);
  const geo = paint(axisTube(1, 1, ctx.quality === 'low' ? 18 : 40, false));
  const rod = instanced(geo, mat, 1, (_i, m) => tubeMatrix(m, CUT_X, FAR_X, 0, 0, MYO_R));
  group.add(rod);
  // the cut face: thick (large) and thin (small) filaments end-on, in the real hexagonal pattern
  const d = 0.3;
  const thick: Array<[number, number]> = [];
  const thin: Array<[number, number]> = [];
  const lim = MYO_R - 0.12;
  const at = (i: number, j: number): [number, number] => [d * (i + j / 2), d * 0.866 * j];
  for (let i = -8; i <= 8; i++) {
    for (let j = -8; j <= 8; j++) {
      const p = at(i, j);
      if (Math.hypot(p[0], p[1]) < lim) thick.push(p);
      for (const tri of [[at(i, j), at(i + 1, j), at(i, j + 1)], [at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)]]) {
        const c: [number, number] = [(tri[0]![0] + tri[1]![0] + tri[2]![0]) / 3, (tri[0]![1] + tri[1]![1] + tri[2]![1]) / 3];
        if (Math.hypot(c[0], c[1]) < lim) thin.push(c);
      }
    }
  }
  const dotGeo = paint(new CircleGeometry(1, 14).rotateY(-Math.PI / 2));
  const dots = instanced(
    dotGeo,
    solid,
    thick.length + thin.length,
    (i, m) => {
      const isThick = i < thick.length;
      const p = isThick ? thick[i]! : thin[i - thick.length]!;
      const r = isThick ? 0.11 : 0.048;
      compose(m, CUT_X - 0.03, p[0], p[1], 1, r, r);
    },
    (i) => (i < thick.length ? COLORS.thick : COLORS.thin),
  );
  group.add(dots);
  return {
    group,
    fader,
    contract: () => undefined,
    dispose: () => {
      [geo, dotGeo, dots, rod].forEach((o) => o.dispose());
      fader.dispose();
    },
  };
}
