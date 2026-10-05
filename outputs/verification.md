# Collision Theory Lab — 3D verification

Verified 5 October 2026. This audit supersedes the earlier 2D renderer audit.

## Deliverables

- `collision-theory-lab.html` is a self-contained offline HTML application, including Three.js 0.160.1 and its MIT license.
- The project-root `index.html` contains the identical build.
- Editable sources are in `src/`: simulation, renderer, controller, sound, styles, and the build script. The prior interface is retained as `legacy-lab.html` for its established controls, translations, and graph methods; superseded rendering/controller methods are removed by the build.
- Rebuild with `python src/build.py`. Model checks: `node work/test-3d-model.cjs`.

## Scientific checks

The collision model now uses three-dimensional positions, velocities, contact normals, orientation vectors, elastic collisions, and solid-surface contacts. Effective collisions still require both sufficient energy and suitable orientation. It remains a qualitative, replenished teaching sample with illustrative energies, rather than a quantitatively calibrated molecular-dynamics package.

Deterministic 120-second runs passed these comparisons:

| Factor | Lower condition: effective collisions | Higher condition: effective collisions |
|---|---:|---:|
| Concentration: 36 → 72 molecules | 36 | 118 |
| Temperature: 1.0 → 2.6 relative kinetic energy | 36 | 105 |
| Surface area: 1 → 27 pieces | 99 | 236 |
| Catalyst: Eₐ 1.45 → 0.58 | 36 | 78 |

Additional assertions passed:

- Catalyst leaves every velocity component unchanged when switched.
- Adding particles preserves existing velocities and the same initial kinetic-energy distribution.
- Temperature changes smoothly, conserving the intended kinetic-energy scaling through elastic collisions.
- All solid configurations preserve 3.6³ volume; exposed area rises by factors of 1, 2, and 3.
- The fixed 1/120-second model gives identical ten-second collision totals under 30, 60, and 144 Hz frame schedules.
- The same 0.96-energy, correctly oriented demonstration fails at Eₐ 1.45 and succeeds at Eₐ 0.58. Wrong orientation fails under either barrier.
- The complete bundled script parses successfully; no external script downloads are required.

## Interaction and layout checks

Browser checks covered factor controls, slider extremes, pause/play, slow motion, reset, all three replay choices, automatic camera return, catalyst comparison, molecule picking, keyboard camera control and Reset View, optional sound state, Why/Data panels, experiment visualization, and live reaction-rate data. English and Bahasa Melayu were checked, including switching language during replay.

No horizontal overflow was observed at 850px, 390px, or 320px. The 200% display setting was also checked at 390px in English and 320px in Bahasa Melayu. Display-size and language preferences persist locally. Narrow layouts stack the scientific panels and wrap controls.

No JavaScript errors were observed during the final browser interactions. Three.js emits a known deprecation notice for its pinned classic-script distribution; the bundled build runs without a module server, including offline use.

## Rendering and limits

The normal view uses instanced atoms/bonds, pooled event lights, shared geometry/materials, capped pixel ratio, physically lit materials, shadowed glass chamber, and a restrained environment. The close-up uses continuously moving atoms and fading/reforming bonds, a spatial energy threshold, dimmed surroundings, and a smooth camera. The normal energy graphs retain the earlier removal of the moving dot and triangle.

A desktop sample reported about 1.8 ms JavaScript rendering work per frame and 16.66 ms between frames (approximately 60 Hz), with 25 draw calls. This is one local observation, not a guarantee on other hardware. Sustained slow rendering reduces pixel ratio and shadows automatically. WebGL-unavailable devices receive a simpler compatibility visualization; that fallback is implemented but was not forced during the browser checks. Synthesized sound is opt-in and limited to selected demonstration events.

Controlled close-ups hold the live sample, so their illustrative events do not inflate the live graph or collision counters. The sample resumes when the camera returns. Actual successful model collisions drive the product graph and experiment bubbles.

## Restored light theme

Restored the previous sage/ivory theme, serif title, light panels and green controls across the 3D chamber, graphs and teaching overlays. This is a presentation-only change; the 3D model and interactions remain intact. Rebuilt both HTML deliverables and checked bundle syntax and the browser rendering.

## Fragment spacing and rotation

The original pale materials and lighting are retained, without fragment outlines. The gap between fragments is now 1.5 scene units (previously 0.75). Physics and rendered fragment positions share this spacing; solid volume and surface area are unchanged. The model checks passed with the revised spacing, including the surface-area comparison above.

The camera can orbit through a full horizontal turn and tilt from near level to above the chamber. Dragging and arrow keys rotate the entire scene; Reset View restores the initial angle. Touch gestures on the canvas are reserved for rotation.

During a collision close-up, live molecules, bonds, solid fragments and surface markers fade completely out before the camera arrives. They reappear as the view returns to the chamber, keeping the demonstration unobstructed without changing the held model state.

