import { DoubleSide, MeshPhysicalMaterial, Plane, SphereGeometry, Vector3, Mesh } from 'three';
import { mulberry32 } from '../../../core';
import type { ModuleLabel } from '../../../scene';
import type { Kit, TrackRig } from '../kit';
import { cameraPath, ramp, window01 } from '../math';
import { COLORS } from '../palette';
import { InstancePool } from '../pool';
import { PulseBead } from '../pulse';
import { makeWander, walkerAt, type Walker } from '../walk';
import { buildCells } from './shapes';
import { buildProteins } from './proteins';
import { cargoOffset, DOCK_X, ntPos, refillCenter, vesicleCenter } from './motion';
import {
  AP_END,
  AP_START,
  CA_BIND,
  CA_IN,
  CA_Y,
  FUSE,
  MERGE,
  NT_COUNT,
  PLAN,
  POST_X,
  PRE_X,
  REC_Y,
  SYN_DURATION,
  VESICLE_R,
  VESICLE_Y,
  caOpen,
  channelOpen,
  fuseAt,
  mergeAt,
  ntPercent,
  postIonWindow,
  pspAt,
  refillAt,
  tf,
} from './model';

const minus = (v: number): string => (v < 0 ? '−' : '') + Math.abs(Math.round(v));
const cp = (x: number, y: number, d: number): { pos: [number, number, number]; target: [number, number, number] } => {
  const tx = x;
  const ty = y;
  return { pos: [tx + 0.03 * d, ty + 0.03 * d, d * 1.1], target: [tx, ty, 0] };
};
const v3 = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

