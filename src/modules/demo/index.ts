import type { ModuleInfo } from '../../data/moduleTypes';
import type { ModuleDefinition } from '../../scene';

export const DEMO_ID = '__demo';

/** The framework test module (never on the home page; reachable at `#/modul/__demo` in dev builds and with `?demo`). */
export const demoDefinition: ModuleDefinition = {
  id: DEMO_ID,
  async load() {
    const [{ demoInfo }, { createDemoScene }] = await Promise.all([import('./info'), import('./scene')]);
    // The id is a string for the demo only; ModuleId lists the real modules.
    return { info: { ...demoInfo, id: DEMO_ID as ModuleInfo['id'] }, createScene: createDemoScene };
  },
};
