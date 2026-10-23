import type { CellInfo, PlacementZone } from '../data/types';
import { hashString, mulberry32, type Rng } from '../core';

/** One placed organelle instance (rotation is Euler XYZ radians; scale already includes jitter). */
export interface PlacedInstance {
  organelleId: string;
  /** Index among the instances of the same organelle. */
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  /** Bounding sphere radius in scene units after scaling; used for picking and zones. */
  radius: number;
  /** Horizontal and vertical half sizes used for overlap and containment (equal for round organelles). */
  rh: number;
  rv: number;
}

export type LayoutCell = Pick<CellInfo, 'id' | 'shell' | 'placements'>;
type Vec3 = [number, number, number];

/**
 * Teaching exaggeration: organelles are drawn larger than life so they read at a glance (the reference look is a dense
 * diorama). Per cell type because the shells differ in size; applied on top of the data's own placement scales.
 */
export const ORGANELLE_BOOST: Record<string, number> = { animal: 1.45, plant: 1.4, bacterium: 1.5 };
/** Big organelles are boosted less, otherwise they crowd the rest out of the shell. */
const ID_FACTOR: Record<string, number> = { nucleus: 0.9, vacuole: 0.62, golgi: 0.78, 'rough-er': 0.82, 'smooth-er': 0.82 };

const MAX_TRIES = 700;
const GAP = 0.08;

/**
 * Approximate signed distance from p to the shell surface (negative inside).
 * Exact for the capsule and rounded box, a good first-order estimate for the ellipsoid.
 */
export function shellSdf(shell: LayoutCell['shell'], p: Vec3): number {
  const [hx, hy, hz] = shell.halfExtents;
  if (shell.shape === 'ellipsoid') {
    const k0 = Math.hypot(p[0] / hx, p[1] / hy, p[2] / hz);
    const k1 = Math.hypot(p[0] / (hx * hx), p[1] / (hy * hy), p[2] / (hz * hz));
    return k1 < 1e-9 ? -Math.min(hx, hy, hz) : (k0 * (k0 - 1)) / k1;
  }
  if (shell.shape === 'rounded-box') {
    const rho = 0.3 * Math.min(hx, hy, hz);
    const q = [Math.abs(p[0]) - (hx - rho), Math.abs(p[1]) - (hy - rho), Math.abs(p[2]) - (hz - rho)];
    const outside = Math.hypot(Math.max(q[0] ?? 0, 0), Math.max(q[1] ?? 0, 0), Math.max(q[2] ?? 0, 0));
    const inside = Math.min(Math.max(q[0] ?? 0, q[1] ?? 0, q[2] ?? 0), 0);
    return outside + inside - rho;
  }
  // Capsule along the longest axis; the cross-section radius is the smaller of the other two.
  const he = shell.halfExtents;
  const axis = he[0] >= he[1] && he[0] >= he[2] ? 0 : he[1] >= he[2] ? 1 : 2;
  const others = [0, 1, 2].filter((i) => i !== axis);
  const radius = Math.min(he[others[0] ?? 0] ?? 1, he[others[1] ?? 0] ?? 1);
  const half = Math.max((he[axis] ?? 1) - radius, 0);
  const along = Math.max(-half, Math.min(half, p[axis] ?? 0));
  const d: Vec3 = [p[0], p[1], p[2]];
  d[axis] = (p[axis] ?? 0) - along;
  return Math.hypot(d[0], d[1], d[2]) - radius;
}

function minHalfExtent(shell: LayoutCell['shell']): number {
  return Math.min(...shell.halfExtents);
}

