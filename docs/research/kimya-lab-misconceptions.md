# Kimya Laboratuvarı: misconception lists for quizzes

Purpose: quiz-quality misconception lists for the ten `chem-lab` tracks (`src/data/modules/chem-lab*.ts`) and for later two-tier diagnostic items (FB.8.5.5 practice names "iki aşamalı teşhis testleri"). Date: 2026-10-24. Companion to `docs/research/kimya-lab.md` (which listed unvalidated hypotheses per experiment) and `docs/research/kimya.md` (programme limits).

## How to read this file

- **Evidence** is one of: *literature* (a published study or teaching resource describes the misconception; the link is given), *hypothesis* (our guess from the dossier, not yet found in a source; marked so that nobody treats it as validated), *engine/limit* (a limit or fact from the programme or the engine, not a misconception study).
- Link status: the RSC (edu.rsc.org, pubs.rsc.org) and STEM Learning URLs answered HTTP 202 or 403 to our fetcher (bot protection) and could not be re-checked here; they were returned by web search on 2026-10-24. The other links answered HTTP 200.
- The literature links were found by web search on 2026-10-24 and read through search summaries, **not** read in full. Percentages and names below are only those the summaries gave; re-open the paper before quoting a number. None of the studies is about our exact reagents, and most are not Turkish; the Turkish ones are marked (TR).
- Each entry gives: the wrong idea in learner wording, the correct idea in our own words, a two-tier item draft (tier 1 question, tier 2 reason options; the right pair is marked ✔), and which module check targets it (`chem-lab` check id = `<track>-<id>`).
- A Turkish chemistry teacher should review the wording and the prevalence assumptions before wider use (ADR 0005, not arranged by us).

## Sources used for the lists

| Id | Source | Topic |
|---|---|---|
| L1 | RSC Education, "Help students navigate the law of conservation of mass on dissolving and heating" <https://edu.rsc.org/cpd/conservation-of-mass/4011856.article> | mass, dissolving, heating; cites Johnston and Scott 1991, Driver 1985, Andersson 1984 (secondary) |
| L2 | RSC Education, "Explore dissolving and conservation of mass, tackle common misconceptions" <https://edu.rsc.org/resources/mass-and-dissolving/1084.article> | dissolving vs disappearing |
| L3 | EJMSTE, "Misconceptions among middle school students regarding the conservation of mass during combustion" <https://www.ejmste.com/download/misconceptions-among-middle-school-students-regarding-the-conservation-of-mass-during-combustion-5495.pdf> | combustion and mass; gas has no mass |
| L4 | NSTA formative assessment probe "Sugar water" <https://www.nsta.org/lesson-plan/sugar-water> | dissolving is not melting |
| L5 | RSC Education, "Neutralise misconceptions around acids and bases using studies into students' models for chemical reactions" <https://edu.rsc.org/resources/students-thinking-about-acids-bases-and-neutralisation-beyond-appearances/4017804.article> | acids, bases, neutralisation, salts and pH 7 |
| L6 | STEM Learning, "Strong and weak acids and bases" <https://www.stem.org.uk/lxhsb> | strength vs concentration; "acids are dangerous"; pH measures strength |
| L7 | Chemistry Education Research and Practice 2006, high school students' understanding of titrations and related acid-base phenomena <https://pubs.rsc.org/en/content/articlelanding/2006/rp/b5rp90014j> | pH, neutralisation, titration |
| L8 | Demircioğlu et al. (TR authors), Asia-Pacific Forum on Science Learning and Teaching 10(2), article 5 (2009) <https://www.eduhk.hk/apfslt/v10_issue2/gokhan/gokhan8.htm> | salt solutions assumed neutral (hydrolysis) |
| L9 | RSC Education, "Students' ideas about specific chemical events: closed system reactions beyond appearances" <https://edu.rsc.org/resources/students-ideas-about-specific-chemical-events-closed-system-reactions-beyond-appearances/4017790.article> | closed system chemical reactions |
| L10 | CERP 2021, "Examining learning of atomic level ideas about precipitation reactions with a resources framework" <https://pubs.rsc.org/en/content/articlehtml/2021/rp/d0rp00071j> | particle-level ideas about precipitation |
| L11 | RSC Education resource on precipitation at the particle level <https://edu.rsc.org/download?ac=527315> | post-16 particle explanations of precipitation |
| L12 | Bain and Towns (2016), literature review on chemical kinetics (J. Chem. Educ.), as reported in a search summary; see also CERP 2018 on reaction coordinate diagrams <https://pubs.rsc.org/en/content/articlehtml/2018/rp/c8rp00045j> | catalysts, activation energy, endo/exothermic |
| L13 | Asia-Pacific Forum on Science Learning and Teaching 19(2), article 3 (2018) <https://www.eduhk.hk/apfslt/v19_issue2/karpudewan/page3.htm> | catalyst and rate diagnostics with pre-service teachers |
| L14 | CERP 2024, electrolysis conceptions <https://pubs.rsc.org/en/content/articlelanding/2024/rp/d3rp00124e> | "current produces ions", electrons moving through the solution (Indonesian and Turkish students) |
| L15 | CERP 2020, "Electrolysis: what textbooks don't tell us" <https://pubs.rsc.org/en/content/articlehtml/2020/rp/c9rp00218a> | textbook accounts of water electrolysis |
| L16 | Tokgöz and Sarıkaya (2025, TR, J. Chem. Educ.), gifted students and the law of conservation of mass <https://avesis.gazi.edu.tr/yayin/c585e654-04cb-436c-8fd7-aef056a8c416/experimental-study-on-eliminating-misconceptions-regarding-the-law-of-conservation-of-mass-in-chemical-reactions-in-gifted-students> | conservation of mass in reactions (TR) |
| L17 | Turkish thesis (Balıkesir) on reaction-rate misconceptions <https://acikerisim.balikesir.edu.tr/items/da3044a0-d0ec-4da6-a5f7-2608abcd12e7> | rate, 416 high school students (TR; figures from a summary) |
| T | Treagust-style two-tier diagnostic format is the one named in the programme (FB.8.5.5 practice); we did not locate Treagust's original paper in this pass | format only |

