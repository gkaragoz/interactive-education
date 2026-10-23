import { Float32BufferAttribute, type BufferGeometry } from 'three';

/**
 * Bakes soft ambient-occlusion-like shading into an outline mesh that is viewed from the inside: the floor is light,
 * the sides darken toward the rim, with a slow mottling, so the cut cell shows a cytoplasm bed rather than a flat colour.
 */
export function shadeBowl(geometry: BufferGeometry): BufferGeometry {
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const up = -nor.getY(i); // outward normal pointing down = inner floor
    const floor = Math.max(0, up) ** 0.7;
    const mottle = 0.5 + 0.5 * Math.sin(pos.getX(i) * 0.9 + 1.3) * Math.sin(pos.getZ(i) * 0.8 + 0.4) * Math.sin(pos.getY(i) * 1.1);
    const shade = 0.5 + 0.5 * floor + 0.1 * (mottle - 0.5);
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}