function randomInShellBox(shell: LayoutCell['shell'], rng: Rng): Vec3 {
  const [hx, hy, hz] = shell.halfExtents;
  // Slightly more organelles in the lower half: the default view is a horizontal cut that shows exactly that half.
  return [(rng() * 2 - 1) * hx, (rng() * 2 - 1) * hy - 0.2 * hy, (rng() * 2 - 1) * hz];
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

interface Context {
  shell: LayoutCell['shell'];
  anchor: Vec3;
  anchorRadius: number;
  flat: boolean;
}

/** Does a sphere of radius r at p satisfy the zone's placement preference? */
function zoneAccepts(zone: PlacementZone, p: Vec3, r: number, ctx: Context): boolean {
  const sdf = shellSdf(ctx.shell, p);
  const m = minHalfExtent(ctx.shell);
  switch (zone) {
    case 'center':
      return dist(p, ctx.anchor) <= 0.18 * m + 0.01;
    case 'nucleus-near': {
      const d = dist(p, ctx.anchor);
      return d >= ctx.anchorRadius + r && d <= ctx.anchorRadius + r + 0.9 * m;
    }
    case 'periphery':
      return sdf <= -r - 0.04 * m && sdf >= -r - 0.38 * m;
    case 'wall-adjacent':
      return sdf <= -r - 0.01 * m && sdf >= -r - 0.14 * m;
    case 'cytoplasm':
    default:
      return true;
  }
}

function randomRotation(rng: Rng): Vec3 {
  return [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2];
}

/** Slab-like cells (the plant) keep organelles flat on their floor: yaw is free, tilt is small. */
function isFlat(shell: LayoutCell['shell']): boolean {
  const [hx, hy, hz] = shell.halfExtents;
  return hy < 0.75 * Math.min(hx, hz);
}
const TILT = 0.16;

/** Does an organelle with horizontal half size rh and vertical half size rv, centred at p, fit inside the shell? */
export function fitsInShell(shell: LayoutCell['shell'], p: Vec3, rh: number, rv: number): boolean {
  if (rh === rv) return shellSdf(shell, p) <= -rh;
  const d = rh * Math.SQRT1_2;
  const offsets: Vec3[] = [[rh, 0, 0], [-rh, 0, 0], [0, 0, rh], [0, 0, -rh], [d, 0, d], [-d, 0, d], [d, 0, -d], [-d, 0, -d], [0, rv, 0], [0, -rv, 0]];
  return offsets.every((o) => shellSdf(shell, [p[0] + o[0], p[1] + o[1], p[2] + o[2]]) <= 0);
}

type Body = Pick<PlacedInstance, 'position' | 'rh' | 'rv'>;

/** Ellipsoid-style separation: above 0 the two organelles overlap, at or below 0 they are apart. */
export function overlapOf(a: Body, b: Body): number {
  const dx = a.position[0] - b.position[0];
  const dz = a.position[2] - b.position[2];
  const dy = a.position[1] - b.position[1];
  const ratio = (dx * dx + dz * dz) / (a.rh + b.rh) ** 2 + (dy * dy) / (a.rv + b.rv) ** 2;
  return 1 - Math.sqrt(ratio);
}

interface Job {
  organelleId: string;
  zone: PlacementZone;
  scale: Vec3;
  baseRadius: number;
  /** Horizontal and vertical half sizes at the authored scale (they only differ in flat cells). */
  hRadius: number;
  vRadius: number;
  index: number;
}

/**
 * Deterministic layout solver: places every PlacementRule instance inside the shell without overlaps.
 * Rejection sampling per instance, largest first (the nucleus claims the centre before small items fill the gaps).
 * When a spot cannot be found the instance gets smaller; in flat cells it is flattened in y first (organelles keep
 * their width but squash down to 60 %), then shrinks uniformly, so the requested count is always met.
 * `radiusOf` returns the asset's `boundsRadius`; `halfOf` optionally its bounding box half sizes (flat cells use them
 * to know how tall an organelle really is).
 */
export function solveLayout(
  cell: LayoutCell,
  radiusOf: (organelleId: string) => number,
  boost = ORGANELLE_BOOST[cell.id] ?? 1,
  halfOf?: (organelleId: string) => Vec3 | undefined,
): PlacedInstance[] {
  const rng = mulberry32(hashString(`layout:${cell.id}`));
  const placed: PlacedInstance[] = [];
  const ctx: Context = { shell: cell.shell, anchor: [0, 0, 0], anchorRadius: 0, flat: isFlat(cell.shell) && halfOf !== undefined };

  const jobs: Job[] = [];
  for (const rule of cell.placements) {
    const authored = rule.scale ?? [1, 1, 1];
    const k = boost * (ID_FACTOR[rule.organelleId] ?? 1);
    const scale: Vec3 = [authored[0] * k, authored[1] * k, authored[2] * k];
    const half = halfOf?.(rule.organelleId);
    const baseRadius = radiusOf(rule.organelleId) * Math.max(scale[0], scale[1], scale[2]);
    const hRadius = ctx.flat && half ? Math.hypot(half[0] * scale[0], half[2] * scale[2]) : baseRadius;
    const vRadius = ctx.flat && half ? half[1] * scale[1] + TILT * hRadius : baseRadius;
    for (let i = 0; i < rule.count; i++) {
      jobs.push({ organelleId: rule.organelleId, zone: rule.zone, scale, baseRadius, hRadius: Math.min(hRadius, baseRadius), vRadius: Math.min(vRadius, baseRadius), index: i });
    }
  }
  // Centre-zone items first, then by size; the sort is stable so equal items keep rule order.
  const zoneRank = (z: PlacementZone): number => (z === 'center' ? 0 : z === 'nucleus-near' ? 0.5 : 1);
  jobs.sort((a, b) => zoneRank(a.zone) - zoneRank(b.zone) || b.baseRadius - a.baseRadius);

  for (const job of jobs) {
    const jitter = 0.92 + rng() * 0.16;
    let kxz = 1;
    let ky = 1;
    let found: { position: Vec3; rh: number; rv: number } | null = null;
    while (!found && kxz > 0.05) {
      const rh = job.hRadius * jitter * kxz;
      const rv = job.vRadius * jitter * ky;
      found = tryPlace(job.zone, rh, rv, ctx, placed, rng);
      // Below 80 % size the zone preference is dropped: a legal spot matters more than the zone.
      if (!found && kxz < 0.8) found = tryPlace('cytoplasm', rh, rv, ctx, placed, rng);
      if (found) break;
      if (ctx.flat && ky > 0.6) ky = Math.max(0.6, ky - 0.14);
      else kxz *= 0.9;
      if (!ctx.flat) ky = kxz;
    }
    const fxz = jitter * kxz;
    const fy = jitter * ky;
    const rh = found?.rh ?? job.hRadius * fxz;
    const rv = found?.rv ?? job.vRadius * fy;
    const tilt = ctx.flat ? TILT : 0;
    const inst: PlacedInstance = {
      organelleId: job.organelleId,
      index: job.index,
      position: found?.position ?? [0, 0, 0],
      rotation: ctx.flat ? [(rng() * 2 - 1) * tilt, rng() * Math.PI * 2, (rng() * 2 - 1) * tilt] : randomRotation(rng),
      scale: [job.scale[0] * fxz, job.scale[1] * fy, job.scale[2] * fxz],
      radius: Math.max(rh, rv),
      rh,
      rv,
    };
    if (job.zone === 'center' && ctx.anchorRadius === 0) {
      ctx.anchor = inst.position;
      ctx.anchorRadius = inst.radius;
    }
    placed.push(inst);
  }
  return placed;
}

function tryPlace(
  zone: PlacementZone,
  rh: number,
  rv: number,
  ctx: Context,
  placed: readonly PlacedInstance[],
  rng: Rng,
): { position: Vec3; rh: number; rv: number } | null {
  const r = Math.max(rh, rv);
  const hy = ctx.shell.halfExtents[1];
  for (let t = 0; t < MAX_TRIES; t++) {
    const p = randomInShellBox(ctx.shell, rng);
    if (ctx.flat) p[1] -= 0.18 * hy; // flat cells: even more weight on the floor half the cut shows
    if (zone === 'center') {
      const m = 0.18 * minHalfExtent(ctx.shell);
      p[0] = ctx.anchor[0] + (rng() * 2 - 1) * m;
      p[1] = ctx.anchor[1] + (rng() * 2 - 1) * m;
      p[2] = ctx.anchor[2] + (rng() * 2 - 1) * m;
    }
    // In a flat cell wall-adjacent organelles (chloroplasts) sit on the floor along the rim.
    if (ctx.flat && zone === 'wall-adjacent') {
      p[1] = -hy + rv * (1.02 + rng() * 0.3);
      if (shellSdf(ctx.shell, [p[0], 0, p[2]]) < -(rh + 0.25 * minHalfExtent(ctx.shell))) continue;
    }
    if (!fitsInShell(ctx.shell, p, rh, rv)) continue;
    if (!zoneAccepts(zone, p, ctx.flat ? rh : r, ctx)) continue;
    const candidate = { position: p, rh, rv };
    if (placed.every((other) => overlapOf(candidate, other) <= -GAP)) return candidate;
  }
  return null;
}

/** Worst overlap of any pair (<= 0 means the instances are apart); see `overlapOf`. */
export function worstOverlap(instances: readonly PlacedInstance[]): number {
  let worst = -Infinity;
  for (let i = 0; i < instances.length; i++) {
    for (let j = i + 1; j < instances.length; j++) {
      const a = instances[i];
      const b = instances[j];
      if (a && b) worst = Math.max(worst, overlapOf(a, b));
    }
  }
  return worst;
}
