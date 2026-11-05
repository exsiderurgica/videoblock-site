# NOCTIS / RE1 fixed camera test

First playable **experimental** browser test with true skinned GLB character, Idle / Walk / Run; pre-rendered Piazza del Gesù atmosphere and touch controls in portrait and landscape.

Hero model: `Soldier.glb` (three.js sample; original MIT distribution). The source model is **not** yet a likeness of the person in the reference photos. The game neither shows a photo-cutout nor promises photographic character matching.

The background is a previously created concept image of Piazza del Gesù, **not** a geometrically calibrated reconstruction. This is a camera/animation integration test; no metric occlusion or multi-camera calibration yet.

Hosted audio is loaded from the existing `/noctis/music/p0.bin` to `p5.bin` parts. Audio may require a user gesture on Android.

Dependencies: Three.js 0.164.1 from jsDelivr (pinned), GLTFLoader, an approximately 2 MB local GLB. No client install.

Asset credits: Soldier.glb copied from https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf ; Three.js MIT license, see https://github.com/mrdoob/three.js/blob/dev/LICENSE .