/**
 * Catalysed and thermal decompositions.
 * 2 H2O2 -> 2 H2O + O2, dH = -196 kJ as written; iodide and catalase (yeast) speed it up and are not consumed:
 * https://en.wikipedia.org/wiki/Elephant%27s_toothpaste , https://en.wikipedia.org/wiki/Catalase ,
 * https://en.wikipedia.org/wiki/Catalysis ; MnO2 as a peroxide catalyst: https://en.wikipedia.org/wiki/Manganese(IV)_oxide
 * Uncatalysed 3 % peroxide is shelf-stable (very small k). Catalyst k and half-saturation amounts are our teaching values.
 * 2 NaHCO3 -> Na2CO3 + H2O + CO2 when heated dry: https://en.wikipedia.org/wiki/Sodium_bicarbonate ; dH = +91.6 kJ
 * is our arithmetic from standard formation enthalpies (NaHCO3 -950.8 and Na2CO3 -1130.7 kJ/mol are on the Wikipedia
 * pages; CO2 -393.5 and liquid water -285.8 kJ/mol are handbook values, unverified here).
 */
import type { ReactionRule } from './reactions';

export const MISC_RULES: readonly ReactionRule[] = [
  {
    id: 'decomp:h2o2', nameTr: 'Hidrojen peroksitin bozunması', family: 'catalysis',
    reactants: { h2o2: 2 }, products: { water: 2, 'g:o2': 1 }, dH: -196.4, k: 4e-9,
    catalysts: [
      { key: 'cat:yeast', k: 0.035, half: 1.0 },
      { key: 'I-', k: 0.04, half: 0.01 },
      { key: 's:mno2', k: 0.06, half: 0.2 },
    ],
    obs: [
      { id: 'gas', tag: 'gas', textTr: 'Hızla kabarcık çıkıyor: oksijen gazı oluşuyor.' },
      { id: 'warm', tag: 'temperature', textTr: 'Kap ısınıyor: bu tepkime ısı verir.', when: 'end' },
    ],
    source: 'https://en.wikipedia.org/wiki/Elephant%27s_toothpaste', kazanim: ['KİM.11.1.1', 'KİM.11.1.5', 'KİM.11.1.7'],
  },
  {
    id: 'decomp:nahco3', nameTr: 'Kabartma tozunun ısıyla bozunması', family: 'thermal',
    reactants: { 's:nahco3': 2 }, products: { 's:na2co3': 1, water: 1, 'g:co2': 1 }, dH: 91.6, k: 0.03, noTemp: true,
    needs: { minTempC: 100, dry: true },
    obs: [{ id: 'gas', tag: 'gas', textTr: 'Isıtılan katıdan gaz çıkıyor ve tüpün ağzında su damlaları var: kabartma tozu bozunuyor.' }],
    source: 'https://en.wikipedia.org/wiki/Sodium_bicarbonate', kazanim: ['KİM.10.1.1', 'KİM.10.1.3'],
  },
];
