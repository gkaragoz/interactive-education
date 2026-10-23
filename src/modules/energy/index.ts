import type { ModuleDefinition } from '../../scene';

/** Lazy definition of the energy module (photosynthesis, respiration, fermentation, chemosynthesis). */
export const energyDefinition: ModuleDefinition = {
  id: 'energy',
  async load() {
    const [{ energy }, { createEnergyScene }] = await Promise.all([import('../../data/modules/energy'), import('./scene')]);
    return { info: energy, createScene: createEnergyScene };
  },
};
