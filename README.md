# Collision Theory Lab

Interactive teaching module for Form 4 Chemistry, Chapter 7: Collision Theory and Activation Energy.

Download `index.html` and open it in a modern browser. The complete module is contained in this one HTML file and works offline.

The main screen focuses on the factor selector, Particle View, and Activation Energy. Use **Show One Collision** for a close-up replay and **Back to Particle View** to return. **Why?** reveals the cause-and-effect chain; **Data** reveals the collision meters and rate graph. These secondary views open one at a time. Play/Pause, Slow Motion, and Reset are in the Particle View's **Playback** menu. Teaching Labels remains a small toggle.

- Concentration, temperature, surface area, and catalyst controls.
- Moving particles, failed collisions, and product formation.
- Close-up replays for wrong orientation, insufficient energy, and effective collisions.
- Linked activation-energy profile, cause-and-effect chain, and live product graph.
- Play/pause, slow motion, reset, and teaching labels.

This is a qualitative teaching simulation. Particle energies, times, and reaction rates are illustrative model values.

The embedded `collision-theory-lab` custom element exposes `setFactor`, `setState`, `getState`, `showCollision`, and `reset`, with `lab-state-change`, `lab-collision`, and `lab-sample` events for future integration.
