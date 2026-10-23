import type { ModuleDefinition } from '../../scene';

/** Lazy definition of the nervous module: the data and the scene code load only when it is opened. */
export const nervousDefinition: ModuleDefinition = {
  id: 'nervous',
  async load() {
    const [{ nervous }, { createNervousScene }] = await Promise.all([import('../../data/modules/nervous'), import('./scene')]);
    return { info: nervous, createScene: createNervousScene };
  },
};
