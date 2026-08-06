# Decision: Pivot the Geographic Atlas to a Constrained 2.5D Scene

Date: 2026-08-06

Status: **Accepted**

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Tracking issue: `#10`

Decision baseline: World Forge `dev` at `b8c2a7e9e97d1fdd9cd1ee3cdd0d8dc24ebca056`, visible version `0.3.66`

Related documents:

- `refs/handoffs/currentHandoff.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`
- `refs/planning/geographic-atlas-2.5d-architecture-spike.md`
- Parchment Worlds `refs/handoffs/world-forge-2.5d-atlas-integration.md`
- Portfolio `docs/geographic-atlas-2.5d-architecture-pivot.md`

## Decision

Stop extending the current flat atlas through incremental renderer patches. Replace its production presentation path with a constrained 2.5D geographic scene that uses authoritative World Forge geography and supports continuous scale transitions.

The default experience remains map-like:

- orthographic camera by default;
- pan and smooth zoom;
- optional shallow pitch and limited rotation;
- elevation-displaced terrain;
- water as a distinct surface;
- natural and analytical materials over the same geometry;
- terrain-following river vectors;
- region boundaries, selection, and hexes as overlays;
- labels in screen space;
- progressive detail and hex visibility based on scale.

This is not a decision to turn World Forge into an unrestricted flying-camera globe application. It is a decision to use terrain geometry where terrain geometry solves the product problem.

## Why the current path is paused

Browser QA from versions `0.3.61` through `0.3.66` established that the current atlas path can prove hierarchy navigation, but repeated fixes produced new failures faster than the experience converged.

Observed failure classes included:

- flat terrain with elevation reduced to ambiguous color;
- different renderer paths consuming different definitions of ice, color, rivers, and selection;
- scale ceilings and renderer switches tied to hierarchy levels;
- region membership, labels, and overlays drifting from the visible map;
- river presentation compensating for missing local terrain information;
- hidden or legacy fallback modes reappearing through Auto behavior;
- UI controls changing meaning as implementation paths changed;
- renderer code deriving or reconstructing geography instead of presenting it.

The failures are not all graphics failures. A 3D canvas does not fix incorrect region membership, classification, hydrology, or saved-world contracts. The architecture must separate those concerns before the new renderer becomes authoritative.

## Architectural ownership

The target system has four explicit layers.

### 1. Authoritative world data

Owned by generator and shared contracts:

- elevation and slope evidence;
- land, ocean, lake, ice, and coastline identity;
- climate and biome;
- geology and volcanism;
- canonical rivers and drainage facts;
- topology and world-relative coordinates;
- deterministic seeds, versions, and provenance.

The renderer must not change these facts.

### 2. Geographic interpretation

Owned by geographic hierarchy and feature systems:

- continent, landmass, archipelago, island, and ocean-basin interpretation;
- region, subregion, local, and detail membership;
- parent-child relationships;
- stable IDs and labels;
- boundary rationale and diagnostics.

The renderer must not infer region membership from color or visible mesh boundaries.

### 3. Scene and level of detail

Owned by a renderer-independent scene builder:

- visible geographic extent;
- terrain patch resolution;
- elevation samples and skirts;
- water surfaces;
- material weights;
- river paths and widths;
- region boundaries;
- visible hex scale;
- labels and anchors;
- selection and hover state;
- context-map camera footprint.

The scene builder may derive presentation detail from authoritative facts. It may not invent new authoritative geography.

### 4. Presentation

Owned by the 2.5D renderer:

- camera and interaction;
- lighting and elevation exaggeration;
- terrain materials;
- river ribbons or lines;
- boundary, grid, and selection overlays;
- labels and screen-space UI;
- visual level-of-detail transitions.

Presentation-specific noise must remain deterministic, world anchored, and disposable.

## Renderer-independent scene contract

The spike will define a pure contract shaped approximately like:

```ts
export type GeographicScene = {
  sceneId: string;
  sourceProjectId: string;
  sourceWorldId: string;
  sourceRevision: string;
  projection: GeographicSceneProjection;
  extent: GeographicSceneExtent;
  terrainPatches: GeographicTerrainPatch[];
  waterSurfaces: GeographicWaterSurface[];
  riverPaths: GeographicRiverPath[];
  regionBoundaries: GeographicBoundaryPath[];
  hexOverlay: GeographicHexOverlay | null;
  labels: GeographicLabelAnchor[];
  selection: GeographicSceneSelection | null;
  context: GeographicSceneContext;
};
```

