export type QualityName = 'low' | 'medium' | 'high';

export interface QualitySettings {
  /** Upper bound for devicePixelRatio. */
  maxPixelRatio: number;
  /** Post-process antialiasing (SMAA). Multisampled targets are avoided: they do not mix with the stencil caps. */
  smaa: boolean;
  gtao: boolean;
  bloom: boolean;
  vignette: boolean;
  shadows: boolean;
  shadowMapSize: number;
  /** Multiplies projected sizes when choosing LODs: higher keeps finer meshes for longer. */
  lodBias: number;
  /** Triangles the organelles and shell may use per frame (before stencil twins in the cut view). */
  triBudget: number;
  /** Most instances drawn at full detail at once. */
  lod0Max: number;
  /** Shell LOD when the camera is close (0 = finest). */
  shellLod: number;
  /** Protein studs on the shell surface. */
  studs: boolean;
  /** Cross-section caps for organelles too (stencil twins cost vertex work); low keeps only the shell cap. */
  organelleCaps: boolean;
  /** Cytoskeleton, vesicles, floating particles and the slow drift of things (off at low). */
  ambient: boolean;
  /** Instances smaller than this projected size (radius / distance) are not drawn at all. */
  cullSize: number;
}

export const QUALITY_PRESETS: Record<QualityName, QualitySettings> = {
  low: { maxPixelRatio: 1, smaa: false, gtao: false, bloom: false, vignette: true, shadows: false, shadowMapSize: 512, lodBias: 0.6, triBudget: 110_000, lod0Max: 0, shellLod: 2, studs: false, organelleCaps: false, ambient: false, cullSize: 0.035 },
  medium: { maxPixelRatio: 1.25, smaa: true, gtao: false, bloom: true, vignette: true, shadows: true, shadowMapSize: 1024, lodBias: 1, triBudget: 520_000, lod0Max: 3, shellLod: 1, studs: true, organelleCaps: true, ambient: true, cullSize: 0.008 },
  high: { maxPixelRatio: 1.75, smaa: true, gtao: true, bloom: true, vignette: true, shadows: true, shadowMapSize: 2048, lodBias: 1.4, triBudget: 2_000_000, lod0Max: 8, shellLod: 0, studs: true, organelleCaps: true, ambient: true, cullSize: 0 },
};

export const QUALITY_NAMES: QualityName[] = ['low', 'medium', 'high'];

export function isQualityName(value: unknown): value is QualityName {
  return value === 'low' || value === 'medium' || value === 'high';
}