Not found in this pass (gaps, stay hypotheses): indicator colour read as an exact pH; spectator ions misread as part of the solid; "heat comes from the acid alone"; "foam is steam"; "the nail turns into copper"; "the ash weighs less because it was burned". They are plausible, they appear in the dossier, and they are used as distractors, but we have no source.

## E1 `sirke-kabartma`: vinegar and baking soda

| # | Wrong idea (learner wording) | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 1.1 | "Gaz kütle taşımaz, bu yüzden köpürünce kütle azalmaz ya da artar." / "Kütle yok oldu." | Gas has mass; in an open flask the CO₂ leaves and takes its mass with it; mass is conserved when the gas is counted. | literature: L3 (gas has no mass), L1, L9, L16 | `sirke-kabartma-azalir`, `-balon` |
| 1.2 | "Kabarcıklar kaptaki hava (ya da buhar)." | The bubbles are CO₂ made in the reaction. | hypothesis (dossier) | `-kabarcik` |
| 1.3 | "Balon takınca kütle artar çünkü balon ağırlık ekler." | In a closed system the total mass (flask, contents, balloon) is constant. | hypothesis; L1 and L9 discuss open versus closed systems | `-balon` |
| 1.4 | "Atomlar yok olur ya da başka atomlara dönüşür." | Atoms are rearranged: bonds break and form, atom kinds and numbers stay. | literature (L16, conservation of mass) | `-atom`, `-c-say` |
| 1.5 | "Köpürme olduysa tepkime tamamen bitmiştir ve çözelti nötrdür." | Baking soda is the limiting reagent; leftover acetic acid keeps the solution weakly acidic. | hypothesis (engine arithmetic) | `-asidik` |

Two-tier draft (1.1): Tier 1 "Açık kapta köpürme bitince terazi, başlangıç toplamına göre ne gösterir?" (a) azalır ✔ (b) aynı kalır (c) artar. Tier 2 "Çünkü ..." (1) çıkan gazın kütlesi kaptan ayrıldı ✔ (2) gazın kütlesi yoktur (3) madde yok oldu (4) terazi hata yaptı.

