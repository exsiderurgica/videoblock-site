# NOCTIS — Piazza del Gesù, art-direction rebuild (work in progress)

**Status, 5 November 2026: technical experiment — visual quality NOT APPROVED.**

This is NOT a new public release of the game. The current scene uses genuine WebGL 3D geometry, a texture atlas, touch controls and a basic third-person camera, but the architecture, materials, lighting and protagonist are still below the visual reference supplied by the project owner (the atmospheric night-time low-poly city video).

## Project direction

- **Real 3D**, not prerendered images with 2D character cutouts; web-first, Android APK later.
- **Piazza del Gesù Nuovo, Naples**: recognizable rusticated church facade, Guglia dell'Immacolata, surrounding palazzi and streets.
- Visual benchmark: atmospheric authorial low-poly / early PS2, blue night sky, warmly illuminated windows and streetlamps, believable period architecture and natural surfaces. Retro must be intentional, not crude.
- Third-person follow camera; full touch controls in portrait and landscape; original soundscape.
- Protagonist reference: real person's supplied photos (black hoodie, tied hair, loose trousers). Current procedural character is only a technical placeholder.

## Current files

- `index.html` web entry point; `game.js` WebGL geometry, scene and controls.
- `assets/materials.png` texture atlas used at runtime.
- `generate_textures.py` generates initial material textures (requires Pillow).
- `tests/vtk_full.png`, `tests/uv_full.png`, `tests/atlas_preview.png` are saved offline debugging previews, **not proof of commercial-quality art**.

## Try locally

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

The current `game.js` soundtrack loader expects shared website audio files under `../music/p0.bin` etc., so audio playback will require that site structure. In the public VideoBlock repository the data is under `/noctis/music/`; this branch does not change that deployed route.

## Blocking issues before public promotion

1. Replace placeholder procedural protagonist with an articulated humanoid mesh, authentic textures and intentional walk/run animations.
2. Model actual Piazza del Gesù facades from accurate references rather than simplified cubes.
3. Build nighttime lightmap / baked lighting, convincing warm pools of light, dark blue ambient and believable paving.
4. Test visual quality on an Android device in portrait *and* landscape before updating any public `/noctis/` entry.
5. Properly validate in a browser and fix any performance issues. Current offline render and syntax checks are insufficient for a release.

**This branch is deliberately isolated from `main`.**