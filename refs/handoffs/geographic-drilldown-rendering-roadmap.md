# Geographic Drilldown Rendering Roadmap

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Visible version: `0.3.20`

Related handoff: `refs/handoffs/geographic-region-drilldown.md`

Browser QA: `refs/testing/geographic-region-drilldown-qa.md`

Tracking issue: `#10 [PI] Build canonical tile-window geographic drilldown`

## Status

PI 1, the canonical tile-window drilldown, is implemented on `dev` through detail level and is awaiting repository verification and browser acceptance.

The implementation now includes:

- a versioned tile-window contract;
- extent-aware world-relative tile generation;
- explicit parent and context tile roles;
- clean 2D tile rendering;
- a widescreen-first atlas;
- generic region, subregion, local, and detail orchestration;
- deterministic overlap, seam, and deeper-partition tests.

The current implementation is not yet accepted because:

- the available GitHub connector reports no workflow check results;
- browser QA has not been completed for `0.3.20`;
- exporter hex generation still owns a parallel classifier and must either move onto the canonical runtime classifier or be split into an explicitly approved follow-up.

The former windowed raster renderer remains a successful hierarchy proof, not the production regional rendering path.

3D and procedural material work remain blocked until the canonical tile model is verified and visually accepted.

## Delivery workflow

This is a single-developer repository.

Routine work lands directly on `dev` in small functional commits. Accepted commits are promoted exactly through `qa` and `main`. Root `AGENTS.md` records this permanently.

Do not create routine feature branches or pull requests unless the user explicitly changes the workflow.

## Accepted layout direction

Use a widescreen-first atlas composition:

- compact title and breadcrumb row;
- compact map controls;
- map occupying the dominant center-left area;
- diagnostics and selection details in a bounded right-side inspector;
- no vertically stacked cards beneath the map during normal desktop navigation;
- no page-level vertical scrolling at common widescreen resolutions;
- responsive stacking only at narrower breakpoints.

The `0.3.20` implementation applies this structure. Browser QA must validate `1920 x 1080` and `1440 x 900` behavior.

## Canonical tile translation layer

### Implemented runtime direction

The runtime API is now represented by:

```ts
generateGeographicTileWindow({
  project,
  topology,
  scale,
  extent,
  parentMembership,
  childMembership,
});
```

Required and implemented behavior includes:

- generate only the selected seam-aware extent;
- use adaptive world-relative `q/r` coordinates;
- preserve stable tile IDs across reopening and adjacent maps;
- mark exact parent membership separately from contextual tiles;
- preserve topology-cell provenance;
- support macro area, region, subregion, local, and detail maps;
- keep canvas and presentation concerns out of the canonical contract;
- generate a bounded halo for edge classification;
- produce deterministic window signatures.

### Contract locations

- `packages/shared/src/geographicTileWindow.ts`
- `packages/generator-core/src/geographicTileWindow.ts`

### Remaining ownership correction

The existing export pipeline in `packages/exporters/src/index.ts` still contains its established tile classifier.

Before PI 1 is fully complete, choose one of these outcomes:

1. Preferred: move exporter generation onto the canonical runtime classifier and retain exporter-only serialization and drawing.
2. Explicit follow-up: accept the runtime slice after browser QA and track exporter convergence as the immediate next increment.

Do not silently leave two long-lived geography classifiers without recording the decision.

## Deeper drilldown generation

The implemented hierarchy path is:

```text
Open parent
  -> choose adaptive scale and seam-aware extent
  -> generate canonical tile window
  -> classify inherited world facts
  -> render in 2D
  -> partition into the next child level
```

Parent facts remain authoritative:

- coastline and water identity;
- broad elevation and slope tendency;
- major ridges;
- major river continuity;
- climate and biome;
- geology and volcanism;
- permanent ice and snow constraints.

The `0.3.20` implementation does not yet add a new authoritative high-resolution terrain simulation at local or detail scale. It samples and classifies inherited facts on finer world-relative windows.

Browser QA must identify the point, if any, where the current topology becomes too coarse to support useful local or detail presentation. Any future scale-specific refinement must remain deterministic, world anchored, inherited-fact constrained, and replay neutral until separately approved.

## 2D rendering direction

### Implemented

`apps/desktop/src/regions/geographicTileWindowMap.ts` provides:

- direct hex-tile rendering;
- Natural and Terrain presentations from the same tile facts;
- water and ice treatment;
- elevation and morphology differentiation;
- rivers and ridges;
- parent, child, selection, label, and optional hex overlays;
- context dimming without removing neighboring terrain.

### Acceptance questions

Browser QA must answer:

1. Is the tile presentation materially cleaner than the enlarged raster at region and subregion scale?
2. Does it remain useful at local and detail scale?
3. Do river and ridge edges remain coherent across overlapping windows?
4. Are biome and morphology boundaries readable without becoming noisy?
5. Does context remain visible but subordinate?
6. Does selection near boundaries match the visible tile side?
7. Does the map remain interactive at the maximum `50 x 50` footprint?

The 2D path must be accepted before 3D begins.

## 3D feasibility

Decision status: planned next proof, not active implementation.

Three.js is already available.

Recommended geometry:

1. Use tile centers and shared edge or corner vertices to build a continuous terrain mesh.
2. Avoid independent raised hex columns except as a temporary diagnostic.
3. Render water as a separate continuous plane or mesh.
4. Render rivers as ribbons following canonical river-edge paths.
5. Keep the hex grid as an optional overlay and selection surface.
6. Use instancing for repeated trees, rocks, volcanoes, and later settlement markers.
7. Default to an orthographic or shallow-perspective camera because this remains a map tool.

