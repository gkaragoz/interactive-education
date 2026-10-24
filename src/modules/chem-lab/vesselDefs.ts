import type { VesselKind } from '../../chemlab';

/**
 * Static facts about how each engine vessel kind is drawn (lab GLB ids, sizes in cm, anchors the meta files do not carry).
 * `fallback` is used when a meta.json or an `inner` mesh is missing (tests, placeholders): a plain cylinder cavity.
 */
export interface VesselDef {
  asset: string | null;
  /** Height of the opening (cm): where a pouring stream starts, where a stopper or balloon sits. */
  topY: number;
  /** Outer radius (cm), used for footprints and hit tests. */
  radius: number;
  /** Footprint width along the bench (cm), including the spout side. */
  width: number;
  fallback: { yMin: number; yMax: number; r: number };
  /** Pouring lip on +X (cm from the axis). */
  lipX: number;
}

export const VESSEL_DEFS: Record<VesselKind, VesselDef> = {
  beaker100: { asset: 'beaker-100ml', topY: 7.09, radius: 2.64, width: 7, fallback: { yMin: 0.18, yMax: 4.77, r: 2.4 }, lipX: 3.0 },
  beaker250: { asset: 'beaker-250ml', topY: 9.61, radius: 3.64, width: 9, fallback: { yMin: 0.21, yMax: 7.41, r: 3.4 }, lipX: 4.1 },
  erlenmeyer250: { asset: 'erlenmeyer-250ml', topY: 14.12, radius: 4.25, width: 9.5, fallback: { yMin: 0.21, yMax: 4.06, r: 3.9 }, lipX: 1.6 },
  testtube: { asset: 'test-tube', topY: 15.06, radius: 0.9, width: 2.9, fallback: { yMin: 0.13, yMax: 11.5, r: 0.7 }, lipX: 0.9 },
  cylinder100: { asset: 'graduated-cylinder-100ml', topY: 25.09, radius: 3.1, width: 7, fallback: { yMin: 1.57, yMax: 20.09, r: 2.4 }, lipX: 3.1 },
  burette25: { asset: 'burette', topY: 52, radius: 0.7, width: 3, fallback: { yMin: 8, yMax: 50, r: 0.55 }, lipX: 0.7 },
  crucible: { asset: null, topY: 3.6, radius: 2.1, width: 8, fallback: { yMin: 0.3, yMax: 3.2, r: 1.6 }, lipX: 2.1 },
  'gas-tube': { asset: 'test-tube', topY: 15.06, radius: 0.9, width: 4, fallback: { yMin: 0.13, yMax: 11.5, r: 0.7 }, lipX: 0.9 },
  hofmann: { asset: 'hofmann-voltameter', topY: 46, radius: 5.5, width: 29, fallback: { yMin: 4.4, yMax: 40, r: 1.2 }, lipX: 0 },
  funnel: { asset: 'funnel', topY: 13.38, radius: 3.8, width: 8, fallback: { yMin: 5, yMax: 12.5, r: 3.4 }, lipX: 3.8 },
};

/** Asset ids of the non-vessel props, one place so tests can check they exist. */
export const PROP_ASSETS = [
  'bench-top', 'lab-backdrop', 'digital-balance', 'thermometer', 'glass-rod', 'ph-paper-strip', 'ph-colour-chart', 'reagent-bottle-250ml',
  'powder-jar', 'indicator-dropper-bottle', 'tripod', 'wire-gauze', 'alcohol-burner', 'hot-plate-stirrer', 'burette-stand', 'test-tube-rack',
  'balloon', 'iron-nail', 'magnesium-ribbon-coil', 'copper-strip', 'precipitate-crystal', 'electrode', 'magnetic-stir-bar', 'filter-paper-cone',
  'waste-container', 'beaker-400ml', 'splint', 'safety-goggles', 'nitrile-gloves', 'dropper-pipette', 'spatula',
] as const;
