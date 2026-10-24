import { BufferGeometry, Float32BufferAttribute, type MeshPhysicalMaterial } from 'three';

interface Part {
  name: string;
  geometry: BufferGeometry;
}

/**
 * Turns the painted `chromosome-single` GLB (one chromatid, drawn tilted like half of an X) into the rod the bend shader
 * expects: long axis along Y, centromere (the waist) at the origin, long arm toward -Y, total length 1 and radius
 * `radius` (instance scale then sets the real size), plus `aSeg` (0 at the long-arm tip .. 1 at the short-arm tip).
 * Returns null for a placeholder (no `arms` part), so the caller falls back to the procedural lathe.
 */
export function paintedChromatidGeometry(parts: Part[], radius = 1.0): BufferGeometry | null {
  const arms = parts.find((p) => /arms/.test(p.name));
  if (!arms) return null;
  const g = arms.geometry.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const n = pos.count;

  // principal axis in the XY plane
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += pos.getX(i);
    my += pos.getY(i);
  }
  mx /= n;
  my /= n;
  let cxx = 0;
  let cxy = 0;
  let cyy = 0;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) - mx;
    const y = pos.getY(i) - my;
    cxx += x * x;
    cxy += x * y;
    cyy += y * y;
  }
  const axis = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const rot = Math.PI / 2 - axis;
  const rotate = (a: number): void => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setXY(i, x * c - y * s, x * s + y * c);
      const nx = nor.getX(i);
      const ny = nor.getY(i);
      nor.setXY(i, nx * c - ny * s, nx * s + ny * c);
    }
  };
  rotate(rot);

  const range = (): { lo: number; hi: number } => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      lo = Math.min(lo, pos.getY(i));
      hi = Math.max(hi, pos.getY(i));
    }
    return { lo, hi };
  };
  // the waist: thinnest cross-section in the middle of the rod
  const waist = (): { y: number; x: number; z: number } => {
    const { lo, hi } = range();
    const bins = 48;
    const sum = new Float64Array(bins * 4);
    const cnt = new Float64Array(bins);
    for (let i = 0; i < n; i++) {
      const b = Math.min(bins - 1, Math.floor(((pos.getY(i) - lo) / (hi - lo)) * bins));
      sum[b * 4] = (sum[b * 4] as number) + pos.getX(i);
      sum[b * 4 + 1] = (sum[b * 4 + 1] as number) + pos.getZ(i);
      cnt[b] = (cnt[b] as number) + 1;
    }
    const mean = (b: number): [number, number] => [(sum[b * 4] as number) / (cnt[b] as number), (sum[b * 4 + 1] as number) / (cnt[b] as number)];
    const spread = new Float64Array(bins).fill(Infinity);
    for (let i = 0; i < n; i++) {
      const b = Math.min(bins - 1, Math.floor(((pos.getY(i) - lo) / (hi - lo)) * bins));
      const [cx, cz] = mean(b);
      const d = Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz);
      spread[b] = spread[b] === Infinity ? d : Math.max(spread[b] as number, d);
    }
    let best = Math.floor(bins * 0.3);
    for (let b = Math.floor(bins * 0.25); b < Math.floor(bins * 0.75); b++) if ((cnt[b] as number) > 8 && (spread[b] as number) < (spread[best] as number)) best = b;
    const [cx, cz] = mean(best);
    return { y: lo + ((best + 0.5) / bins) * (hi - lo), x: cx, z: cz };
  };
  let w = waist();
  let r = range();
  if (r.hi - w.y > w.y - r.lo) {
    rotate(Math.PI);
    w = waist();
    r = range();
  }
  const length = r.hi - r.lo;
  let rz = 0;
  for (let i = 0; i < n; i++) rz = Math.max(rz, Math.abs(pos.getZ(i) - w.z));
  const k = radius / Math.max(rz, 1e-6);
  const seg = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i) - w.y;
    pos.setXYZ(i, (pos.getX(i) - w.x) * k, y / length, (pos.getZ(i) - w.z) * k);
    seg[i] = (pos.getY(i) - (r.lo - w.y) / length) / 1;
    const nx = nor.getX(i) / k;
    const ny = nor.getY(i) * length;
    const nz = nor.getZ(i) / k;
    const l = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(i, nx / l, ny / l, nz / l);
  }
  g.setAttribute('aSeg', new Float32BufferAttribute(seg, 1));
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

/** Keeps a cloned material in step with the shared library material while painted textures stream in. */
export function syncPainted(src: MeshPhysicalMaterial, dst: MeshPhysicalMaterial): boolean {
  if (dst.map === src.map && dst.normalMap === src.normalMap && dst.aoMap === src.aoMap) return false;
  dst.map = src.map;
  dst.normalMap = src.normalMap;
  dst.normalScale.copy(src.normalScale);
  dst.aoMap = src.aoMap;
  dst.roughnessMap = src.roughnessMap;
  dst.metalnessMap = src.metalnessMap;
  dst.roughness = src.roughness;
  dst.metalness = src.metalness;
  dst.vertexColors = src.vertexColors;
  dst.color.copy(src.color);
  dst.sheen = src.sheen;
  dst.clearcoat = src.clearcoat;
  dst.envMapIntensity = src.envMapIntensity;
  dst.needsUpdate = true;
  return true;
}
