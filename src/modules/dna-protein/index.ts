import type { ModuleDefinition } from '../../scene';

/** Lazy definition of the dna-protein module (data and scene code are only fetched when the module is opened). */
export const dnaProteinDefinition: ModuleDefinition = {
  id: 'dna-protein',
  async load() {
    const [{ dnaProtein }, { createDnaScene }] = await Promise.all([import('../../data/modules/dna-protein'), import('./scene')]);
    return { info: dnaProtein, createScene: createDnaScene };
  },
};
