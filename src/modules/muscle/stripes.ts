import { Color, type MeshPhysicalMaterial } from 'three';
import { COLORS } from './kit';

/** Shared by every striped tube: the A band share of a sarcomere and the H zone share (both change as it shortens). */
export interface StripeUniforms {
  uA: { value: number };
  uH: { value: number };
}
export const stripeUniforms = (): StripeUniforms => ({ uA: { value: 0.667 }, uH: { value: 0.167 } });

/**
 * Turns a clay material into a striated tube: along the tube's local x it repeats one sarcomere every 1 / `perUnit` units (an M line sits at x = 0), each with Z lines at the ends,
 * pale I zones, a dark A band, a lighter H zone and an M line. The bands move with the shared uniforms.
 */
export function stripeMaterial(m: MeshPhysicalMaterial, u: StripeUniforms, perUnit: { value: number }, dim = 1): MeshPhysicalMaterial {
  const cA = new Color(COLORS.bandA).multiplyScalar(dim);
  const cI = new Color('#8fcad6').multiplyScalar(dim);
  const cH = new Color('#f0a35e').multiplyScalar(dim);
  const cZ = new Color(COLORS.zline).multiplyScalar(dim);
  m.onBeforeCompile = (shader): void => {
    Object.assign(shader.uniforms, { uA: u.uA, uH: u.uH, uPer: perUnit, cA: { value: cA }, cI: { value: cI }, cH: { value: cH }, cZ: { value: cZ } });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vStripe;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 ip = vec4(position, 1.0);\n#ifdef USE_INSTANCING\nip = instanceMatrix * ip;\n#endif\nvStripe = ip.x;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vStripe;\nuniform float uA;\nuniform float uH;\nuniform float uPer;\nuniform vec3 cA;\nuniform vec3 cI;\nuniform vec3 cH;\nuniform vec3 cZ;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  {
    float ph = vStripe * uPer + 0.5;
    float p = abs(fract(ph) - 0.5);
    float w = max(fwidth(ph), 0.002) * 1.2;
    float inA = 1.0 - smoothstep(uA * 0.5 - w, uA * 0.5 + w, p);
    float inH = 1.0 - smoothstep(uH * 0.5 - w, uH * 0.5 + w, p);
    float z = smoothstep(0.5 - 0.035 - w, 0.5 - 0.035 + w, p);
    float mm = 1.0 - smoothstep(0.012, 0.012 + w, p);
    vec3 band = mix(cI, cA, inA);
    band = mix(band, cH, inH * 0.85);
    band = mix(band, cA * 0.8, mm * inA * 0.5);
    band = mix(band, cZ, z);
    diffuseColor.rgb *= band;
  }`,
      );
  };
  m.customProgramCacheKey = (): string => 'muscle-stripes';
  return m;
}
