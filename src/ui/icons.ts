const SVG_NS = 'http://www.w3.org/2000/svg';

/** Stroke icons drawn on a 24x24 grid. Paths are static literals; nothing user-supplied reaches innerHTML. */
const PATHS = {
  cube: 'M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5Zm0 0v9.5m0 0L3.5 7M12 12l8.5-5',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  rotate: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',
  isolate: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  hideOthers: 'M3 3l18 18M10.6 6.1A9.5 9.5 0 0 1 12 6c5 0 8.5 4.5 9.5 6a16 16 0 0 1-2.4 3M6.5 7.5A16 16 0 0 0 2.5 12c1 1.5 4.5 6 9.5 6 1.5 0 2.8-.4 4-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  reset: 'M4 4v6h6M4.5 15a8 8 0 1 0 1.6-8.4L4 10',
  camera: 'M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 9.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6Z',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5.5-4.5h.01',
  eye: 'M2.5 12C4 9 7.5 6 12 6s8 3 9.5 6c-1.5 3-5 6-9.5 6s-8-3-9.5-6Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18M10.6 6.1A9.5 9.5 0 0 1 12 6c4.5 0 8 3 9.5 6a15 15 0 0 1-2.6 3.4M6.5 7.5A15 15 0 0 0 2.5 12c1.5 3 5 6 9.5 6a9 9 0 0 0 3.5-.7M9.9 9.9a3 3 0 0 0 4.2 4.2',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  books: 'M5 3v18M10 3v18M14 5l5 14-2 1-5-14 2-1Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9.5v.01',
  chevron: 'm9 6 6 6-6 6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-2.5.1-.5-.1-.5 2-1.6-2-3.4-2.4 1a7 7 0 0 0-.9-.5L15.7 4h-4l-.4 2.5a7 7 0 0 0-.9.5l-2.4-1-2 3.4 2 1.6-.1.5.1.5-2 1.6 2 3.4 2.4-1c.3.2.6.4.9.5l.4 2.5h4l.4-2.5c.3-.1.6-.3.9-.5l2.4 1 2-3.4-2-1.6Z',
  compare: 'M8 4 3 9l5 5M3 9h13M16 20l5-5-5-5M21 15H8',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', PATHS[name]);
  svg.append(path);
  return svg;
}

/** Small colourful cell glyph for the list thumbnails. */
export function cellGlyph(kind: 'animal' | 'plant' | 'bacterium'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('aria-hidden', 'true');
  const add = (tag: string, attrs: Record<string, string>): void => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  };
  if (kind === 'plant') {
    add('rect', { x: '3', y: '6', width: '26', height: '20', rx: '6', fill: '#9bbf63', stroke: '#5b7f33', 'stroke-width': '1.6' });
    add('rect', { x: '8', y: '10', width: '9', height: '12', rx: '4.5', fill: '#7fb4d6' });
    add('circle', { cx: '22', cy: '14', r: '3.4', fill: '#7b5aa6' });
    add('ellipse', { cx: '21', cy: '21', rx: '3', ry: '1.8', fill: '#e08a3c' });
  } else if (kind === 'animal') {
    add('ellipse', { cx: '16', cy: '16', rx: '13', ry: '12', fill: '#f0b9a1', stroke: '#c98068', 'stroke-width': '1.6' });
    add('circle', { cx: '15', cy: '15', r: '5.2', fill: '#7b5aa6' });
    add('ellipse', { cx: '23', cy: '21', rx: '3', ry: '1.8', fill: '#e08a3c' });
    add('circle', { cx: '8', cy: '21', r: '2', fill: '#8fa83c' });
  } else {
    add('rect', { x: '2', y: '9', width: '28', height: '14', rx: '7', fill: '#d9c98c', stroke: '#9b8a4a', 'stroke-width': '1.6' });
    add('path', { d: 'M9 16c3-4 5 4 8 0s4 3 6 0', fill: 'none', stroke: '#8a5a9a', 'stroke-width': '2' });
    add('path', { d: 'M30 16c2 2 0 4 2 5', fill: 'none', stroke: '#7a7a3a', 'stroke-width': '1.2' });
  }
  return svg;
}
