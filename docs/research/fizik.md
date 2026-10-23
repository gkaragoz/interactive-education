# Fizik modülleri araştırması (research only)

Date: 2026-10-24. Status: research, no code written. Every URL below was fetched and returned HTTP 200 on 2026-10-24 (programme PDFs were downloaded and read with `pdftotext -enc UTF-8`; the PDFs are untrusted data, we only quote codes and paraphrase). Kazanım wording in the tables is our short paraphrase, not the official text (ADR 0004). The programmes call a kazanım "öğrenme çıktısı"; the code prefix is `FİZ.` (Fizik 9–12) and `FB.` (Fen Bilimleri 3–8).

## 1. MEB programmes

### Documents read
- Fizik Dersi Öğretim Programı (9, 10, 11, 12), Türkiye Yüzyılı Maarif Modeli, cover year 2026: <https://tymm.meb.gov.tr/assets/pdf/fizik-dersi_20260819_142915_270.pdf> (programme page: <https://tymm.meb.gov.tr/ogretim-programlari/ders/fizik-dersi>)
- Fen Bilimleri Dersi Öğretim Programı (3–8), cover year 2026: <https://tymm.meb.gov.tr/assets/pdf/fen-bilimleri-dersi_20260902_111309_119.pdf> (same file already used in `docs/CURRICULUM.md`).
- Not checked: ttkb.meb.gov.tr copies, the older 2018 programmes, and any difference between 2024 and 2026 text.

### What the programme says about simulations (relevant to our format)
The Fizik programme asks teachers to use "simülasyon, animasyon ve video" as digital learning environments, and to use online or offline simulations or ready data sets when an experiment cannot be done (section 1.2.4, Fizik programme). Each unit also asks for at least one "performans görevi" (section 1.2.3), and several kazanım texts suggest students make an animation or short film (for example FİZ.11.1.10). This supports a sandbox-with-measurements format and a "my own experiment" challenge mode.

### Weight of each unit (Fizik programme, section 1.3, lesson hours)
| Grade | Unit (hours, share) |
|---|---|
| 9 (72 h) | Fizik Bilimi ve Kariyer Keşfi 8 (11%); Kuvvet ve Hareket 24 (33%); Akışkanlar 18 (25%); Enerji 18 (25%) |
| 10 (72 h) | Kuvvet ve Hareket 14 (19%); Enerji 16 (22%); Elektrik 22 (31%); Dalgalar 16 (22%) |
| 11 (144 h) | Kuvvet ve Hareket 54 (38%); Elektrik ve Manyetizma 48 (33%); Optik 36 (25%) |
| 12 (144 h) | Kuvvet ve Hareket 46 (32%); Enerji 36 (25%); Dalgalar 22 (15%); Madde ve Doğası 34 (24%) |

Most hours go to mechanics (Kuvvet ve Hareket, Enerji), then electricity/magnetism, then waves/optics.

### Fizik 9–12 kazanımlar (FİZ), with the programme's stated limits

Format of limits: the programme does not use a separate "girilmez" column; the limits are sentences inside the unit's teaching notes ("...girilmez", "...kaçınılır", "...ile sınırlı kalınır"). They are quoted below as short paraphrases with the code they sit under. Doppler effect, universal gravitation (Newton's law of gravitation), Kepler's laws, line spectra and a separate collision unit do **not appear** in the programme text (searched by keyword); the only gravity-related item is an enrichment note about free fall on other planets under FİZ.11.1.10.

