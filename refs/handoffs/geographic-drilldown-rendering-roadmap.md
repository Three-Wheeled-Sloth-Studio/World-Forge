# Geographic Drilldown Rendering Roadmap

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Related handoff: `refs/handoffs/geographic-region-drilldown.md`

## Status

The adaptive hierarchy and world-relative hex contracts are working through subregion level. Initial browser inspection found the geographic breakdowns coherent enough to continue, but exposed presentation and depth limitations in the current prototype.

The next implementation should treat the current windowed raster renderer as a successful hierarchy proof, not the final regional-map rendering path.

The material-transition and PBR sections in this roadmap are future-direction planning. They record the current preferred shape and the questions a visual proof should test. They are not locked architecture decisions.

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

## Exploratory material-transition direction

Decision status: **future-direction hypothesis, not locked**.

The current preferred approach is a hybrid rather than either of these extremes:

- allowing whole tiles to overlap neighboring tiles according to one universal material priority;
- maintaining a combinatorial library of bespoke edge and corner textures for every possible material pairing.

### Likely default: window-level blend weights

Treat the tile as the simulation and selection unit, but blend terrain materials across a continuous map surface.

Each translated tile may contribute weights for several shared material families, for example:

```ts
{
  grassland: 0.65,
  exposedRock: 0.20,
  wetSoil: 0.15,
}
```

The opened map window should derive low-resolution control textures, commonly called splat maps, blend maps, control maps, or material-weight maps. Those control textures define material contribution across the complete contextual rectangle rather than assigning one unique texture stack to each tile.

Expected behavior:

- interpolate material weights across shared tile edges;
- allow up to three meaningful contributors at a hex vertex;
- normalize the final weights;
- limit active contributors per rendered pixel to the strongest two or three material families;
- use a compact active material palette for each opened map window;
- use world-relative coordinates so adjacent or reopened windows reproduce the same transitions.

A practical control-map density may start around four to sixteen samples per hex dimension and remain adjustable by zoom level and profiling evidence.

### Transition shaping

Pure center-to-center interpolation will preserve visible soft hex outlines. A later visual proof should test modest deterministic boundary distortion using:

- low-frequency world-space procedural noise;
- slope and exposed-rock evidence;
- drainage and wetness;
- temperature and snow coverage;
- shoreline distance;
- vegetation density.

The distortion should break mechanical hex boundaries without moving a biome or terrain identity far enough to contradict the canonical tile classification.

Presentation noise must remain deterministic, world-anchored, and non-authoritative.

### Layer priority remains useful for physical cover

A compositing hierarchy may still be appropriate for materials that physically cover another surface. A candidate ordering is:

```text
base geology
→ soil or sediment
→ vegetation cover
→ wetness or mud
→ snow or ice
→ ash, lava, or temporary deposits
→ roads and constructed surfaces
```

This hierarchy should define surface-cover behavior. It should not decide that one entire neighboring tile paints over another tile.

### Curated special transitions

A small curated transition system remains desirable where the boundary has physical or semantic meaning beyond ordinary material blending.

Likely candidates:

- coastline and beach;
- shallow-water transition;
- riverbank;
- cliff edge;
- snowline;
- glacier edge;
- marsh boundary;
- lava-flow edge;
- road shoulder;
- wall, embankment, or other constructed edge.

Possible implementations include procedural edge geometry, decals, trim textures, signed-distance masks, or instanced boundary meshes. These systems should derive from canonical feature and edge data rather than infer important geography from color alone.

### Why not a complete pairwise transition atlas

A full edge-and-corner atlas grows combinatorially as material families, directions, corner cases, moisture states, seasonal states, and three-way junctions are added. That approach may still be valid for a deliberately illustrated board-game presentation, but it is not the current preferred default for procedural PBR terrain.

The architecture should not prevent a future authored tile-art renderer from using curated edge assets. It should simply avoid making that asset matrix mandatory for the core geographic renderer.

### Candidate runtime contract

An exploratory tile-surface contract may eventually expose:

```ts
type TileSurfaceMaterial = {
  primary: MaterialFamilyId;
  secondary?: MaterialFamilyId;
  secondaryWeight?: number;
  soilMoisture: number;
  vegetationDensity: number;
  snowCoverage: number;
  exposedRock: number;
  sediment: number;
  volcanicCover: number;
  slope: number;
  elevation: number;
  shorelineDistance?: number;
  riverDistance?: number;
  seed: number;
};
```

A map-window material result may eventually expose:

```ts
type TerrainMaterialWindow = {
  extent: GeographicHierarchyMapExtent;
  activeMaterials: MaterialFamilyId[];
  blendMaps: BlendMap[];
  waterMask: TextureData;
  shorelineMask: TextureData;
  riverMask: TextureData;
  cliffMask: TextureData;
};
```

These names and shapes are illustrative only. They must not be treated as accepted persistence or public API contracts.

### Proof questions before locking direction

A visual prototype should answer:

1. Does window-level blending remove visible hex seams without making biome boundaries muddy?
2. How much world-space noise is enough to break regularity without violating tile meaning?
3. Can the renderer keep transitions stable across adjacent windows and hierarchy levels?
4. How many active material families can be supported at the `50 x 50` maximum footprint without unacceptable GPU cost?
5. Should 2D Explorer View and 3D PBR share the same blend maps or derive presentation-specific maps from the same tile attributes?
6. Which boundaries require authored decals or geometry rather than shader blending?
7. How should seasonal or temporary cover interact with deterministic base materials?
8. Is an authored transition-atlas presentation worth supporting as an optional renderer rather than a core dependency?

### Tentative implementation order

1. Start with blend maps over simple biome colors.
2. Add elevation shading, slope-driven rock, water, shoreline masks, and deterministic boundary distortion.
3. Replace simple colors with shared PBR material families.
4. Add explicit semantic transitions for shorelines, rivers, cliffs, snowlines, and roads.
5. Add local feature instances and optional baked texture export.

No material-transition implementation should begin before the extent-aware canonical tile-window model is stable.

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
- profiling at the maximum `50 x 50` contextual footprint.

## Guardrails

- Do not create a second geography model for 3D.
- Do not let presentation-generated noise alter authoritative world facts.
- Do not reset tile coordinates per parent map.
- Do not make exporter-only structures the persisted hierarchy contract.
- Do not use CSS zooming or enlarged source rasters as the production regional renderer.
- Do not generate one bespoke PBR texture stack per tile.
- Do not require a complete pairwise edge-and-corner asset matrix for the core renderer.
- Do not treat the exploratory material contracts in this document as accepted persistence contracts.
- Do not activate or persist `world-regions-v2` as part of the rendering work without separate approval.

## Immediate next slice

The next implementation should be the extent-aware canonical tile-window PI, with a widescreen atlas layout correction included in the same user-visible increment. 3D and material-transition work should begin only after that tile model is producing clean and stable region, subregion, local, and detail maps.
