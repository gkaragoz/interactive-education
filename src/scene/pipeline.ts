import {
  AddEquation,
  CustomBlending,
  HalfFloatType,
  OneFactor,
  ShaderMaterial,
  SrcAlphaFactor,
  ZeroFactor,
  Vector2,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { QualitySettings } from '../core';

/**
 * Final pass: the 3D scene is rendered on a transparent background and composited here over a warm parchment
 * gradient, after tone mapping, so the backdrop keeps its exact colours instead of being dimmed by ACES.
 * The render target holds premultiplied colour (cleared to alpha 0, normal blending), hence `rgb + bg * (1 - a)`.
 */
const CompositeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 1 }, tone: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float tone;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // Colour grade on the premultiplied scene colour: richer saturation, a touch more contrast, warm highlights, cool shadows.
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 g = mix(vec3(l), c.rgb, 1.22);
      g = (g - 0.5 * c.a) * 1.07 + 0.5 * c.a;
      g *= mix(vec3(0.97, 0.99, 1.04), vec3(1.04, 1.0, 0.94), smoothstep(0.1, 0.8, l));
      g = max(g, 0.0);
      vec2 d = (vUv - vec2(0.5, 0.52)) * vec2(1.0, 0.85);
      float r = smoothstep(0.1, 0.78, length(d));
      // tone darkens the backdrop (Isolate) so pale organelles read against it.
      vec3 centre = mix(vec3(0.985, 0.953, 0.878), vec3(0.74, 0.66, 0.52), tone);
      vec3 edge = mix(centre, mix(vec3(0.86, 0.74, 0.55), vec3(0.5, 0.42, 0.32), tone), max(vignette, tone));
      vec3 bg = mix(centre, edge, r);
      vec3 outc = g + bg * (1.0 - c.a);
      // Warm vignette over everything, strongest in the corners.
      outc *= 1.0 - vignette * 0.16 * smoothstep(0.35, 0.85, length(d));
      gl_FragColor = vec4(outc, 1.0);
    }`,
};

/** Render, ambient occlusion, bloom, tone mapping, vignette for one scene. Stencil is kept for the cutaway caps. */
export class Pipeline {
  private readonly composer: EffectComposer;
  private readonly gtao: GTAOPass | null;
  private readonly bloom: UnrealBloomPass | null;
  private gtaoWanted: boolean;
  private cutting = false;
  private interacting = false;
  private readonly composite: ShaderPass;
  private readonly vignetteWanted: boolean;
  private readonly target: WebGLRenderTarget;

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    quality: QualitySettings,
    width: number,
    height: number,
  ) {
    this.target = new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      stencilBuffer: true,
      depthBuffer: true,
    });
    this.composer = new EffectComposer(renderer, this.target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.gtaoWanted = quality.gtao;
    this.gtao = quality.gtao ? new GTAOPass(scene, camera, width, height) : null;
    if (this.gtao) {
      this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.2, thickness: 3, scale: 1, samples: 8, distanceFallOff: 1 });
      // Half resolution: ambient occlusion is low-frequency, and this is the most expensive pass.
      const full = this.gtao.setSize.bind(this.gtao);
      this.gtao.setSize = (w: number, h: number): void => full(Math.ceil(w / 2), Math.ceil(h / 2));
      this.gtao.blendIntensity = 0.85;
      this.composer.addPass(this.gtao);
    }
    this.bloom = quality.bloom ? new UnrealBloomPass(new Vector2(width, height), 0.1, 0.4, 1.15) : null;
    if (this.bloom) {
      // The blur writes alpha 1; keep the scene's own alpha so the backdrop composite below still works.
      const blend = (this.bloom as unknown as { blendMaterial: ShaderMaterial }).blendMaterial;
      blend.blending = CustomBlending;
      blend.blendEquation = AddEquation;
      blend.blendSrc = SrcAlphaFactor;
      blend.blendDst = OneFactor;
      blend.blendSrcAlpha = ZeroFactor;
      blend.blendDstAlpha = OneFactor;
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    if (quality.smaa) this.composer.addPass(new SMAAPass());
    this.composite = new ShaderPass(CompositeShader);
    this.vignetteWanted = quality.vignette;
    this.composite.uniforms.vignette!.value = quality.vignette ? 1 : 0;
    this.composer.addPass(this.composite);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  /** 0 = parchment, 1 = darker backdrop (Isolate). */
  setBackdropTone(tone: number): void {
    this.composite.uniforms.tone!.value = tone;
  }

  /** Side-by-side panes use a flat backdrop so there is no seam between them. */
  setFlatBackdrop(flat: boolean): void {
    this.composite.uniforms.vignette!.value = this.vignetteWanted && !flat ? 1 : 0;
  }

  /** Clipping planes are per material, so the AO pre-pass would see uncut geometry: switch AO off while cut. */
  setCutting(cutting: boolean): void {
    this.cutting = cutting;
    this.updateAo();
  }

  /** Ambient occlusion is skipped while the camera moves; it returns when the view settles. */
  setInteracting(interacting: boolean): void {
    this.interacting = interacting;
    this.updateAo();
  }

  private updateAo(): void {
    if (this.gtao) this.gtao.enabled = this.gtaoWanted && !this.cutting && !this.interacting;
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    for (const pass of this.composer.passes) (pass as { dispose?: () => void }).dispose?.();
    this.composer.dispose();
    this.gtao?.dispose();
    this.bloom?.dispose();
    this.target.dispose();
  }
}