A basic regional 2.5D proof can be one focused increment. Production regional 3D remains multiple increments.

## Procedural PBR direction

Decision status: future-direction hypothesis, not locked architecture.

Do not generate a bespoke texture stack per tile.

Use shared procedural material families driven by canonical tile attributes:

- biome;
- morphology;
- elevation;
- slope;
- wetness;
- temperature;
- river strength;
- volcanism;
- deterministic variation seed.

Candidate material families:

- grassland;
- forest;
- desert;
- exposed rock;
- tundra;
- snow;
- ice;
- coastal water;
- deep water;
- marsh or bog;
- volcanic terrain.

Runtime shaders or procedural texture generation may derive:

- base color;
- roughness;
- normal detail;
- limited height or displacement detail;
- ambient-occlusion approximation;
- snowline, shoreline, wet-ground, exposed-rock, and vegetation masks.

Terrain metalness remains zero except for explicitly modeled artificial features.

## Material-transition hypothesis

The preferred hypothesis remains a hybrid:

- canonical tiles remain the simulation and selection units;
- continuous window-level material weights blend across the rendered surface;
- a small curated transition system handles physically meaningful boundaries.

### Window-level blend weights

A future translated tile may contribute several shared material weights, for example:

```ts
{
  grassland: 0.65,
  exposedRock: 0.20,
  wetSoil: 0.15,
}
```

The opened window may derive low-resolution control or splat maps that:

- interpolate weights across shared tile edges;
- normalize contributors;
- keep only the strongest two or three contributors per rendered pixel;
- use a compact active material palette;
- remain stable across adjacent and reopened windows through world-relative coordinates.

### Transition shaping

A future visual proof may test modest deterministic boundary distortion using:

- low-frequency world-space noise;
- slope and rock evidence;
- drainage and wetness;
- temperature and snow coverage;
- shoreline distance;
- vegetation density.

The distortion must not move a terrain identity far enough to contradict canonical tile classification.

### Physical-cover priority

A surface-cover hierarchy may remain useful:

```text
base geology
-> soil or sediment
-> vegetation cover
-> wetness or mud
-> snow or ice
-> ash, lava, or temporary deposits
-> roads and constructed surfaces
```

This ordering governs physical cover. It does not allow one whole neighboring tile to paint over another.

### Curated special transitions

Likely candidates include:

- coastline and beach;
- shallow water;
- riverbank;
- cliff edge;
- snowline;
- glacier edge;
- marsh boundary;
- lava-flow edge;
- road shoulder;
- wall or embankment.

Possible techniques include procedural edge geometry, decals, trim textures, signed-distance masks, or instanced boundary meshes. Important geography must derive from canonical feature and edge data rather than color inference.

A complete pairwise edge-and-corner asset atlas is not the default core strategy because it grows combinatorially with materials, directions, corners, states, and three-way junctions.

## Proof questions before locking materials

A future proof must answer:

1. Do window-level blend maps remove mechanical hex seams without muddying meaningful biome boundaries?
2. How much deterministic world-space distortion is useful without violating tile meaning?
3. Can transitions remain stable across adjacent windows and hierarchy levels?
4. How many active material families fit the `50 x 50` maximum footprint?
5. Should 2D and 3D share blend maps or derive presentation-specific maps from the same attributes?
6. Which boundaries require decals or geometry?
7. How should seasonal or temporary cover interact with deterministic base materials?
8. Is an authored transition-atlas renderer worthwhile as an optional presentation?

## Revised implementation sequence

### PI 1: Canonical tile-window drilldown

Implementation status: code present on `dev`, validation pending.

Remaining:

- obtain a real `npm audit` and `npm run verify` result;
- complete the browser QA matrix;
- capture screenshots;
- resolve exporter classifier ownership;
- fix any overlap, seam, river, ridge, layout, or performance defects;
- promote the exact accepted commit through `qa` and `main`.

### PI 2: Regional 3D proof

Begin only after PI 1 acceptance.

- continuous terrain mesh;
- elevation and water;
- directional lighting and shadows;
- orthographic camera, pan, zoom, and limited orbit;
- optional hex grid;
- parent and child boundaries;
- tile selection;
- simple biome colors.

### PI 3: Procedural material system

- shared biome material families;
- deterministic color and normal variation;
- roughness and moisture response;
- window-level material blend maps;
- snow and shoreline blending;
- river ribbons;
- instanced vegetation and terrain features.

### PI 4: Detail and performance

- scale-specific terrain refinement;
- background generation;
- cached tile windows;
- mesh and feature LOD;
- optional baked PBR export;
- profiling at the maximum `50 x 50` footprint.

## Guardrails

- Do not create a second geography model for 3D.
- Do not let presentation-generated noise alter authoritative world facts.
- Do not reset tile coordinates per parent map.
- Do not keep exporter-only structures as the long-term hierarchy contract.
- Do not return to CSS zooming or enlarged source rasters as the regional renderer.
- Do not generate one bespoke PBR texture stack per tile.
- Do not require a complete pairwise transition atlas for the core renderer.
- Do not treat exploratory material shapes as accepted persistence contracts.
- Do not activate or persist `world-regions-v2` without separate approval.
- Do not begin 3D or materials until PI 1 passes verification and browser QA.

## Immediate next slice

The immediate work is validation and hardening of the implemented canonical tile-window path, including exporter convergence. The regional 3D proof starts only after the `0.3.20` world-to-detail experience is accepted and promoted.
