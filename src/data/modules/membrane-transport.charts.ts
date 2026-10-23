// Chart values at the START of each phase for the default options, measured from the scene
// (tests/modules/membraneTransport.test.ts checks them against the scene's `chartAt`).
// Series order: molekul-ic, molekul-dis, derisim-farki, net-gecis, hucre-hacmi, harcanan-atp.
export type ChartRow = [number, number, number, number, number, number];
const IDS = ['molekul-ic', 'molekul-dis', 'derisim-farki', 'net-gecis', 'hucre-hacmi', 'harcanan-atp'] as const;

/** Values per track and phase id. */
export const CHART_TABLE: Record<string, Record<string, ChartRow>> = {
  'difuzyon': {
    'dengesiz-baslangic': [12, 36, 24, 0, 100, 0],
    'net-gecis': [12, 36, 24, 1, 100, 0],
    'yavaslama': [20, 28, 8, 0.75, 100, 0],
    'dinamik-denge': [22, 26, 4, -0.75, 100, 0],
  },
  'kolaylastirilmis-difuzyon': {
    'proteinler': [4, 12, 8, 0, 100, 0],
    'kanal': [4, 12, 8, 0.33, 100, 0],
    'tasiyici': [8, 8, 0, 0.5, 100, 0],
    'doyma': [10, 22, 12, 0.17, 100, 0],
  },
  'ozmoz': {
    'zar-ve-su': [24, 29, 9, 0, 100, 0],
    'hipotonik': [24, 29, 9, 0.4, 100, 0],
    'izotonik': [24, 29, 0, 0.2, 100, 0],
    'hipertonik': [24, 29, 12, -0.6, 100, 0],
    'karsilastirma': [16, 37, 0.51, -0.4, 72.31, 0],
  },
  'aktif-tasima': {
    'derisime-karsi': [14, 34, 20, 0, 100, 0],
    'na-ve-atp': [14, 34, 20, 0, 100, 0],
    'sekil-degisimi': [14, 34, 20, -0.5, 100, 1],
    'k-alimi': [11, 37, 26, -0.5, 100, 1],
    'dongu': [8, 40, 32, -0.5, 100, 2],
    'sonuc': [2, 46, 44, -0.5, 100, 4],
  },
  'endositoz-ekzositoz': {
    'ortam': [6, 6, 0, 0, 100, 0],
    'fagositoz': [6, 6, 0, 0, 100, 0],
    'pinositoz': [7, 5, 2, 0, 100, 0],
    'ekzositoz': [12, 0, 12, 0, 100, 0],
    'ozet': [6, 6, 0, 0, 100, 0],
  },
};

export function chartRow(trackId: string, phaseId: string): Record<string, number> {
  const row = CHART_TABLE[trackId]?.[phaseId] ?? [0, 0, 0, 0, 100, 0];
  return Object.fromEntries(IDS.map((id, i) => [id, row[i] ?? 0]));
}
