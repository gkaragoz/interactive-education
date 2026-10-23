import type { ModuleDefinition } from '../../scene';

/** Lazy definition of the mitosis-meiosis module (data and scene are only fetched when the module is opened). */
export const mitosisMeiosisDefinition: ModuleDefinition = {
  id: 'mitosis-meiosis',
  async load() {
    const [{ mitosisMeiosis }, { createMitosisScene }] = await Promise.all([import('../../data/modules/mitosis-meiosis'), import('./scene')]);
    return { info: mitosisMeiosis, createScene: createMitosisScene };
  },
};
