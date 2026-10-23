import { Catalog, Store, h, loadQualityMode, saveQualityMode, type QualityMode, parseParams, parseRoute, routeHash, toggleInSet, type AppState, type DataBundle, type Route, type ViewMode } from '../core';
import type { CellTypeId, LevelId } from '../data/types';
import { Stage, type ViewState } from '../scene';
import { createShell, type UiActions } from '../ui';

export interface AppOptions {
  root: HTMLElement;
  data: DataBundle;
  baseUrl: string;
  search: string;
  hash: string;
}

const CELL_ORDER: CellTypeId[] = ['animal', 'plant', 'bacterium'];

/** Another cell type to compare with: the first one that is not the current cell. */
export function defaultCompareCell(cellId: CellTypeId): CellTypeId {
  return CELL_ORDER.find((c) => c !== cellId) ?? 'animal';
}

/** Composition root: wires the store, the 3D stage and the DOM shell together. */
export async function startApp(opts: AppOptions): Promise<void> {
  const params = parseParams(opts.search, opts.hash);
  const catalog = new Catalog(opts.data);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const initialCell = catalog.cellById.has(params.cell) ? params.cell : (opts.data.cells[0]?.id ?? 'plant');
  const initialLevel = catalog.cell(initialCell).levels.includes(params.level) ? params.level : (catalog.cell(initialCell).levels[0] ?? 'temel');
  // `?quality=` pins a preset; otherwise the saved menu choice, otherwise the adaptive default.
  const qualityMode: QualityMode = params.qualityFixed ? params.quality : (loadQualityMode() ?? 'auto');
  const store = new Store({
    route: params.route,
    cellId: initialCell,
    level: initialLevel,
    selectedId: null,
    hidden: new Set(),
    viewMode: 'cutaway',
    hideOthers: false,
    cutPosition: 0.4,
    labels: false,
    autoRotate: false,
    compareOn: false,
    compareCellId: defaultCompareCell(initialCell),
    qualityMode,
  });

  let stage: Stage | null = null;

  const writeUrl = (state: AppState): void => {
    const q = new URLSearchParams(location.search);
    q.set('cell', state.cellId);
    q.set('level', state.level);
    const hash = location.hash.startsWith('#/kaynakca/') && state.route === 'kaynakca' ? location.hash : routeHash(state.route);
    // URLSearchParams writes a bare flag (?perf) as perf=; keep the URL as the user typed it.
    const query = q.toString().replace(/(^|&)(\w+)=(?=&|$)/g, '$1$2');
    history.replaceState(null, '', `${location.pathname}?${query}${hash}`);
  };

  const levelHidden = (state: AppState): string[] =>
    catalog.organelleIdsOf(catalog.cell(state.cellId)).filter((id) => {
      const info = catalog.organelleById.get(id);
      return info ? !catalog.availableAt(info, state.level) : false;
    });

  const viewOf = (s: AppState): ViewState => ({
    selectedId: s.selectedId,
    hidden: new Set([...s.hidden, ...levelHidden(s)]),
    viewMode: s.viewMode,
    hideOthers: s.hideOthers,
    cutPosition: s.cutPosition,
    labels: s.labels,
    autoRotate: s.autoRotate,
  });

  const actions: UiActions = {
    selectCell(id) {
      const s = store.get();
      if (id === s.cellId) return;
      const cell = catalog.cell(id);
      store.patch({
        cellId: id,
        level: cell.levels.includes(s.level) ? s.level : (cell.levels[0] ?? s.level),
        selectedId: null,
        hidden: new Set(),
        hideOthers: false,
        viewMode: s.viewMode === 'isolate' ? 'full' : s.viewMode,
        compareCellId: s.compareCellId === id ? defaultCompareCell(id) : s.compareCellId,
      });
    },
    setLevel(level: LevelId) {
      const s = store.get();
      if (!catalog.cell(s.cellId).levels.includes(level)) return;
      const selected = s.selectedId ? catalog.organelleById.get(s.selectedId) : undefined;
      const keep = !selected || catalog.availableAt(selected, level);
      store.patch({ level, selectedId: keep ? s.selectedId : null, viewMode: keep || s.viewMode !== 'isolate' ? s.viewMode : 'full' });
    },
    selectOrganelle(id) {
      const s = store.get();
      const next = id === s.selectedId ? null : id;
      store.patch({
        selectedId: next,
        hideOthers: next ? s.hideOthers : false,
        viewMode: next === null && s.viewMode === 'isolate' ? 'full' : s.viewMode,
        hidden: next && s.hidden.has(next) ? toggleInSet(s.hidden, next) : s.hidden,
      });
    },
    toggleHidden(id) {
      const s = store.get();
      store.patch({ hidden: toggleInSet(s.hidden, id) });
    },
    setViewMode(mode: ViewMode) {
      const s = store.get();
      if (mode === 'isolate' && !s.selectedId) return;
      store.patch({ viewMode: mode, cutPosition: mode === 'cutaway' && s.cutPosition < 0.02 ? 0.4 : s.cutPosition });
    },
    setCut: (cutPosition) => store.patch({ cutPosition }),
    toggleHideOthers: () => store.patch({ hideOthers: !store.get().hideOthers && store.get().selectedId !== null }),
    toggleAutoRotate: () => store.patch({ autoRotate: !store.get().autoRotate }),
    toggleLabels: () => store.patch({ labels: !store.get().labels }),
    resetView: () => stage?.resetView(),
    screenshot() {
      void stage?.screenshot().then((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = h('a', { href: url, download: `bilim-atolyesi-${store.get().cellId}.png` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });
    },
    setCompare: (on) => store.patch({ compareOn: on }),
    setCompareCell: (id) => store.patch({ compareCellId: id }),
    setQualityMode(mode) {
      if (params.qualityFixed) return;
      saveQualityMode(mode);
      store.patch({ qualityMode: mode });
      stage?.setQualityMode(mode);
    },
    navigate(route: Route) {
      if (location.hash !== routeHash(route)) location.hash = routeHash(route);
      store.patch({ route });
    },
  };

  const shell = createShell(opts.root, { catalog, actions, baseUrl: opts.baseUrl, qualityLocked: params.qualityFixed });

  try {
    stage = new Stage({
      container: shell.viewport,
      baseUrl: opts.baseUrl,
      quality: qualityMode === 'auto' ? 'medium' : qualityMode,
      reducedMotion,
      autoQuality: qualityMode === 'auto',
      data: { cell: (id) => catalog.cell(id), organelles: catalog.organelleById },
    });
  } catch (error) {
    console.warn('WebGL unavailable', error);
    shell.viewport.append(h('p', { class: 'empty-note', style: 'padding:120px 40px' }, 'Bu tarayıcı 3B grafikleri (WebGL) çalıştıramıyor. Lütfen güncel bir tarayıcı dene.'));
  }

  // Dev / ?perf handle for the console and the Playwright tests.
  if (params.perf || import.meta.env.DEV) (window as unknown as { __bilim: unknown }).__bilim = { stage, store, catalog };
  stage?.on({
    select: (id) => store.patch({ selectedId: id, hideOthers: id ? store.get().hideOthers : false, viewMode: id === null && store.get().viewMode === 'isolate' ? 'full' : store.get().viewMode }),
    loading: (f) => shell.setLoading(f),
    fallback: () => shell.toast('Bazı modeller yüklenemedi; basit şekiller gösteriliyor.'),
    connection: (lost) => shell.setStageStatus(lost ? 'Grafik bağlantısı kesildi, yeniden bağlanıyor…' : null),
    stats: (st) => {
      if (params.perf) shell.setPerfText(`FPS ${st.fps.toFixed(0)}  ${st.frameMs.toFixed(1)} ms [${st.quality}]\ncalls ${st.drawCalls}  tris ${st.triangles}\ngeom ${st.geometries}  tex ${st.textures}`);
    },
  });
  if (params.perf) shell.setPerfText('FPS …');

  // Keeps what the stage shows in step with the store; cell and compare changes load asynchronously.
  let stageCell: CellTypeId | null = null;
  let stageCompare: CellTypeId | null = null;
  const sync = async (state: AppState): Promise<void> => {
    if (!stage) return;
    if (state.cellId !== stageCell) {
      stageCell = state.cellId;
      await stage.setCell(state.cellId);
    }
    const wantCompare = state.compareOn ? state.compareCellId : null;
    if (wantCompare !== stageCompare) {
      stageCompare = wantCompare;
      await stage.setCompare(wantCompare);
    }
    stage.apply(viewOf(store.get()));
    document.body.dataset.ready = 'true';
  };

  store.subscribe((state, prev) => {
    shell.update(state);
    if (state.cellId !== prev.cellId || state.level !== prev.level || state.route !== prev.route) writeUrl(state);
    void sync(state);
  });
  window.addEventListener('hashchange', () => store.patch({ route: parseRoute(location.hash) }));

  shell.update(store.get());
  writeUrl(store.get());
  await sync(store.get());
}
