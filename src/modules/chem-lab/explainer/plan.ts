import type { ParticleScript } from '../../../chemlab';
import { clamp, lerp, smoothstep } from '../helpers';

/**
 * The timeline of a particle script as plain data and pure functions of time (no WebGL): which particle exists when,
 * where reactions happen, where protons and electrons travel. The renderer only asks `pose(plan, particle, t)`.
 * Counts follow the engine's script (the number alive at the end of every stage equals `stage.counts`, tested).
 */
export const BOX = { hx: 11, hy: 7, hz: 6 } as const;

export interface PlanParticle {
  sid: string;
  k: number;
  born: number;
  died: number;
  /** Rest centre and wobble parameters in the unit box (-1..1). */
  c: [number, number, number];
  free: [number, number, number];
  ph: [number, number, number, number, number, number];
  w: [number, number, number];
  bornAt: [number, number, number] | null;
  diedAt: [number, number, number] | null;
  /** Lattice units rest at fixed floor positions (world units) instead of wandering. */
  fixed: [number, number, number] | null;
}
export interface PlanEvent {
  t: number;
  stage: string;
  point: [number, number, number];
  consumed: number[];
  created: number[];
}
export interface PlanTransfer {
  kind: 'proton' | 'electron';
  t0: number;
  t1: number;
  from: number;
  to: number;
}
export interface Plan {
  script: ParticleScript;
  particles: PlanParticle[];
  events: PlanEvent[];
  transfers: PlanTransfer[];
  duration: number;
  reduced: boolean;
}

const MOTION_AMP: Record<string, number> = { random: 1, approach: 0.75, rise: 0.85, drift: 0.65, vibrate: 0.14, static: 0.06, attract: 0.6 };