## E2 `kirmizi-lahana`: red cabbage indicator

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 2.1 | "pH sayısı büyükse daha asidik." | Smaller pH means more acidic; below 7 is acid. | hypothesis (common pattern); L6 notes pH is misread as strength | `kirmizi-lahana-ph3-5` |
| 2.2 | "Renk tam pH değerini söyler." | The colour shows a range, not the exact value. | hypothesis (not found in sources) | `-yaklasik` |
| 2.3 | "Bütün asitler tehlikeli, bütün bazlar zararsız." | Lemon juice and vinegar are acids and are edible; hazard depends on strength and concentration. Dilute alkalis can be corrosive too. | literature: L6 | `-guvenlik`, `-limon` |
| 2.4 | "Mor renk bir şey bulunmadığı demektir." | Purple is the colour at neutral pH. | hypothesis | `-mor` |
| 2.5 | "Bilinmeyen sıvıyı tadıp koklamak hızlı bir testtir." | Never taste or smell unknown chemicals (programme safety rule, FB.8.5.5). | engine/limit (MEB-FEN) | `-guvenlik` |

Two-tier draft (2.1): Tier 1 "pH 3 mü pH 5 mi daha asidiktir?" (a) pH 3 ✔ (b) pH 5. Tier 2 "Çünkü ..." (1) pH küçüldükçe asitlik artar ✔ (2) sayı büyüdükçe asitlik artar (3) ikisi de 7'den küçük, aynıdır.

## E3 `notrallesme`: neutralisation and titration

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 3.1 | "Nötr demek hiçbir şey kalmadı demek." | Spectator ions (Na⁺, Cl⁻) remain in solution; only H⁺ and OH⁻ become water. | literature: L5, L7 (neutralisation models); a Korean-language study summary mentions leftover-ion ideas at the equivalence point | `notrallesme-artan-iyon`, `-net` |
| 3.2 | "Eşdeğerlikte pH her zaman 7." | pH 7 holds for strong acid with strong base only; weak acid or base differ. | literature: L7, L5, L8 (salt solutions assumed neutral) | `-ph7` |
| 3.3 | "10 mL baz renk değiştirir; renk değişimi yavaş yavaş olur." | The indicator changes at about pH 8.3; before that it is colourless even though the pH has risen from 1 to 3.6. | hypothesis | `-on-ml`, `-dik` |
| 3.4 | "Nötralleşme ısı vermez ya da çok ısı verir." | It releases heat but little at this scale (about 0.7 K for 2 mmol). | hypothesis (engine arithmetic) | (note only) |
| 3.5 | "Güçlü asit çok derişik asittir; pH sertliği ölçer." | Strength (ionisation) and concentration are different; pH relates to the H⁺ concentration. | literature: L6 | (concept note) |

Two-tier draft (3.1): Tier 1 "Eşdeğerlik noktasında çözeltide hangi iyonlar bulunur?" (a) Na⁺ ve Cl⁻ ✔ (b) hiçbiri (c) H⁺ ve OH⁻. Tier 2 "Çünkü ..." (1) tuz iyonları tepkimeye katılmaz ✔ (2) nötr çözelti saf sudur (3) bütün iyonlar suya dönüşür.

## E4 `cokelme-kalsiyum-karbonat`: precipitation

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 4.1 | "Katı yoktan var olur / bulanıklık yalnızca karışmadır." | A new insoluble compound formed from dissolved ions: a chemical change. | literature: L10, L11 (particle-level ideas about precipitation are weak) | `cokelme-kalsiyum-karbonat-yeni-madde` |
| 4.2 | "Na⁺ ve Cl⁻ kaybolur ya da çökeleğe girer." | They stay dissolved as spectators. | hypothesis (not found as a specific misconception) | `-suzuntu`, `-net` |
| 4.3 | "Süzüntü saf sudur." | It is a salt solution. | hypothesis | `-suzuntu` |
| 4.4 | "Çökelek buzdur / donmuş sudur." | Precipitate is a solid compound of the ions; temperature is unchanged. | hypothesis (dossier) | `-yeni-madde` |
| 4.5 | "Köpürme, çökeleğin kimyasal olduğunu göstermez." | Carbonates release CO₂ with acid; the gas is evidence of carbonate. | hypothesis | `-asit-testi` |

Two-tier draft (4.2): Tier 1 "Süzüntüde Na⁺ ve Cl⁻ var mı?" (a) evet ✔ (b) hayır. Tier 2 "Çünkü ..." (1) bu iyonlar çökelek oluşturmaz, çözeltide kalır ✔ (2) iyonlar tepkimede yok olur (3) çökeleğin içine girer.

