import type { Vec3 } from './moduleScene';

/**
 * Explicit framing and camera limits for a scene whose bounding sphere is a poor frame (a flat, wide bench). `center`
 * and the half sizes describe the box the learner should see (`radius` alone gives a sphere); the home view fits that
 * box to about 85 % of the free area. Limits are world units and radians (polar 0 = straight above).
 */
export interface StageFraming {
  center: Vec3;
  radius: number;
  halfWidth?: number;
  halfHeight?: number;
  /** What the camera looks at (default: `center`). */
  target?: Vec3;
  distanceMin?: number;
  distanceMax?: number;
  polarMin?: number;
  polarMax?: number;
  azimuthMin?: number;
  azimuthMax?: number;
}

interface LimitedControls {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
}

/** Writes the framing's orbit limits onto the camera controls (unset limits keep their current value). */
export function applyFramingLimits(c: LimitedControls, f: StageFraming): void {
  c.minDistance = f.distanceMin ?? c.minDistance;
  c.maxDistance = f.distanceMax ?? c.maxDistance;
  c.minPolarAngle = f.polarMin ?? c.minPolarAngle;
  c.maxPolarAngle = f.polarMax ?? c.maxPolarAngle;
  c.minAzimuthAngle = f.azimuthMin ?? -Infinity;
  c.maxAzimuthAngle = f.azimuthMax ?? Infinity;
}
