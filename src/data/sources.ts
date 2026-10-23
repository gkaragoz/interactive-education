import type { Source } from './types';
import { ACCESSED, commons, openstax, wpEn, wpTr } from './sources-helpers';
import { moduleSources } from './sources-modules';

// Every cited reference. URLs were fetched and confirmed to exist on the `accessed` date.
// Learner text is written in our own words; these are the pages we learned from (ADR 0004).

export const sources: Source[] = [
  // MEB programmes (official public documents)
  {
    id: 'meb-fen-2026',
    kind: 'meb',
    title: 'Fen Bilimleri Dersi Öğretim Programı (3, 4, 5, 6, 7 ve 8. Sınıflar)',
    url: 'https://tymm.meb.gov.tr/assets/pdf/fen-bilimleri-dersi_20260902_111309_119.pdf',
    publisher: 'T.C. Milli Eğitim Bakanlığı, Talim ve Terbiye Kurulu Başkanlığı',
    license: 'MEB (resmi program)',
    lang: 'tr',
    accessed: ACCESSED,
  },
  {
    id: 'meb-biyoloji-2026',
    kind: 'meb',
    title: 'Biyoloji Dersi Öğretim Programı (9, 10, 11 ve 12. Sınıflar)',
    url: 'https://tymm.meb.gov.tr/assets/pdf/biyoloji-dersi_20260819_142444_074.pdf',
    publisher: 'T.C. Milli Eğitim Bakanlığı, Talim ve Terbiye Kurulu Başkanlığı',
    license: 'MEB (resmi program)',
    lang: 'tr',
    accessed: ACCESSED,
  },

  // Vikipedi (tr). Where Turkish has no own page for a topic we cite the English page instead.
  wpTr('hucre', 'Hücre', 'Hücre'),
  wpTr('okaryot', 'Ökaryot', 'Ökaryot'),
  wpTr('prokaryot', 'Prokaryot', 'Prokaryot'),
  wpTr('bakteri', 'Bakteri', 'Bakteri'),
  wpTr('organel', 'Organel', 'Organel'),
  wpTr('hucre-zari', 'Hücre zarı', 'Hücre_zarı'),
  wpTr('hucre-duvari', 'Hücre duvarı', 'Hücre_duvarı'),
  wpTr('hucre-zarfi', 'Hücre zarfı', 'Hücre_zarfı'),
  wpTr('cekirdek', 'Hücre çekirdeği', 'Hücre_çekirdeği'),
  wpTr('cekirdekcik', 'Çekirdekçik', 'Çekirdekçik'),
  wpTr('mitokondri', 'Mitokondri', 'Mitokondri'),
  wpTr('kloroplast', 'Kloroplast', 'Kloroplast'),
  wpTr('er', 'Endoplazmik retikulum', 'Endoplazmik_retikulum'),
  wpTr('golgi', 'Golgi aygıtı', 'Golgi_aygıtı'),
  wpTr('ribozom', 'Ribozom', 'Ribozom'),
  wpTr('lizozom', 'Lizozom', 'Lizozom'),
  wpTr('koful', 'Koful', 'Koful'),
  wpTr('sentrozom', 'Sentrozom', 'Sentrozom'),
  wpTr('nukleoit', 'Nükleoit', 'Nükleoit'),
  wpTr('plazmid', 'Plazmid', 'Plazmid'),
  wpTr('kamci', 'Kamçı (biyoloji)', 'Kamçı_(biyoloji)'),
  wpTr('pilus', 'Pilus', 'Pilus'),

  // Wikipedia (en)
  wpEn('cell', 'Cell (biology)', 'Cell_(biology)'),
  wpEn('plant-cell', 'Plant cell', 'Plant_cell'),
  wpEn('prokaryote', 'Prokaryote', 'Prokaryote'),
  wpEn('bacterial-cell-structure', 'Bacterial cell structure', 'Bacterial_cell_structure'),
  wpEn('cell-membrane', 'Cell membrane', 'Cell_membrane'),
  wpEn('cell-wall', 'Cell wall', 'Cell_wall'),
  wpEn('cell-envelope', 'Cell envelope', 'Cell_envelope'),
  wpEn('bacterial-capsule', 'Bacterial capsule', 'Bacterial_capsule'),
  wpEn('nucleus', 'Cell nucleus', 'Cell_nucleus'),
  wpEn('nucleolus', 'Nucleolus', 'Nucleolus'),
  wpEn('mitochondrion', 'Mitochondrion', 'Mitochondrion'),
  wpEn('chloroplast', 'Chloroplast', 'Chloroplast'),
  wpEn('er', 'Endoplasmic reticulum', 'Endoplasmic_reticulum'),
  wpEn('golgi', 'Golgi apparatus', 'Golgi_apparatus'),
  wpEn('ribosome', 'Ribosome', 'Ribosome'),
  wpEn('lysosome', 'Lysosome', 'Lysosome'),
  wpEn('vacuole', 'Vacuole', 'Vacuole'),
  wpEn('centrosome', 'Centrosome', 'Centrosome'),
  wpEn('nucleoid', 'Nucleoid', 'Nucleoid'),
  wpEn('plasmid', 'Plasmid', 'Plasmid'),
  wpEn('flagellum', 'Flagellum', 'Flagellum'),
  wpEn('pilus', 'Pilus', 'Pilus'),

  // OpenStax Biology 2e, chapter 4 (cross-check only; text and images not copied)
  openstax('4-1', '4.1 Studying Cells', '4-1-studying-cells'),
  openstax('4-2', '4.2 Prokaryotic Cells', '4-2-prokaryotic-cells'),
  openstax('4-3', '4.3 Eukaryotic Cells', '4-3-eukaryotic-cells'),
  openstax('4-4', '4.4 The Endomembrane System and Proteins', '4-4-the-endomembrane-system-and-proteins'),

  ...moduleSources,

  // Wikimedia Commons file pages for micrographs
  commons('onion', 'Living cells of onion epidermis', 'Living_cells_of_onion_epidermis_(33605021164).jpg', 'Berkshire Community College Bioscience Image Library', 'CC0'),
  commons('elodea', 'Células de Elodea 40x', 'C%C3%A9lulas_de_Elodea_40x_(Daemon_Canchig).png', 'Daemon Canchig', 'CC BY-SA 4.0'),
  commons('cheek', 'Human epithelial cells stained with methylene blue dye', 'Human_epithelial_cells_stained_with_methylene_blue_dye.jpg', 'Daliasalloum', 'CC BY 4.0'),
  commons('mito-tem', 'Mitochondria - TEM', 'Mitochondria_-_TEM.jpg', 'Louisa Howard', 'PD'),
  commons('golgi-tem', 'Human leukocyte, showing golgi - TEM', 'Human_leukocyte,_showing_golgi_-_TEM.jpg', 'Louisa Howard', 'PD'),
  commons('nucleus-tem', 'Mammalian pancreatic tissue, nuclear pores and rough endoplasmic reticulum', 'Mammalian_pancreatic_tissue,_nuclear_pores_and_rough_endoplasmic_reticulum.jpg', 'Louisa Howard', 'PD'),
  commons('centriole-tem', 'Spindle centriole - embryonic brain mouse - TEM', 'Spindle_centriole_-_embryonic_brain_mouse_-_TEM.jpg', 'Louisa Howard, Miguel Marin-Padilla', 'PD'),
  commons('chloroplast-tem', 'Chloroplast in leaf of Anemone sp TEM 30000x', 'Chloroplast_in_leaf_of_Anemone_sp_TEM_30000x.png', 'and3k and caper437', 'CC BY-SA 3.0'),
  commons('ecoli-sem', 'Escherichia coli (SEM)', 'Escherichia_coli_(SEM).jpg', 'CDC / Evangeline Sowers, Janice Carr', 'PD'),
];
