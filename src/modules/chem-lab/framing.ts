import type { VesselKind } from '../../chemlab';
import type { StageFraming } from '../../scene';
import { BENCH } from './bench';
import type { BenchLayout } from './layout';
import { VESSEL_DEFS } from './vesselDefs';

/**
 * Framing and orbit limits of a bench: the box the learner should see (the bench tiles, the shelf and the tallest
 * apparatus) and a sensible orbit (above the bench, a limited swing left and right, no flying off). Pure; unit-tested.
 */
export function benchFraming(layout: BenchLayout, kinds: readonly VesselKind[]): StageFraming {
  const halfWidth = (layout.tiles * BENCH.tileW) / 2 + 3;
  let top = BENCH.shelfY + 14; // bottles on the shelf
  for (const k of kinds) if (k === 'burette25' || k === 'hofmann') top = Math.max(top, VESSEL_DEFS[k].topY + 6);
  const halfHeight = top / 2 + 8;
  return {
    center: [0, top / 2 - 7, 6],
    radius: Math.hypot(halfWidth, halfHeight),
    halfWidth,
    halfHeight,
    target: [0, top / 2 - 9, 2],
    distanceMin: 14,
    distanceMax: 190,
    polarMin: 0.2,
    polarMax: 1.45,
    azimuthMin: -1.0,
    azimuthMax: 1.0,
  };
}
