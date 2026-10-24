import type { SimDefinition } from '../../scene';

/** The chemistry lab (v0.9): a sim module. Engine in `src/chemlab`, host and UI shell in `scene/simStage` and `ui/lab*`. */
export const chemLabDefinition: SimDefinition = {
  id: 'chem-lab',
  async load() {
    const [{ chemLabInfo }, scene, explainer, data] = await Promise.all([import('./info'), import('./scene'), import('./explainer/scene'), import('../../data/modules/chem-lab')]);
    // `timeline`: the content agent's ModuleInfo (tracks = experiment ids) drives the "Nedenini göster" dock.
    return { info: chemLabInfo, createSim: scene.createChemLabSim, createExplainer: explainer.createChemLabExplainer, timeline: data.chemLab };
  },
};
