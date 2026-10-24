import type { SimInfo } from '../../data/moduleTypes';
import { EXPERIMENTS } from '../../chemlab';

const unique = (xs: string[]): string[] => [...new Set(xs)];

/** Card and page content of the lab. Prompts (Kendini dene after a step) come from the content agent; none yet. */
export const chemLabInfo: SimInfo = {
  kind: 'sim',
  id: 'chem-lab',
  nameTr: 'Kimya laboratuvarı',
  tagline: 'On deney, serbest tezgâh ve atom düzeyinde açıklama',
  introTr: 'Sanal tezgâhta kapları doldur, ısıt, tart ve gözlemlerini Defter e yaz. Rehberli deneyde adımları izle; serbest tezgâhta kendi denemeni yap.',
  levels: ['temel', 'ileri'],
  prompts: [],
  kazanimIds: unique(EXPERIMENTS.flatMap((e) => e.kazanim)),
  sourceIds: [],
  simplifications: [
    'Karışımlar tamamen homojen karıştırılır; yayılma ve dökülme hareketi modellenmez.',
    'Tepkimeler sınırlayıcı maddeye kadar ilerler; denge yalnızca çözünürlük ve asit-baz ailelerinde vardır.',
    'Zaman gerçek saniyedir; yavaş olaylar için zaman atlaması kullanılır.',
  ],
  glossary: [],
  funFacts: [],
};
