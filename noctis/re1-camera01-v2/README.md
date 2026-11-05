# NOCTIS — RE1 reboot / Camera 01 V2 (unapproved technical branch)

Rebuild of the Piazza del Gesù Nuovo scene from **new THREE.js geometry**, not the earlier still image. Intended rendering architecture: a **single fixed camera** produces a still background ONCE in the browser; a skinned 3D actor is composited on top using **depth-only versions of the same scene meshes**; blockers are measured in the same metric world coordinates. Touch + tank controls, background soundtrack and one interaction included. This is an experimental browser prototype, not a PS1 executable.

The Guglia is a fresh ~30m tiered baroque working reconstruction, with broad sculptural pedestal, saint figures, cornices, tall shaft and green copper Mary. Scale is a working art-direction target, not a survey-confirmed monument height. Sources conflict (some guides ~22m; Art Bonus reports >30m). Church facade has diamond-shaped piperno bossage modelled as actual triangular faces. The palazzi and nighttime plaza are artistic, stylized stand-ins.

**Unfinished:** exact architectural photogrammetry and facade details; actual statue likeness and carving; photo-matched perspectives; character face, tied hair and clothes matching supplied images; tested quality of lighting; animation quality. Real screenshots must be judged visually, not only by CI success.

Paths:
- \`index.html\` mobile test
- \`world.js\` architecture, 3D walkway and depth source
- \`monument.js\` rebuilt spire
- \`game.js\` single-camera bake + the actor rig, depth and collision

Existing public release under \`/noctis/\` and \`/noctis/re1-civilian/\` must remain unchanged.
