---
type: "Testing Reference"
title: "System Explore Visual QA"
tags:
- world-forge
- testing
---
# System Explore Visual QA

Updated: 2026-07-31

## Acceptance path

1. Generate the fast 256 x 128 world.
2. Select System in the Explore `Map | Globe | System` control.
3. Confirm the lazy `project.system-orbital-context@1.0.0` workflow completes without adding work to ordinary generation.
4. Confirm the dedicated System viewer shows the generated star, primary world, generated moons, planets, dwarfs, belts, and other scaffold bodies present in the artifact.
5. Confirm generated bodies use solid styling and placeholder bodies use obvious wireframe styling.
6. Select a placeholder body from the body selector and confirm the inspector reports `placeholder` status.
7. Focus the selected body and confirm the scene recenters without changing its physical orbital values.
8. Use Return to primary and confirm selection and focus return to the generated primary world.
9. Toggle orbit paths off and on.
10. Toggle labels off and on.
11. Switch between Compressed overview and Relative distance. Confirm orbital ordering remains coherent and the inspector continues to show physical orbit separately from display radius.
12. Advance the shared clock and confirm planets and moons continue moving. Confirm moons remain parent-relative.
13. Drag the camera and confirm the shared clock pauses while held and resumes on release.
14. Confirm the 35% and 50% zoom stops remain usable in System view.
15. Verify 1440 x 900 and 1920 x 1080 without page-level overflow or browser errors.

## Automated contracts

The focused System presentation suite must verify:

- deterministic catalog and position construction;
- star, primary, planet, and moon catalog coverage;
- generated-versus-placeholder status;
- parent-relative moon placement;
- preserved orbital ordering in compressed and relative-distance modes;
- explicit separation between physical orbital values and exaggerated display scale.

Chromium QA must verify:

- `Map | Globe | System` routing;
- completed orbital enrichment;
- nontrivial body count;
- body selection and placeholder inspector status;
- focus selected and return to primary;
- orbit-path and label toggles;
- relative-distance mode;
- shared-clock motion;
- independent 35% and 50% System zoom;
- both required viewport sizes and no browser errors.

## Renderer boundary

The System viewer is a deterministic presentation of the existing orbital-context artifact. It does not generate secondary-body terrain or simulation history. Physical orbital values come from the persisted artifact. Display radii and body sizes are intentionally exaggerated and are labeled as presentation values.

The first slice uses a compressed overview and a logarithmic relative-distance mode. Neither is an N-body simulation, authoritative ephemeris, or literal same-scale astronomical model.

Secondary-body generation begins only after body lifecycle and queue behavior are established as inspectable, versioned enrichment workflows. The first proof after that boundary is an airless moon.
