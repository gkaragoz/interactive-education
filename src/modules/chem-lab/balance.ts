import { BufferAttribute, CanvasTexture, Group, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3, type BufferGeometry } from 'three';
import { balanceText } from './helpers';
import type { LabAssets } from './labAssets';

const W = 512;
const H = 128;

/** The balance: GLB body plus a display whose digits are drawn on a canvas and mapped onto the `display` mesh. */
export class Balance {
  readonly group = new Group();
  readonly panCentre: [number, number, number];
  private readonly canvas: HTMLCanvasElement | null;
  private readonly texture: CanvasTexture | null;
  private shown = '';

  constructor(assets: LabAssets) {
    this.group.name = 'balance';
    this.group.userData['simId'] = 'balance';
    const { group, asset } = assets.objectNow('digital-balance');
    this.group.add(group);
    group.traverse((o) => {
      o.userData['simId'] = 'balance';
    });
    this.panCentre = asset.meta.panCentre ?? [0, 5, -3.5];
    const display = group.getObjectByName('display') as Mesh | undefined;
    if (!display || typeof document === 'undefined') {
      this.canvas = null;
      this.texture = null;
      return;
    }
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    // The `display` mesh is a sloped slab whose faces share one atlas; the digits go on a plane laid on its front face
    // (centre of the face, normal (0, 0.27, 0.96), measured from the GLB).
    const plane = new Mesh(new PlaneGeometry(10.4, 2.6), new MeshBasicMaterial({ map: this.texture, toneMapped: false }));
    plane.position.set(0, 5.67, 10.33);
    plane.position.addScaledVector(new Vector3(0, 0.268, 0.963), 0.04);
    plane.rotation.x = -0.272;
    plane.raycast = (): void => undefined;
    plane.userData['simId'] = 'balance';
    this.group.add(plane);
    this.draw('-.--', false);
  }

  /** Writes the reading ("12,34 g"); `stable` blinks nothing, it only dims the unit when the value is changing. */
  setReading(grams: number | null, unit = 'g'): void {
    const text = balanceText(grams);
    if (text === this.shown) return;
    this.shown = text;
    this.draw(text, true, unit);
  }

  private draw(text: string, on: boolean, unit = 'g'): void {
    const c = this.canvas?.getContext('2d');
    if (!c || !this.canvas || !this.texture) return;
    c.fillStyle = '#9db08a';
    c.fillRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = on ? '#1d2a17' : 'rgba(29,42,23,0.35)';
    c.font = '700 96px "Courier New", monospace';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.fillText(text, W - 90, H / 2 + 4);
    c.font = '700 44px "Courier New", monospace';
    c.textAlign = 'left';
    c.fillText(unit, W - 80, H / 2 + 26);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture?.dispose();
    this.group.removeFromParent();
  }
}

/** Remaps the UVs of a mesh from a rectangle of the shared atlas onto 0..1 (the rect is [u0, v0, u1, v1], v down). */
export function remapUv(geometry: BufferGeometry, rect: readonly [number, number, number, number]): BufferGeometry {
  const g = geometry.clone();
  const uv = g.getAttribute('uv');
  if (!uv) return g;
  const out = new Float32Array(uv.count * 2);
  const du = Math.max(1e-6, rect[2] - rect[0]);
  const dv = Math.max(1e-6, rect[3] - rect[1]);
  for (let i = 0; i < uv.count; i++) {
    out[i * 2] = (uv.getX(i) - rect[0]) / du;
    out[i * 2 + 1] = (uv.getY(i) - rect[1]) / dv;
  }
  g.setAttribute('uv', new BufferAttribute(out, 2));
  return g;
}