/** Synapse: action potential arrives, Ca2+ enters, vesicles dock and fuse, transmitter crosses the cleft, binds, opens channels, is removed. */
export async function createSynapse(kit: Kit): Promise<TrackRig> {
  buildCells(kit);
  const prot = buildProteins(kit);
  const rng = mulberry32(5);

  // vesicles: translucent lilac spheres; a clip plane opens them toward the cleft while they fuse
  const vGeo = new SphereGeometry(VESICLE_R, 26, 18);
  kit.track(vGeo);
  const vesicles = VESICLE_Y.map(() => {
    const plane = new Plane(new Vector3(-1, 0, 0), 1e3);
    const mat = new MeshPhysicalMaterial({
      color: COLORS.vesicle,
      transparent: true,
      opacity: 0.5,
      roughness: 0.3,
      side: DoubleSide,
      depthWrite: false,
      clippingPlanes: [plane],
    });
    kit.track(mat);
    const mesh = new Mesh(vGeo, mat);
    mesh.renderOrder = 35;
    kit.root.add(mesh);
    kit.track({ dispose: () => mesh.removeFromParent() });
    const sensor = kit.sprite('#ffd23f', 2.0, 0);
    return { mesh, plane, sensor };
  });

  // transmitter molecules (cargo while inside a vesicle)
  const ntPool = new InstancePool(null, kit.clay('nv-nt'), NT_COUNT, 12);
  for (let i = 0; i < NT_COUNT; i++) ntPool.setColor(i, COLORS.neurotransmitter);
  kit.root.add(ntPool.mesh);
  kit.track(ntPool);

  // calcium (terminal) and sodium (receiving cell) ions that cross through channels
  const mat = kit.clay('nv-ion');
  const caW: Walker[] = [];
  const naW: Walker[] = [];
  const mk = (home0: Vector3, legs: Walker['legs']): Walker => ({
    wander: makeWander(rng),
    home0,
    legs,
    radius: 1,
  });
  CA_Y.forEach((y, k) => {
    for (let j = 0; j < 3; j++) {
      const vy = VESICLE_Y[k + (j % 2)]!;
      caW.push(
        mk(v3(PRE_X + 0.95 + 0.25 * j, y + (j - 1) * 0.45, -0.1 - 0.2 * j), [
          {
            t0: CA_IN[j]!.t0,
            t1: CA_IN[j]!.t1,
            a: v3(PRE_X + 0.7, y, 0.5),
            b: v3(PRE_X - 0.7, y, 0.5),
            home: v3(DOCK_X - 0.7 - 0.25 * j, y + (j - 1) * 0.35, 0.3),
          },
          {
            t0: CA_BIND + 0.1 * j,
            t1: CA_BIND + 0.1 * j + 0.5,
            a: v3(DOCK_X - 0.3, vy + (j - 1) * 0.1, 0.95),
            b: v3(DOCK_X - 0.3, vy + (j - 1) * 0.1, 0.95),
            home: v3(DOCK_X - 0.3, vy + (j - 1) * 0.1, 0.95),
          },
        ]),
      );
    }
  });
  REC_Y.forEach((y, k) => {
    for (let i = 0; i < 3; i++) {
      const w = postIonWindow(k, i);
      naW.push(
        mk(v3(POST_X - 0.85 - 0.3 * i, y + (i - 1) * 0.55, -0.3 - 0.2 * i), [
          {
            t0: w.t0,
            t1: w.t1,
            a: v3(POST_X - 0.9, y, 0.5),
            b: v3(POST_X + 0.9, y, 0.5),
            home: v3(POST_X + 1.7 + 0.35 * i, y + (i - 1) * 0.5, 0.2),
          },
        ]),
      );
    }
  });
  const caPool = new InstancePool(null, mat, caW.length, 12);
  const naPool = new InstancePool(null, mat, naW.length, 12);
  caW.forEach((_, i) => caPool.setColor(i, COLORS.calcium));
  naW.forEach((_, i) => naPool.setColor(i, COLORS.sodium));
  for (const p of [caPool, naPool]) {
    kit.root.add(p.mesh);
    kit.track(p);
  }

  // impulse in the axon, depolarisation glow on the terminal membrane, receiving membrane glow
  const bead = new PulseBead(kit, '#fff0a0', 0.3);
  const preGlow = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((y) => {
    const s = kit.sprite('#ffc83a', 2.6, 0, false);
    s.position.set(PRE_X, y, 0.5);
    return s;
  });
  const postGlow = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((y) => {
    const s = kit.sprite('#58d8c0', 2.6, 0, false);
    s.position.set(POST_X, y, 0.5);
    return s;
  });

  const c = new Vector3();
  const p = new Vector3();
  const trail: Vector3[] = Array.from({ length: 12 }, () => new Vector3());
  const seek = (t: number): void => {
    // axon impulse
    const ap = (t - AP_START) / (AP_END - AP_START);
    for (let k = 0; k < trail.length; k++) trail[k]!.set(-16 + 11 * Math.min(1, Math.max(0, ap - k * 0.018)), 0, 0.5);
    bead.set(trail, ap > 0 && ap < 1.1 ? Math.min(1, ap * 6) * (1 - ramp(ap, 1, 1.1)) : 0);
    const dep = ramp(t, 4.2, 5.0) * (1 - ramp(t, 9.4, 10.8));
    preGlow.forEach((s) => ((s.material as { opacity: number }).opacity = 0.5 * dep));
    const psp = (pspAt(t) + 70) / 10;
    postGlow.forEach((s) => ((s.material as { opacity: number }).opacity = 0.5 * psp));
    // calcium channels (all together) and receptor-gated channels (each when its transmitter has bound)
    prot.ca.forEach((ch) => ch.set(caOpen(t), 0));
    prot.receptors.forEach((ch, k) => ch.set(channelOpen(k, t), 0));
    // vesicles
    vesicles.forEach((ves, v) => {
      const f = fuseAt(v, t);
      const g = mergeAt(v, t);
      if (t < tf(v) + FUSE + MERGE) {
        vesicleCenter(v, t, c);
        c.x += g * VESICLE_R * 0.9;
        ves.mesh.visible = g < 0.995;
        ves.mesh.scale.set(1 - g, 1 - 0.5 * g, 1 - g);
        ves.plane.constant = c.x + (1 - g) * VESICLE_R * (1.06 - 1.3 * f);
      } else if (t >= 33.2) {
        refillCenter(v, t, c);
        const s = refillAt(t);
        ves.mesh.visible = s > 0.01;
        ves.mesh.scale.setScalar(s);
        ves.plane.constant = 1e3;
      } else {
        ves.mesh.visible = false;
        c.set(0, 0, 0);
      }
      ves.mesh.position.copy(c);
      // calcium sensor flash just before fusion
      (ves.sensor.material as { opacity: number }).opacity = 0.85 * window01(t, CA_BIND + 0.1, tf(v) + 0.2, 0.3) * (1 - ramp(t, tf(v) + 0.2, tf(v) + 0.8));
      ves.sensor.position.set(c.x - 0.1, c.y, 0.9);
      ves.sensor.scale.setScalar(2.0);
    });
    // transmitter
    for (let i = 0; i < NT_COUNT; i++) {
      const n = PLAN[i]!;
      if (t >= 33.2 && t > n.tRem) {
        const s = refillAt(t);
        refillCenter(n.v, t, p).add(cargoOffset(n.j, c));
        ntPool.set(i, p, 0.17 * s);
        continue;
      }
      ntPos(i, t, kit.wander * 0.7, p);
      const s = t < n.tRel ? 1 : 1 - ramp(t, n.tRem - 0.3, n.tRem);
      ntPool.set(i, p, 0.17 * s);
    }
    ntPool.commit();
    // ions
    caW.forEach((w, i) => {
      walkerAt(w, t, kit.wander * 0.8, p);
      caPool.set(i, p, 0.2 * (1 - ramp(t, 10.3, 10.8)));
    });
    naW.forEach((w, i) => {
      walkerAt(w, t, kit.wander * 0.8, p);
      naPool.set(i, p, 0.2);
    });
    caPool.commit();
    naPool.commit();
    prot.enzymes.forEach((g, k) => g.scale.setScalar(1 + 0.12 * Math.sin(t * 5 + k) * window01(t, 27, 32.6, 0.5)));
  };

  const cam = cameraPath([
    { t: 0, ...cp(-10, 0.4, 26) },
    { t: 4.8, ...cp(-7.2, 0.4, 22) },
    { t: 7, ...cp(-2.4, 0.2, 21) },
    { t: 14, ...cp(-1.2, 0.2, 20) },
    { t: 19, ...cp(0.8, 0.2, 20) },
    { t: 27, ...cp(0.8, 0.4, 20) },
    { t: 31, ...cp(0.2, 0.4, 21) },
    { t: 36, ...cp(-3, 0.4, 24) },
  ]);

  const labels = (t: number): ModuleLabel[] => {
    const out: ModuleLabel[] = [];
    const add = (on: boolean, text: string, w: [number, number, number], id: string): void => {
      if (on) out.push({ text, world: w, anchorId: id });
    };
    add(t < 6, 'Presinaptik nöron (akson ucu)', [-7.4, 5.0, 0.6], 'pre');
    add(t < 6, 'Akson', [-13, 1.6, 0.6], 'axon');
    add(t > 0.5, 'Sinaptik aralık', [0, 4.7, 0.6], 'cleft');
    add(t >= 21 || t < 3, 'Postsinaptik hücre', [7.2, 4.9, 0.6], 'post');
    add(t >= 5.3 && t < 9.8, 'Ca²⁺ kanalı', [PRE_X - 1.2, CA_Y[3]! + 1.0, 0.9], 'ca');
    add(t >= 6 && t < 10, 'Ca²⁺', [DOCK_X - 0.7, CA_Y[1]! + 0.4, 1.0], 'ca-ion');
    add(t >= 3 && t < 12, 'Vezikül', [DOCK_X - 0.9, VESICLE_Y[2]! + 0.9, 1.0], 'vesicle');
    add(
      t >= 12.5 && t < 21,
      'Nörotransmitter',
      ntPos(22, t, 0, p)
        .toArray()
        .map((x, i) => (i === 2 ? x + 0.6 : x)) as [number, number, number],
      'nt',
    );
    add(t >= 21 && t < 30, 'Reseptör + kanal', [POST_X + 1.4, REC_Y[2]! + 0.1, 1.0], 'rec');
    add(t >= 22 && t < 29.5, `Postsinaptik zar: ${minus(pspAt(t))} mV`, [POST_X + 3.4, 1.8, 0.8], 'psp');
    add(t >= 27.5 && t < 33, 'Geri alım', [PRE_X - 2.4, 5.0, 0.9], 'reuptake');
    add(t >= 27.5 && t < 33, 'Enzim', [POST_X + 0.6, 5.1, 0.9], 'enzyme');
    add(t >= 33.4, 'Yeni vezikül, yeni sinyale hazır', [-4.5, 4.3, 0.9], 'ready');
    return out;
  };

  return {
    duration: SYN_DURATION,
    seek,
    cameraAt: (t) => cam(t),
    labelsAt: labels,
    chartAt: (t) => ({
      'nt-miktari': ntPercent(t),
      'postsinaptik-potansiyel': pspAt(t),
    }),
    dispose: () => undefined,
  };
}
