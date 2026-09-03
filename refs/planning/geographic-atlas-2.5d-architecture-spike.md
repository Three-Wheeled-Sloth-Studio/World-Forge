---
type: "Planning Reference"
title: "PI: Geographic Atlas 2.5D Architecture Spike"
tags:
- world-forge
- planning
---
# PI: Geographic Atlas 2.5D Architecture Spike

Updated: 2026-08-06

Status: **next implementation slice**

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

Decision: `refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md`

Cross-repository integration: Parchment Worlds `refs/handoffs/world-forge-2.5d-atlas-integration.md`

## Outcome

Prove that World Forge can present one authoritative geographic scene as elevation-aware 2.5D terrain from continental through local scale without switching to a separate tile renderer, changing saved-world contracts, or allowing presentation code to rebuild geography.

This is an architecture spike with a usable vertical slice. It is not a disposable screenshot prototype. Successful seams and contracts should be production-shaped, but material polish and complete feature coverage remain out of scope.

## Product questions answered by the spike

1. Can existing elevation and water data produce a useful terrain scene?
2. Can one map-like camera move continuously beyond the prior hierarchy scale ceiling?
3. Can Natural and analytical views share geometry, picking, boundaries, and labels?
4. Can canonical rivers follow terrain without being reconstructed by the renderer?
5. Can hexes appear progressively as overlays rather than forcing a renderer switch?
6. Can the scene remain deterministic and stable across reopen, resize, and neighboring extents?
7. Can the Parchment host embed the renderer without owning camera or geographic state?
8. What GPU, memory, and patch-size budgets are practical for the supported desktop targets?

## Fixed architecture guardrails

- Geography remains authoritative outside the renderer.
- Build a renderer-independent `GeographicScene` contract.
- Use continuous terrain meshes, not raised hex columns, for production terrain.
- Use orthographic camera behavior by default.
- Permit shallow pitch and limited rotation only.
- Keep labels in screen space.
- Keep water and rivers as explicit scene layers.
- Keep region boundaries and hexes as overlays.
- Do not add a second regional geography model.
- Do not persist spike-only scene artifacts.
- Do not change `.wforge`, `.pworld`, or cross-repository contracts.
- Do not retain the old atlas as a hidden production fallback after acceptance.
- Do not resume cosmetic patching of the flat atlas during the spike.

## Work packages

### WP0: Freeze and inventory the current atlas

Purpose: preserve evidence and stop accidental continuation of the failed patch loop.

Tasks:

- record the exact accepted decision baseline and v0.3.66 QA screenshots;
- classify existing atlas modules as reusable data, reusable interaction, comparison-only presentation, or retirement candidates;
- identify all paths that currently derive selection, boundaries, colors, rivers, labels, and scale;
- identify existing Three.js, globe, camera, picking, and material utilities that can be reused safely;
- pin issue `#126` as a later context-action consumer, not a spike blocker;
- add a feature flag or development route only if needed to compare old and new renderers explicitly.

Exit criteria:

- no uncertainty about which modules own authoritative facts;
- no Auto or silent renderer switching in the spike path;
- old atlas remains comparison-only.

### WP1: Define the pure scene contract

Purpose: create the seam between geography and presentation.

Tasks:

- define `GeographicScene` and subordinate types in a renderer-neutral package;
- include source project/world/revision identity;
- define projection and extent;
- define terrain patch IDs and world-relative coordinates;
- define elevation samples, normals or derivation inputs, skirts, and neighboring patch seams;
- define water surfaces and shoreline evidence;
- define canonical river paths and scale-aware presentation hints;
- define region boundaries, labels, selection, and hex overlay data;
- define deterministic scene signatures and diagnostics;
- define cancellation and progress behavior for scene building;
- add pure contract tests.

Exit criteria:

- scene types import no React, DOM, Canvas, WebGL, or Three.js types;
- identical inputs produce identical scene signatures;
- neighboring patch coordinates share an explicit seam model.

### WP2: Build one terrain patch pipeline

Purpose: prove elevation and material presentation from authoritative facts.

Tasks:

- select one representative continental area and fixed seed;
- generate a bounded projected terrain patch from existing world data;
- construct shared-edge terrain geometry with skirts or equivalent seam protection;
- add bounded elevation exaggeration;
- render water as a separate surface;
- implement Natural and Elevation or Slope materials on the same geometry;
- retain world-relative material noise and UV behavior;
- expose diagnostics for source resolution, mesh resolution, elevation range, and generation time.

Exit criteria:

- ridges, valleys, coastline relief, and inland basins are visually legible;
- switching materials does not change camera, selection, or geometry;
- no visible cracks at patch edges in the tested extent.

### WP3: Camera, picking, labels, and boundaries

Purpose: restore atlas usability over the terrain scene.

Tasks:

- implement orthographic pan and continuous zoom;
- add a map-view reset;
- add optional shallow pitch and limited rotation;
- preserve a north-up default;
- implement terrain picking that resolves canonical world-relative identity;
- render parent and child boundaries as overlays;
- render selected-region fill or outline without changing terrain materials;
- render labels in screen space with collision and visibility limits;
- synchronize a context map with the active camera footprint;
- keep left-click, double-click, and right-click semantics consistent.