**Grade 9**
| Code | Theme | Paraphrase | Limit / note |
|---|---|---|---|
| FİZ.9.1.1–4 | Fizik Bilimi ve Kariyer Keşfi | Define physics, classify its branches, scientists' work, careers | Not simulation material |
| FİZ.9.2.1 | Kuvvet ve Hareket | Classify SI base and derived quantities | |
| FİZ.9.2.2 | " | Compare scalar and vector quantities | |
| FİZ.9.2.3 | " | Direction and magnitude of vectors on one line | |
| FİZ.9.2.4 | " | Vector addition (head-to-tail, parallelogram), components | No trigonometric calculation; components only in a Cartesian system (kartezyen) |
| FİZ.9.2.5 | " | Compare the fundamental forces of nature | |
| FİZ.9.2.6 | " | Basic motion concepts (position, displacement, speed, velocity) | |
| FİZ.9.2.7 | " | Classify types of motion | No mathematical models |
| FİZ.9.3.1 | Akışkanlar | Factors affecting pressure | |
| FİZ.9.3.2 | " | Pressure in still liquids | Only interpret how variables relate; no calculation of force on side walls |
| FİZ.9.3.3 | " | Everyday uses of liquid pressure (inquiry) | |
| FİZ.9.3.4 | " | Open (atmospheric) air pressure | |
| FİZ.9.3.5 | " | Experiment on variables of buoyant force | |
| FİZ.9.3.6 | " | Buoyant force equals weight of displaced liquid; link to pressure forces | |
| FİZ.9.3.7 | " | Pipe cross-section, flow speed and pressure (Bernoulli) | Conceptual only, no mathematical model; the programme stresses Bernoulli is not the only effect in aeroplane lift |
| FİZ.9.4.1 | Enerji | Internal energy, heat and temperature | |
| FİZ.9.4.2 | " | Heat, specific heat, heat capacity, temperature change (Q = m c ΔT) | Thermometer scales Kelvin/Celsius/Fahrenheit only; no conversion calculations |
| FİZ.9.4.3 | " | Heat needed for a phase change | |
| FİZ.9.4.4 | " | Thermal equilibrium | |
| FİZ.9.4.5 | " | Heat transfer: conduction, convection, radiation | |
| FİZ.9.4.6 | " | Factors of conduction rate in solids | |

**Grade 10**
| Code | Theme | Paraphrase | Limit / note |
|---|---|---|---|
| FİZ.10.1.1 | Kuvvet ve Hareket | Uniform motion in a horizontal line (position, displacement, velocity, time) | |
| FİZ.10.1.2 | " | Acceleration and velocity change | |
| FİZ.10.1.3 | " | Constant acceleration, graph models | |
| FİZ.10.2.1 | Enerji | Work from force-displacement graph | |
| FİZ.10.2.2 | " | Work, energy, power | |
| FİZ.10.2.3 | " | Compare forms of energy | |
| FİZ.10.2.4 | " | Mechanical energy | |
| FİZ.10.2.5 | " | Renewable and non-renewable sources | |
| FİZ.10.3.1 | Elektrik | Potential difference, current, resistance (water-pipe analogy) | |
| FİZ.10.3.2 | " | Electric current as moving charge | |
| FİZ.10.3.3 | " | Ohm's law | No internal resistance calculations; no EMF concept |
| FİZ.10.3.4 | " | Equivalent resistance: series, parallel, mixed | Kirchhoff's second law is not used |
| FİZ.10.3.5 | " | Generator (üreteç) connections, series/parallel | |
| FİZ.10.3.6–7 | " | Electrical hazards; grounding (topraklama) | |
| FİZ.10.4.1 | Dalgalar | Periodic motion | |
| FİZ.10.4.2 | " | Wave basics: amplitude, wavelength, period, frequency | |
| FİZ.10.4.3 | " | Classify waves (transverse/longitudinal, mechanical/EM) | |
| FİZ.10.4.4 | " | What affects wave speed | |
| FİZ.10.4.5 | " | Water-wave reflection and refraction | Echo: no calculations; straight water waves shown with simulation or visuals |
| FİZ.10.4.6–7 | " | Resonance and earthquakes, an earthquake model | |

