// The standard genetic code (RNA codons) for the dna-protein module, written out explicitly so it can be audited.
// Source: standard code as described in OpenStax Biology 2e 15.1 (64 codons: 61 amino acids, 3 stop codons, AUG start)
// and Wikipedia "Genetic code". Turkish amino-acid names follow common Turkish textbook usage.

export type AminoCode = 'Ala' | 'Arg' | 'Asn' | 'Asp' | 'Cys' | 'Gln' | 'Glu' | 'Gly' | 'His' | 'Ile' | 'Leu' | 'Lys' | 'Met' | 'Phe' | 'Pro' | 'Ser' | 'Thr' | 'Trp' | 'Tyr' | 'Val';

export interface AminoAcid {
  three: AminoCode; // three-letter code
  one: string; // one-letter code
  nameTr: string;
  nameEn: string;
}

export const aminoAcids: AminoAcid[] = [
  { three: 'Ala', one: 'A', nameTr: 'Alanin', nameEn: 'Alanine' },
  { three: 'Arg', one: 'R', nameTr: 'Arjinin', nameEn: 'Arginine' },
  { three: 'Asn', one: 'N', nameTr: 'Asparajin', nameEn: 'Asparagine' },
  { three: 'Asp', one: 'D', nameTr: 'Aspartik asit', nameEn: 'Aspartic acid' },
  { three: 'Cys', one: 'C', nameTr: 'Sistein', nameEn: 'Cysteine' },
  { three: 'Gln', one: 'Q', nameTr: 'Glutamin', nameEn: 'Glutamine' },
  { three: 'Glu', one: 'E', nameTr: 'Glutamik asit', nameEn: 'Glutamic acid' },
  { three: 'Gly', one: 'G', nameTr: 'Glisin', nameEn: 'Glycine' },
  { three: 'His', one: 'H', nameTr: 'Histidin', nameEn: 'Histidine' },
  { three: 'Ile', one: 'I', nameTr: 'İzolösin', nameEn: 'Isoleucine' },
  { three: 'Leu', one: 'L', nameTr: 'Lösin', nameEn: 'Leucine' },
  { three: 'Lys', one: 'K', nameTr: 'Lizin', nameEn: 'Lysine' },
  { three: 'Met', one: 'M', nameTr: 'Metiyonin', nameEn: 'Methionine' },
  { three: 'Phe', one: 'F', nameTr: 'Fenilalanin', nameEn: 'Phenylalanine' },
  { three: 'Pro', one: 'P', nameTr: 'Prolin', nameEn: 'Proline' },
  { three: 'Ser', one: 'S', nameTr: 'Serin', nameEn: 'Serine' },
  { three: 'Thr', one: 'T', nameTr: 'Treonin', nameEn: 'Threonine' },
  { three: 'Trp', one: 'W', nameTr: 'Triptofan', nameEn: 'Tryptophan' },
  { three: 'Tyr', one: 'Y', nameTr: 'Tirozin', nameEn: 'Tyrosine' },
  { three: 'Val', one: 'V', nameTr: 'Valin', nameEn: 'Valine' },
];

export type CodonMeaning = AminoCode | 'Stop';

/** All 64 RNA codons (U, C, A, G) and what they code for. */
export const codonTable: Record<string, CodonMeaning> = {
  UUU: 'Phe',
  UUC: 'Phe',
  UUA: 'Leu',
  UUG: 'Leu',
  UCU: 'Ser',
  UCC: 'Ser',
  UCA: 'Ser',
  UCG: 'Ser',
  UAU: 'Tyr',
  UAC: 'Tyr',
  UAA: 'Stop',
  UAG: 'Stop',
  UGU: 'Cys',
  UGC: 'Cys',
  UGA: 'Stop',
  UGG: 'Trp',
  CUU: 'Leu',
  CUC: 'Leu',
  CUA: 'Leu',
  CUG: 'Leu',
  CCU: 'Pro',
  CCC: 'Pro',
  CCA: 'Pro',
  CCG: 'Pro',
  CAU: 'His',
  CAC: 'His',
  CAA: 'Gln',
  CAG: 'Gln',
  CGU: 'Arg',
  CGC: 'Arg',
  CGA: 'Arg',
  CGG: 'Arg',
  AUU: 'Ile',
  AUC: 'Ile',
  AUA: 'Ile',
  AUG: 'Met',
  ACU: 'Thr',
  ACC: 'Thr',
  ACA: 'Thr',
  ACG: 'Thr',
  AAU: 'Asn',
  AAC: 'Asn',
  AAA: 'Lys',
  AAG: 'Lys',
  AGU: 'Ser',
  AGC: 'Ser',
  AGA: 'Arg',
  AGG: 'Arg',
  GUU: 'Val',
  GUC: 'Val',
  GUA: 'Val',
  GUG: 'Val',
  GCU: 'Ala',
  GCC: 'Ala',
  GCA: 'Ala',
  GCG: 'Ala',
  GAU: 'Asp',
  GAC: 'Asp',
  GAA: 'Glu',
  GAG: 'Glu',
  GGU: 'Gly',
  GGC: 'Gly',
  GGA: 'Gly',
  GGG: 'Gly',
};

export const START_CODON = 'AUG';
export const STOP_CODONS = ['UAA', 'UAG', 'UGA'] as const;

export interface TranslationResult {
  codons: string[]; // codons read, from the start codon up to and including the stop codon (if reached)
  peptide: AminoCode[]; // amino acids added, in order
  stopped: boolean; // true if a stop codon ended the translation
}

/**
 * Translates an mRNA written 5' to 3' (letters A, U, G, C; spaces ignored): starts at the first AUG and reads codon
 * by codon until a stop codon or the end of the sequence. Returns an empty result when there is no start codon.
 */
export function translateMrna(mrna: string): TranslationResult {
  const seq = mrna.replace(/\s+/g, '').toUpperCase();
  const start = seq.indexOf(START_CODON);
  const result: TranslationResult = { codons: [], peptide: [], stopped: false };
  if (start < 0) return result;
  for (let i = start; i + 3 <= seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    const meaning = codonTable[codon];
    if (meaning === undefined) throw new Error(`Invalid codon ${codon}`);
    result.codons.push(codon);
    if (meaning === 'Stop') {
      result.stopped = true;
      break;
    }
    result.peptide.push(meaning);
  }
  return result;
}

/** DNA template strand (3' to 5') to the mRNA it produces (5' to 3'): each base is replaced by its partner. */
export function transcribeTemplate(template: string): string {
  const partner: Record<string, string> = { A: 'U', T: 'A', G: 'C', C: 'G' };
  return [...template.replace(/\s+/g, '').toUpperCase()].map((b) => partner[b] ?? '?').join('');
}
