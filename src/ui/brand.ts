/** The small cell mark used by the header and the home page. */
export function brandMark(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'brand-mark');
  svg.setAttribute('aria-hidden', 'true');
  const shapes: [string, Record<string, string>][] = [
    ['rect', { x: '3', y: '6', width: '38', height: '32', rx: '11', fill: '#b9d28a', stroke: '#5b7f33', 'stroke-width': '2' }],
    ['circle', { cx: '19', cy: '21', r: '8', fill: '#8a63b8' }],
    ['circle', { cx: '19', cy: '21', r: '3', fill: '#5f3a85' }],
    ['ellipse', { cx: '32', cy: '28', rx: '5', ry: '3', fill: '#e08a3c' }],
    ['circle', { cx: '30', cy: '14', r: '3', fill: '#7fb4d6' }],
  ];
  for (const [tag, attrs] of shapes) {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  }
  return svg;
}
