import type { SurfaceMaps } from './textureStore';
import { BackSide, Color, DoubleSide, FrontSide, MeshBasicMaterial, MeshPhysicalMaterial, type Plane, type Texture, Vector2 } from 'three';

export type SurfaceKind = 'clay' | 'gel';

/** Sheen, clearcoat and environment strength of clay with a painted albedo. */
/** Brightness of a painted albedo under the stage lighting (1 = as painted). */
const TEXTURE_GAIN = 0.8;
const TEXTURED_SHEEN = 0.08;
const TEXTURED_COAT = 0.04;
const TEXTURED_ENV = 0.7;
const SHEEN = new Color('#ffe9d2');
const EMISSIVE = new Color('#ffb15c');

/**
 * Fresnel rim for translucent surfaces: the alpha is `floor` face-on and 1 at grazing angles, so the middle stays clear
 * (a flat veil would only whiten what is behind it) and an optional glow colour lights the inside of the gel.
 */
function rimShader(mat: MeshPhysicalMaterial, floor: number, power: number, glow?: [number, number, number], glowBase = 0.35): void {
  const g = glow ? `outgoingLight += vec3(${glow.map((v) => v.toFixed(3)).join(', ')}) * (${glowBase.toFixed(2)} + ${(1 - glowBase).toFixed(2)} * rim);` : '';
  mat.onBeforeCompile = (shader): void => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), ${power.toFixed(2)});
  diffuseColor.a *= mix(${floor.toFixed(2)}, 1.0, rim);
  ${g}
  #include <opaque_fragment>`,
    );
  };
  mat.customProgramCacheKey = (): string => `rim-${floor}-${power}-${glowBase}-${glow?.join(',') ?? ''}`;
}

/** Per-organelle look of the translucent and soft parts (the vacuole is a saturated blue, never a white cloud). */
const GEL_STYLE: Record<string, { color: [number, number, number]; opacity: number; glow?: [number, number, number] }> = {
  vacuole: { color: [0.42, 0.72, 1.3], opacity: 0.62, glow: [0.02, 0.1, 0.26] },
};
const CLAY_STYLE: Record<string, [number, number, number]> = { vacuole: [0.55, 0.82, 1.25] };

/**
 * Replaces the authored `_clay` / `_gel` materials: soft satin clay with vertex colours and a shared micro-normal,
 * and translucent gel for membranes. One material per organelle id and kind so hover and selection can glow
 * one organelle without touching the others; they all share the normal map.
 */
export class MaterialLibrary {
  private readonly materials = new Map<string, MeshPhysicalMaterial>();
  private outlineMaterial: MeshBasicMaterial | null = null;
  private relief = 1;
  /** Shared with the flagellum's vertex shader: seconds and wave amplitude (0 = still). */
  private readonly wave = { time: { value: 0 }, amount: { value: 0 } };

  constructor(
    private readonly normalMap: Texture,
    private readonly clipPlane: Plane,
  ) {}

  get(id: string, kind: SurfaceKind): MeshPhysicalMaterial {
    const key = `${id}:${kind}`;
    let mat = this.materials.get(key);
    if (!mat) {
      mat = kind === 'clay' ? this.createClay() : this.createGel();
      const baseId = id.split('.')[0] ?? id;
      if (kind === 'gel') {
        const style = GEL_STYLE[baseId];
        rimShader(mat, style ? 0.4 : 0.55, 2, style?.glow);
        if (style) {
          mat.color.setRGB(...style.color);
          mat.opacity = style.opacity;
        }
      } else {
        if (CLAY_STYLE[baseId]) mat.color.setRGB(...(CLAY_STYLE[baseId] as [number, number, number]));
        if (baseId === 'flagellum') this.addWave(mat);
      }
      mat.userData.baseColor = mat.color.clone();
      this.materials.set(key, mat);
    }
    return mat;
  }

  /** Drives the flagellum wave (amount 0 = still); the uniforms are shared by every flagellum material. */
  setWave(amount: number, seconds: number): void {
    this.wave.amount.value = amount;
    this.wave.time.value = seconds;
  }