The exact schema is a spike output. The required principle is fixed: scene construction is independent of WebGL, Canvas 2D, React, and Parchment shell concerns.

## Scale model

The preferred presentation is hybrid but continuous.

### World scale

Use the existing globe or a lightly curved world mesh where planetary context, poles, and longitude continuity matter.

### Continental and regional scale

Transition to an orthographic projected terrain patch. Planetary curvature should not make map interaction harder once the selected extent is regional.

### Local and detail scale

Increase terrain-patch resolution and reveal progressively finer overlays. Hexes become more prominent as their screen size becomes useful. The renderer does not switch to a separate tile universe.

Hierarchy remains useful for semantic navigation and asset identity, but it must not impose a hard zoom ceiling.

## Elevation and terrain

The terrain mesh must make existing elevation information legible through geometry, lighting, and optional contours or analytical materials.

Required controls:

- bounded elevation exaggeration;
- orthographic map view reset;
- optional shallow pitch;
- analytical elevation and slope views;
- water level visible against terrain;
- no exaggerated column-per-hex presentation as the production terrain model.

Independent raised hex columns are acceptable only as a temporary diagnostic.

## Rivers

Rivers remain authoritative vector geography, not color inferred from the terrain texture.

The renderer may:

- drape canonical paths over terrain;
- refine visible curves between authoritative anchors;
- vary visual width by scale and physical evidence;
- reveal tributaries as detail becomes available;
- render banks, floodplains, or water surfaces when supported.

The renderer may not create unresolved decorative rivers to make a scene look busy.

Hydrology problems remain generator or interpretation problems. The 2.5D scene should make those problems easier to see, not hide them.

## Hexes

Canonical hexes remain simulation, selection, export, and strategy-map units where required.

In the atlas:

- the grid is an overlay, not the terrain mesh topology;
- grid density and emphasis respond to camera scale;
- selection resolves to canonical world-relative identity;
- strategy semantics such as edge-river crossing penalties remain separate from atlas cartography until explicitly modeled.

## Parchment integration

World Forge owns the scene, camera state, geographic selection, and renderer.

Parchment Worlds owns:

- project context;
- launch and return navigation;
- save-back orchestration;
- active body and workspace identity;
- shell-level entitlement and account cues;
- future project-linked geographic assets.

The spike must not require a `.pworld`, `.wforge`, or cross-repository schema change. Any later persistence of camera bookmarks, selected regions, edits, or derived regional artifacts requires a separately reviewed contract.

## Retirement rule

The current flat atlas may remain available during the spike only as a comparison fixture and fallback for development recovery.

It must not remain as an invisible production fallback after the 2.5D path is accepted. There will be one production geographic scene path.

Do not preserve Auto behavior that silently switches between unrelated renderers.

## Non-goals for the spike

- final photorealistic PBR materials;
- unrestricted orbit or flight controls;
- final globe-to-patch cinematic transition;
- terrain editing;
- political borders, settlements, roads, or cultures;
- persistence of generated local-detail artifacts;
- exporter redesign;
- strategy-game movement or combat semantics;
- full drainage-basin simulation;
- final mobile interaction design.

## Acceptance boundary

The architecture spike is accepted only when one representative world and selected continental area prove:

1. elevation-displaced terrain with useful relief;
2. orthographic pan and continuous zoom beyond the prior 24-mile ceiling;
3. optional shallow pitch without losing map usability;
4. Natural and at least one analytical material over the same geometry;
5. canonical region selection and boundaries independent of rendering;
6. terrain-following continuous rivers;
7. progressive hex visibility without switching renderers;
8. stable labels and selection overlays;
9. synchronized context map and camera footprint;
10. bounded performance on the supported desktop viewport;
11. no hidden fallback to the old atlas renderer;
12. no saved-world or Parchment contract change.

## Consequences

### Positive

- elevation, ridges, valleys, and drainage become visually legible;
- one renderer can span multiple useful scales;
- hexes become an overlay rather than the only presentation primitive;
- natural and analytical views share geometry and interaction;
- renderer defects become easier to separate from data defects;
- later editing, feature placement, and map export have a durable scene foundation.

### Cost

- terrain patch and LOD infrastructure must be built;
- camera, picking, labels, and overlays need explicit contracts;
- the old renderer cannot be casually reused as a permanent fallback;
- performance and GPU capability handling become first-class concerns;
- semantic geography defects still require separate fixes.

## Immediate direction

Pause cosmetic and behavior patching of the existing atlas except for build-breaking or data-corrupting defects.

Proceed with `refs/planning/geographic-atlas-2.5d-architecture-spike.md` as the next implementation slice.