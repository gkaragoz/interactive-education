# nervous (Sinir sistemi)

Three animated tracks, two levels. Kazanım: BİY.11.1.7-8, FB.6.3.6. Content: `src/data/modules/nervous*.ts`. Every track is a pure function of time (`seek(t)`).
Preview: `#/modul/nervous?demo` (registered in `entries/index.ts`, released by `releases.ts`, which this module never touches).

| track                 | duration | level         | scene                                                                                                                                                                                                                                             |
| --------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refleks-yayi`        | 40 s     | Temel + İleri | hand on a hot pot, sensory neuron (forearm part turns with the elbow), spinal cord cross-section with butterfly grey matter, interneuron, motor neuron, biceps that swells, hand pulled away; slow violet branch to the brain arrives last (36 s) |
| `aksiyon-potansiyeli` | 36 s     | İleri         | cut-away axon: two instanced lipid bilayers, 4 sites x 2 walls of Na+ channel, K+ channel and pump, Na+/K+ ions, "+"/"-" charge markers, a wave that travels right (0.42 s per unit), electrode at the left                                       |
| `sinaps`              | 36 s     | İleri         | terminal and receiving cell as cut-away plates, 5 vesicles that dock, fuse (clip-plane cup) and refill, 50 transmitter molecules, Ca2+ and Na+ ions, receptor-gated channels, reuptake transporters and enzymes                                   |

## How it works

- `math.ts` has `pchip` (monotone cubic): the voltage curve passes through the data value at every phase start, peaks at exactly +30 mV at 15 s, bottoms at -80 mV at 29 s.
- Reflex: `reflex/timing.ts` (legs: sensory 9-16, interneuron 16.6-21.4, motor 22-29, brain branch 16.6-36; elbow angle, contraction), `paths.ts` (a neuron's centre line in 1-2 curves; the forearm curve is in forearm-local coordinates and follows the elbow), `glowMat.ts` (clay material + `aS` vertex attribute + uniforms: the impulse glow is a shader term, so the whole neuron lights up from one number). `pulse.ts` is the bead + tail.
- Action potential: `action/model.ts` (voltage, `lagAt(x)`, channel gates and states, ion transits, ion counts), `channel.ts` (painted `na-channel`/`k-channel` closed/open assets swapped by gate state; `makeChannel` is the procedural cut-away barrel with a moving flap, used by the synapse), `ions.ts`, `membrane.ts`.
- Synapse: `synapse/model.ts` (the plan: fusion times, per-molecule release, binding, removal; removal times are chosen so the cleft holds 100/70/40/0 % at 16/21/27/33 s), `motion.ts` (positions from the plan), `shapes.ts` (extruded plates), `proteins.ts`.
- `walk.ts`: Brownian-looking jitter from incommensurate sines plus gate legs (no state). `kit.ts`: shared clay materials, sprites, backdrop bands; `noAO()` keeps glow quads out of the high-quality ambient-occlusion pass (otherwise they draw dark boxes).
- Camera paths put the action in the clear part of the stage (the shell panels cover the corners); labels are level-adaptive (Temel never shows "Ara nöron" or "Reseptör").

## Camera, panels, reduced motion
Camera paths look at the point of interest (`cp(x, y, d)`); the stage centres the picture in the area the shell panels leave free (`setSafeInsets`), so scenes carry no panel offsets. With reduced motion the player does not play (the learner steps with the playhead) and the Brownian jitter amplitude is smaller; every pose is still a pure function of t.

## Assets

Used: `na-channel`, `na-channel-open`, `k-channel`, `k-channel-open`, `pump-protein`. Not used: `neuron`, `synapse-terminal`, `neurotransmitter` (the scenes need per-part motion, cut-aways and clip planes), `reflex-arc-parts` (tried for the cord: its pale pink grey matter and fixed roots do not line up with the neurons drawn here). Procedural stand-ins in the synapse: Ca2+ channel, receptor-gated channel, transporter, enzyme.

## Tests

`tests/modules/nervous.test.ts` (data values at phase starts, determinism, backward seek, no pops, channel and ion bookkeeping, pulse timing), `tests/e2e/nervous.spec.ts`.