**Grade 11**
| Code | Theme | Paraphrase | Limit / note |
|---|---|---|---|
| FİZ.11.1.1–2 | Kuvvet ve Hareket | Free fall, acceleration, data | g is taken constant |
| FİZ.11.1.3 | " | Constant acceleration in two dimensions | Do not name "yatay atış" / "eğik atış" as motion types |
| FİZ.11.1.4 | " | Newton's laws, net force and motion | |
| FİZ.11.1.5 | " | Free-body diagrams | No systems of several bodies with different accelerations; constant acceleration only |
| FİZ.11.1.6–7 | " | Static and kinetic friction; friction model | |
| FİZ.11.1.8 | " | Terminal (limit) velocity | |
| FİZ.11.1.9 | " | Uniform circular motion: trajectory, velocity vector | |
| FİZ.11.1.10 | " | Circular motion model; horizontal/vertical circle, banked curves | No maths on circular motion in a rail system; enrichment mentions other planets' gravity |
| FİZ.11.2.1–3 | Elektrik ve Manyetizma | Coulomb force, electric field, Faraday cage | |
| FİZ.11.2.4–7 | " | Magnet interaction; field of a straight wire; solenoid axis field; electromagnets | |
| FİZ.11.2.8–9 | " | Force on a current-carrying wire; electric motor principle | |
| FİZ.11.2.10–12 | " | Magnetic flux, induced EMF, alternating current | |
| FİZ.11.2.13 | " | Transformer | Only interpret relations between quantities; no calculation |
| FİZ.11.3.1 | Optik | Luminous intensity, flux, illuminance | |
| FİZ.11.3.2 | " | Plane mirrors | |
| FİZ.11.3.3–4 | " | Spherical mirrors, image formation experiment | |
| FİZ.11.3.5–6 | " | Light in transparent media; apparent depth | |
| FİZ.11.3.7 | " | Optical fibre | |
| FİZ.11.3.8 | " | Prisms and combined systems | |
| FİZ.11.3.9–10 | " | Lenses, image formation | |

**Grade 12**
| Code | Theme | Paraphrase | Limit / note |
|---|---|---|---|
| FİZ.12.1.1 | Kuvvet ve Hareket | Torque model | |
| FİZ.12.1.2 | " | Equilibrium, centre of mass, centre of gravity | Lami's theorem not used |
| FİZ.12.1.3–4 | " | Impulse, momentum; conservation (elastic/inelastic collisions, explosions, rocket via simulation) | |
| FİZ.12.1.5–6 | " | Moment of inertia; angular momentum conservation | |
| FİZ.12.2.1–3 | Enerji | Spring constant; spring potential energy | |
| FİZ.12.2.4 | " | Work done by friction | |
| FİZ.12.2.5–6 | " | Energy transformation and conservation; efficiency | A note suggests comparing a frictionless and a frictional inclined plane |
| FİZ.12.3.1 | Dalgalar | Diffraction of straight water waves | |
| FİZ.12.3.2 | " | Interference of circular water waves | |
| FİZ.12.3.3–4 | " | Interference and diffraction of light (experiment) | |
| FİZ.12.3.5 | " | Electromagnetic spectrum | |
| FİZ.12.3.6 | " | Light colours and wavelengths | |
| FİZ.12.3.7 | " | Devices using waves | |
| FİZ.12.4.1 | Madde ve Doğası | Planck constant, blackbody radiation | |
| FİZ.12.4.2–3 | " | Photoelectric effect, photon | Photon only in the particle model of light; no quantum properties of the photon |
| FİZ.12.4.4–5 | " | Semiconductors; superconductors (inquiry) | |
| FİZ.12.4.6 | " | Standard model | Names and classification of fundamental particles only; hadron types not detailed |
| FİZ.12.4.7 | " | Modern atom theory, elementary particles | No atom quantum mechanics, no Bohr model, no mathematical models |
| FİZ.12.4.8 | " | Nuclear energy (inquiry) | |

