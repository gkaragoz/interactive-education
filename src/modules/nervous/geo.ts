import { CatmullRomCurve3, Color, ExtrudeGeometry, Float32BufferAttribute, Shape, TubeGeometry, Vector2, Vector3, type BufferGeometry } from 'three';

/** Vertex-colours a geometry with a soft top-light gradient (the "painted" look). */
export function paint(geo: BufferGeometry, hex: string, spread = 0.18): BufferGeometry {
  const pos = geo.getAttribute('position');
  geo.computeBoundingBox();
  const y0 = geo.boundingBox?.min.y ?? 0;
  const h = Math.max((geo.boundingBox?.max.y ?? 1) - y0, 1e-6);
  const base = new Color(hex);
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = 1 - spread + spread * 1.6 * ((pos.getY(i) - y0) / h);
    col[i * 3] = Math.min(1, base.r * k);
    col[i * 3 + 1] = Math.min(1, base.g * k);
    col[i * 3 + 2] = Math.min(1, base.b * k);
  }
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  return geo;
}

export interface TubeSpec {
  points: Vector3[];
  radius: number | ((u: number) => number);
  segments?: number;
  radial?: number;
  color: string;
  /** Global arc parameter covered by this tube (a neuron can be made of several tubes). */
  s0?: number;
  s1?: number;
}

export interface Tube {
  geometry: BufferGeometry;
  curve: CatmullRomCurve3;
}

/** A painted tube along a smooth curve. Attribute `aS` holds the arc parameter (0..1 along the whole neuron) for the pulse glow. */
export function makeTube(spec: TubeSpec): Tube {
  const curve = new CatmullRomCurve3(spec.points, false, 'centripetal');
  const segs = spec.segments ?? Math.max(16, Math.round(curve.getLength() * 6));
  const radial = spec.radial ?? 8;
  const geo = new TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const aS = new Float32Array(pos.count);
  const col = new Float32Array(pos.count * 3);
  const base = new Color(spec.color);
  const c = new Vector3();
  const v = new Vector3();
  const s0 = spec.s0 ?? 0;
  const s1 = spec.s1 ?? 1;
  const rad = typeof spec.radius === 'number' ? (): number => spec.radius as number : spec.radius;
  for (let i = 0; i < pos.count; i++) {
    const j = Math.floor(i / (radial + 1));
    const u = j / segs;
    curve.getPointAt(u, c);
    const r = rad(u);
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(c).multiplyScalar(r).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
    aS[i] = s0 + (s1 - s0) * u;
    // light from above: lighter on the upper side of the tube
    const k = 0.86 + 0.22 * (nor.getY(i) * 0.5 + 0.5);
    col[i * 3] = Math.min(1, base.r * k);
    col[i * 3 + 1] = Math.min(1, base.g * k);
    col[i * 3 + 2] = Math.min(1, base.b * k);
  }
  geo.setAttribute('aS', new Float32BufferAttribute(aS, 1));
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  return { geometry: geo, curve };
}

/** Polygon (counter-clockwise) of a rounded super-ellipse (centre, half-axes a and b, exponent n). */
export function superEllipse(cx: number, cy: number, a: number, b: number, n = 2.4, steps = 64): Vector2[] {
  const out: Vector2[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    out.push(new Vector2(cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)));
  }
  return out;
}

/** Moves every vertex of a closed counter-clockwise polygon inward by `d` (good enough for smooth blobs). */
export function inset(poly: readonly Vector2[], d: number): Vector2[] {
  const n = poly.length;
  return poly.map((p, i) => {
    const a = poly[(i + n - 1) % n]!;
    const b = poly[(i + 1) % n]!;
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    // the left normal (-ty, tx) of a counter-clockwise polygon points inward
    return new Vector2(p.x - (ty / len) * d, p.y + (tx / len) * d);
  });
}

/** A flat painted slab of a polygon: z from `z0` to `z0 + depth`, with a soft bevel. */
export function slab(poly: readonly Vector2[], z0: number, depth: number, color: string, bevel = 0.12): BufferGeometry {
  const shape = new Shape(poly.slice());
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 4,
    steps: 1,
  });
  geo.translate(0, 0, z0);
  return paint(geo, color, 0.22);
}
