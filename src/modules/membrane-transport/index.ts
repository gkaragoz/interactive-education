import type { ModuleDefinition } from '../../scene';

/** Lazy definition of the membrane-transport module: the data and the scene code load only when it is opened. */
export const membraneTransportDefinition: ModuleDefinition = {
  id: 'membrane-transport',
  async load() {
    const [{ membraneTransport }, { createMembraneScene }] = await Promise.all([import('../../data/modules/membrane-transport'), import('./scene')]);
    return { info: membraneTransport, createScene: createMembraneScene };
  },
};
