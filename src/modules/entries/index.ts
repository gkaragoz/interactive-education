// Every module entry (released or not). Module authors add exactly one import + one array item here; the lead decides
// which ones are released in ../releases.ts.
import type { RegistryEntry } from '../registry';
import { muscleDefinition } from '../muscle';
import { membraneTransportDefinition } from '../membrane-transport';
import { mitosisMeiosisDefinition } from '../mitosis-meiosis';
import { dnaProteinDefinition } from '../dna-protein';
import { geneticsDefinition } from '../genetics';
import { energyDefinition } from '../energy';
import { nervousDefinition } from '../nervous';
import { chemLabDefinition } from '../chem-lab';

export const ALL_ENTRIES: readonly RegistryEntry[] = [
  { id: 'membrane-transport', nameTr: 'Zardan madde geçişi', tagline: 'Difüzyon, osmoz ve aktif taşıma', levels: ['temel', 'ileri'], definition: membraneTransportDefinition },
  { id: 'mitosis-meiosis', nameTr: 'Mitoz ve mayoz', tagline: 'Hücre bölünmesini adım adım izle', levels: ['temel', 'ileri'], definition: mitosisMeiosisDefinition },
  { id: 'dna-protein', nameTr: 'DNA ve protein sentezi', tagline: 'Eşleme, sentez ve çeviri', levels: ['temel', 'ileri'], definition: dnaProteinDefinition },
  { id: 'genetics', nameTr: 'Kalıtım', tagline: 'Mendel ve Punnett kareleri', levels: ['temel', 'ileri'], definition: geneticsDefinition },
  { id: 'energy', nameTr: 'Enerji dönüşümleri', tagline: 'Fotosentez ve solunum', levels: ['temel', 'ileri'], definition: energyDefinition },
  { id: 'muscle', nameTr: 'Kas ve Hareket', tagline: 'Kaslar nasıl kısalır, kollar nasıl hareket eder?', levels: ['temel', 'ileri'], definition: muscleDefinition },
  { id: 'chem-lab', nameTr: 'Kimya laboratuvarı', tagline: 'On deney, serbest tezgâh ve atom düzeyinde açıklama', levels: ['temel', 'ileri'], definition: null, sim: chemLabDefinition },
  { id: 'nervous', nameTr: 'Sinir sistemi', tagline: 'Refleks, aksiyon potansiyeli ve sinaps', levels: ['temel', 'ileri'], definition: nervousDefinition },
];
