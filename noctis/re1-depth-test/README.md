# NOCTIS / RE1: fixed camera depth test

Experimental branch: **NOT an approved game build**.

This trial uses a **single fixed prerendered image**, not a 3D moving-camera city. A separate 3D skinned character is rendered over that image, while a calibrated world camera projects the shoe contact point to the pavement. Approximate collision volumes prevent walking through the monument, buildings, and front bollards. Cropped foreground photographic mattes mask the character when it passes behind an obstacle. The character has native idle / brisk walk / jog animations with gentler blending and a soft floor contact shadow.

**Limits:** Depth and obstacle masks are manually approximated from the current Piazza del Gesù concept image; this is not survey-accurate depth mapping. The CC0 humanoid does NOT yet resemble the reference photos. Animation quality is under art review. Camera view 01 only, not a full RE1 camera network. Browser preview is a prototype for eventual PS1-compatible asset planning, not a PS1 executable.

Desktop: W/S forward/back, A/D rotate, Shift sprint, E interact. Touch: left joystick controls forward/back and rotation, right side buttons for sprint/action. Optional diagnostic grid: `?debug=1`.
