# Geographic Drilldown Rendering Roadmap

Updated: 2026-08-06

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

Status: **The flat 2D atlas hardening sequence is superseded by the accepted 2.5D architecture pivot.**

Authoritative direction:

- `refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md`
- `refs/planning/geographic-atlas-2.5d-architecture-spike.md`
- `refs/handoffs/currentHandoff.md`

## What the existing implementation proved

The v0.3.20 through v0.3.66 work remains valuable. It established:

- `geographic-tile-window-v1` and its canonical classifier;
- world-relative `q/r` coordinates and stable tile IDs;
- seam-aware extents and bounded context;
- hierarchy navigation through detail;
- main-workspace atlas mounting;
- mini-map and breadcrumb interaction;
- direct rendered-tile selection;
- region, child, label, and boundary presentation experiments;
- scale-aware river and hex presentation experiments;
- useful QA fixtures for overlap, seam, and local-detail failure modes.

These contracts and tests should be reused where they represent authoritative geography or interaction. The existing flat atlas renderer is now a comparison fixture and migration source, not the production destination.

## Why the old sequence is retired

The previous roadmap required complete 2D browser acceptance before beginning 3D. Repeated QA showed that this gate was producing throwaway work rather than reducing risk.

The flat renderer could not cleanly answer the product needs that now matter:

- elevation and landform readability;
- continuous zoom beyond hierarchy-defined scales;
- one presentation path from regional to local detail;
- consistent Natural and analytical views;
- terrain-aware river inspection;
- progressive hex visibility without switching renderers;
- clean ownership between geography and presentation.

The accepted decision is therefore to prove those concerns directly with a constrained 2.5D scene.

## Retained canonical contracts

The following remain valid inputs or candidate seams:

- `packages/shared/src/geographicTileWindow.ts`
- `packages/generator-core/src/geographicTileWindow.ts`
- world topology and surface layers;
- geographic hierarchy membership and stable IDs;
- canonical river paths;
- world-relative adaptive scale definitions;
- context-map geometry;
- location-action direction under issue `#126`.

The spike may revise how tile-window data is translated into a scene, but it must not create a parallel geography model.

## Target architecture

```text
Authoritative world data
  -> geographic interpretation
  -> pure GeographicScene builder
  -> constrained 2.5D renderer
  -> World Forge workspace and Parchment host
```

### Scene builder responsibilities

- choose a bounded projected extent;
- build terrain patches and seam metadata;
- derive presentation-level material weights;
- produce water surfaces;
- expose canonical river paths;
- expose boundaries, labels, selection, and visible hex overlay;
- produce deterministic diagnostics and signatures.

### Renderer responsibilities

- orthographic camera, pan, and continuous zoom;
- optional shallow pitch and limited rotation;
- elevation exaggeration and lighting;
- Natural and analytical materials;
- water, rivers, boundaries, selection, and grid overlays;
- screen-space labels;
- picking and visual LOD.

### Explicitly not renderer responsibilities

- continent or archipelago classification;
- region partitioning;
- saved-world truth;
- hydrology generation;
- replay compatibility;
- project or Parchment asset ownership.

## Revised implementation sequence

### PI 0: Freeze and inventory

- preserve v0.3.66 evidence;
- identify reusable contracts and interaction modules;
- classify old rendering code for retirement;
- prevent silent renderer fallback in the spike path.

### PI 1: GeographicScene contract

- renderer-neutral types;
- terrain, water, river, boundary, label, selection, and context records;
- deterministic signatures;
- cancellation and progress behavior;
- seam and neighboring-patch tests.

### PI 2: Regional terrain proof

- one representative fixed area;
- continuous displaced mesh;
- separate water;
- Natural plus Elevation or Slope material;
- orthographic camera;
- diagnostics and performance evidence.

### PI 3: Atlas interaction

- continuous zoom;
- canonical picking;
- boundaries and selection;
- screen-space labels;
- context-map synchronization;
- shallow pitch and reset behavior.

### PI 4: Rivers and hex LOD

- terrain-following canonical rivers;
- unresolved drainage diagnostics;
- scale-aware channel treatment;
- progressive world-anchored hex overlay;
- no renderer switch.

### PI 5: Production continuation decision

- mount in normal workspace;
- verify Parchment embedding;
- test supported desktop viewports;
- profile scene build, frame time, memory, and draw calls;
- validate resize, reopen, seam, adjacent extent, and cancellation;
- accept, revise, or stop the architecture based on evidence.

## Material direction

Procedural materials remain a later production concern. The spike should use simple, legible material families and analytical views.

The durable hypothesis remains:

- shared material families;
- world-relative deterministic variation;
- terrain attributes drive blending;
- important boundaries derive from explicit geography;
- no bespoke texture stack per tile;
- no complete pairwise transition atlas requirement.

Do not let material work obscure whether terrain geometry, scene ownership, camera behavior, and LOD are sound.

## Performance direction

- bounded terrain patches;
- indexed geometry;
- shared or reproducible border vertices;
- no full-world fine mesh;
- no object per hex;
- cancellable scene generation;
- explicit CPU, GPU, memory, and draw-call evidence;
- production LOD strategy selected only after the bounded proof.

## Integration direction

The spike must preserve:

- ordinary World Forge generation;
- saved-world loading;
- `.wforge` compatibility;
- active-body selection;
- Parchment launch and return navigation;
- save-back behavior;
- the accepted Sol starter path.

Camera bookmarks, selected region persistence, edits, and derived regional assets are future contract work.

## Guardrails

- Do not repair the flat atlas cosmetically during the spike.
- Do not keep the flat atlas as a hidden production fallback after acceptance.
- Do not make raised hex columns the production terrain.
- Do not infer geography from colors or mesh triangles.
- Do not persist presentation-only noise or scene caches.
- Do not change saved-world or Parchment contracts in the spike.
- Do not absorb politics, cultures, settlements, roads, resources, or editing.
- Do not describe a screenshot as an architecture proof.

## Immediate next slice

Execute `refs/planning/geographic-atlas-2.5d-architecture-spike.md`, beginning with the freeze/inventory and pure scene-contract work packages.