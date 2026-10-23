/**
 * Metal rules: metal + acid, displacement (activity series) and combustion.
 * Activity series Mg > Al > Zn > Fe > (H) > Cu > Ag: https://en.wikipedia.org/wiki/Reactivity_series
 * Mg + acid gives H2 and is exothermic: https://en.wikipedia.org/wiki/Magnesium ; Fe + CuSO4 single replacement:
 * https://en.wikipedia.org/wiki/Copper(II)_sulfate ; 2 Mg + O2 -> 2 MgO, dHf(MgO) = -601.6 kJ/mol:
 * https://en.wikipedia.org/wiki/Magnesium_oxide ; Mg burns with a brilliant white light: https://en.wikipedia.org/wiki/Magnesium
 * Enthalpies of formation of the aqueous ions (kJ/mol, handbook values; unverified on the cited pages) turn each
 * redox rule's dH into a difference: https://en.wikipedia.org/wiki/Standard_enthalpy_of_formation
 * Rate constants are our teaching values chosen so that the experiments take tens of seconds to minutes; the order
 * (Mg fastest, Fe slowest) follows the series. Aluminium is slowed because of its oxide layer
 * (https://en.wikipedia.org/wiki/Aluminium#Chemistry).
 */
import type { ReactionRule } from './reactions';

interface Metal { id: string; ion: string; n: number; rank: number; kAcid: number; hf: number; nameTr: string }

const METALS: readonly Metal[] = [
  { id: 'mg', ion: 'Mg(2+)', n: 2, rank: 0, kAcid: 0.05, hf: -466.85, nameTr: 'magnezyum' },
  { id: 'al', ion: 'Al(3+)', n: 3, rank: 1, kAcid: 0.004, hf: -531, nameTr: 'alüminyum' },
  { id: 'zn', ion: 'Zn(2+)', n: 2, rank: 2, kAcid: 0.006, hf: -153.89, nameTr: 'çinko' },
  { id: 'fe', ion: 'Fe(2+)', n: 2, rank: 3, kAcid: 0.0006, hf: -89.1, nameTr: 'demir' },
  { id: 'cu', ion: 'Cu(2+)', n: 2, rank: 4, kAcid: 0, hf: 64.77, nameTr: 'bakır' },
  { id: 'ag', ion: 'Ag+', n: 1, rank: 5, kAcid: 0, hf: 105.58, nameTr: 'gümüş' },
];
const SRC = 'https://en.wikipedia.org/wiki/Reactivity_series';
const KZ = ['KİM.10.1.3', 'KİM.12.1.1', 'KİM.12.1.2'];
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const ACID_RULES: ReactionRule[] = METALS.filter((m) => m.rank < 4).map((m) => {
  const f = m.n % 2 === 0 ? 1 : 2;
  return {
    id: `redox:${m.id}+H+`, nameTr: `${m.nameTr} + asit`, family: 'metal-acid',
    reactants: { [`s:${m.id}`]: f, 'H+': m.n * f }, products: { [m.ion]: f, 'g:h2': (m.n * f) / 2 },
    dH: f * m.hf, k: m.kAcid, surface: true, conc: { key: 'H+', ref: 1, order: 1 },
    obs: [
      { id: 'gas', tag: 'gas', textTr: `Metal yüzeyinde kabarcıklar çıkıyor: ${m.nameTr} asitle tepkimeye girip hidrojen gazı veriyor.` },
      { id: 'warm', tag: 'temperature', textTr: 'Tüp ısınıyor: tepkime ısı veriyor.', when: 'end' },
    ],
    source: SRC, kazanim: ['FB.8.5.8', 'KİM.12.1.1', 'KİM.11.1.7'],
  };
});

const DISPLACE_RULES: ReactionRule[] = [];
for (const m of METALS) {
  for (const x of METALS) {
    if (m.rank >= x.rank) continue;
    const L = (m.n * x.n) / gcd(m.n, x.n);
    const coM = L / m.n;
    const coX = L / x.n;
    DISPLACE_RULES.push({
      id: `redox:${m.id}+${x.ion}`, nameTr: `${m.nameTr} + ${x.nameTr} iyonu (yer değiştirme)`, family: 'displacement',
      reactants: { [`s:${m.id}`]: coM, [x.ion]: coX }, products: { [m.ion]: coM, [`s:${x.id}`]: coX },
      dH: coM * m.hf - coX * x.hf, k: 0.003 * Math.pow(2.7, x.rank - m.rank) * (m.id === 'al' ? 0.2 : 1), surface: true,
      conc: { key: x.ion, ref: 0.1, order: 0.5 },
      obs: [
        { id: 'deposit', tag: 'deposit', textTr: `Metal yüzeyinde ${x.nameTr} birikiyor: daha etkin metal, daha az etkin metalin iyonunu çıkarıyor.` },
        { id: 'colour', tag: 'colour', textTr: 'Çözeltinin rengi soluyor: renkli iyonlar azalıyor.' },
      ],
      source: SRC, kazanim: KZ,
    });
  }
}

const COMBUSTION: ReactionRule[] = [
  {
    id: 'combustion:mg', nameTr: 'Magnezyumun yanması', family: 'combustion',
    reactants: { 's:mg': 2, 'g:o2': 1 }, products: { 's:mgo': 2 }, dH: -1203.2, k: 2, noTemp: true, retention: 0.15,
    needs: { ignitionC: 600 },
    obs: [
      { id: 'light', tag: 'light', textTr: 'Çok parlak beyaz ışık! Magnezyum yanıyor. Gerçekte bu aleve doğrudan bakılmaz.', flash: 0.8 },
      { id: 'ash', tag: 'deposit', textTr: 'Geriye beyaz kül (magnezyum oksit) kaldı. Havadaki oksijen metale katıldı.', when: 'end' },
    ],
    source: 'https://en.wikipedia.org/wiki/Magnesium_oxide', kazanim: ['KİM.10.1.3', 'KİM.12.1.1', 'FB.8.5.3'],
  },
  {
    id: 'combustion:h2', nameTr: 'Hidrojenin yanması', family: 'combustion',
    reactants: { 'g:h2': 2, 'g:o2': 1 }, products: { water: 2 }, dH: -571.6, k: 40, noTemp: true, retention: 0.3,
    needs: { ignitionC: 99999 },
    obs: [{ id: 'pop', tag: 'sound', textTr: 'Tık sesi (hafif patlama): hidrojen alevle oksijenle birleşip su oluşturdu.' }],
    source: 'https://en.wikipedia.org/wiki/Hydrogen_safety', kazanim: ['KİM.12.1.1', 'KİM.10.1.3'],
  },
];

export const REDOX_RULES: readonly ReactionRule[] = [...ACID_RULES, ...DISPLACE_RULES, ...COMBUSTION];
