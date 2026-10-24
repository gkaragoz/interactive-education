import type { VesselKind } from '../../chemlab';
import { VESSEL_DEFS } from './vesselDefs';

/**
 * Where everything stands on the bench: a pure function of the vessel list (so every experiment and the free bench get a
 * tidy, collision-free row). Units are cm, x runs along the bench (left to right), z towards the viewer, y up.
 */
export interface BenchItem {
  id: string;
  kind: VesselKind;
}
export interface Pose {
  x: number;
  y: number;
  z: number;
}
export type Mount = 'bench' | 'rack' | 'stand' | 'funnel' | 'trough' | 'hofmann';
export interface Placed extends Pose {
  id: string;
  mount: Mount;
}
export interface Unit {
  kind: 'rack' | 'stand' | 'trough' | 'single' | 'hofmann';
  x: number;
  z: number;
  width: number;
  ids: string[];
}
export interface BenchLayout {
  placed: Record<string, Placed>;
  units: Unit[];
  /** Balance centre on the bench (meaningful only when `hasBalance`). */
  balance: Pose;
  /** False for experiments that never weigh: the bench is narrower without it. */
  hasBalance: boolean;
  /** Tools (rod, thermometer, pH strip, chart) rest here. */
  tools: Pose;
  /** Total width used by the units and the balance, cm. */
  width: number;
  /** Number of bench tiles needed (60 cm tiles at 56 cm spacing). */
  tiles: number;
  /** Centre x of the whole bench (0 after centring). */
  centreX: number;
}

/** Measured/meta anchors (docs/ASSETS.md Lab batch). */
export const ANCHORS = {
  row: 3.5,
  rackHoles: [-7.25, -4.35, -1.45, 1.45, 4.35, 7.25],
  rackHoleY: 1.1,
  rackWidth: 21,
  stand: { width: 25, burette: [2, 12, 0] as const, plateY: 2.2, buretteMountX: 2 },
  hofmannOriginShift: 3,
  balance: { width: 19, panY: 5, panZ: -3.5 },
  gap: 5,
  /** Spacing of the 60 cm tiles: they overlap by 4 cm so the rounded corners leave no gap. */
  tile: 56,
  trough: { width: 13, collectorY: 3.4 },
} as const;

const isTube = (k: VesselKind): boolean => k === 'testtube';
const SMALL: ReadonlySet<VesselKind> = new Set(['beaker100', 'beaker250', 'erlenmeyer250', 'cylinder100', 'crucible']);

