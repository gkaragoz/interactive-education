import { describe, expect, it } from 'vitest';
import { aminoAcids, codonTable, STOP_CODONS, START_CODON, transcribeTemplate, translateMrna } from '../src/data/modules/dna-protein.codons';
import { geneExamples, mutationExamples } from '../src/data/modules/dna-protein.examples';

describe('standard genetic code table', () => {
  const codons = Object.keys(codonTable);

  it('has all 64 distinct RNA codons', () => {
    expect(codons).toHaveLength(64);
    for (const c of codons) expect(c).toMatch(/^[UCAG]{3}$/);
    expect(new Set(codons).size).toBe(64);
  });

  it('has 61 amino-acid codons and the three stop codons', () => {
    const stops = codons.filter((c) => codonTable[c] === 'Stop').sort();
    expect(stops).toEqual([...STOP_CODONS].sort());
    expect(codons.length - stops.length).toBe(61);
  });

  it('start codon is AUG for methionine', () => {
    expect(codonTable[START_CODON]).toBe('Met');
  });

  it('covers exactly the 20 amino acids, with unique codes and names', () => {
    expect(aminoAcids).toHaveLength(20);
    for (const key of ['three', 'one', 'nameTr', 'nameEn'] as const) expect(new Set(aminoAcids.map((a) => a[key])).size).toBe(20);
    const used = new Set(codons.map((c) => codonTable[c]).filter((m) => m !== 'Stop'));
    expect([...used].sort()).toEqual(aminoAcids.map((a) => a.three).sort());
    for (const a of aminoAcids) {
      expect(a.one).toMatch(/^[A-Z]$/);
      expect(a.nameTr.length).toBeGreaterThan(2);
    }
  });

  it('has the textbook degeneracy of each amino acid', () => {
    const count = (aa: string) => codons.filter((c) => codonTable[c] === aa).length;
    const expected: Record<string, number> = {
      Leu: 6, Ser: 6, Arg: 6, Ala: 4, Gly: 4, Pro: 4, Thr: 4, Val: 4,
      Ile: 3, Asn: 2, Asp: 2, Cys: 2, Gln: 2, Glu: 2, His: 2, Lys: 2, Phe: 2, Tyr: 2, Met: 1, Trp: 1,
    };
    for (const [aa, n] of Object.entries(expected)) expect(count(aa), aa).toBe(n);
  });

  it('matches well-known codons', () => {
    expect(codonTable['UUU']).toBe('Phe');
    expect(codonTable['GGC']).toBe('Gly');
    expect(codonTable['GAA']).toBe('Glu');
    expect(codonTable['GUA']).toBe('Val');
    expect(codonTable['UGG']).toBe('Trp');
    expect(codonTable['AUA']).toBe('Ile');
    expect(codonTable['UGA']).toBe('Stop');
  });
});

describe('translation helpers', () => {
  it('translates until the stop codon', () => {
    const r = translateMrna('GG AUG UUU GGC AAA UAA CCC');
    expect(r.peptide).toEqual(['Met', 'Phe', 'Gly', 'Lys']);
    expect(r.stopped).toBe(true);
    expect(r.codons.at(-1)).toBe('UAA');
  });
  it('returns nothing without a start codon and reports an unfinished chain', () => {
    expect(translateMrna('UUUGGC').peptide).toEqual([]);
    expect(translateMrna('AUGUUU').stopped).toBe(false);
  });
  it('transcribes a template strand', () => {
    expect(transcribeTemplate('TAC')).toBe('AUG');
  });
});

describe('example genes', () => {
  it.each(geneExamples.map((g) => [g.id, g] as const))('%s: template, mRNA and peptide agree', (_id, g) => {
    expect(transcribeTemplate(g.template)).toBe(g.mrna);
    expect(g.mrna.length % 3).toBe(0);
    const r = translateMrna(g.mrna);
    expect(r.peptide).toEqual(g.peptide);
    expect(r.stopped).toBe(true);
  });

  it.each(mutationExamples.map((m) => [m.id, m] as const))('mutation %s is a single-base change of gene melh', (_id, m) => {
    const gene = geneExamples.find((g) => g.id === 'melh')!;
    const codons = gene.mrna.match(/.{3}/g)!;
    expect(codons[m.codonIndex]).toBe(m.from);
    let diff = 0;
    for (let i = 0; i < 3; i++) if (m.from[i] !== m.to[i]) diff++;
    expect(diff).toBe(1);
    const mutated = [...codons];
    mutated[m.codonIndex] = m.to;
    const before = translateMrna(codons.join(''));
    const after = translateMrna(mutated.join(''));
    if (m.id === 'sessiz') expect(after.peptide).toEqual(before.peptide);
    if (m.id === 'yanlis-anlamli') {
      expect(after.peptide).toHaveLength(before.peptide.length);
      expect(after.peptide).not.toEqual(before.peptide);
    }
    if (m.id === 'anlamsiz') expect(after.peptide).toEqual(['Met']);
  });
});