### Fen Bilimleri 3–8: physics-related kazanımlar (FB)
| Grade | Code | Theme (unit) | Paraphrase | Limit / note |
|---|---|---|---|---|
| 3 | FB.3.5.1–2 | Hareketi Keşfediyorum | Motion state of objects; effects of force | |
| 3 | FB.3.6.1–3 | Yaşamımızı Kolaylaştıran Elektrik | Electrical appliances, safe use, saving | |
| 4 | FB.4.5.1–3 | Mıknatısı Keşfediyorum | Poles, interaction, materials, uses | |
| 4 | FB.4.6.1–2 | Elektrik ve Enerji Kaynakları | Build a simple circuit; energy sources | |
| 4 | FB.4.7.1–3 | Işığı Tanıyalım | Light and vision, sources, light pollution | |
| 5 | FB.5.2.1–4 | Kuvveti Tanıyalım | Force magnitude, dynamometer, mass vs weight, friction | |
| 5 | FB.5.4.1–3 | Işığın Dünyası | Straight-line light, transparency classes, full shadow | Shadow-number changes with source count are not entered |
| 5 | FB.5.5.2–6 | Maddenin Doğası | Heat vs temperature, mixing liquids, phase change, conduction, insulation | |
| 5 | FB.5.6.1–3 | Yaşamımızdaki Elektrik | Circuit symbols, build circuits, bulb brightness | |
| 6 | FB.6.2.1–3 | Kuvvetin Etkisinde Hareket | Net force on one line, balanced/unbalanced, speed vs velocity | Graph reading and maths not entered |
| 6 | FB.6.4.1–7 | Işığın Yansıması ve Renkler | Reflection, normal, mirrors, absorption, white light and colours, solar energy | No special-ray image drawing and no formulas for mirrors |
| 6 | FB.6.6.1–3 | Elektriğin İletimi ve Direnç | Conductors, bulb brightness variables, variable resistor | |
| 7 | FB.7.2.1–3 | Kuvvet ve Enerjiyi Keşfedelim | Work (force, displacement), kinetic and potential energy, conservation | Only kinetic and potential energy; no maths for their conversion |
| 7 | FB.7.4.1–3 | Işığın Kırılması ve Mercekler | Refraction, lens types, uses | Critical angle and total internal reflection not entered |
| 7 | FB.7.6.1–3 | Elektriklenme | Charging methods, charge types | Electroscope named, its working principle not entered |
| 8 | FB.8.2.1–2 | Yaşamı Kolaylaştıran Kuvvet | Simple machines (lever, pulleys, inclined plane, windlass, screw, wheel and belt), design a machine | No formulas; ratio-proportion only; compound machines qualitatively |
| 8 | FB.8.4.1–6 | Sesin Dünyası | Sound origin, media, pitch, loudness, reflection and absorption, noise | No intensity-distance relation or intensity unit; no echo; no insulation material types |
| 8 | FB.8.6.1–10 | Elektriğin Yolculuğu | Bulb connection, current, voltage, V–I relation, energy conversion, power plants | Mixed (series-parallel) circuits not entered |

Observation: the lower grades set the visual vocabulary (circuits, shadows, mirrors, lenses, force arrows), and the high school programme keeps the same topics with models and graphs. A single module can therefore carry a Temel level (Fen, grades 3–8) and an İleri level (Fizik, 9–12), as the biology modules do with `LevelId`.

## 2. Ranking: benefit from 3D, animation and interaction

Scale: **Gain** = how much a student understands more with a moving 3D or interactive view than with a textbook figure (1–5). **Cost** = difficulty for a three.js build (1 easy, 5 hard). **Format**: S = sandbox (sliders, measurements, graphs), T = timeline explainer (existing `ModuleScene.seek(t)` contract), S+T = both.
"Weight" is from section 1.3 hours.

