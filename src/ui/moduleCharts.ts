import { chartValueAt, h } from '../core';
import type { ChartSeries, PhaseInfo } from '../data/moduleTypes';

const NS = 'http://www.w3.org/2000/svg';
const W = 420;
const H = 70;
const SAMPLES = 80;

export interface ChartStrip {
  el: HTMLElement;
  /** Moves the playhead and the value read-outs; `values` overrides the phase-interpolated numbers (scene `chartAt`). */
  update(time: number, values: Record<string, number>): void;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** One small chart per series, drawn from the phase points, with a shared playhead and a numeric read-out. */
export function createChartStrip(allCharts: readonly ChartSeries[], phases: readonly PhaseInfo[], duration: number): ChartStrip {
  // Only series this track actually uses (named in some phase's chartPoints); scene-only series (no points anywhere) all stay.
  const anyPoints = phases.some((p) => p.chartPoints && Object.keys(p.chartPoints).length > 0);
  const charts = anyPoints ? allCharts.filter((c) => phases.some((p) => p.chartPoints && c.id in p.chartPoints)) : allCharts;
  const el = h('div', { class: 'chart-strip', role: 'group', 'aria-label': 'Grafikler' });
  const heads: SVGLineElement[] = [];
  const readouts = new Map<string, HTMLElement>();
  const dots: SVGCircleElement[] = [];
  const y = (c: ChartSeries, v: number): number => H - 8 - ((v - c.min) / Math.max(c.max - c.min, 1e-9)) * (H - 16);
  for (const c of charts) {
    const points = Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const t = (i / SAMPLES) * duration;
      return `${((i / SAMPLES) * W).toFixed(1)},${y(c, chartValueAt(c, phases, t)).toFixed(1)}`;
    }).join(' ');
    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
    chart.append(svg('line', { x1: '0', y1: String(H - 8), x2: String(W), y2: String(H - 8), class: 'axis' }));
    for (const p of phases) chart.append(svg('line', { x1: String((p.start / duration) * W), y1: '4', x2: String((p.start / duration) * W), y2: String(H - 8), class: 'phase-tick' }));
    chart.append(svg('polyline', { points, fill: 'none', stroke: c.color, 'stroke-width': '2.6', 'stroke-linejoin': 'round' }));
    const head = svg('line', { x1: '0', y1: '2', x2: '0', y2: String(H - 6), class: 'playhead' });
    const dot = svg('circle', { r: '4.2', cx: '0', cy: '0', fill: c.color, stroke: '#fff', 'stroke-width': '1.5' });
    chart.append(head, dot);
    heads.push(head);
    dots.push(dot);
    const value = h('b', {}, '0');
    readouts.set(c.id, value);
    el.append(h('figure', { class: 'chart-fig' }, h('figcaption', {}, h('span', { class: 'sw', style: `background:${c.color}` }), `${c.labelTr} `, value, ` ${c.unitTr}`), chart));
  }
  return {
    el,
    update(time, values): void {
      const x = Math.min(Math.max(time / duration, 0), 1) * W;
      charts.forEach((c, i) => {
        const v = values[c.id] ?? c.min;
        heads[i]?.setAttribute('x1', x.toFixed(1));
        heads[i]?.setAttribute('x2', x.toFixed(1));
        dots[i]?.setAttribute('cx', x.toFixed(1));
        dots[i]?.setAttribute('cy', y(c, v).toFixed(1));
        const out = readouts.get(c.id);
        if (out) out.textContent = Number.isInteger(v) ? String(v) : v.toFixed(2);
      });
    },
  };
}
