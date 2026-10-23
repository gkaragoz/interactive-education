// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Catalog, escapeHtml, h, safeUrl, Store, type AppState } from '../src/core';
import { createInfoCard, renderBibliography, type UiActions } from '../src/ui';
import { bundle } from './fixtures/data';

const PAYLOAD = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script>';

const noActions = new Proxy({}, { get: () => () => undefined }) as UiActions;

describe('escaping', () => {
  it('escapeHtml neutralises markup characters', () => {
    expect(escapeHtml(PAYLOAD)).not.toContain('<');
    expect(escapeHtml(`a & "b" 'c'`)).toBe('a &amp; &quot;b&quot; &#39;c&#39;');
  });

  it('h() puts strings in as text nodes, never as HTML', () => {
    const el = h('p', {}, PAYLOAD);
    expect(el.children).toHaveLength(0);
    expect(el.textContent).toBe(PAYLOAD);
  });

  it('safeUrl only allows http(s)', () => {
    expect(safeUrl('https://commons.wikimedia.org/wiki/File:A.jpg')).toContain('https://');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
  });

  it('the bibliography renders hostile titles as text and drops unsafe links', () => {
    const evil = {
      ...bundle,
      sources: [{ ...bundle.sources[0]!, id: 'evil', title: PAYLOAD, url: 'javascript:alert(1)', publisher: PAYLOAD }, ...bundle.sources.slice(1)],
    };
    const page = renderBibliography({ catalog: new Catalog(evil), actions: noActions, baseUrl: './', qualityLocked: false });
    expect(page.querySelector('img[src="x"]')).toBeNull();
    expect(page.querySelector('script')).toBeNull();
    expect(page.textContent).toContain(PAYLOAD);
    for (const a of page.querySelectorAll('a')) expect(a.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
  });

  it('the info card renders hostile organelle text as text', () => {
    const evil = {
      ...bundle,
      organelles: bundle.organelles.map((o) => (o.id === 'nucleus' ? { ...o, nameTr: PAYLOAD, tagline: PAYLOAD, funFact: PAYLOAD } : o)),
    };
    const catalog = new Catalog(evil);
    const card = createInfoCard({ catalog, actions: noActions, baseUrl: './', qualityLocked: false });
    const state: AppState = {
      route: 'explore', cellId: 'plant', level: 'temel', selectedId: 'nucleus', hidden: new Set(), viewMode: 'full', hideOthers: false,
      cutPosition: 0.4, labels: false, autoRotate: false, compareOn: false, compareCellId: 'animal', qualityMode: 'auto',
    };
    card.update(state);
    expect(card.el.querySelector('img')).toBeNull();
    expect(card.el.querySelector('script')).toBeNull();
    expect(card.el.textContent).toContain(PAYLOAD);
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });
});

describe('Store', () => {
  const base: AppState = {
    route: 'explore', cellId: 'plant', level: 'temel', selectedId: null, hidden: new Set(), viewMode: 'full', hideOthers: false,
    cutPosition: 0.4, labels: false, autoRotate: false, compareOn: false, compareCellId: 'animal', qualityMode: 'auto',
  };

  it('notifies on change only', () => {
    const store = new Store(base);
    let calls = 0;
    store.subscribe(() => calls++);
    store.patch({ level: 'temel' });
    expect(calls).toBe(0);
    store.patch({ level: 'ileri' });
    expect(calls).toBe(1);
    expect(store.get().level).toBe('ileri');
  });

  it('unsubscribes', () => {
    const store = new Store(base);
    let calls = 0;
    const off = store.subscribe(() => calls++);
    off();
    store.patch({ labels: true });
    expect(calls).toBe(0);
  });
});