| Rank | Topic | Grade / kazanım | Weight | Gain | Cost | Format | Technical note |
|---|---|---|---|---|---|---|---|
| 1 | Kinematics: motion graphs, vectors | 9.2, 10.1, 11.1.1–3 | high (9: 33%) | 5 | 2 | S | Closed-form or fixed-step; live x–t, v–t, a–t graphs linked to a car/ball on a track. Assets: a few simple props. Best first sandbox. |
| 2 | Newton's laws, friction, inclined plane, free-body diagram | 11.1.4–8, FB.5.2, FB.6.2, 12.2.4 | high (11: 38%) | 5 | 3 | S | Rigid body on a plane, force arrows drawn from the state. Static/kinetic friction needs a stick-slip rule (threshold, then μk). Limit velocity needs drag term (semi-implicit Euler). |
| 3 | Electric circuits, Ohm, series/parallel | 10.3, FB.4.6, 5.6, 6.6, 8.6 | high (10: 31%) | 5 | 3 | S | Not 3D physics: a circuit board with bulbs, switches, batteries; nodal solver in pure TypeScript (linear equations); animated charge drift as a visual only. Water-pipe analogy fits FİZ.10.3.1. |
| 4 | Geometric optics: reflection, refraction, mirrors, lenses, prisms, colour | 11.3, FB.6.4, 7.4, 12.3.6 | high (11: 25%) | 5 | 3 | S | 2D ray tracing (Snell, mirror and thin-lens formulas), shown on a 3D optical bench. Drag object, move focal length slider. Dispersion via wavelength-dependent index. |
| 5 | Energy and work, conservation (skate park, spring, incline) | 10.2, 12.2, FB.7.2 | high (12: 25%) | 4 | 2 | S+T | Bar chart of KE/PE/thermal vs time; fixed-step integrator with energy-drift check. Friction toggle. |
| 6 | Momentum and collisions | 12.1.3–4 | medium | 4 | 2 | S | 1D/2D discs; elastic/inelastic slider; conservation check. Programme explicitly suggests simulation. |
| 7 | Waves: superposition, ripple tank, interference, diffraction, reflection and refraction | 10.4, 12.3.1–2 | medium (15–22%) | 5 | 4 | S | Wave field on GPU (height texture, 2-pass ping-pong, 2D wave equation) or analytic sum of circular waves in a fragment shader. Analytic is simpler and deterministic. Water surface shown as a displaced plane. |
| 8 | Light interference and diffraction (double slit), EM spectrum | 12.3.3–6 | medium | 4 | 3 | S+T | Intensity pattern as a formula in a shader; sliders for slit distance and wavelength. |
| 9 | Pressure and fluids: buoyancy, Pascal-like pressure, Bernoulli | 9.3 | high (9: 25%) | 4 | 3 | S+T | Buoyancy: tank, block with density slider, displaced-liquid ghost (no fluid solver needed). Bernoulli kept conceptual (programme says no maths): pipe with particles whose speed follows continuity. Real SPH is overkill. |
| 10 | Circular motion | 11.1.9–10 | medium | 4 | 2 | S+T | Velocity vector tangent, centripetal arrow, string-cut moment. |
| 11 | Magnetism, induction, motor, transformer | 11.2.4–13 | high (11: 33%) | 5 | 4 | S+T | Field lines from analytic dipole/wire/solenoid formulas (compute once, instance lines); moving magnet through coil with flux graph. Motor as a T explainer. |
| 12 | Electrostatics: Coulomb, field lines, charging | 11.2.1–3, FB.7.6 | medium | 4 | 3 | S | Point charges with drag; field arrows on a grid; energy-based charging stories as T. |
| 13 | Heat and temperature, phase change, heat transfer | 9.4, FB.5.5 | medium | 3 | 3 | S+T | Particle view for conduction; heating curve graph with plateaus; mixing calorimeter. Particle count is small, so CPU instanced meshes suffice. |
| 14 | Torque, equilibrium, centre of mass | 12.1.1–2, FB.8.2 | medium | 4 | 3 | S | Seesaw/lever with draggable weights; centre of mass marker. |
| 15 | Simple machines | FB.8.2 | low (grade 8) | 3 | 2 | S+T | Lever, pulley, inclined plane; "force vs distance" tradeoff. Qualitative ratios only. |
| 16 | Sound | 10.4, FB.8.4 | low (8: unit) | 3 | 3 | S+T | Longitudinal wave as compressing particle rows; Web Audio for pitch/loudness (optional, needs user gesture). Doppler is not in the programme: keep as optional enrichment only if the user asks. |
| 17 | Modern physics: photoelectric effect, Planck, atom | 12.4 | medium (24%) | 3 | 3 | S+T | Photoelectric: sliders for frequency and intensity; ejected electron counts and the kinetic-energy graph. The programme forbids Bohr model and photon quantum properties, so spectra/line spectra are out of scope. Standard model is a catalogue card, not a simulation. |
| 18 | Free fall and 2D motion (projectile) | 11.1.1–3 | medium | 4 | 1 | S | Part of the kinematics module; the programme avoids the names "yatay atış" and "eğik atış", so title it "iki boyutta sabit ivmeli hareket". |
| 19 | Gravitation and orbits | not in 9–12 text | none | 4 | 3 | T | Only circular motion context (Türksat satellites in FİZ.11.1.9 notes). Out of the programme: park it. |
| 20 | Earthquake, resonance | 10.4.6–7 | low | 3 | 3 | T | Resonant building on shaking base; mass-spring oscillators. Local relevance for Turkey. |

Why this order: the two top rows are also where the programme spends most hours, so they are the best proof of the sandbox idea, and they need no new assets beyond primitives.

## 3. Proposed modules and release order

