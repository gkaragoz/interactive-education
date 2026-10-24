import { moduleHash, parseModuleRoute, routeHash, type AppState, type QualityName } from '../core';
import { findModule } from '../modules';
import type { Shell } from '../ui';
import type { ModuleHost } from './moduleHost';
import type { SimHost } from './simHost';

export interface ModuleRoutingDeps {
  shell: Shell;
  baseUrl: string;
  quality: () => QualityName;
  reducedMotion: boolean;
  demo: boolean;
}

/**
 * Keeps the open module in step with the route: timeline modules go to `ModuleHost`, interactive sims (the chemistry lab)
 * to `SimHost`. Both are lazy chunks; the one that is not on screen is closed. Returns the sync function for the store.
 */
export function createModuleRouting({ shell, baseUrl, quality, reducedMotion, demo }: ModuleRoutingDeps): (state: AppState) => void {
  let hostPromise: Promise<ModuleHost> | null = null;
  let simHostPromise: Promise<SimHost> | null = null;
  const ensureHost = (): Promise<ModuleHost> => {
    hostPromise ??= import('./moduleHost').then(({ ModuleHost: HostClass }) => {
      const host = new HostClass({ view: shell.moduleView, baseUrl, quality, reducedMotion, toast: (text) => shell.toast(text), navigateTrack: (id, track) => void (location.hash = moduleHash(id, track)) });
      (window as unknown as { __bilimModules?: ModuleHost }).__bilimModules = host;
      return host;
    });
    return hostPromise;
  };
  const ensureSimHost = (): Promise<SimHost> => {
    simHostPromise ??= import('./simHost').then(({ SimHost: HostClass }) => {
      const host = new HostClass({ view: shell.labView, baseUrl, quality, reducedMotion, toast: (text) => shell.toast(text), navigate: (id, slug) => void (location.hash = moduleHash(id, slug)) });
      (window as unknown as { __bilimSim?: SimHost }).__bilimSim = host;
      return host;
    });
    return simHostPromise;
  };
  return (state) => {
    const route = state.route === 'modul' ? parseModuleRoute(location.hash) : null;
    const entry = route ? findModule(route.id, { demo }) : null;
    const isSim = entry?.sim !== undefined;
    if (hostPromise && (state.route !== 'modul' || isSim)) void hostPromise.then((host) => host.close());
    if (simHostPromise && (state.route !== 'modul' || !isSim)) void simHostPromise.then((host) => host.close());
    if (state.route !== 'modul') return;
    if (!route || !(entry?.definition || entry?.sim)) {
      shell.toast('Bu modül bulunamadı.');
      location.hash = routeHash('home');
      return;
    }
    const fail = (error: unknown): void => console.error(error);
    if (entry.sim) {
      void ensureSimHost().then((host) => { host.setQuestions(state.questionsOn); return host.open(entry, route.track, state.level); }).catch(fail);
    } else {
      void ensureHost().then((host) => { host.setQuestions(state.questionsOn); return host.open(entry, route.track, state.level); }).catch(fail);
    }
  };
}
