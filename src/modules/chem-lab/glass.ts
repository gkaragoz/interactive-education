import { Color, DoubleSide, MeshPhysicalMaterial } from 'three';

/**
 * Laboratory glass: nearly clear in the middle, a fresnel rim at the edges, hard environment reflections (the studio
 * environment paints the window streaks), double sided, no depth write so the liquid inside shows through. The painted
 * `_gel` textures of the lab GLBs are alpha-only veils: they made the glass read as a white sleeve, so the lab glass uses
 * this material instead (see docs: lab glass).
 */
export function createGlassMaterial(): MeshPhysicalMaterial {
  const mat = new MeshPhysicalMaterial({
    color: new Color(0.86, 0.95, 1),
    transparent: true,
    opacity: 1,
    roughness: 0.04,
    metalness: 0,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 1.8,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    side: DoubleSide,
    depthWrite: false,
  });
  mat.onBeforeCompile = (shader): void => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.4);
  diffuseColor.a = mix(0.035, 0.7, rim);
  outgoingLight += vec3(0.5, 0.68, 0.8) * rim * 0.34;
  #include <opaque_fragment>
  gl_FragColor.a = clamp(diffuseColor.a + (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) * 0.02 * rim, 0.0, 0.9);`,
    );
  };
  mat.customProgramCacheKey = (): string => 'chemlab-glass';
  return mat;
}