export function buildPlan(script: ParticleScript, rng: () => number, reduced = false): Plan {
  const particles: PlanParticle[] = [];
  const live = new Map<string, number[]>();
  const events: PlanEvent[] = [];
  const transfers: PlanTransfer[] = [];
  const kinds = new Map(script.species.map((s) => [s.id, s.kind]));
  const speciesIx = new Map(script.species.map((s, i) => [s.id, i]));
  const latticeCount = new Map<string, number>();

  const rand = (a: number, b: number): number => a + (b - a) * rng();
  const make = (sid: string, born: number, bornAt: PlanParticle['bornAt']): number => {
    const ix = speciesIx.get(sid) ?? 0;
    const kind = kinds.get(sid);
    // initial zones: even species on the left, odd on the right; later everything mixes
    const zoneX = ix % 2 === 0 ? rand(-0.95, -0.15) : rand(0.15, 0.95);
    let fixed: PlanParticle['fixed'] = null;
    if (kind === 'lattice') {
      const n = latticeCount.get(sid) ?? 0;
      latticeCount.set(sid, n + 1);
      const gx = n % 3;
      const gz = Math.floor(n / 3) % 3;
      const gy = Math.floor(n / 9);
      fixed = [(gx - 1) * 1.7 + 0.6 * (ix % 3 - 1) * 3, -BOX.hy + 1 + gy * 1.2, (gz - 1) * 1.7];
    } else if (kind === 'catalyst') {
      fixed = [rand(-4, 4), rand(-1, 3), rand(-2, 2)];
    }
    const p: PlanParticle = {
      sid,
      k: particles.filter((q) => q.sid === sid).length,
      born,
      died: Infinity,
      c: [zoneX, rand(-0.8, 0.8), rand(-0.8, 0.8)],
      free: [rand(-0.9, 0.9), rand(-0.8, 0.8), rand(-0.8, 0.8)],
      ph: [rand(0, 6.28), rand(0, 6.28), rand(0, 6.28), rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)],
      w: [rand(0.5, 1.5), rand(0.5, 1.5), rand(0.5, 1.5)],
      bornAt,
      diedAt: null,
      fixed,
    };
    particles.push(p);
    const list = live.get(sid) ?? [];
    list.push(particles.length - 1);
    live.set(sid, list);
    return particles.length - 1;
  };

  const first = script.stages[0];
  if (first) for (const sp of script.species) for (let i = 0; i < (first.counts[sp.id] ?? 0); i++) make(sp.id, -1, null);

  const posAt = (idx: number, t: number): [number, number, number] => {
    const p = particles[idx];
    if (!p) return [0, 0, 0];
    const o = { x: 0, y: 0, z: 0, alive: true, scale: 1 };
    const tmp: Plan = { script, particles, events, transfers, duration: script.durationS, reduced };
    pose(tmp, p, t, o, true);
    return [o.x, o.y, o.z];
  };

  script.stages.forEach((st, i) => {
    const prev = i === 0 ? st.counts : (script.stages[i - 1]?.counts ?? st.counts);
    const dur = Math.max(0.5, st.toS - st.fromS);
    const removals = new Map<string, number>();
    const creations = new Map<string, number>();
    for (const sp of script.species) {
      const d = (st.counts[sp.id] ?? 0) - (prev[sp.id] ?? 0);
      if (d < 0) removals.set(sp.id, -d);
      else if (d > 0) creations.set(sp.id, d);
    }
    const J = Math.max(0, ...removals.values(), ...creations.values());
    const stageEvents: PlanEvent[] = [];
    for (let j = 0; j < J; j++) {
      const t = st.fromS + dur * (0.3 + 0.55 * ((j + 0.5) / J));
      const consumed: number[] = [];
      for (const [sid, n] of removals) {
        if (j >= n) continue;
        const list = live.get(sid) ?? [];
        const idx = list.pop();
        if (idx !== undefined) consumed.push(idx);
      }
      const base = consumed[0];
      const point: [number, number, number] = base !== undefined ? posAt(base, t) : [rand(-6, 6), rand(-3, 4), rand(-3, 3)];
      consumed.forEach((idx, n) => {
        const p = particles[idx];
        if (!p) return;
        p.died = t;
        p.diedAt = [point[0] + (n % 2 === 0 ? -0.5 : 0.5), point[1] + 0.1 * n, point[2] + 0.2 * n];
      });
      const created: number[] = [];
      let n = 0;
      for (const [sid, count] of creations) {
        if (j >= count) continue;
        created.push(make(sid, t, [point[0] + (n % 2 === 0 ? 0.5 : -0.5), point[1], point[2] + 0.2 * n]));
        n++;
      }
      const ev: PlanEvent = { t, stage: st.id, point, consumed, created };
      stageEvents.push(ev);
      events.push(ev);
    }
    for (const tr of st.transfers) {
      for (let j = 0; j < Math.min(tr.count, 12); j++) {
        const ev = stageEvents.length > 0 ? stageEvents[j % stageEvents.length] : undefined;
        const t = ev ? ev.t : st.fromS + dur * (0.4 + 0.4 * ((j + 0.5) / Math.max(1, tr.count)));
        const fromList = [...particles.keys()].filter((ix) => particles[ix]?.sid === tr.from && (particles[ix]?.born ?? 0) <= t && (particles[ix]?.died ?? Infinity) >= t - 0.01);
        const toList = [...particles.keys()].filter((ix) => particles[ix]?.sid === tr.to && (particles[ix]?.born ?? 0) <= t + 0.3 && (particles[ix]?.died ?? Infinity) >= t - 0.01);
        const from = ev?.consumed.find((ix) => particles[ix]?.sid === tr.from) ?? fromList[j % Math.max(1, fromList.length)] ?? 0;
        const to = ev?.consumed.find((ix) => particles[ix]?.sid === tr.to) ?? ev?.created.find((ix) => particles[ix]?.sid === tr.to) ?? toList[j % Math.max(1, toList.length)] ?? from;
        transfers.push({ kind: tr.kind, t0: t - 0.75, t1: t - 0.02, from, to });
      }
    }
  });
  return { script, particles, events, transfers, duration: script.durationS, reduced };
}

