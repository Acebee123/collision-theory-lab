# Collision Theory Lab

Interactive 3D teaching module for Form 4 Chemistry, Chapter 7: Collision Theory and Activation Energy.

Download `index.html` and open it in a modern browser. The complete module includes Three.js and works offline. `outputs/collision-theory-lab.html` is the identical build.

- Concentration, temperature, surface area, and catalyst controls.
- English and Bahasa Melayu, with display sizes from 100% to 200%.
- A light sage chamber with 3D molecules, wider spacing between solid fragments, full horizontal rotation, and vertical tilt. Drag or use the arrow keys; **Reset View** restores the starting angle.
- **Show One Collision** demonstrates wrong orientation, insufficient energy, or an effective collision. Surrounding particles and solids disappear during the close-up so they cannot obscure it, then return afterward.
- Linked activation-energy profile, live reaction-rate graph, **Why?** explanations, and **Data** panels.
- Play/pause, slow motion, reset, teaching labels, and optional sound.

This is a qualitative teaching simulation. Particle energies, times, and reaction rates are illustrative model values.

## Editing and verification

Editable sources are in `src/`; the pinned Three.js distribution and MIT license are in `vendor/`.

```sh
python src/build.py
node work/test-3d-model.cjs
```

The build produces both standalone HTML files. Model and browser checks are documented in `outputs/verification.md`.

The embedded `collision-theory-lab` custom element exposes `setFactor`, `setState`, `getState`, `showCollision`, and `reset`, with `lab-state-change`, `lab-collision`, and `lab-sample` events for integration.
