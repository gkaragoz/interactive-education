import type { MeshPhysicalMaterial } from 'three';

export interface ChromatidUniforms {
  uLoose: { value: number };
}

/**
 * Turns a clone of the shared painted clay into the chromatid material: the vertex shader bends the arms around the
 * centromere (V shape in anaphase, ring shape in a bivalent), thins and wiggles the rod into chromatin when decondensed
 * (`uLoose`), and the fragment shader paints the exchanged segment of a crossing over (`aSeg` below `iA.w`, colour `iAlt`).
 * Bending is done in scaled space (from the instance matrix lengths) so the rod keeps its proportions.
 */
export function makeChromatidMaterial(base: MeshPhysicalMaterial, uniforms: ChromatidUniforms, painted = false): MeshPhysicalMaterial {
  const mat = base.clone();
  mat.vertexColors = true;
  mat.onBeforeCompile = (shader): void => {
    shader.uniforms.uLoose = uniforms.uLoose;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uLoose;
attribute vec4 iA;
attribute vec3 iAlt;
attribute float aSeg;
varying float vSeg;
varying vec3 vAlt;
varying float vHi;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = position;
{
  float L = length(instanceMatrix[1].xyz);
  float T = length(instanceMatrix[0].xyz);
  float k = uLoose;
  vec3 p = vec3(position.x * T, position.y * L, position.z * T);
  // decondense: longer, thinner, wiggling thread
  p.xz *= mix(1.0, 0.45, k);
  p.y *= mix(1.0, 0.85, k);
  float w = position.y * 9.0 + iA.z;
  p.x += sin(w) * 0.3 * k + sin(w * 2.3 + 1.0) * 0.1 * k;
  p.z += cos(w * 0.83 + 1.7) * 0.3 * k;
  // bend the arms around the centromere (origin)
  float sg = sin(clamp(p.y / (0.07 * L + 0.001), -1.0, 1.0) * 1.5707963);
  float g = mix(iA.x, iA.y, 0.5 + 0.5 * sg);
  float a = -sg * g * (1.0 - 0.0 * k);
  float ca = cos(a); float sa = sin(a);
  p.xy = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);
  transformed = vec3(p.x / T, p.y / L, p.z / T);
}
vSeg = aSeg; vAlt = iAlt; vHi = iA.w;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vSeg;\nvarying vec3 vAlt;\nvarying float vHi;`)
      .replace(
        '#include <color_fragment>',
        painted
          ? `#include <color_fragment>
// painted albedo: the exchanged tip keeps the paint but takes the other parent's tint
float inSeg = (1.0 - smoothstep(vHi - 0.025, vHi + 0.025, vSeg)) * step(0.002, vHi);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb / max(vColor.rgb, vec3(0.05)) * vAlt, inSeg);`
          : `#include <color_fragment>
float inSeg = (1.0 - smoothstep(vHi - 0.025, vHi + 0.025, vSeg)) * step(0.002, vHi);
diffuseColor.rgb = mix(diffuseColor.rgb, vAlt, inSeg);
float waist = smoothstep(0.03, 0.0, abs(vSeg - 0.65));
diffuseColor.rgb *= (1.0 - 0.25 * waist) * (0.82 + 0.18 * sin(vSeg * 64.0)) * (0.94 + 0.06 * sin(vSeg * 23.0 + 1.0));`,
      );
  };
  mat.customProgramCacheKey = (): string => (painted ? 'mm-chromatid-painted' : 'mm-chromatid-v1');
  return mat;
}
