import { Vector3, type PerspectiveCamera } from 'three';
import { h } from '../core';
import type { CellScene } from './cellScene';

export interface LabelSpec {
  id: string;
  text: string;
  color: string;
}

export interface LabelAnchor {
  id: string;
  world: Vector3;
}

/** The floating toolbars sit along the bottom edge of the stage; labels stay above them. */
const TOOLBAR_CLEARANCE = 84;
const SVG_NS = 'http://www.w3.org/2000/svg';

interface Entry {
  id: string;
  el: HTMLDivElement;
  line: SVGLineElement;
  dot: SVGCircleElement;
}

/** HTML labels with SVG leader lines, anchored to 3D points and spread vertically so they do not overlap. */
export class LabelLayer {
  readonly root: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private entries: Entry[] = [];
  private enabled = false;
  private readonly tmp = new Vector3();
  private avoid: { x: number; y: number; r: number } | null = null;

  constructor(parent: HTMLElement) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'label-lines');
    this.svg.setAttribute('aria-hidden', 'true');
    this.root = h('div', { class: 'label-layer', 'aria-hidden': 'true' });
    this.root.append(this.svg);
    parent.append(this.root);
    this.root.hidden = true;
  }

  setSpecs(specs: LabelSpec[]): void {
    for (const e of this.entries) {
      e.el.remove();
      e.line.remove();
      e.dot.remove();
    }
    this.entries = specs.map((spec) => {
      const el = h('div', { class: 'leader-label' }, h('span', { class: 'swatch', style: `background:${spec.color}` }), spec.text);
      el.style.display = 'none';
      const line = document.createElementNS(SVG_NS, 'line');
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '3.2');
      this.svg.append(line, dot);
      this.root.append(el);
      return { id: spec.id, el, line, dot };
    });
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.hidden = !on;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Anchors every label of a cell scene (organelles and shell parts) and positions them. */
  updateFor(scene: CellScene, camera: PerspectiveCamera, width: number, height: number, selected?: { id: string; index: number | null }): void {
    if (!this.enabled) return;
    const anchors: LabelAnchor[] = [];
    for (const id of [...scene.sets.keys(), ...scene.cell.shellOrganelleIds]) {
      const world = scene.labelAnchor(id, camera.position, selected?.id === id ? selected.index : null);
      if (world) anchors.push({ id, world });
    }
    // Labels keep clear of the selected organelle: remember where it is on screen.
    this.avoid = null;
    const target = selected ? scene.focusTarget(selected.id, camera.position) : null;
    if (target) {
      const centre = target.center.clone().project(camera);
      const distance = target.center.distanceTo(camera.position);
      const pxPerUnit = height / 2 / (distance * Math.tan((camera.fov * Math.PI) / 360));
      this.avoid = { x: (centre.x * 0.5 + 0.5) * width, y: (-centre.y * 0.5 + 0.5) * height, r: target.radius * pxPerUnit * 1.1 };
    }
    this.update(anchors, camera, width, height);
  }

  /** Positions every label; anchors that are missing (hidden or clipped) hide their label. */
  update(anchors: LabelAnchor[], camera: PerspectiveCamera, width: number, height: number): void {
    if (!this.enabled) return;
    const placed: { entry: Entry; x: number; y: number; side: number }[] = [];
    for (const entry of this.entries) {
      const anchor = anchors.find((a) => a.id === entry.id);
      if (!anchor) {
        this.hide(entry);
        continue;
      }
      this.tmp.copy(anchor.world).project(camera);
      if (this.tmp.z > 1 || Math.abs(this.tmp.x) > 1.05 || Math.abs(this.tmp.y) > 1.05) {
        this.hide(entry);
        continue;
      }
      const x = (this.tmp.x * 0.5 + 0.5) * width;
      const y = (-this.tmp.y * 0.5 + 0.5) * height;
      placed.push({ entry, x, y, side: x < width / 2 ? -1 : 1 });
    }
    // Make the boxes measurable first (wrapped labels have different heights), then spread each side.
    for (const p of placed) p.entry.el.style.display = '';
    const sizes = new Map(placed.map((p) => [p.entry, { w: p.entry.el.offsetWidth || 120, h: p.entry.el.offsetHeight || 24 }]));
    for (const side of [-1, 1]) {
      const column = placed.filter((p) => p.side === side).sort((a, b) => a.y - b.y);
      const ys = column.map((p) => p.y);
      const half = (i: number): number => (sizes.get((column[i] as (typeof column)[number]).entry)?.h ?? 24) / 2;
      // Push down where boxes collide, then push back up if the column runs off the bottom edge.
      for (let i = 0; i < ys.length; i++) {
        const prev = i > 0 ? (ys[i - 1] as number) + half(i - 1) + half(i) + 4 : half(i) + 8;
        ys[i] = Math.max(ys[i] as number, prev);
      }
      for (let i = ys.length - 1; i >= 0; i--) {
        const next = i < ys.length - 1 ? (ys[i + 1] as number) - half(i + 1) - half(i) - 4 : height - half(i) - TOOLBAR_CLEARANCE;
        ys[i] = Math.min(ys[i] as number, next);
      }
      column.forEach((p, i) => this.show(p.entry, p.x, p.y, ys[i] as number, side, width, sizes.get(p.entry) as { w: number; h: number }));
    }
  }

  private hide(entry: Entry): void {
    entry.el.style.display = 'none';
    entry.line.setAttribute('visibility', 'hidden');
    entry.dot.setAttribute('visibility', 'hidden');
  }

  private show(entry: Entry, x: number, y: number, labelY: number, side: number, width: number, size: { w: number; h: number }): void {
    const { w, h } = size;
    // The box always stays inside the stage; right-hand labels start at lx, left-hand ones end at lx.
    const clamp = (v: number): number => (side < 0 ? Math.min(width - 8, Math.max(w + 8, v)) : Math.min(width - w - 8, Math.max(8, v)));
    let lx = clamp(side < 0 ? x - 60 : x + 60);
    const a = this.avoid;
    // Slide the label outward until its box no longer covers the selected organelle.
    for (let tries = 0; a && tries < 12; tries++) {
      const left = side < 0 ? lx - w : lx;
      const nx = Math.max(left, Math.min(a.x, left + w));
      const ny = Math.max(labelY - h / 2, Math.min(a.y, labelY + h / 2));
      if (Math.hypot(nx - a.x, ny - a.y) > a.r) break;
      lx = clamp(lx + side * 36);
    }
    entry.el.style.display = '';
    entry.el.style.transform = `translate(${side < 0 ? '-100%' : '0px'}, -50%) translate(${lx}px, ${labelY}px)`;
    entry.line.setAttribute('visibility', 'visible');
    entry.dot.setAttribute('visibility', 'visible');
    entry.line.setAttribute('x1', String(x));
    entry.line.setAttribute('y1', String(y));
    entry.line.setAttribute('x2', String(lx));
    entry.line.setAttribute('y2', String(labelY));
    entry.dot.setAttribute('cx', String(x));
    entry.dot.setAttribute('cy', String(y));
  }

  dispose(): void {
    this.root.remove();
    this.entries = [];
  }
}