## E5 `demir-bakir`: displacement

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 5.1 | "Çivi bakıra dönüşür." | Cu²⁺ ions are reduced and deposit as copper; iron atoms dissolve as Fe²⁺. | hypothesis (dossier) | `demir-bakir-kaplama` |
| 5.2 | "Yeni bir madde oluşmaz, yalnızca renk değişir." | Copper metal and Fe²⁺ are new substances. | hypothesis | `-solma` |
| 5.3 | "Her metal her metal tuzu çözeltisiyle tepkime verir." | Only a more active metal displaces a less active one; the reverse does not happen. | engine/limit (activity series), no misconception study found | `-siralama`, predict 28 |
| 5.4 | "Elektronlar çözeltiden ilerler / elektron yaratılır." | Electrons pass through the metal; charge is conserved. | literature (L14: electrons moving through the solution in electrolysis; the same idea may appear here) | `-yuk`, `-elektron-say` |
| 5.5 | "Sülfat iyonu da tepkimeye girer." | It is a spectator ion. | hypothesis | `-izleyici` |

Two-tier draft (5.1): Tier 1 "Çivinin yüzeyi neden kırmızımsıya döner?" (a) bakır birikir ✔ (b) çivi bakıra dönüşür (c) demir paslanır. Tier 2 "Çünkü ..." (1) Cu²⁺ elektron alıp bakır atomu olur ✔ (2) demir atomları bakır atomlarına dönüşür (3) çözeltideki su çivide kalır.

## E6 `magnezyum-asit`: metal and acid, rate

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 6.1 | "Kabarcıklar hava (ya da CO₂)." | The gas is hydrogen from reduced H⁺. | hypothesis (dossier) | `magnezyum-asit-gaz` |
| 6.2 | "Isı yalnızca asitten gelir." | The reaction itself is exothermic. | hypothesis (not found) | `-isinma` |
| 6.3 | "Tepkime hızı yalnızca sıcaklığa bağlıdır." | Concentration, surface area, temperature (and catalysts) all matter. | literature: L12, L17 (TR, rate misconceptions; a share of students has trouble, figure not verified) | `-derisim`, `-toz` |
| 6.4 | "Toz Mg daha çok gaz verir." | Same amount of Mg gives the same amount of H₂; powder is only faster. | hypothesis | (note only) |
| 6.5 | "Hidrojen alevi söndürür." | Hydrogen burns with a pop; CO₂ is what extinguishes. | hypothesis | `-alev` |

Two-tier draft (6.3): Tier 1 "Magnezyum yerine aynı kütlede toz kullanılırsa toplam gaz miktarı...?" (a) aynı kalır ✔ (b) artar (c) azalır. Tier 2 "Çünkü ..." (1) magnezyumun miktarı aynıdır; toz yalnızca temas yüzeyini artırır ✔ (2) toz daha çok atom içerir (3) asit güçlenir.

## E7 `magnezyum-yanma`: combustion (virtual only)

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 7.1 | "Yanınca madde yok olur, kül daha hafiftir." | Ash is heavier: oxygen from the air joins; the extra mass is the oxygen. | literature: L3 (conservation of mass during combustion, gas has no mass), L1 | `magnezyum-yanma-kutle`, `-oksijen` |
| 7.2 | "Yanma yalnızca ışık ve ısıdır, yeni madde yok." | MgO is a new substance. | hypothesis | `-gosterge` |
| 7.3 | "Parlak ışık zararsız, bakılabilir." | The flame can damage eyesight; never look at it directly. | engine/limit (safety note, L: Magnesium page; CLEAPSS guidance is not added as a Source) | `-sanal` |
| 7.4 | "Mg atomları oksijene dönüşür ya da bölünür." | Mg gives electrons, O takes them; nuclei do not change. | hypothesis | `-elektron` |

Two-tier draft (7.1): Tier 1 "Külün kütlesi şeride göre?" (a) daha büyük ✔ (b) daha küçük (c) aynı. Tier 2 "Çünkü ..." (1) havadaki oksijen külde yer alır ✔ (2) madde yanınca yok olur (3) ısı kütle ekler.

