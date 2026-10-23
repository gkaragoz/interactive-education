import type { ModuleDefinition } from '../../scene';

/** Lazy definition of the genetics module (data and scene are only fetched when the module is opened). */
export const geneticsDefinition: ModuleDefinition = {
  id: 'genetics',
  async load() {
    const [{ genetics }, { createGeneticsScene }] = await Promise.all([import('../../data/modules/genetics'), import('./scene')]);
    return { info: genetics, createScene: createGeneticsScene };
  },
};
