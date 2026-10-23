import {
  Catalog,
  Store,
  h,
  loadLevel,
  loadQualityMode,
  moduleHash,
  parseModuleRoute,
  parseParams,
  parseRoute,
  routeHash,
  saveLevel,
  saveQualityMode,
  saveQuestions,
  loadQuestions,
  parseQuestionsParam,
  toggleInSet,
  type AppState,
  type DataBundle,
  type QualityMode,
  type Route,
  type ViewMode,
} from '../core';
import type { CellTypeId, LevelId } from '../data/types';
import { findModule, homeModules, openableModules, UPCOMING } from '../modules';
import type { Stage, ViewState } from '../scene';
import { createShell, type UiActions } from '../ui';
import type { ModuleHost } from './moduleHost';

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

/** Composition root: wires the store, the lazily created 3D stages and the DOM shell together. */
export async function startApp(opts: AppOptions): Promise<void> {
  const params = parseParams(opts.search, opts.hash);
  const catalog = new Catalog(opts.data);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const demo = import.meta.env.DEV || new URLSearchParams(opts.search).has('demo');

  const initialCell = catalog.cellById.has(params.cell) ? params.cell : (opts.data.cells[0]?.id ?? 'plant');
  // The level comes from the URL, else from the learner's last choice (remembered), else Temel; a cell may only offer İleri.
  const wanted: LevelId = new URLSearchParams(opts.search).has('level') ? params.level : (loadLevel() ?? params.level);
  const initialLevel = params.route !== 'explore' || catalog.cell(initialCell).levels.includes(wanted) ? wanted : (catalog.cell(initialCell).levels[0] ?? 'temel');
  // `?quality=` pins a preset; otherwise the saved menu choice, otherwise the adaptive default.
  const qualityMode: QualityMode = params.qualityFixed ? params.quality : (loadQualityMode() ?? 'auto');
  const store = new Store({
    route: params.route,
    moduleId: params.route === 'explore' ? 'cell' : (parseModuleRoute(opts.hash)?.id ?? 'cell'),
    cellId: initialCell,
    level: initialLevel,
    selectedId: null,
    infoOpen: false,
    hidden: new Set(),
    viewMode: 'cutaway',
    hideOthers: false,
    cutPosition: 0.4,
    labels: false,
    autoRotate: false,
    compareOn: false,
    compareCellId: defaultCompareCell(initialCell),
    qualityMode,
    questionsOn: parseQuestionsParam(opts.search) ?? loadQuestions() ?? true,
  });

  let stage: Stage | null = null;
  let stagePromise: Promise<Stage | null> | null = null;
  let insets: [number, number] = [0, 0];
  const handle: { stage: Stage | null; store: Store; catalog: Catalog } = { stage: null, store, catalog };
  // Dev / ?perf handle for the console and the Playwright tests.
  if (params.perf || import.meta.env.DEV) (window as unknown as { __bilim: unknown }).__bilim = handle;

  const writeUrl = (state: AppState): void => {
    const q = new URLSearchParams(location.search);
    q.set('level', state.level);
    if (state.route === 'explore') q.set('cell', state.cellId);
    else q.delete('cell');
    // Deep links (a bibliography entry, a module and its track) keep their own hash.
    const keep = (state.route === 'kaynakca' && location.hash.startsWith('#/kaynakca/')) || state.route === 'modul';
    const hash = keep ? location.hash : routeHash(state.route);
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

  const openModule = (id: string): void => {
    const target = id === 'cell' ? routeHash('explore') : moduleHash(id);
    if (location.hash === target) store.patch({ route: parseRoute(target), moduleId: id });
    else location.hash = target;
  };

  const actions: UiActions = {
    selectCell(id) {
      const s = store.get();
      if (id === s.cellId) return;
      const cell = catalog.cell(id);
      store.patch({
        cellId: id,
        level: cell.levels.includes(s.level) ? s.level : (cell.levels[0] ?? s.level),
        selectedId: null,
        infoOpen: false,
        hidden: new Set(),
        hideOthers: false,
        viewMode: s.viewMode === 'isolate' ? 'full' : s.viewMode,
        compareCellId: s.compareCellId === id ? defaultCompareCell(id) : s.compareCellId,
      });
    },
    setLevel(level: LevelId) {
      const s = store.get();
      if (s.route === 'explore' && !catalog.cell(s.cellId).levels.includes(level)) return;
      saveLevel(level);
      const selected = s.selectedId ? catalog.organelleById.get(s.selectedId) : undefined;
      const keep = !selected || catalog.availableAt(selected, level);
      store.patch({ level, selectedId: keep ? s.selectedId : null, infoOpen: keep ? s.infoOpen : false, viewMode: keep || s.viewMode !== 'isolate' ? s.viewMode : 'full' });
    },
    selectOrganelle(id) {
      const s = store.get();
      const next = id === s.selectedId ? null : id;
      store.patch({
        selectedId: next,
        infoOpen: next !== null,
        hideOthers: next ? s.hideOthers : false,
        viewMode: next === null && s.viewMode === 'isolate' ? 'full' : s.viewMode,
        hidden: next && s.hidden.has(next) ? toggleInSet(s.hidden, next) : s.hidden,
      });
    },
    openInfo: () => store.patch({ infoOpen: true }),
    closeInfo: () => store.patch({ infoOpen: false }),
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
    setQuestions: (on) => { saveQuestions(on); store.patch({ questionsOn: on }); },
    navigate(route: Route) {
      if (location.hash !== routeHash(route)) location.hash = routeHash(route);
      store.patch({ route });
    },
    openModule,
  };

  const entries = openableModules({ demo });
  const released = new Set(homeModules().map((m) => m.id));
  const shell = createShell(opts.root, {
    catalog,
    actions,
    baseUrl: opts.baseUrl,
    qualityLocked: params.qualityFixed,
    reducedMotion,
    // The test module is only reachable by address; every other registered module is a card (previews only with ?demo).
    modules: entries.filter((e) => e.id !== '__demo').map((e) => ({ id: e.id, nameTr: e.nameTr, tagline: e.tagline, levels: e.levels, preview: !released.has(e.id) })),
    upcoming: UPCOMING.filter((u) => !entries.some((e) => e.id === u.id)).map((u) => ({ ...u })),
  });
  shell.onInsets((left, right) => {
    insets = [left, right];
    stage?.setOverlayInsets(left, right);
  });

  // The cell explorer's stage is created the first time its screen is shown (the home page needs no 3D at all).
  const ensureStage = (): Promise<Stage | null> => {
    stagePromise ??= (async () => {
      try {
        const { Stage: StageClass } = await import('../scene');
        const created = new StageClass({
          container: shell.viewport,
          baseUrl: opts.baseUrl,
          quality: qualityMode === 'auto' ? 'medium' : qualityMode,
          reducedMotion,
          autoQuality: qualityMode === 'auto',
          data: { cell: (id) => catalog.cell(id), organelles: catalog.organelleById },
        });
        created.setOverlayInsets(insets[0], insets[1]);
        created.on({
          select: (id) =>
            store.patch({ selectedId: id, infoOpen: id !== null, hideOthers: id ? store.get().hideOthers : false, viewMode: id === null && store.get().viewMode === 'isolate' ? 'full' : store.get().viewMode }),
          loading: (f) => shell.setLoading(f),
          fallback: () => shell.toast('Bazı modeller yüklenemedi; basit şekiller gösteriliyor.'),
          connection: (lost) => shell.setStageStatus(lost ? 'Grafik bağlantısı kesildi, yeniden bağlanıyor…' : null),
          stats: (st) => {
            if (params.perf) shell.setPerfText(`FPS ${st.fps.toFixed(0)}  ${st.frameMs.toFixed(1)} ms [${st.quality}]\ncalls ${st.drawCalls}  tris ${st.triangles}\ngeom ${st.geometries}  tex ${st.textures}`);
          },
        });
        stage = created;
        handle.stage = created;
        if (params.perf) shell.setPerfText('FPS …');
        return created;
      } catch (error) {
        console.warn('WebGL unavailable', error);
        shell.viewport.append(h('p', { class: 'empty-note', style: 'padding:120px 40px' }, 'Bu tarayıcı 3B grafikleri (WebGL) çalıştıramıyor. Lütfen güncel bir tarayıcı dene.'));
        return null;
      }
    })();
    return stagePromise;
  };

  // Animated modules (`#/modul/<id>[/<track>]`); the module code and the 3D engine are fetched when one is opened.
  let hostPromise: Promise<ModuleHost> | null = null;
  const ensureHost = (): Promise<ModuleHost> => {
    hostPromise ??= import('./moduleHost').then(({ ModuleHost: HostClass }) => {
      const host = new HostClass({
        view: shell.moduleView,
        baseUrl: opts.baseUrl,
        quality: () => (qualityMode === 'auto' ? 'medium' : qualityMode),
        reducedMotion,
        toast: (text) => shell.toast(text),
        navigateTrack: (id, track) => {
          location.hash = moduleHash(id, track);
        },
      });
      (window as unknown as { __bilimModules?: ModuleHost }).__bilimModules = host;
      return host;
    });
    return hostPromise;
  };
  const syncModule = (state: AppState): void => {
    if (state.route !== 'modul') {
      if (hostPromise) void hostPromise.then((host) => host.close());
      return;
    }
    const route = parseModuleRoute(location.hash);
    const entry = route ? findModule(route.id, { demo }) : null;
    if (!route || !entry?.definition) {
      shell.toast('Bu modül bulunamadı.');
      location.hash = routeHash('home');
      return;
    }
    void ensureHost().then((host) => { host.setQuestions(state.questionsOn); return host.open(entry, route.track, state.level); }).catch((error: unknown) => console.error(error));
  };

  // Keeps what the explorer stage shows in step with the store; cell and compare changes load asynchronously.
  let stageCell: CellTypeId | null = null;
  let stageCompare: CellTypeId | null = null;
  const sync = async (state: AppState): Promise<void> => {
    if (state.route !== 'explore') return;
    const s = stage ?? (await ensureStage());
    if (!s) return;
    if (state.cellId !== stageCell) {
      stageCell = state.cellId;
      await s.setCell(state.cellId);
    }
    const wantCompare = state.compareOn ? state.compareCellId : null;
    if (wantCompare !== stageCompare) {
      stageCompare = wantCompare;
      await s.setCompare(wantCompare);
    }
    s.apply(viewOf(store.get()));
    document.body.dataset.ready = 'true';
  };

  const routeModuleId = (route: Route): string | undefined => (route === 'explore' ? 'cell' : route === 'modul' ? parseModuleRoute(location.hash)?.id : undefined);

  store.subscribe((state, prev) => {
    shell.update(state);
    if (state.cellId !== prev.cellId || state.level !== prev.level || state.route !== prev.route) writeUrl(state);
    if (state.route === 'modul' || prev.route === 'modul') syncModule(state);
    void sync(state);
    if (state.route !== 'explore' && state.route !== 'modul') document.body.dataset.ready = 'true';
  });
  window.addEventListener('hashchange', () => {
    const route = parseRoute(location.hash);
    const moduleId = routeModuleId(route);
    store.patch(moduleId ? { route, moduleId } : { route });
    // A track change keeps the route 'modul' but must reopen the module.
    if (route === 'modul') syncModule(store.get());
  });

  shell.update(store.get());
  writeUrl(store.get());
  syncModule(store.get());
  await sync(store.get());
  if (store.get().route !== 'explore') document.body.dataset.ready = 'true';
}
