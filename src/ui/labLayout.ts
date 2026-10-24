/**
 * Compact mode and the safe area for a floating-panel screen. Narrow or short stages (under about 1450 x 740 px) get the
 * `compact` class and the callback; every visible panel counts as an obstacle (wide ones block the top or bottom, tall
 * ones a side) and the insets go to `onInsets`, so the 3D picture is centred in the free area. Returns the cleanup.
 */
export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type PanelRef = HTMLElement | (() => HTMLElement | null);

export function watchLayout(root: HTMLElement, wrap: HTMLElement, panelRefs: PanelRef[], onInsets: ((i: Insets) => void) | undefined, onCompact: (compact: boolean) => void): () => void {
  let queued = false;
  const doMeasure = (): void => {
    queued = false;
    const w = wrap.getBoundingClientRect();
    if (w.width < 10) return;
    const panels = panelRefs.map((p) => (typeof p === 'function' ? p() : p)).filter((p): p is HTMLElement => p !== null);
    // CSS needs the height of the top bar (the first panel) to place overlay drawers below it
    const first = panels[0];
    if (first) wrap.style.setProperty('--lab-top', `${first.offsetHeight}px`);
    const compact = w.width < 1450 || w.height < 740;
    if (root.classList.contains('compact') !== compact) {
      root.classList.toggle('compact', compact);
      onCompact(compact);
    }
    const ins: Insets = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const el of panels) {
      if (el.hidden || el.closest('[hidden]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cx = (r.left + r.right) / 2 - w.left;
      const cy = (r.top + r.bottom) / 2 - w.top;
      const vertical = r.width > w.width * 0.5 || r.height < w.height * 0.16;
      if (vertical) {
        if (cy < w.height / 2) ins.top = Math.max(ins.top, r.bottom - w.top + 6);
        else ins.bottom = Math.max(ins.bottom, w.bottom - r.top + 6);
      } else if (cx < w.width / 2) ins.left = Math.max(ins.left, r.right - w.left + 8);
      else ins.right = Math.max(ins.right, w.right - r.left + 8);
    }
    onInsets?.({ left: Math.min(ins.left, w.width * 0.4), right: Math.min(ins.right, w.width * 0.4), top: Math.min(ins.top, w.height * 0.4), bottom: Math.min(ins.bottom, w.height * 0.4) });
  };
  const measure = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(doMeasure);
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
  for (const el of [wrap, ...panelRefs]) if (typeof el !== 'function') ro?.observe(el);
  wrap.addEventListener('transitionend', measure);
  measure();
  return () => ro?.disconnect();
}
