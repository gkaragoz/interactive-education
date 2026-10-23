import { Float32BufferAttribute, SphereGeometry, Vector2, Vector3, type BufferGeometry, type Group, type MeshPhysicalMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addPulseGlow, pulseUniforms, type PulseUniforms } from '../glowMat';
import { makeTube, paint, slab, superEllipse } from '../geo';
import type { Kit } from '../kit';
import { COLORS } from '../palette';
import { BRAIN, BRAIN_PATH, CORD, CORD_R, ELBOW, FINGERTIP, GANGLION_U, INTER_PATH, INTER_SOMA, MOTOR_PATH, MOTOR_SOMA, SENSORY_FORE, SENSORY_STATIC } from './layout';
import { NeuronPath } from './paths';

export interface Neuron {
  path: NeuronPath;
  uniforms: PulseUniforms;
}

export interface Circuit {
  sensory: Neuron;
  inter: Neuron;
  motor: Neuron;
  brain: Neuron;
  /** Lights the brain up (0..1). */
  setBrain(amount: number): void;
}

const v3 = (p: Vector3, dx = 0, dy = 0, dz = 0): Vector3 => new Vector3(p.x + dx, p.y + dy, p.z + dz);

/** Ellipse polygon rotated by `rot` about its own centre (for the horns of the grey matter). */
function ellipse(cx: number, cy: number, a: number, b: number, rot: number): Vector2[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return superEllipse(0, 0, a, b, 2, 36).map((p) => new Vector2(cx + p.x * c - p.y * s, cy + p.x * s + p.y * c));
}

function constantS(geo: BufferGeometry, s: number): BufferGeometry {
  geo.setAttribute('aS', new Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count).fill(s), 1));
  return geo;
}

