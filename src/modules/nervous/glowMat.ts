import { Color, Vector3, type MeshPhysicalMaterial } from 'three';

/** Shared uniforms of one neuron: where the impulse is (arc parameter), how wide the glow is, and how strong. */
export interface PulseUniforms {
  uPulse: { value: number };
  uWidth: { value: number };
  uGlow: { value: Vector3 };
  uAmt: { value: number };
}

export function pulseUniforms(glow: string, width = 0.05): PulseUniforms {
  const c = new Color(glow);
  return {
    uPulse: { value: -1 },
    uWidth: { value: width },
    uGlow: { value: new Vector3(c.r, c.g, c.b) },
    uAmt: { value: 0 },
  };
}

/**
 * Makes a vertex-coloured clay material light up where an impulse is: a bright head with a soft afterglow behind it.
 * Needs the geometry attribute `aS` (see geo.makeTube). The uniforms are the only state; `seek` sets them.
 */
export function addPulseGlow(mat: MeshPhysicalMaterial, u: PulseUniforms, key: string): MeshPhysicalMaterial {
  mat.onBeforeCompile = (shader): void => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aS;\nvarying float vS;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vS;\nuniform float uPulse;\nuniform float uWidth;\nuniform vec3 uGlow;\nuniform float uAmt;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float dd = vS - uPulse;
float gl = dd < 0.0 ? exp(-dd * dd / (uWidth * uWidth)) + 0.3 * exp(dd / (uWidth * 6.0)) : exp(-dd * dd / (uWidth * uWidth * 0.35));
totalEmissiveRadiance += uGlow * gl * uAmt;`,
      );
  };
  mat.customProgramCacheKey = (): string => 'pulse-' + key;
  mat.needsUpdate = true;
  return mat;
}