Exit criteria:

- selection matches visible terrain at center and edges;
- labels remain readable through zoom and shallow pitch;
- the context footprint follows pan, zoom, and projection changes;
- no hierarchy level imposes the former 24-mile zoom ceiling.

### WP4: Rivers and progressive hex overlay

Purpose: prove that canonical vectors and game-facing units can coexist with continuous terrain.

Tasks:

- drape canonical river paths over terrain;
- prevent terrain intersections and floating segments;
- preserve source-to-terminus continuity from authoritative facts;
- vary visible river weight by scale without converting subhex rivers into water tiles;
- expose unresolved drainage as diagnostics rather than hiding it;
- render canonical hexes as an overlay whose visibility and emphasis respond to screen size;
- preserve canonical tile identity for selection and export;
- prove no renderer switch occurs when hexes become visible.

Exit criteria:

- rivers remain continuous through camera movement and material changes;
- unresolved hydrology is visibly diagnosable;
- hexes appear progressively and stay world anchored;
- terrain geometry remains independent of hex geometry.

### WP5: Integration and performance proof

Purpose: establish whether the architecture is viable for production continuation.

Tasks:

- mount the scene in the normal World Forge workspace;
- verify the Parchment-embedded launch path without changing host contracts;
- preserve Back to Project and active-body behavior;
- test `1920 x 1080` and `1440 x 900`;
- measure scene-build time, frame rate, draw calls, GPU memory, and interaction latency;
- test resize, reopen, neighboring extents, longitude seam, and cancellation;
- document minimum supported capability and fallback policy;
- capture a fixed screenshot and performance evidence set;
- decide whether technology remains direct Three.js, adopts React Three Fiber, or keeps a smaller renderer wrapper.

Exit criteria:

- the representative scene remains interactive on the primary development machine;
- the Parchment host requires no new persistence contract;
- exact-head tests and browser QA are recorded;
- a production continuation or stop decision can be made from evidence.

## Initial technical hypothesis

Three.js is already available and the existing globe path provides useful camera, scene, and texture experience. The spike should begin with the smallest direct dependency surface that can prove the architecture.

Technology choice is not locked beyond the existing WebGL foundation. The spike must compare implementation cost and ownership clarity before introducing React Three Fiber or another abstraction.

Preferred initial terrain approach:

- regular projected grid patches;
- shared or reproducible border vertices;
- CPU-built geometry for the first proof;
- indexed triangles;
- generated normals;
- separate water mesh;
- shader or vertex-color material weights;
- vector overlays rendered independently from terrain triangles.

Avoid premature clipmaps, virtual textures, and planetary-scale streaming until the bounded patch proves the scene contract.

## Test fixtures

Minimum fixtures:

- one temperate continental area with mountains, rivers, coast, and inland water;
- one island or archipelago extent;
- one high-latitude extent with permanent ice and snowline behavior;
- one longitude-seam extent;
- one low-relief dry extent.

The first vertical slice may implement only the representative continental fixture, but the scene contract must not preclude the others.

## Performance budgets for the spike

These are evidence targets, not release promises:

- first representative scene ready within 2 seconds after authoritative data is available;
- camera interaction near 60 fps on the primary RTX 4070 development machine;
- no ordinary interaction pause above 100 ms;
- bounded patch memory with no full-world fine mesh allocation;
- no object-per-hex architecture;
- cancellation when a requested scene is superseded.

Record actual measurements and revise budgets before production work.

## Acceptance checklist

- [ ] Pure renderer-independent scene contract.
- [ ] Elevation-displaced continuous terrain.
- [ ] Separate water surface.
- [ ] Natural and analytical materials on one geometry.
- [ ] Orthographic pan and continuous zoom.
- [ ] Optional shallow pitch and limited rotation.
- [ ] Canonical picking and region boundaries.
- [ ] Stable screen-space labels.
- [ ] Terrain-following canonical rivers.
- [ ] Progressive world-anchored hex overlay.
- [ ] Synchronized context map.
- [ ] No silent old-renderer fallback.
- [ ] No `.wforge` or Parchment contract change.
- [ ] Browser and performance evidence captured.
- [ ] Production continuation decision recorded.

## Explicitly deferred

- final PBR material library;
- vegetation and feature instancing;
- editing tools;
- local terrain synthesis beyond what the spike needs to prove LOD;
- persisted camera bookmarks;
- derived regional asset persistence;
- political and cultural overlays;
- roads and settlements;
- strategy-map edge semantics;
- production mobile support;
- cinematic globe-to-patch transitions.

## Definition of done

The spike is done when the accepted checklist is evidenced and the team can choose one of three outcomes:

1. Continue into production 2.5D atlas implementation.
2. Revise the scene or terrain architecture with named unresolved risks.
3. Stop the 2.5D direction because measured cost or performance fails the product case.

A screenshot alone is not completion.