/** The spinal cord cross-section (white and grey matter, butterfly), the three neurons of the reflex arc and the branch to the brain. */
export function buildCircuit(kit: Kit, forearm: Group): Circuit {
  const white = kit.clay('nv-white');
  const grey = kit.clay('nv-grey');
  const seg = kit.detail === 0 ? 12 : 20;

  // spinal cord cross-section: extruded plates (the `reflex-arc-parts` cord piece was tried; its pale pink grey matter and fixed
  // dorsal/ventral roots do not line up with the neurons drawn here, so the plates stay)
  const disc = slab(superEllipse(CORD.x, CORD.y, CORD_R, CORD_R * 0.94, 2.1, 72), -1.0, 1.0, COLORS.whiteMatter, 0.1);
  kit.mesh(disc, white);
  kit.mesh(slab(superEllipse(CORD.x, CORD.y, CORD_R + 0.16, CORD_R * 0.94 + 0.16, 2.1, 72), -1.12, 0.9, '#d9bf92', 0.08), white);
  const horns: BufferGeometry[] = [];
  const g = (cx: number, cy: number, a: number, b: number, rot: number): void => {
    horns.push(slab(ellipse(CORD.x + cx, CORD.y + cy, a, b, rot), -1.0, 1.1, COLORS.greyMatter, 0.07));
  };
  g(0, 0.1, 1.0, 0.92, 0);
  for (const sx of [-1, 1]) {
    g(sx * 0.98, 1.0, 1.12, 0.36, sx * -0.78); // dorsal horns: thin, up and out
    g(sx * 1.02, -0.72, 1.1, 0.64, sx * 0.5); // ventral horns: thick, down and out
  }
  const grey2 = mergeGeometries(horns, false);
  horns.forEach((h) => h.dispose());
  if (grey2) kit.mesh(grey2, grey);

  const sensory = neuron(kit, forearm, 'nv-sensory', COLORS.sensory, [{ points: SENSORY_FORE, local: true }, { points: SENSORY_STATIC }]);
  // receptor ending in the fingertip: a bulb with three fine branches (forearm-local, same glowing material)
  const tip = FINGERTIP.clone().sub(ELBOW);
  kit.mesh(constantS(paint(new SphereGeometry(0.2, seg, 12), COLORS.sensory, 0.2), 0), kit.clay('nv-sensory'), forearm).position.copy(tip);
  [
    [-0.5, 0.35],
    [-0.55, -0.05],
    [-0.1, 0.55],
  ].forEach(([dx, dy]) => {
    const pts = [tip.clone(), tip.clone().add(new Vector3(dx! * 0.5, dy! * 0.5, 0.05)), tip.clone().add(new Vector3(dx! * 1.0, dy! * 1.0, 0.1))];
    const t = makeTube({
      points: pts,
      radius: (x) => 0.06 * (1 - 0.6 * x),
      color: COLORS.sensory,
      radial: 6,
      segments: 8,
    });
    kit.mesh(constantS(t.geometry, 0), kit.clay('nv-sensory'), forearm);
  });
  const inter = neuron(kit, forearm, 'nv-inter', COLORS.inter, [{ points: INTER_PATH }]);
  const motor = neuron(kit, forearm, 'nv-motor', COLORS.motor, [{ points: MOTOR_PATH }]);
  const brain = neuron(kit, forearm, 'nv-tract', '#9a6fd0', [{ points: BRAIN_PATH }], 0.09, '#d8b8ff');

  const addSoma = (id: string, p: Vector3, r: number, color: string, u: number): void => {
    kit.mesh(constantS(paint(new SphereGeometry(r, seg, 14), color, 0.2), u), kit.clay(id)).position.copy(p);
  };
  // dorsal root ganglion cell body on the sensory neuron
  const [sa, sb] = sensory.path.range(1);
  const gp = sensory.path.pointAt(sa + (sb - sa) * GANGLION_U, 0, new Vector3());
  addSoma('nv-sensory', gp, 0.3, COLORS.sensory, sa + (sb - sa) * GANGLION_U);
  addSoma('nv-inter', INTER_SOMA, 0.27, COLORS.inter, 0.4);
  addSoma('nv-motor', MOTOR_SOMA, 0.42, COLORS.motor, 0.0);
  // boutons: sensory terminal, interneuron ends, muscle endings
  const bouton = addSoma;
  bouton('nv-sensory', v3(SENSORY_STATIC[SENSORY_STATIC.length - 1]!), 0.2, COLORS.sensory, 1);
  bouton('nv-inter', v3(INTER_PATH[0]!), 0.14, COLORS.inter, 0);
  bouton('nv-inter', v3(INTER_PATH[INTER_PATH.length - 1]!), 0.14, COLORS.inter, 1);

  // decorative dendrites (thin, same material so they light up with their neuron)
  const dend = (id: string, color: string, from: Vector3, dir: [number, number], len: number, u: number, curl = 0.3): void => {
    const pts = [from, v3(from, dir[0] * len * 0.5 + curl * dir[1], dir[1] * len * 0.5 - curl * dir[0] * 0.3), v3(from, dir[0] * len, dir[1] * len)];
    const t = makeTube({
      points: pts,
      radius: (x) => 0.085 * (1 - 0.7 * x),
      color,
      radial: 6,
      segments: 10,
    });
    constantS(t.geometry, u);
    kit.mesh(t.geometry, kit.clay(id));
  };
  const dm = (id: string, color: string, p: Vector3, list: [number, number, number][], u: number): void => list.forEach(([dx, dy, l]) => dend(id, color, p, [dx, dy], l, u));
  dm(
    'nv-motor',
    COLORS.motor,
    MOTOR_SOMA,
    [
      [-0.9, 0.5, 0.75],
      [-0.4, 0.95, 0.7],
      [-1, -0.2, 0.7],
      [0.2, -1, 0.5],
    ],
    0.0,
  );
  dm(
    'nv-inter',
    COLORS.inter,
    INTER_SOMA,
    [
      [0.9, 0.4, 0.55],
      [0.8, -0.5, 0.5],
      [-0.6, 0.8, 0.45],
    ],
    0.4,
  );
  const tipEnd = SENSORY_STATIC[SENSORY_STATIC.length - 1]!;
  dm(
    'nv-sensory',
    COLORS.sensory,
    tipEnd,
    [
      [-0.7, -0.6, 0.5],
      [0.5, -0.9, 0.5],
      [-0.2, -1, 0.45],
    ],
    1,
  );
  const m0 = MOTOR_PATH[MOTOR_PATH.length - 1]!;
  dm(
    'nv-motor',
    COLORS.motor,
    m0,
    [
      [-0.5, 0.9, 0.55],
      [0.5, 0.9, 0.55],
      [-0.95, 0.2, 0.5],
    ],
    1,
  );

  // brain: lumpy pink clay, a brainstem, and a glow
  const bm = kit.clay('nv-brain');
  const lobes: BufferGeometry[] = [];
  const lobe = (x: number, y: number, z: number, rx: number, ry: number, rz: number): void => {
    const s = new SphereGeometry(1, 26, 18);
    s.scale(rx, ry, rz);
    s.translate(BRAIN.x + x, BRAIN.y + y, BRAIN.z + z);
    lobes.push(s.toNonIndexed());
    s.dispose();
  };
  lobe(0, 0, 0, 2.5, 1.75, 1.4);
  lobe(-1.2, 0.5, 0.1, 1.5, 1.2, 1.2);
  lobe(1.25, 0.45, 0.1, 1.5, 1.25, 1.2);
  lobe(0.2, 1.0, 0.0, 1.6, 0.8, 1.1);
  lobe(1.4, -0.7, 0.0, 1.0, 0.7, 0.9);
  lobe(-1.5, -0.55, 0, 1.0, 0.7, 0.9);
  const merged = mergeGeometries(lobes, false)!;
  lobes.forEach((l) => l.dispose());
  paint(merged, COLORS.brain, 0.2);
  const pos = merged.getAttribute('position');
  const col = merged.getAttribute('color') as Float32BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.9 + 0.1 * Math.sin(pos.getX(i) * 3.1 + Math.sin(pos.getY(i) * 2.3) * 2) * Math.sin(pos.getY(i) * 3.4 + pos.getZ(i) * 1.7);
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  kit.mesh(merged, bm);
  const stem = paint(new SphereGeometry(1, 16, 12), '#d98aa6', 0.12);
  stem.scale(0.5, 1.5, 0.5);
  kit.mesh(stem, bm).position.set(BRAIN.x - 0.1, BRAIN.y - 2.4, 0);
  const brainGlow = kit.sprite('#ff8fb8', 9, 0);

  return {
    sensory,
    inter,
    motor,
    brain,
    setBrain(a) {
      bm.emissive.set('#ff7aa8');
      bm.emissiveIntensity = 0.65 * a;
      (brainGlow.material as { opacity: number }).opacity = 0.7 * a;
      brainGlow.position.set(BRAIN.x, BRAIN.y, 0.6);
    },
  };
}

/** A neuron: its path, a tube per part (the forearm part lives in the turning forearm group, in local coordinates) and the glow uniforms. */
function neuron(kit: Kit, forearm: Group, id: string, color: string, parts: { points: readonly Vector3[]; local?: boolean }[], radius = 0.13, glow = '#fff2a8'): Neuron {
  const path = new NeuronPath(parts);
  const uniforms = pulseUniforms(glow, 0.045);
  const mat: MeshPhysicalMaterial = addPulseGlow(kit.clay(id), uniforms, id);
  parts.forEach((p, i) => {
    const [s0, s1] = path.range(i);
    const pts = p.points.map((v) => (p.local ? v.clone().sub(ELBOW) : v.clone()));
    const tube = makeTube({ points: pts, radius, color, s0, s1 });
    kit.mesh(tube.geometry, mat, p.local ? forearm : undefined);
  });
  return { path, uniforms };
}