Existing releases: v0.2–v0.6.1 are timeline explainers (`mitosis-meiosis` ... `genetics`, `docs/MODULES.md`). Physics needs a stateful interactive scene, which the current `ModuleScene` ("pure function of time") does not cover for sliders. Proposal: keep the old contract for T modules; add a second contract for S modules (next section). This is a decision for the user (see section 5).

| Version | Module id | Topics | Kazanım | Format |
|---|---|---|---|---|
| v0.7 | `physics-sandbox` shell + `kinematics` | vectors, uniform and accelerated motion, linked graphs, free fall, 2D constant acceleration | FİZ.9.2.2–7, 10.1.1–3, 11.1.1–3; FB.6.2.3 | S (pilot) |
| v0.8 | `circuits` | Simple circuit, Ohm, series/parallel, bulb brightness | FİZ.10.3.1–5; FB.4.6, 5.6, 6.6, 8.6 | S |
| v0.9 | `optics` | Reflection, plane/spherical mirrors, refraction, lenses, prism, colour | FİZ.11.3.2–10, 12.3.6; FB.6.4, 7.4 | S |
| v0.10 | `forces` | Net force, Newton, free-body diagram, friction, incline, terminal velocity | FİZ.11.1.4–8, 9.2.4; FB.5.2, 6.2 | S |
| v0.11 | `energy-work` | Work, power, KE/PE, conservation, spring, efficiency | FİZ.10.2.1–4, 12.2.1–6; FB.7.2 | S+T |
| v0.12 | `momentum` + `circular-motion` | Impulse, collisions, uniform circular motion | FİZ.12.1.3–4, 11.1.9–10 | S |
| v0.13 | `waves` | Wave basics, ripple tank, reflection/refraction, interference, diffraction, sound | FİZ.10.4.1–5, 12.3.1–2; FB.8.4 | S |
| v0.14 | `fluids` | Pressure, buoyancy, Bernoulli | FİZ.9.3.1–7 | S+T |
| v0.15 | `em-induction` | Magnet field, wire/solenoid, induction, motor, transformer | FİZ.11.2.4–13 | S+T |
| v0.16 | `electrostatics`, `heat` | Coulomb, field, charging; heat transfer, phase change | FİZ.11.2.1–3, 9.4.1–6; FB.7.6, 5.5 | S |
| v0.17 | `modern-physics`, `light-waves` | Photoelectric effect; double slit, EM spectrum | FİZ.12.4.1–3, 12.3.3–5 | S+T |
| later | `torque`, `simple-machines`, `earthquake` | | FİZ.12.1.1–2, FB.8.2, FİZ.10.4.6–7 | S / T |

Each module follows the existing rule that it ships with Source and kazanım links and a test that enforces both. Learner text is in Turkish and in our own words (ADR 0004).

### Recommended common physics sandbox framework

1. **Scene contract (new, additive).** Suggested shape (design only; to be settled in an ADR before code):
   - `SimScene` has `params` (typed slider definitions with id, Turkish label, unit, min, max, step, default, optional "locked in challenge"), `step(dt)` advancing a deterministic state, `reset(paramValues)`, `measurements()` returning named values with units, `snapshot()` / `restore()` for scrub-back, and `dispose()`.
   - The runner drives `step` with a **fixed time step** (for example 1/120 s) and an accumulator, rendering with interpolation between the last two states, as described in Gaffer On Games "Fix Your Timestep": <https://gafferongames.com/post/fix_your_timestep/>. Integrators: closed form where available (kinematics, optics, interference), **semi-implicit (symplectic) Euler** or velocity Verlet for forces and springs (energy stays bounded), RK4 only if damping/accuracy needs it: <https://gafferongames.com/post/integration_basics/>, <https://en.wikipedia.org/wiki/Semi-implicit_Euler_method>, <https://en.wikipedia.org/wiki/Verlet_integration>.
   - Determinism: seeded RNG only and no wall-clock use, same rule as T modules, so tests can step N frames and compare numbers.