  /** Makes the material swing along its length like a beating flagellum (the wave amplitude comes from `setWave`). */
  private addWave(mat: MeshPhysicalMaterial): void {
    mat.onBeforeCompile = (shader): void => {
      shader.uniforms.uWaveTime = this.wave.time;
      shader.uniforms.uWaveAmount = this.wave.amount;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
uniform float uWaveTime;
uniform float uWaveAmount;`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
  transformed.y += sin(position.x * 1.4 - uWaveTime * 3.2) * 0.2 * uWaveAmount * smoothstep(-3.0, 3.0, position.x);
  transformed.z += cos(position.x * 1.1 - uWaveTime * 2.6) * 0.12 * uWaveAmount * smoothstep(-3.0, 3.0, position.x);`,
        );
    };
    mat.customProgramCacheKey = (): string => 'wave';
  }

  /** Shell parts (wall, membrane, envelope) are always see-through so the inside stays visible in the full view. */
  shell(id: string): MeshPhysicalMaterial {
    const key = `${id}:shell`;
    let mat = this.materials.get(key);
    if (!mat) {
      mat = this.createGel();
      // Thin glass: nearly clear in the middle, a fresnel rim at grazing angles (a flat veil would only whiten what is behind).
      mat.opacity = id.startsWith('wall') ? 0.42 : id.startsWith('envelope') ? 0.14 : 0.17;
      mat.color.setRGB(0.8, 0.9, 0.8);
      if (id.startsWith('envelope')) {
        // A clear glass capsule: almost nothing face-on, a visible rim at the edges.
        // Dark body (it must not add light), bright edge: clear glass instead of a milky veil.
        mat.opacity = 0.5;
        mat.color.setRGB(0.22, 0.34, 0.32);
        rimShader(mat, 0.05, 3.0, [0.5, 0.62, 0.58], 0);
      } else if (id.startsWith('membrane')) {
        mat.opacity = 0.34;
        mat.color.setRGB(0.5, 0.36, 0.38);
        rimShader(mat, 0.08, 2.6, [0.55, 0.36, 0.4], 0);
      } else rimShader(mat, 0.1, 2.4);
      mat.side = FrontSide; // hollow shells: outer near face + inner far face only, not four stacked layers
      mat.clearcoat = 0;
      mat.sheen = 0;
      // Rough and weakly reflective: sharp highlights on a nearly transparent surface blow out to HDR haze.
      mat.roughness = 0.75;
      mat.specularIntensity = 0.15;
      mat.envMapIntensity = 0.25;
      this.materials.set(key, mat);
    }
    return mat;
  }

  /** The cytoplasm bed seen through the cut: matte, vertex-shaded, drawn from the inside of the outline. */
  bed(color: string): MeshPhysicalMaterial {
    const key = 'bed:clay';
    let mat = this.materials.get(key);
    if (!mat) {
      mat = new MeshPhysicalMaterial({ color: new Color(color), vertexColors: true, roughness: 0.85, side: BackSide, clippingPlanes: [this.clipPlane], clipShadows: true, normalMap: this.normalMap, normalScale: new Vector2(0.25, 0.25) });
      this.materials.set(key, mat);
    }
    return mat;
  }

  /** Cut-mode look of a translucent shell part: a glossy, fairly opaque membrane with visible thickness. */
  glossy(id: string): MeshPhysicalMaterial {
    const key = `${id}:glossy`;
    let mat = this.materials.get(key);
    if (!mat) {
      mat = this.createGel();
      mat.opacity = 0.62;
      mat.roughness = 0.22;
      // A strong clearcoat and environment light would whiten the thin rim at the cut edge.
      mat.clearcoat = 0.45;
      mat.clearcoatRoughness = 0.15;
      mat.side = FrontSide;
      mat.envMapIntensity = 0.7;
      this.materials.set(key, mat);
    }
    return mat;
  }

  /**
   * Puts painted textures on the materials of one organelle id (`kind`: its clay or gel surfaces, and the glossy
   * membrane look). With an albedo map the vertex colours are switched off; the ORM map feeds ambient occlusion,
   * roughness and metalness (R, G, B). Passing null maps restores the vertex-colour look. The brightness ramps up
   * briefly so a higher tier does not pop in.
   */
  applyMaps(id: string, kind: SurfaceKind, maps: SurfaceMaps | null, fade: boolean): void {
    const keys = kind === 'clay' ? [`${id}:clay`] : [`${id}:gel`, `${id}:glossy`];
    for (const key of keys) {
      const mat = this.materials.get(key);
      if (!mat) continue;
      const textured = maps !== null && (maps.albedo !== null || maps.normal !== null || maps.orm !== null);
      mat.map = maps?.albedo ?? null;
      mat.vertexColors = !(maps?.albedo ?? null);
      if (maps?.albedo) {
        // Under warm key light plus image-based light the painted colours come out lighter than they were painted.
        mat.color.setRGB(TEXTURE_GAIN, TEXTURE_GAIN, TEXTURE_GAIN);
        mat.userData.baseColor = mat.color.clone();
      }
      if (maps?.normal) {
        mat.normalMap = maps.normal;
        // The GLBs carry no tangents: three derives the frame from UV derivatives, which needs a flipped green channel.
        mat.normalScale.set(1, -1);
        mat.userData.texNormal = true;
      } else if (!textured) {
        mat.normalMap = this.normalMap;
      }
      mat.aoMap = maps?.orm ?? null;
      mat.roughnessMap = maps?.orm ?? null;
      mat.metalnessMap = maps?.orm ?? null;
      if (maps?.orm) {
        mat.roughness = 1;
        mat.metalness = 1;
      }
      // Painted albedo already contains its own sheen and highlights: keep the extra satin layers subtle or it washes out.
      if (kind === 'clay') {
        mat.sheen = textured && maps?.albedo ? TEXTURED_SHEEN : 0.35;
        mat.clearcoat = textured && maps?.albedo ? TEXTURED_COAT : 0.15;
        mat.envMapIntensity = textured && maps?.albedo ? TEXTURED_ENV : 1;
      }
      // Gel takes its opacity from the albedo's alpha; the flat material opacity would multiply it a second time.
      mat.userData.alphaMap = kind === 'gel' && maps?.albedo !== null && maps?.albedo !== undefined;
      if (mat.userData.alphaMap) {
        mat.transparent = true;
        mat.depthWrite = false;
      }
      mat.userData.fade = fade && textured ? 0 : 1;
      mat.needsUpdate = true;
    }
  }

  /**
   * Relief strength of painted normal maps (1 = as authored). Up close the compressed normals show faint 4x4 blocks,
   * so the camera asks for less relief the nearer it gets; the green channel stays flipped (no tangents in the GLBs).
   */
  setRelief(strength: number): void {
    if (Math.abs(strength - this.relief) < 0.02) return;
    this.relief = strength;
    for (const mat of this.materials.values()) if (mat.userData.texNormal) mat.normalScale.set(strength, -strength);
  }

  /** Eases the brightness of freshly textured materials; returns true while any is still fading. */
  tickFade(dt: number): boolean {
    let active = false;
    for (const mat of this.materials.values()) {
      const f = mat.userData.fade as number | undefined;
      if (f === undefined || f >= 1) continue;
      const next = Math.min(1, f + dt * 2.2);
      mat.userData.fade = next;
      const base = mat.userData.baseColor as Color | undefined;
      if (base) mat.color.copy(base).multiplyScalar(0.8 + 0.2 * next);
      active = active || next < 1;
    }
    return active;
  }

  /** All materials belonging to one organelle id (both kinds that exist). */
  forId(id: string): MeshPhysicalMaterial[] {
    return [...this.materials.entries()].filter(([k]) => k.startsWith(`${id}:`)).map(([, m]) => m);
  }

  all(): MeshPhysicalMaterial[] {
    return [...this.materials.values()];
  }

  /** Dims one organelle id (0 = normal, 1 = clearly darker): the others step back when something is selected. */
  setDim(id: string, amount: number): void {
    for (const mat of this.forId(id)) {
      const base = mat.userData.baseColor as Color | undefined;
      if (base) mat.color.copy(base).multiplyScalar(1 - 0.34 * amount);
    }
  }

  /** Warm inverted-hull outline for the selected organelle: back faces pushed out along their normals. */
  outline(): MeshBasicMaterial {
    if (!this.outlineMaterial) {
      const mat = new MeshBasicMaterial({ color: new Color('#ffb347'), side: BackSide, clippingPlanes: [this.clipPlane], toneMapped: false });
      mat.onBeforeCompile = (shader): void => {
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.1;');
      };
      mat.customProgramCacheKey = (): string => 'outline-hull';
      this.outlineMaterial = mat;
    }
    return this.outlineMaterial;
  }

  /** Glow strength 0..1 for one organelle id. */
  setGlow(id: string, amount: number): void {
    for (const mat of this.forId(id)) {
      mat.emissive.copy(EMISSIVE);
      mat.emissiveIntensity = amount * 0.55;
    }
  }

  dispose(): void {
    for (const mat of this.materials.values()) mat.dispose();
    this.materials.clear();
    this.outlineMaterial?.dispose();
  }

  private createClay(): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.62,
      metalness: 0,
      sheen: 0.35,
      sheenRoughness: 0.5,
      sheenColor: SHEEN,
      clearcoat: 0.15,
      clearcoatRoughness: 0.45,
      normalMap: this.normalMap,
      normalScale: new Vector2(0.35, 0.35),
      clippingPlanes: [this.clipPlane],
      clipShadows: true,
      shadowSide: DoubleSide,
    });
  }

  private createGel(): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      roughness: 0.18,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      ior: 1.33,
      sheen: 0.4,
      sheenColor: SHEEN,
      side: DoubleSide,
      depthWrite: false,
      normalMap: this.normalMap,
      normalScale: new Vector2(0.15, 0.15),
      clippingPlanes: [this.clipPlane],
    });
  }
}
