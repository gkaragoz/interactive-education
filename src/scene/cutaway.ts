import {
  AlwaysStencilFunc,
  BackSide,
  Color,
  DecrementWrapStencilOp,
  DoubleSide,
  FrontSide,
  Group,
  IncrementWrapStencilOp,
  InstancedMesh,
  InvertStencilOp,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  Plane,
  PlaneGeometry,
  ReplaceStencilOp,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three';

/**
 * How a group's cross-section is found with the stencil buffer:
 * - winding: back faces count up, front faces count down (nonzero = inside; overlapping parts stay filled),
 * - parity: every face flips the bit (robust to either normal orientation of nested hollow shells).
 */
export type CapMode = 'winding' | 'parity';

/** Group key with a fixed place in the draw order: the shell cap comes before the organelle caps. */
export const SHELL_KEY = 'shell';

export interface RegisterOptions {
  mode?: CapMode;
  /** Geometry for the stencil twin when it may be coarser than the visible mesh. */
  twinGeometry?: BufferGeometry;
  /** The mesh itself is never drawn (a proxy); only its ancestors decide whether the twin shows. */
  proxy?: boolean;
}

interface Twin {
  key: string;
  main: Object3D;
  twins: Object3D[];
  proxy: boolean;
}

interface Cap {
  order: number;
  mesh: Mesh;
  material: MeshStandardMaterial;
}

/** Real clipping plane (keeps y <= constant, so the top is removed) plus stencil-capped cross-sections (ADR 0003). */
export class Cutaway {
  readonly plane = new Plane(new Vector3(0, -1, 0), 1e5);
  /** Parent for the cap polygons; the owner adds it to the scene. */
  readonly root = new Group();
  private active = false;
  private readonly twins: Twin[] = [];
  private readonly caps = new Map<string, Cap>();
  private readonly twinMaterials = new Map<CapMode, Material[]>();
  private readonly geometry = new PlaneGeometry(1, 1);
  private nextOrder = 1;
  private organelleCaps = true;
  private capSize = 80;
  private capY = 0;

  constructor(private readonly colorFor: (key: string) => string) {
    this.root.visible = false;
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Cut at height `y` (world). Inactive moves the plane far away and hides caps and twins. */
  setCut(active: boolean, y: number, capSize: number): void {
    this.active = active;
    this.capSize = capSize;
    this.capY = y;
    this.plane.constant = active ? y : 1e5;
    this.root.visible = active;
    this.placeCaps();
    this.syncTwins();
  }

  private placeCaps(): void {
    for (const cap of this.caps.values()) {
      cap.mesh.visible = this.active;
      // A hair below the plane so the cap is never clipped or z-fought away.
      cap.mesh.position.set(0, this.capY - 0.02, 0);
      cap.mesh.scale.setScalar(this.capSize);
    }
  }

  /** Low quality keeps only the shell's cross-section (organelle twins are skipped). */
  setOrganelleCaps(on: boolean): void {
    this.organelleCaps = on;
    this.syncTwins();
  }

  setCapColor(key: string, color: string): void {
    this.capFor(key).material.color.set(color);
  }

  /** Gives a cap a texture (the cavity floor); the colour then tints it. */
  setCapTexture(key: string, texture: Texture | null): void {
    const cap = this.capFor(key);
    cap.material.map = texture;
    cap.material.needsUpdate = true;
  }

  private capFor(key: string): Cap {
    let cap = this.caps.get(key);
    if (cap) return cap;
    const material = new MeshStandardMaterial({
      color: new Color(this.colorFor(key)),
      roughness: 0.88,
      metalness: 0,
      side: DoubleSide,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: NotEqualStencilFunc,
      stencilFail: ReplaceStencilOp,
      stencilZFail: ReplaceStencilOp,
      stencilZPass: ReplaceStencilOp,
    });
    const order = key === SHELL_KEY ? 0 : this.nextOrder++;
    const mesh = new Mesh(this.geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 11 + order * 2;
    mesh.frustumCulled = false;
    mesh.visible = this.active;
    mesh.receiveShadow = true;
    // One shared stencil buffer: clearing after each cap keeps the groups independent.
    mesh.onAfterRender = (renderer: WebGLRenderer) => renderer.clearStencil();
    this.root.add(mesh);
    cap = { order, mesh, material };
    this.caps.set(key, cap);
    this.placeCaps();
    return cap;
  }

  private materialsFor(mode: CapMode): Material[] {
    let list = this.twinMaterials.get(mode);
    if (list) return list;
    const make = (side: typeof FrontSide | typeof BackSide | typeof DoubleSide, op: number): Material =>
      new MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        depthTest: false,
        side,
        clippingPlanes: [this.plane],
        stencilWrite: true,
        stencilFunc: AlwaysStencilFunc,
        stencilFail: op as never,
        stencilZFail: op as never,
        stencilZPass: op as never,
      });
    list = mode === 'parity' ? [make(DoubleSide, InvertStencilOp)] : [make(BackSide, IncrementWrapStencilOp), make(FrontSide, DecrementWrapStencilOp)];
    this.twinMaterials.set(mode, list);
    return list;
  }

  /** Adds stencil twins next to `main` (same parent and transform, shared instance matrices). */
  register(main: Mesh | InstancedMesh, key: string, options: RegisterOptions = {}): void {
    const parent = main.parent;
    if (!parent) throw new Error('register the mesh after adding it to its parent');
    const cap = this.capFor(key);
    const geometry = options.twinGeometry ?? main.geometry;
    const twins = this.materialsFor(options.mode ?? 'winding').map((material) => {
      let twin: Mesh | InstancedMesh;
      if ((main as InstancedMesh).isInstancedMesh) {
        const inst = main as InstancedMesh;
        const t = new InstancedMesh(geometry, material, inst.instanceMatrix.count);
        t.instanceMatrix = inst.instanceMatrix;
        t.count = inst.count;
        twin = t;
      } else {
        twin = new Mesh(geometry, material);
      }
      twin.position.copy(main.position);
      twin.quaternion.copy(main.quaternion);
      twin.scale.copy(main.scale);
      twin.renderOrder = 10 + cap.order * 2;
      twin.frustumCulled = false;
      twin.visible = false;
      parent.add(twin);
      return twin;
    });
    this.twins.push({ key, main, twins, proxy: options.proxy ?? false });
  }

  /** Call after any visibility or instance-count change of registered meshes. */
  syncTwins(): void {
    for (const { key, main, twins, proxy } of this.twins) {
      let visible = this.active && (this.organelleCaps || key === SHELL_KEY);
      for (let o: Object3D | null = proxy ? main.parent : main; visible && o; o = o.parent) if (!o.visible) visible = false;
      const instanced = (main as InstancedMesh).isInstancedMesh;
      for (const twin of twins) {
        const caps = instanced ? ((main.userData.capCount as number | undefined) ?? (main as InstancedMesh).count) : 1;
        twin.visible = visible && caps > 0;
        if (instanced) (twin as InstancedMesh).count = caps;
      }
    }
  }

  dispose(): void {
    for (const { twins } of this.twins) {
      for (const twin of twins) {
        twin.removeFromParent();
        (twin as InstancedMesh).dispose?.();
      }
    }
    this.twins.length = 0;
    for (const list of this.twinMaterials.values()) for (const m of list) m.dispose();
    this.twinMaterials.clear();
    for (const cap of this.caps.values()) {
      cap.material.map?.dispose();
      cap.material.dispose();
    }
    this.geometry.dispose();
    this.caps.clear();
    this.root.removeFromParent();
  }
}

