export interface CellDims {
  ax: number;
  a: number;
  c: number;
}

/** Lobe semi-axis, lobe radius and lobe-centre offset from the cell channels (ext, neck, gap). */
export function cellDims(v: Float32Array, out: CellDims): CellDims {
  const neck = Math.min(1, Math.max(0, v[6] as number));
  const q = Math.sqrt(1 - neck * neck);
  out.ax = (v[4] as number) / (1 + q);
  out.a = v[5] as number;
  out.c = q * out.ax + (v[7] as number);
  return out;
}

/** Radius of the neck (narrowest circle) for the contractile ring. */
export function neckRadius(d: CellDims): number {
  const k = Math.min(1, d.c / d.ax);
  return d.a * Math.sqrt(Math.max(0, 1 - k * k)) * Math.pow(2, 0.2);
}