2. **Parameter sliders.** Same control kit across modules (slider, numeric field, preset buttons). Values are SI internally, units shown as Turkish symbols. Ranges are chosen so the programme's limits hold (for example circuits: no internal resistance control in Temel level).
3. **Measurements.** Probe tools shown in 3D scene (stopwatch, ruler, ammeter, voltmeter, force arrow) plus a table that the student can "record a row" into (supports FİZ "veri toplayıp kaydeder" outputs). Export as CSV optional.
4. **Graphs.** A shared 2D canvas graph component (time series and x–y), auto-scaling, with a cursor tied to the scene (hover shows the moment). Reuse the existing `chartAt`/chart UI from the biology modules where possible.
5. **Reset and challenge mode.** `Reset` restores defaults; **Challenge** shows a goal ("hit the target at 12 m", "make the bulb as bright as bulb A", "find the focal length") with a hidden parameter, a check against measured values, tolerance, and a short Turkish explanation after success. No scoring server, no accounts; results are not stored beyond the page (matches "static site, no backend").
6. **Levels.** `Temel` hides formulas and numeric fields (qualitative arrows, brightness, graphs without axes numbers when the Fen programme says so) and `İleri` shows equations and values, mirroring biology `LevelId`.
7. **Accessibility and reduced motion.** Honour `reducedMotion`; every slider is keyboard-operable. Desktop-only for now (CLAUDE.md scope).
8. **Performance budget.** CPU for particles below a few thousand instances; GPU wave field only for the waves module (render target ping-pong in three.js: <https://threejs.org/docs/>).

### Prior art (inspiration only, nothing copied)
- PhET Interactive Simulations: Projectile Motion <https://phet.colorado.edu/en/simulations/projectile-motion>, Forces and Motion: Basics <https://phet.colorado.edu/en/simulations/forces-and-motion-basics>, Circuit Construction Kit DC <https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc>, Wave Interference <https://phet.colorado.edu/en/simulations/wave-interference>, Geometric Optics <https://phet.colorado.edu/en/simulations/geometric-optics>, Faraday's Law <https://phet.colorado.edu/en/simulations/faradays-law>, Photoelectric Effect <https://phet.colorado.edu/en/simulations/photoelectric>, Buoyancy <https://phet.colorado.edu/en/simulations/buoyancy>, Collision Lab <https://phet.colorado.edu/en/simulations/collision-lab>, Energy Skate Park <https://phet.colorado.edu/en/simulations/energy-skate-park>, Gravity and Orbits <https://phet.colorado.edu/en/simulations/gravity-and-orbits>. Licence: the PhET licensing page says simulations released **before 2026-03-29** ("Historical PhET Simulations") are CC BY 4.0, with attribution, and that newer HTML simulations are under terms stated separately on the Licensing page: <https://phet.colorado.edu/en/licensing/html>. Because of that change and the "never copy" rule we use PhET only to see which controls and graphs students find useful; no code, text, images, or sim files are reused.
- Open textbooks for cross-checking physics facts only: OpenStax University Physics vol. 1 <https://openstax.org/books/university-physics-volume-1/pages/preface>, vol. 2 <https://openstax.org/details/books/university-physics-volume-2>, vol. 3 <https://openstax.org/details/books/university-physics-volume-3>, College Physics 2e <https://openstax.org/books/college-physics-2e/pages/preface>. **Correction to the brief**: the preface pages of vol. 1 and College Physics 2e state the licence is **CC BY-NC-SA 4.0** (not CC BY), the same as OpenStax Biology in ADR 0004. So no text and no images are copied; facts only. (Vol. 2 and 3 pages were only confirmed to exist; the licence is assumed to be the same series licence and must be checked before use.)
- Vikipedi / Wikipedia (CC BY-SA 4.0, explanatory reference only, as in ADR 0004): Fizik <https://tr.wikipedia.org/wiki/Fizik>, Newton'ın hareket yasaları <https://tr.wikipedia.org/wiki/Newton%27%C4%B1n_hareket_yasalar%C4%B1>, Momentum <https://tr.wikipedia.org/wiki/Momentum>, Ohm yasası <https://tr.wikipedia.org/wiki/Ohm_yasas%C4%B1>, Snell yasası <https://tr.wikipedia.org/wiki/Snell_yasas%C4%B1>, Arşimet prensibi <https://tr.wikipedia.org/wiki/Ar%C5%9Fimet_prensibi>, Bernoulli prensibi <https://tr.wikipedia.org/wiki/Bernoulli_prensibi>, Fotoelektrik olay <https://tr.wikipedia.org/wiki/Fotoelektrik_olay>, Basit makine <https://tr.wikipedia.org/wiki/Basit_makine>, Doppler etkisi <https://tr.wikipedia.org/wiki/Doppler_etkisi> (not in programme), FDTD method <https://en.wikipedia.org/wiki/Finite-difference_time-domain_method> (background for the wave field; not required), Doppler effect <https://en.wikipedia.org/wiki/Doppler_effect>.
- three.js documentation (API reference for the rendering part): <https://threejs.org/docs/>.

## 4. Risks

1. **Contract mismatch.** The `ModuleScene` contract (pure function of time, scrub and reverse) conflicts with sliders and challenge mode. A second contract is needed; the shell, registry, home cards, tests and the QA agents must learn two module kinds. Medium effort, affects `src/scene` and `src/app`.
2. **Scope creep in numerical physics.** Friction, collisions and stick-slip can look wrong if the integrator is unstable or the time step varies. Mitigate: fixed step, energy-drift and momentum-conservation unit tests, closed-form where possible.
3. **Programme limits vs physics honesty.** The programme tells textbooks to avoid calculations (Bernoulli, echo, Bohr, Doppler absent). A sandbox invites students to explore beyond that. Decide: stay inside the limits (safest for MEB alignment and "fully cited") or allow a clearly labelled "İleri / zenginleştirme" mode.
4. **3D adds little for some topics.** Circuits and graphs are mostly 2D; 3D is a presentation layer. Risk of effort without learning gain; keep 3D light (a bench, depth cues, camera presets).
5. **Content volume.** About 17 modules; the biology run delivered one release per module with Blender assets. Physics needs few GLB assets (mostly primitives and procedural meshes), so asset work should shrink, but copy writing, sources and kazanım links per item remain the bottleneck.
6. **Licence traps.** PhET changed terms on 2026-03-29; OpenStax is NC-SA, not CC BY. Do not copy from either; record as references only.
7. **Programme text may change.** The PDFs are 2026 versions (19 Aug 2026 for Fizik, 2 Sep 2026 for Fen). We did not compare with 2024 or with ttkb.meb.gov.tr copies; re-check before each release.
8. **PDF extraction caveat.** `pdftotext` without `-enc UTF-8` drops Turkish characters; the default output is unreadable. Use UTF-8 and the `-raw` mode when re-extracting.
9. **Fonts for maths.** Formulas (Q = m c ΔT, F = m a) need a consistent rendering approach (HTML/CSS text vs MathML vs KaTeX). Not decided.
10. **Performance on integrated GPUs** for the GPU wave field and many ray paths; needs the existing `quality` presets.
11. **Learning-outcome validation.** We cannot test whether students learn more; the Challenge mode gives some signal only if analytics exist, and none are planned (no backend).

## 5. Unresolved questions for the user

1. Is a second, stateful "sandbox" module contract acceptable, or must every physics module also be a timeline explainer? (Section 3 assumes the former.)
2. Which audience first: ortaokul Fen (3–8, qualitative, Temel level) or lise Fizik (9–12, quantitative, İleri level)? Biology started with grade 5 and 9. A reasonable split: Temel for FB, İleri for FİZ in the same module.
3. Start with kinematics (highest hours, easiest, graphs) or circuits (most visual, most classroom use)? The order in section 3 puts kinematics first as the framework pilot and circuits second.
4. May we leave the programme limits for an optional "zenginleştirme" mode (for example Doppler, Bohr, mirror formulas)? If yes, how do we label it so it does not look like required content?
5. Is sound output (Web Audio) wanted? Browsers need a user gesture and it affects accessibility.
6. Do we want an exam-style "challenge" (answers checked, TYT/AYT style) or only exploratory goals?
7. Maths rendering choice (KaTeX vs plain text) and whether to show numeric values at Temel level.
8. Should earthquake/resonance (FİZ.10.4.6–7) be prioritised for local relevance even though it ranks low on 3D gain?
9. Any preference for the module id naming (English slugs as in `membrane-transport`) and the card grouping on the home page (by discipline: Biyoloji / Fizik)?
10. Do we keep desktop-only for physics as per CLAUDE.md, even though sliders are friendly to touch?
