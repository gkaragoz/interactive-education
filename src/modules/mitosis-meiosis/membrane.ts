import { BackSide, type Material, Color, Group, Mesh, MeshBasicMaterial, Vector4, type BufferGeometry, type MeshPhysicalMaterial } from 'three';

/** p-norm of the two lobe profiles: equals max where one is zero and a plain ellipsoid (inflated by 2^(1/P)) where they coincide. */
export const UNION_P = 5;
export const INFLATE = Math.pow(2, 1 / UNION_P);

const SHAPE_GLSL = `
uniform vec4 uShape; // ax, a, c, 0
const float PI_ = 3.14159265;
vec3 cellPoint(float u, float th, float side) {
  float ax = uShape.x; float a = uShape.y; float c = uShape.z;
  float phiN = c < ax ? acos(-c / ax) : PI_;
  float phi = u * phiN;
  float x = -c - ax * cos(phi);
  float rl = a * sin(phi);
  float dx = (x - c) / ax;
  float rr = a * sqrt(max(0.0, 1.0 - dx * dx));
  float r = pow(pow(max(rl, 0.0), ${UNION_P}.0) + pow(rr, ${UNION_P}.0), ${(1 / UNION_P).toFixed(4)});
  return vec3(x * -side, r * cos(th), r * sin(th));
}
vec3 cellNormal(float u, float th, float side) {
  float d = 0.012;
  float u0 = clamp(u, d, 1.0 - d);
  vec3 pu = cellPoint(u0 + d, th, side) - cellPoint(u0 - d, th, side);
  vec3 pt = cellPoint(u0, th + d, side) - cellPoint(u0, th - d, side);
  vec3 n = cross(pu, pt) * side;
  float l = length(n);
  if (l < 1e-9) return vec3(-side * (u < 0.5 ? 1.0 : -1.0), 0.0, 0.0);
  return n / l;
}`;

/** Patches a material so its geometry (attribute aParam) becomes the cleaving cell shape described by `uShape`. */
export function patchCellShader(mat: Material, shape: Vector4, extraKey: string, base?: { onBeforeCompile: unknown }): void {
  const prev = base?.onBeforeCompile as ((s: unknown, r: unknown) => void) | undefined;
  mat.onBeforeCompile = (shader, renderer): void => {
    if (prev) prev.call(mat, shader, renderer);
    shader.uniforms.uShape = { value: shape };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec3 aParam;${SHAPE_GLSL}`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = cellNormal(aParam.x, aParam.y, aParam.z);')
      .replace('#include <begin_vertex>', 'vec3 transformed = cellPoint(aParam.x, aParam.y, aParam.z);');
  };
  mat.customProgramCacheKey = (): string => `mm-cell-${extraKey}`;
}

const RIM_GLSL = `
float mmRim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.6);
outgoingLight += vec3(0.95, 0.38, 0.36) * mmRim * 0.55;
diffuseColor.a = mix(diffuseColor.a, 0.7, mmRim * mmRim);
#include <opaque_fragment>`;

/** One cell body: a clear glass membrane with a peach-pink fresnel rim, and a faint cytoplasm volume that darkens toward the edge. */
export class CellBody {
  readonly group = new Group();
  readonly shape = new Vector4(1, 1, 0, 0);
  private readonly meshes: Mesh[];
  private readonly mats: Material[];

  constructor(geometry: BufferGeometry, membrane: MeshPhysicalMaterial, parent: Group) {
    const outer = membrane.clone();
    patchCellShader(outer, this.shape, 'outer', membrane);
    const chain = outer.onBeforeCompile;
    outer.onBeforeCompile = (shader, renderer): void => {
      chain.call(outer, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', RIM_GLSL);
    };
    outer.customProgramCacheKey = (): string => 'mm-cell-outer-rim';
    const inner = new MeshBasicMaterial({ color: new Color('#e8957f'), transparent: true, opacity: 0.1, side: BackSide, depthWrite: false });
    patchCellShader(inner, this.shape, 'inner');
    const a = new Mesh(geometry, outer);
    const b = new Mesh(geometry, inner);
    a.renderOrder = 60;
    b.renderOrder = 20;
    a.frustumCulled = b.frustumCulled = false;
    this.meshes = [a, b];
    this.mats = [outer, inner];
    this.group.add(a, b);
    parent.add(this.group);
  }

  /** ax, a: lobe semi-axes; c: lobe centre offset along the cell axis. */
  set(x: number, y: number, rot: number, ax: number, a: number, c: number, visible: boolean): void {
    this.shape.set(ax, a, c, 0);
    this.group.position.set(x, y, 0);
    this.group.rotation.z = rot;
    this.group.visible = visible;
  }

  dispose(): void {
    for (const m of this.mats) m.dispose();
    this.meshes.length = 0;
  }
}
