# Cutaway uses real clipping planes with a capped interior, not pre-cut models

The Shell and organelles are whole meshes; the Cutaway is a runtime clipping plane plus a cap material so the cut looks solid. Pre-cut meshes would be cheaper but fix the cut angle and break Isolate and Comparison, which need the same whole organelles. Organelle assets must therefore be closed (watertight) meshes; the GLB contract tests check this.
