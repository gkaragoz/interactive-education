import type { ModuleDefinition } from '../../scene';

/** Lazy definition of the muscle module: the data and the scene code load only when it is opened. */
export const muscleDefinition: ModuleDefinition = {
  id: 'muscle',
  async load() {
    const [{ muscle }, { createMuscleScene }] = await Promise.all([import('../../data/modules/muscle'), import('./scene')]);
    return { info: muscle, createScene: createMuscleScene };
  },
};
