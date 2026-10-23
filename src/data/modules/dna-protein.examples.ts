// Example genes for the dna-protein module. The scene transcribes `template` and translates `mrna` with the
// helpers in dna-protein.codons.ts; tests check that template, mRNA and peptide agree.

export interface GeneExample {
  id: string;
  labelTr: string;
  /** DNA template (non-coding) strand, written 3' to 5'. */
  template: string;
  /** mRNA made from it, written 5' to 3'. */
  mrna: string;
  /** Amino acids expected, three-letter codes. */
  peptide: string[];
}

export const geneExamples: GeneExample[] = [
  { id: 'mfgk', labelTr: 'Örnek gen 1 (Met-Phe-Gly-Lys)', template: 'TACAAACCGTTTATT', mrna: 'AUGUUUGGCAAAUAA', peptide: ['Met', 'Phe', 'Gly', 'Lys'] },
  { id: 'melh', labelTr: 'Örnek gen 2 (Met-Glu-Leu-His)', template: 'TACCTTGACGTAACT', mrna: 'AUGGAACUGCAUUGA', peptide: ['Met', 'Glu', 'Leu', 'His'] },
  { id: 'mpsw', labelTr: 'Örnek gen 3 (Met-Pro-Ser-Trp)', template: 'TACGGATCGACCATC', mrna: 'AUGCCUAGCUGGUAG', peptide: ['Met', 'Pro', 'Ser', 'Trp'] },
];

/** Single-base changes of the mRNA of gene 'melh' used by the mutation track (substitution in the mRNA codon). */
export interface MutationExample {
  id: 'sessiz' | 'yanlis-anlamli' | 'anlamsiz';
  labelTr: string;
  codonIndex: number; // 0-based codon of 'melh' that changes
  from: string;
  to: string;
}

export const mutationExamples: MutationExample[] = [
  { id: 'sessiz', labelTr: 'Amino asidi değiştirmeyen değişim (CUG → CUC, Leu → Leu)', codonIndex: 2, from: 'CUG', to: 'CUC' },
  { id: 'yanlis-anlamli', labelTr: 'Amino asidi değiştiren değişim (GAA → GUA, Glu → Val)', codonIndex: 1, from: 'GAA', to: 'GUA' },
  { id: 'anlamsiz', labelTr: 'Erken durdurma kodonu (GAA → UAA, Glu → Dur)', codonIndex: 1, from: 'GAA', to: 'UAA' },
];