/** Wobble amplitude at time t: the stage's motion, blended over half a second at the boundaries. */
export function amplitude(plan: Plan, t: number): number {
  if (plan.reduced) return 0.04;
  const stages = plan.script.stages;
  let a = MOTION_AMP[stages[0]?.motion ?? 'random'] ?? 0.6;
  for (let i = 1; i < stages.length; i++) {
    const st = stages[i];
    if (!st) continue;
    a = lerp(a, MOTION_AMP[st.motion] ?? 0.6, smoothstep(st.fromS - 0.25, st.fromS + 0.35, t));
  }
  return a;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  alive: boolean;
  scale: number;
  rx: number;
  ry: number;
  rz: number;
}

/** Position, visibility and scale of one particle at time `t` (pure). `o` receives the result (no allocation per call). */
export function pose(plan: Plan, p: PlanParticle, t: number, o: Partial<Pose> & { x: number; y: number; z: number; alive: boolean; scale: number }, quiet = false): void {
  o.alive = t >= p.born - 1e-6 && t <= p.died + 1e-6;
  o.scale = 1;
  if (!o.alive) return;
  const dur = plan.duration;
  const mix = smoothstep(0, dur * 0.45, t);
  const amp = amplitude(plan, t);
  let x: number;
  let y: number;
  let z: number;
  if (p.fixed) {
    x = p.fixed[0];
    y = p.fixed[1];
    z = p.fixed[2];
    if (!plan.reduced) y += 0.04 * Math.sin(t * 2 + p.ph[0]);
  } else {
    const cx = lerp(p.c[0], p.free[0], mix);
    const cy = lerp(p.c[1], p.free[1], mix);
    const cz = lerp(p.c[2], p.free[2], mix);
    const sway = plan.reduced ? 0 : 1;
    x = (cx + amp * 0.22 * sway * Math.sin(t * p.w[0] + p.ph[0])) * BOX.hx;
    y = (cy + amp * 0.2 * sway * Math.sin(t * p.w[1] + p.ph[1])) * BOX.hy;
    z = (cz + amp * 0.22 * sway * Math.sin(t * p.w[2] + p.ph[2])) * BOX.hz;
  }
  if (p.bornAt && t < p.born + 1.1) {
    const k = smoothstep(p.born, p.born + 1.1, t);
    x = lerp(p.bornAt[0], x, k);
    y = lerp(p.bornAt[1], y, k);
    z = lerp(p.bornAt[2], z, k);
    o.scale = smoothstep(p.born - 0.02, p.born + 0.3, t);
  }
  if (p.diedAt && Number.isFinite(p.died)) {
    const k = smoothstep(p.died - 0.95, p.died, t);
    x = lerp(x, p.diedAt[0], k);
    y = lerp(y, p.diedAt[1], k);
    z = lerp(z, p.diedAt[2], k);
    o.scale = Math.min(o.scale ?? 1, 1 - smoothstep(p.died - 0.12, p.died, t));
  }
  o.x = x;
  o.y = y;
  o.z = z;
  if (!quiet) {
    const spin = plan.reduced ? 0 : 1;
    o.rx = p.ph[3] + spin * t * 0.35 * p.w[0];
    o.ry = p.ph[4] + spin * t * 0.45 * p.w[1];
    o.rz = p.ph[5] + spin * t * 0.3 * p.w[2];
  }
}

/** Number of particles of a species alive at `t` (what the stage counts promise at the end of each stage). */
export function aliveCount(plan: Plan, sid: string, t: number): number {
  let n = 0;
  for (const p of plan.particles) if (p.sid === sid && t >= p.born - 1e-6 && t < p.died - 1e-6) n++;
  return n;
}

export const stageAt = (plan: Plan, t: number): number => clamp(plan.script.stages.findIndex((s) => t >= s.fromS && t < s.toS), 0, Math.max(0, plan.script.stages.length - 1));
