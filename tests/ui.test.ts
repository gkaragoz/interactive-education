// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Catalog, loadQualityMode, saveQualityMode, type AppState } from '../src/core';
import { createInfoCard, createSettingsMenu, createMicroscopePanel, renderAbout, renderBibliography, type UiActions } from '../src/ui';
import { licenseLabel } from '../src/ui/types';
import { bundle } from './fixtures/data';

const calls: string[] = [];
const actions = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => calls.push(`${name}:${args.join(',')}`) }) as UiActions;
const state = (patch: Partial<AppState> = {}): AppState => ({
  route: 'explore', cellId: 'plant', level: 'temel', selectedId: 'nucleus', hidden: new Set(), viewMode: 'cutaway', hideOthers: false,
  cutPosition: 0.4, labels: false, autoRotate: false, compareOn: false, compareCellId: 'animal', qualityMode: 'auto', ...patch,
});
const ctx = (catalog = new Catalog(bundle), qualityLocked = false) => ({ catalog, actions, baseUrl: './', qualityLocked, reducedMotion: true });

describe('license labels', () => {
  it('spells out public-domain licenses and leaves the data alone', () => {
    expect(licenseLabel('PD')).toBe('Kamu malı (PD)');
    expect(licenseLabel('CC0')).toBe('CC0 (kamu malı)');
    expect(licenseLabel('CC BY-SA 4.0')).toBe('CC BY-SA 4.0');
    expect(licenseLabel('PD-old-70')).toBe('PD-old-70');
  });

  it('the bibliography shows them and carries the OpenStax note', () => {
    const data = { ...bundle, sources: bundle.sources.map((s) => (s.id === 'cm-test' ? { ...s, license: 'PD' } : s)) };
    const page = renderBibliography(ctx(new Catalog(data)));
    expect(page.textContent).toContain('Kamu malı (PD)');
    expect(page.textContent).toContain('OpenStax Biology 2e (CC BY-NC-SA 4.0) yalnızca bilgi doğrulamak için kullanıldı; metin ve şekil kopyalanmadı.');
    expect(page.querySelector('a[href="https://openstax.org/books/biology-2e/pages/1-introduction"]')).not.toBeNull();
  });
});

describe('info card levels', () => {
  const card = createInfoCard(ctx());
  it('hides the fun fact at Temel and shows it at İleri', () => {
    card.update(state());
    expect(card.el.textContent).not.toContain('İlginç bilgi');
    expect(card.el.textContent).toContain('Boyut');
    card.update(state({ level: 'ileri' }));
    expect(card.el.textContent).toContain('İlginç bilgi');
  });
});

describe('about page', () => {
  it('names both levels with their grades and ties İleri to BİY.9.2.1', () => {
    const text = renderAbout(ctx()).textContent ?? '';
    expect(text).toContain('Temel (5–8. sınıf)');
    expect(text).toContain('İleri (9–12. sınıf)');
    expect(text).toContain('BİY.9.2.1');
    expect(text).toContain('ön bilgisini');
  });
});

describe('microscope gallery', () => {
  const many = {
    ...bundle,
    micrographs: Array.from({ length: 6 }, (_, i) => ({ ...bundle.micrographs[0]!, id: `mg-${i}`, titleTr: `Görsel ${i + 1}` })),
    cells: bundle.cells.map((c) => (c.id === 'plant' ? { ...c, micrographIds: ['mg-0', 'mg-1', 'mg-2', 'mg-3', 'mg-4', 'mg-5'] } : c)),
  };

  it('shows three tiles plus a +N tile that opens a gallery with next and previous', () => {
    const panel = createMicroscopePanel(ctx(new Catalog(many)));
    panel.update(state());
    expect(panel.el.querySelectorAll('.micro-btn')).toHaveLength(4);
    const more = panel.el.querySelector<HTMLButtonElement>('.micro-more');
    expect(more?.textContent).toContain('+3');
    (HTMLDialogElement.prototype as { showModal?: () => void }).showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
    more?.click();
    const counter = panel.el.querySelector('.gallery-count');
    expect(counter?.textContent).toBe('4 / 6');
    panel.el.querySelector<HTMLButtonElement>('button[aria-label="Sonraki görsel"]')?.click();
    expect(counter?.textContent).toBe('5 / 6');
    panel.el.querySelector<HTMLButtonElement>('button[aria-label="Önceki görsel"]')?.click();
    panel.el.querySelector<HTMLButtonElement>('button[aria-label="Önceki görsel"]')?.click();
    expect(counter?.textContent).toBe('3 / 6');
  });

  it('shows every tile when there are four or fewer', () => {
    const panel = createMicroscopePanel(ctx());
    panel.update(state());
    expect(panel.el.querySelector('.micro-more')).toBeNull();
  });
});

describe('quality menu', () => {
  it('lists four choices, reports the pick and locks when the URL pins a preset', () => {
    const menu = createSettingsMenu(ctx());
    menu.update(state({ qualityMode: 'medium' }));
    const radios = [...menu.el.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.map((r) => r.value)).toEqual(['auto', 'low', 'medium', 'high']);
    expect(radios.find((r) => r.checked)?.value).toBe('medium');
    calls.length = 0;
    radios[1]!.dispatchEvent(new Event('change'));
    expect(calls).toContain('setQualityMode:low');
    const locked = createSettingsMenu(ctx(new Catalog(bundle), true));
    locked.update(state());
    expect(locked.el.querySelector<HTMLInputElement>('input')?.disabled).toBe(true);
  });

  it('persists the choice and survives blocked storage', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(loadQualityMode(storage)).toBeNull();
    saveQualityMode('high', storage);
    expect(loadQualityMode(storage)).toBe('high');
    mem.set('bilim.qualityMode', 'ultra');
    expect(loadQualityMode(storage)).toBeNull();
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadQualityMode(blocked)).toBeNull();
    expect(() => saveQualityMode('low', blocked)).not.toThrow();
  });
});
