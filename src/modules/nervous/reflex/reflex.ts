import { ExtrudeGeometry, Mesh, MeshBasicMaterial, Shape, Vector3 } from 'three';
import type { Kit, TrackRig } from '../kit';
import { cameraPath, ramp, smooth } from '../math';
import { PulseBead } from '../pulse';
import { buildBody } from './body';
import { buildCircuit, type Neuron } from './cord';
import { BRAIN, ELBOW, FINGERTIP } from './layout';
import { beadLabels } from './labels';
import { beadPoints } from './paths';
import { brainGlowAt, flexAt, leg, legAmount, legProgress, LEGS, REFLEX_DURATION } from './timing';

const TAIL = 12;
const TAIL_STEP = 0.16;

/** The unified bead position of the fast reflex arc: sensory, a hop across the synapse, interneuron, a hop, motor. Null while it is not travelling. */
export interface BeadState {
  neuron: 'sensory' | 'inter' | 'motor' | 'gap1' | 'gap2' | null;
  u: number;
  amount: number;
}

export function mainBeadState(t: number): BeadState {
  const s = leg('sensory');
  const i = leg('inter');
  const m = leg('motor');
  const fade = 1 - ramp(t, 29.4, 30.4);
  if (t < s.t0 - 0.3 || fade <= 0) return { neuron: null, u: 0, amount: 0 };
  const a = ramp(t, s.t0 - 0.3, s.t0 + 0.2);
  if (t <= s.t1) return { neuron: 'sensory', u: legProgress(s, t), amount: a };
  if (t < i.t0) return { neuron: 'gap1', u: smooth((t - s.t1) / (i.t0 - s.t1)), amount: 1 };
  if (t <= i.t1) return { neuron: 'inter', u: legProgress(i, t), amount: 1 };
  if (t < m.t0) return { neuron: 'gap2', u: smooth((t - i.t1) / (m.t0 - i.t1)), amount: 1 };
  return { neuron: 'motor', u: legProgress(m, t), amount: fade };
}

/** Reflex arc: hot plate, hand, sensory neuron, spinal cord (interneuron), motor neuron, biceps, plus the slow branch to the brain. */
export async function createReflex(kit: Kit): Promise<TrackRig> {
  const body = buildBody(kit);
  const circuit = buildCircuit(kit, body.forearm);
  const main = new PulseBead(kit, '#fff0a0', 0.26);
  const slow = new PulseBead(kit, '#d9b8ff', 0.2);
  const receptor = kit.sprite('#ffb040', 2.4, 0);
  body.forearm.add(receptor);
  receptor.position.copy(FINGERTIP).sub(ELBOW);

  const starShape = new Shape();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 0.9 : 0.42;
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const star = new Mesh(
    new ExtrudeGeometry(starShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.08,
      bevelThickness: 0.06,
      bevelSegments: 2,
    }),
    new MeshBasicMaterial({ color: '#ffd23f', toneMapped: false }),
  );
  star.position.set(BRAIN.x + 3.6, BRAIN.y - 0.2, 0.6);
  kit.root.add(star);
  kit.track(star.geometry);
  kit.track(star.material as MeshBasicMaterial);
  kit.track({ dispose: () => star.removeFromParent() });

  const neurons: Record<string, Neuron> = {
    sensory: circuit.sensory,
    inter: circuit.inter,
    motor: circuit.motor,
    brain: circuit.brain,
  };
  const pts: Vector3[] = [];
  const pts2: Vector3[] = [];
  const level = kit.ctx.level;

  const seek = (t: number): void => {
    body.setPose(t);
    const flex = flexAt(t);
    for (const l of LEGS) {
      const n = neurons[l.id]!;
      n.uniforms.uPulse.value = legProgress(l, t) * 1.0 + (t < l.t0 ? -0.2 : 0);
      n.uniforms.uAmt.value = 1.7 * legAmount(l, t);
    }
    // the receptor charges up while the plate burns the finger, then the impulse leaves it
    (receptor.material as { opacity: number }).opacity = 0.85 * ramp(t, 4.6, 8.6) * (1 - ramp(t, 9, 10.4));
    const st = mainBeadState(t);
    if (st.neuron === null) main.hide();
    else {
      const path = st.neuron === 'gap1' ? circuit.sensory.path : st.neuron === 'gap2' ? circuit.inter.path : neurons[st.neuron]!.path;
      let head: Vector3[];
      if (st.neuron === 'gap1' || st.neuron === 'gap2') {
        const from = path.pointAt(1, flex, new Vector3());
        const to = (st.neuron === 'gap1' ? circuit.inter.path : circuit.motor.path).pointAt(0, flex, new Vector3());
        head = [from.lerp(to, st.u)];
      } else head = beadPoints(path, st.u, flex, TAIL, TAIL_STEP, pts);
      main.set(head, st.amount);
    }
    const b = leg('brain');
    const bu = legProgress(b, t);
    const bAmt = ramp(t, b.t0 - 0.2, b.t0 + 0.4) * (1 - ramp(t, b.t1 + 0.2, b.t1 + 0.9));
    slow.set(beadPoints(circuit.brain.path, bu, flex, 7, 0.16, pts2), bAmt);
    const g = brainGlowAt(t);
    circuit.setBrain(g);
    const pop = ramp(t, 36.6, 37.7);
    star.visible = pop > 0.01;
    star.scale.setScalar(pop * (1 + 0.08 * Math.sin(t * 6)));
    star.rotation.z = Math.sin(t * 3) * 0.12;
  };

  // camera: wide at the start, follows the impulse along its way, ends wide with the brain in view
  const cam = cameraPath([
    { t: 0, ...cp(-0.5, 1.2, 30) },
    { t: 2.5, ...cp(-9, -1, 15) },
    { t: 7, ...cp(-8.6, -0.7, 12.5) },
    { t: 9.5, ...cp(-8, -1, 13) },
    { t: 12.5, ...cp(-2, -0.4, 14) },
    { t: 15, ...cp(3.6, 0.9, 13) },
    { t: 17.5, ...cp(5.9, 0.7, 12) },
    { t: 21.5, ...cp(5.7, 0.2, 12) },
    { t: 23.5, ...cp(3.5, -0.8, 12) },
    { t: 27, ...cp(0.8, -0.8, 13) },
    { t: 30.5, ...cp(-3.2, 1.0, 19) },
    { t: 34.5, ...cp(-1.5, 2.6, 23) },
    { t: 38, ...cp(0.8, 3.4, 28) },
    { t: 40, ...cp(0.8, 3.4, 28) },
  ]);

  return {
    duration: REFLEX_DURATION,
    seek,
    cameraAt: (t) => cam(t),
    labelsAt: (t) =>
      beadLabels(t, level, {
        flex: flexAt(t),
        bead: (n, u) => neurons[n]!.path.pointAt(u, flexAt(t), new Vector3()),
        mainState: mainBeadState(t),
      }),
    chartAt: () => ({}),
    dispose: () => undefined,
  };
}

/** Camera key looking at (x, y) from distance d; the stage centres the picture in the area the panels leave free (safe insets). */
function cp(x: number, y: number, d: number): { pos: [number, number, number]; target: [number, number, number] } {
  const tx = x;
  const ty = y;
  return { pos: [tx, ty, d * 1.1], target: [tx, ty, 0] };
}