export function layoutBench(items: readonly BenchItem[], withBalance = true): BenchLayout {
  const used = new Set<string>();
  const units: Unit[] = [];
  const pending: Array<{ unit: Unit; place: (cx: number) => void }> = [];
  const placed: Record<string, Placed> = {};
  const z = ANCHORS.row;

  const pickReceiver = (prefer: VesselKind[]): BenchItem | undefined => {
    for (const k of prefer) {
      const r = items.find((i) => i.kind === k && !used.has(i.id));
      if (r) return r;
    }
    return undefined;
  };

  // roles first, so a burette can claim its flask and a funnel its beaker
  const burettes = items.filter((i) => i.kind === 'burette25');
  const funnels = items.filter((i) => i.kind === 'funnel');
  for (const b of burettes) used.add(b.id);
  const standFor = new Map<string, BenchItem | undefined>();
  for (const b of burettes) {
    const r = pickReceiver(['erlenmeyer250', 'beaker250', 'beaker100']);
    if (r) used.add(r.id);
    standFor.set(b.id, r);
  }
  for (const f of funnels) used.add(f.id);
  const funnelFor = new Map<string, BenchItem | undefined>();
  for (const f of funnels) {
    // the receiver is the beaker that follows the funnel in the list (experiment 4: A, funnel, B), else the last unused beaker
    const idx = items.indexOf(f);
    const after = items.slice(idx + 1).find((i) => (i.kind === 'beaker250' || i.kind === 'beaker100') && !used.has(i.id));
    const r = after ?? [...items].reverse().find((i) => (i.kind === 'beaker250' || i.kind === 'beaker100') && !used.has(i.id));
    if (r) used.add(r.id);
    funnelFor.set(f.id, r);
  }

  const tubes = items.filter((i) => isTube(i.kind));
  const tubeChunks: BenchItem[][] = [];
  for (let i = 0; i < tubes.length; i += 6) tubeChunks.push(tubes.slice(i, i + 6));
  for (const t of tubes) used.add(t.id);

  let rackDone = 0;
  for (const item of items) {
    if (item.kind === 'funnel') {
      const r = funnelFor.get(item.id);
      const w = r ? VESSEL_DEFS[r.kind].width : VESSEL_DEFS.funnel.width;
      const u: Unit = { kind: 'single', x: 0, z, width: Math.max(w, VESSEL_DEFS.funnel.width), ids: r ? [r.id, item.id] : [item.id] };
      units.push(u);
      pending.push({
        unit: u,
        place: (cx) => {
          if (r) placed[r.id] = { id: r.id, mount: 'bench', x: cx, y: 0, z };
          placed[item.id] = { id: item.id, mount: 'funnel', x: cx, y: r ? VESSEL_DEFS[r.kind].topY - 3.2 : 0, z };
        },
      });
    } else if (item.kind === 'burette25') {
      const r = standFor.get(item.id);
      const u: Unit = { kind: 'stand', x: 0, z, width: ANCHORS.stand.width, ids: r ? [item.id, r.id] : [item.id] };
      units.push(u);
      pending.push({
        unit: u,
        place: (cx) => {
          placed[item.id] = { id: item.id, mount: 'stand', x: cx + ANCHORS.stand.burette[0], y: ANCHORS.stand.burette[1] + ANCHORS.stand.plateY, z };
          if (r) placed[r.id] = { id: r.id, mount: 'bench', x: cx + ANCHORS.stand.buretteMountX, y: ANCHORS.stand.plateY, z };
        },
      });
    } else if (isTube(item.kind)) {
      if (tubeChunks[rackDone]?.[0]?.id !== item.id) continue;
      const chunk = tubeChunks[rackDone++] ?? [];
      const u: Unit = { kind: 'rack', x: 0, z, width: ANCHORS.rackWidth, ids: chunk.map((c) => c.id) };
      units.push(u);
      pending.push({
        unit: u,
        place: (cx) => chunk.forEach((c, i) => (placed[c.id] = { id: c.id, mount: 'rack', x: cx + (ANCHORS.rackHoles[i] ?? 0), y: ANCHORS.rackHoleY, z })),
      });
    } else if (item.kind === 'gas-tube') {
      const u: Unit = { kind: 'trough', x: 0, z, width: ANCHORS.trough.width, ids: [item.id] };
      units.push(u);
      pending.push({ unit: u, place: (cx) => (placed[item.id] = { id: item.id, mount: 'trough', x: cx, y: ANCHORS.trough.collectorY, z }) });
    } else if (item.kind === 'hofmann') {
      const u: Unit = { kind: 'hofmann', x: 0, z, width: VESSEL_DEFS.hofmann.width, ids: [item.id] };
      units.push(u);
      pending.push({ unit: u, place: (cx) => (placed[item.id] = { id: item.id, mount: 'hofmann', x: cx - ANCHORS.hofmannOriginShift, y: 0, z }) });
    } else if (!used.has(item.id)) {
      const w = SMALL.has(item.kind) ? Math.max(VESSEL_DEFS[item.kind].width, 9) : VESSEL_DEFS[item.kind].width;
      const u: Unit = { kind: 'single', x: 0, z, width: w, ids: [item.id] };
      units.push(u);
      pending.push({ unit: u, place: (cx) => (placed[item.id] = { id: item.id, mount: 'bench', x: cx, y: 0, z }) });
    }
  }

  // left to right with gaps, then the balance, then centre the whole row on x = 0
  let cursor = 0;
  for (const p of pending) {
    p.unit.x = cursor + p.unit.width / 2;
    cursor += p.unit.width + ANCHORS.gap;
  }
  const balanceX = cursor + ANCHORS.balance.width / 2;
  const width = withBalance ? cursor + ANCHORS.balance.width : Math.max(10, cursor - ANCHORS.gap);
  const shift = -width / 2;
  for (const p of pending) {
    p.unit.x += shift;
    p.place(p.unit.x);
  }
  return {
    placed,
    units,
    balance: { x: balanceX + shift, y: 0, z: z + 1 },
    hasBalance: withBalance,
    tools: { x: -width / 2 + 6, y: 0, z: -7.5 },
    width,
    tiles: Math.max(1, Math.ceil((width + 6) / ANCHORS.tile)),
    centreX: 0,
  };
}

/** Evenly spaced x positions for `n` shelf items inside a span of `width` cm. */
export function shelfSlots(n: number, width: number, maxStep = 8.2): number[] {
  if (n <= 0) return [];
  const step = Math.min(maxStep, width / n);
  const total = step * (n - 1);
  return Array.from({ length: n }, (_, i) => -total / 2 + i * step);
}
