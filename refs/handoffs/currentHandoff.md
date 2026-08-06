# Current Handoff: Geographic Atlas 2.5D Architecture Spike

Updated: 2026-08-06

Status: **accepted architecture pivot and active next slice on `dev`**

Primary tracking:

- World Forge issue `#10`
- `refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md`
- `refs/planning/geographic-atlas-2.5d-architecture-spike.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

Decision baseline:

- repository: `Three-Wheeled-Sloth-Studio/World-Forge`
- branch: `dev`
- commit: `b8c2a7e9e97d1fdd9cd1ee3cdd0d8dc24ebca056`
- visible version: `0.3.66`

Integration repository:

- `Three-Wheeled-Sloth-Studio/Parchment-Worlds`
- branch: `dev`
- integration handoff: `refs/handoffs/world-forge-2.5d-atlas-integration.md`

Portfolio decision:

- `Three-Wheeled-Sloth-Studio/Parchment-Worlds-Portfolio`
- `docs/geographic-atlas-2.5d-architecture-pivot.md`

## Decision

Pause incremental patching of the current flat geographic atlas and build a constrained 2.5D scene architecture.

The production direction is:

- orthographic, map-like interaction by default;
- optional shallow pitch and limited rotation;
- elevation-displaced continuous terrain;
- separate water surfaces;
- Natural and analytical materials over the same geometry;
- canonical rivers draped over terrain;
- region boundaries, selection, and hexes as overlays;
- screen-space labels;
- continuous zoom and level of detail instead of hierarchy-triggered renderer switches.

The current atlas remains useful as hierarchy, data-contract, and QA evidence. It is not the production rendering architecture.

## Why this supersedes the prior handoff

Versions `0.3.61` through `0.3.66` proved useful pieces:

- world-to-detail hierarchy navigation;
- main-workspace atlas mounting;
- canonical tile-window contracts;
- world-relative IDs;
- contextual mini-map;
- direct rendered-tile selection;
- improved river continuity and presentation experiments;
- right-click location actions.

The same QA also showed that the flat renderer had reached diminishing returns:

- elevation remained visually absent;
- color and ice authority differed by rendering path;
- region membership and presentation became entangled;
- zoom stopped at implementation-defined scale levels;
- Auto and legacy fallback behavior created contradictory views;
- fixes to rivers, context, and materials repeatedly regressed neighboring behavior;
- renderer code was increasingly reconstructing geography.

Do not resume that patch loop except for a build-breaking or data-corrupting defect.

## Read first

1. `refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md`
2. `refs/planning/geographic-atlas-2.5d-architecture-spike.md`
3. World Forge issue `#10`
4. `refs/handoffs/geographic-drilldown-rendering-roadmap.md`
5. `refs/testing/geographic-drilldown-qa-0.3.66.md`
6. `refs/testing/geographic-drilldown-scale-fidelity-findings-2026-08-06.md`
7. `packages/shared/src/geographicTileWindow.ts`
8. `packages/generator-core/src/geographicTileWindow.ts`
9. existing globe and Three.js scene utilities
10. Parchment Worlds `refs/handoffs/world-forge-2.5d-atlas-integration.md`

Where older documents say 2D acceptance is a prerequisite for 3D, this handoff and the accepted decision record supersede them.

## Product objective

Deliver one authoritative geographic scene that can present a generated world from continental through local scale with useful terrain relief, stable selection, continuous zoom, canonical rivers, progressive hexes, and no hidden renderer switch.

Hierarchy remains semantic navigation:

```text
World
-> landmass / archipelago / ocean basin
-> region
-> subregion
-> local
-> detail
```

It does not impose a camera or resolution ceiling.

## Required ownership boundaries

### Generator and geographic interpretation own

- elevation, water, ice, climate, biome, geology, and hydrology;
- landmass, archipelago, region, and child membership;
- stable IDs and parent-child relationships;
- replay versions and provenance.

### Geographic scene builder owns

- projected visible extent;
- terrain patch resolution and seams;
- water surfaces;
- presentation-ready river paths;
- material weights;
- boundary paths;
- labels and anchors;
- visible hex overlay scale;
- selection and camera-context metadata.

### Renderer owns

- camera;
- lighting and relief exaggeration;
- materials;
- vector and grid overlays;
- screen-space labels;
- picking presentation;
- visual level of detail.

The renderer does not classify continents, invent rivers, or decide saved-world truth.

## Immediate work sequence

### WP0: Freeze and inventory

- preserve v0.3.66 QA evidence;
- identify reusable data and interaction seams;
- classify old renderer modules as comparison-only or retirement candidates;
- confirm existing Three.js and globe utilities;
- prevent silent Auto or fallback behavior in the new path.

### WP1: Pure `GeographicScene` contract

- add renderer-neutral scene types;
- define identity, extent, projection, terrain patches, water, rivers, boundaries, labels, selection, and context;
- add deterministic signatures and pure tests;
- import no DOM, React, Canvas, WebGL, or Three.js types.

### WP2: Representative terrain patch

- build one fixed continental fixture;
- displace continuous terrain from authoritative elevation;
- add a separate water surface;
- render Natural and Elevation or Slope views on the same geometry;
- expose scene-build diagnostics.

### WP3: Map interaction

- orthographic pan and continuous zoom;
- map reset;
- shallow pitch and limited rotation;
- canonical picking;
- region boundaries and selection overlays;
- screen-space labels;
- synchronized context map.

### WP4: Rivers and progressive hexes

- terrain-following canonical river vectors;
- unresolved drainage diagnostics;
- scale-aware river presentation;
- progressive world-anchored hex overlay;
- no renderer switch when hexes appear.

### WP5: Integration and evidence

- mount in normal World Forge workspace;
- verify Parchment embedding without a contract change;
- profile scene build, frame rate, draw calls, memory, and interaction latency;
- test reopen, resize, neighboring extents, seams, and cancellation;
- capture exact-head QA and decide whether to continue into production.

## Guardrails

- Do not create a second geography model for 2.5D.
- Do not build production terrain from raised hex columns.
- Do not make the terrain mesh the source of region membership.
- Do not infer rivers or boundaries from material colors.
- Do not allocate a full-world fine terrain mesh.
- Do not make every hex a scene object.
- Do not add unrestricted flight controls.
- Do not persist spike-only scene artifacts.
- Do not change `.wforge`, `.pworld`, or Parchment host contracts during the spike.
- Do not retain the flat atlas as a hidden production fallback after acceptance.
- Do not resume issue `#12` threshold tuning as part of this spike.
- Preserve issue `#126` as a later consumer of canonical location actions.

## Acceptance boundary

The spike is accepted only when one representative area proves:

- useful elevation relief;
- continuous zoom beyond the prior 24-mile ceiling;
- Natural and analytical materials on one geometry;
- canonical region selection and boundaries;
- continuous terrain-following rivers;
- progressive hex visibility;
- stable labels;
- synchronized context map;
- bounded desktop performance;
- no hidden fallback renderer;
- no saved-world or host-contract change.

A screenshot without these seams is not acceptance.

## Deferred

- final PBR library;
- vegetation and feature instancing;
- terrain editing;
- persisted camera bookmarks;
- derived regional asset persistence;
- politics, cultures, settlements, and roads;
- strategy-game river-edge semantics;
- production mobile interaction;
- cinematic globe-to-patch transitions.

## Existing Sol reference status

The Sol package pipeline remains operational. Earth, Jupiter, and Mars remain the accepted body-presentation baseline. Broader body presentation is still deferred and must not be absorbed into the atlas spike.