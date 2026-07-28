# Geographic Drilldown Rendering Roadmap

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Related handoff: `refs/handoffs/geographic-region-drilldown.md`

## Status

The adaptive hierarchy and world-relative hex contracts are working through subregion level. Initial browser inspection found the geographic breakdowns coherent enough to continue, but exposed presentation and depth limitations in the current prototype.

The next implementation should treat the current windowed raster renderer as a successful hierarchy proof, not the final regional-map rendering path.

## Browser findings

1. Bias the atlas layout toward widescreen desktop use.
2. Horizontal space is abundant; vertical space is the constrained dimension.
3. The current title, breadcrumb, control bar, map, and diagnostics stack spends too much height before the user reaches the map.
4. Region and subregion geography generally looks coherent.
5. The hierarchy needs to continue through `local` and `detail` levels.
6. Enlarging the existing world raster produces visibly soft, splotchy regional terrain.
7. Explorer-style presentation or canonical hex-tile translation should replace direct raster enlargement at closer scales.

## Layout direction

Use a widescreen-first atlas composition:

- compact title and breadcrumb row;
- compact control row or controls integrated into the map header;
- map occupying the dominant center-left area;
- diagnostics and selection details in a right-side inspector;
- avoid vertically stacked cards beneath the map during normal navigation;
- keep the selected map usable without page-level vertical scrolling at common desktop resolutions.

Responsive behavior should preserve function on narrower windows, but widescreen is the primary product target.

## Canonical tile translation layer

The existing hex-tile export pipeline should be refactored into a reusable runtime translation layer rather than duplicated for drilldown.

Current relevant implementation:

- `packages/exporters/src/index.ts`
- `generateHexTileMap(...)`
- tile classification for biome, morphology, features, ridges, rivers, elevation, temperature, wetness, water, ice, and volcanism

The runtime API should become extent-aware and world-anchored, approximately:

```ts
generateHexTileWindow({
  project,
  scale,
  extent,
  parentMembership,
  contextPadding,
});
```

Required behavior:

- generate only the selected seam-aware rectangular extent;
- use adaptive world-relative `q/r` coordinates rather than restarting at `0,0`;
- preserve stable tile IDs across reopening and adjacent maps;
- mark exact parent membership separately from contextual tiles;
- preserve topology-cell provenance;
- support continent, region, subregion, local, and detail levels;
- feed 2D rendering, 3D rendering, JSON/SVG export, and later persistence from one canonical tile model.

The tile classifier belongs in generator-core or another shared generation package. Exporters should serialize or draw the canonical result rather than own the classification logic.

## Deeper drilldown generation

The next hierarchy levels should use inherited facts as constraints rather than simply enlarging the same source raster.

Recommended flow:

```text
Open parent
  → choose adaptive scale and seam-aware extent
  → generate canonical hex tile window
  → translate inherited world facts into tile priors
  → generate deterministic scale-appropriate detail
  → classify tiles
  → render in 2D or 3D
  → partition into the next child level
```

Parent facts that must remain authoritative:

- coastline and water identity;
- broad elevation and slope tendency;
- major ridges;
- major river continuity;
- climate and biome;
- geology and volcanism;
- permanent ice and snow constraints.

Child generation may add local relief, tributaries, terrain variation, vegetation patterns, wetlands, and other scale-appropriate detail without contradicting those inherited facts.

## 2D rendering direction

The first production rendering increment should use the canonical tile window to replace the enlarged world raster at region and deeper levels.

Possible presentations:

- clean Explorer-style map;
- direct hex-tile presentation using the existing classification rules;
- optional Natural and Terrain presentations derived from tile facts;
- parent, child, river, ridge, and selection overlays retained as separate layers.

This should be completed before investing heavily in 3D. Otherwise the 3D renderer will merely emboss the current splotchy source data.

## 3D feasibility

A regional 3D viewer is moderately involved and fits the existing stack. Three.js is already a project dependency.

Recommended geometry:

1. Use tile centers and shared edge/corner vertices to build a continuous terrain mesh.
2. Avoid independent raised hex columns except as a short-lived diagnostic.
3. Render water as a separate continuous plane or mesh.
4. Render rivers as ribbons following canonical river-edge paths.
5. Keep the hex grid as an optional overlay and selection surface.
6. Use instancing for repeated features such as trees, rocks, volcanoes, and settlement markers.
7. Default to an orthographic or very shallow-perspective camera because this remains a map tool.

A basic 2.5D proof can be one focused PI. Production-quality regional 3D should be planned as several increments.

## Procedural PBR direction

Do not generate a separate full texture stack per tile.

Use shared procedural material families with per-tile attributes:

- biome;
- morphology;
- elevation;
- slope;
- wetness;
- temperature;
- river strength;
- volcanism;
- deterministic variation seed.

Shared material families should cover at least:

- grassland;
- forest;
- desert;
- rock;
- tundra;
- snow;
- ice;
- coastal water;
- deep water;
- marsh or bog;
- volcanic terrain.

Runtime shaders or procedural texture generation should derive:

- base color;
- roughness;
- normal detail;
- limited height or displacement detail;
- ambient occlusion approximation;
- snowline, shoreline, wet-ground, exposed-rock, and vegetation masks.

Terrain metalness should remain zero except for explicitly modeled artificial features.

Texture atlases may be baked later for export or caching. Runtime rendering should prefer shared materials and batched geometry over thousands of unique tile materials.

## Recommended implementation sequence

### PI 1: Tile-window drilldown

- extract tile classification from exporter ownership;
- create extent-aware world-anchored tile windows;
- replace region and subregion raster enlargement with a clean 2D tile renderer;
- implement local and detail hierarchy levels;
- retain deterministic IDs, exact membership, context, seam handling, and replay-neutral diagnostic behavior.

### PI 2: Regional 3D proof

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
- snow and shoreline blending;
- river ribbons;
- instanced vegetation and terrain features.

### PI 4: Detail and performance

- scale-specific terrain refinement;
- background generation;
- cached tile windows;
- mesh and feature LOD;
- optional baked PBR export;
- profiling at the maximum `50 x 50` contextual footprint.

## Guardrails

- Do not create a second geography model for 3D.
- Do not let presentation-generated noise alter authoritative world facts.
- Do not reset tile coordinates per parent map.
- Do not make exporter-only structures the persisted hierarchy contract.
- Do not use CSS zooming or enlarged source rasters as the production regional renderer.
- Do not activate or persist `world-regions-v2` as part of the rendering work without separate approval.

## Immediate next slice

The next implementation should be the extent-aware canonical tile-window PI, with a widescreen atlas layout correction included in the same user-visible increment. 3D should begin only after that tile model is producing clean and stable region, subregion, local, and detail maps.