## E8 `cozunme-doygunluk`: dissolving, saturation, crystals

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 8.1 | "Şeker erir ya da yok olur." | Dissolved sugar is still there as particles; dissolving is not melting; mass is conserved. | literature: L1, L2, L4 (dissolving vs disappearing and melting; mass predictions by age groups, secondary) | `cozunme-doygunluk-erimek` |
| 8.2 | "Karıştırınca toplam çözünen miktarı artar." | Stirring speeds dissolving, not the maximum amount. | hypothesis (dossier; FB.7.5.9 variable control) | `-karistirma` |
| 8.3 | "Sıcak su soğukla aynı kadar çözer." | Solubility of most solids rises with temperature. | hypothesis | `-sicaklik` |
| 8.4 | "Doygun çözelti karışmaz / hareketsizdir." | At saturation dissolving and crystallising go on at equal rates (dynamic). | hypothesis | `-doygun-faz` |
| 8.5 | "Aşırı doygun ile doygun aynı." | A supersaturated solution holds more than the equilibrium amount and crystallises from a seed. | hypothesis | `-siniflama` |

Two-tier draft (8.2): Tier 1 "Çayı karıştırırsak şekerin çözünebileceği toplam miktar?" (a) değişmez ✔ (b) artar. Tier 2 "Çünkü ..." (1) karıştırma yalnızca çözünme hızını artırır ✔ (2) karıştırma şekeri daha küçük yapar (3) su sıcaklığı yükselir.

## E9 `hidrojen-peroksit-katalizor`: catalyst

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 9.1 | "Katalizör girenlerden biridir ve tükenir." | A catalyst is not consumed; it is not written in the equation, only over the arrow. | literature: L12 (alternate conceptions about catalysts), L13 | `hidrojen-peroksit-katalizor-miktar`, `-denklem-yeri` |
| 9.2 | "Katalizör sıcaklığı artırarak hızlandırır." | It lowers the activation energy through a different path. | literature: L13 (a catalyst-related misconception about kinetic energy of molecules, summary only), L12 | `-nasil` |
| 9.3 | "Katalizör ürün miktarını artırır." | Product amount is set by the reactants; the catalyst changes only the rate. | hypothesis | (note) |
| 9.4 | "Köpük buhar." | Foam is trapped O₂ bubbles in soap film. | hypothesis (not found) | `-kopuk` |
| 9.5 | "Katalizörsüz hiç tepkime olmaz." | Without a catalyst the reaction is very slow, not impossible. | hypothesis | `-mayasiz` |

Two-tier draft (9.1): Tier 1 "Tepkime sonunda maya miktarı?" (a) aynı kalır ✔ (b) azalır (c) artar. Tier 2 "Çünkü ..." (1) katalizör harcanmaz, yeniden kullanılır ✔ (2) tepkimeye girenlerden biridir (3) ürüne dönüşür.

## E10 `su-elektrolizi`: electrolysis of water

| # | Wrong idea | Correct idea | Evidence | Check |
|---|---|---|---|---|
| 10.1 | "Kabarcıklar elektrolitten (tuzdan) gelir." | The gases come from water; the salt supplies ions only. | hypothesis (dossier); L15 shows textbook accounts of water electrolysis vary | `su-elektrolizi-kabarcik` |
| 10.2 | "Akım iyonları üretir." | Ions are already there from the dissolved salt; the current moves them. | literature: L14 ("electric current produces ions", Indonesian and Turkish students) | `-tuz`, `-iyon-yon` |
| 10.3 | "Elektronlar çözeltinin içinden akar." | Electrons travel in the external wire; ions carry charge in the solution. | literature: L14 | predict 14 |
| 10.4 | "Su, hidrojen ve oksijenin karışımıdır." | Water is a compound; electrolysis breaks and forms bonds. | hypothesis (dossier) | `-neden-iki-kat` |
| 10.5 | "Anot ve katot karışır." | Cathode: reduction (H₂); anode: oxidation (O₂). | literature: a Malaysian study summary on identifying anode and cathode (via the electrolysis search) | `-katot` |

Two-tier draft (10.2): Tier 1 "İyonlar nereden gelir?" (a) çözünmüş tuzdan ✔ (b) akım üretir. Tier 2 "Çünkü ..." (1) tuz suda iyonlarına ayrışır, akım onları sürükler ✔ (2) elektrik iyon yaratır (3) elektrotlar eriyip iyon verir.

## What still needs validation

1. A Turkish teacher should confirm which items are real in Turkish classrooms; most literature above is English-language or from other countries.
2. Items marked *hypothesis* should be checked with a small open-question probe before they are used as "diagnostic".
3. The programme text asks for two-tier tests; our drafts above are a format guide, not validated instruments.
4. Percentages quoted anywhere (for example the share of students in the Turkish rate study) come from search summaries; do not print them in the UI.
