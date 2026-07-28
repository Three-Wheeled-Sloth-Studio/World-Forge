# PI: Canonical Tile-Window Geographic Drilldown

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Base branch: `dev`

Tracking issue: `#10`

## Purpose

Replace the accepted close-scale raster hierarchy proof with a reusable canonical tile-window path and complete the diagnostic geographic hierarchy through local and detail levels.

This PI is grounded in:

- `refs/handoffs/geographic-region-drilldown.md`
- `refs/testing/geographic-region-drilldown-qa.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

The PI must produce one coherent user-visible increment:

- a widescreen-first atlas;
- clean region, subregion, local, and detail maps;
- deterministic world-relative tile identities;
- exact parent membership distinct from context;
- generic hierarchy navigation through detail;
- exporter reuse of the same classifier;
- completed automated and browser validation.

## Current accepted baseline

The current `dev` implementation already provides:

- continent, archipelago, and provisional ocean-basin macro areas;
- deterministic adaptive scales;
- seam-aware rectangular extents;
- exact parent membership sampled through world-anchored hex centers;
- stable region and subregion partitions;
- disconnected island handling;
- world-relative scale identifiers;
- in-memory partition caching;
- atlas navigation through subregion;
- Natural and Terrain presentations;
- heavy parent boundaries, lighter child boundaries, selection, labels, and optional hexes.

The existing windowed renderer is not failed work. It proved the hierarchy and interaction. Its direct world-raster enlargement is simply the wrong rendering substrate for close scales.

## Locked product rules

### Hierarchy

Use:

`World -> macro area -> region -> subregion -> local -> detail`

The world overview sectors remain navigation aids only. They are not geographic parents.

### Scale

Do not hardcode one miles-per-hex value per hierarchy level.

Every opened parent uses the existing adaptive scale ladder and the existing footprint contract:

- hard minimum context near `10 x 10`;
- preferred context near `20 x 20`;
- hard maximum `50 x 50` when the selected geography fits;
- explicit exceeded state instead of cropping selected geography.

### Membership

The selected parent and the rectangular rendering context are different concepts.

- Parent budgets use exact topology membership.
- Context-only terrain remains visible.
- Context-only terrain cannot become a selectable child of the open parent.
- A tile shared by adjacent windows retains the same world identity and terrain facts.

### Authority

This PI remains diagnostic and replay-neutral.

It does not activate `world-regions-v2`, persist child partitions, change the saved-world schema, or change generator compatibility.

## Recommended architecture

The existing exporter classifier contains useful canonical behavior, but it currently mixes four responsibilities:

1. tile coordinate generation;
2. terrain classification;
3. river and ridge connectivity;
4. export serialization and drawing.

Split those responsibilities so the atlas and exporters consume one runtime model.

### Suggested shared contract module

Suggested path:

`packages/shared/src/geographicTileWindow.ts`

The exact names may change, but keep the responsibilities and versioning explicit.

```ts
export const GEOGRAPHIC_TILE_WINDOW_VERSION = 'geographic-tile-window-v1' as const;

export type GeographicTileMembershipRole = 'inside-parent' | 'context-only';

export type GeographicTileWindowTile = {
  id: string;
  q: number;
  r: number;
  longitude: number;
  latitude: number;
  topologyCellId: number;
  membershipRole: GeographicTileMembershipRole;
  childIndex: number | null;
  biome: HexTileBiome;
  morphology: HexTileMorphology;
  terrainType: string;
  features: HexTileFeature[];
  featureDetails: HexTileFeatureDetail[];
  elevation: number;
  temperatureC: number;
  wetness: number;
  water: boolean;
  ice: boolean;
  volcanism: number;
  riverStrength: number;
  minorRiverEdges: HexTileEdge[];
  navigableRiverEdges: HexTileEdge[];
  ridgeEdges: HexTileEdge[];
  navigableRiverCenter: boolean;
};

export type GeographicTileWindow = {
  modelVersion: typeof GEOGRAPHIC_TILE_WINDOW_VERSION;
  sourceProjectId: string;
  sourceWorldId: string;
  sourceTopologyKind: TopologyKind;
  sourceTopologyResolution: number;
  scale: GeographicAdaptiveHexScale;
  extent: GeographicHierarchyMapExtent;
  parentId: string;
  parentLevel: GeographicHierarchyLevel;
  childLevel: GeographicHierarchyLevel | null;
  tiles: GeographicTileWindowTile[];
  signature: string;
};
```

Contract rules:

- Tile ID uses scale identity plus normalized world-relative `q/r`.
- Tile ID does not include the open parent.
- Terrain classification does not include selected state or UI colors.
- `childIndex` may be omitted from the canonical base tile and supplied as a parallel overlay if that keeps classification cleaner.
- Canvas coordinates remain renderer state.
- Presentation labels and inspector copy remain UI state.
- Future 3D material attributes may extend from tile facts but must not be added prematurely.

### Suggested classifier module

Suggested path:

`packages/generator-core/src/geographicTileClassification.ts`

Move or adapt the pure behavior currently behind exporter `classifyHexTile(...)`:

- surface structure classification;
- biome mapping;
- morphology mapping;
- snow and ice handling;
- feature and feature-detail rules;
- terrain label calculation;
- sampled elevation, temperature, wetness, water, river, lake, and volcanism facts.

Preferred API shape:

```ts
classifyGeographicTile({
  project,
  topology,
  surfaceStructure,
  topologyCellId,
  q,
  r,
  longitude,
  latitude,
  classificationRules,
  profile,
});
```

The result must be independent from whether the caller is an exporter, the atlas, a test, or a future renderer.

### Suggested tile-window generator

Suggested path:

`packages/generator-core/src/geographicTileWindow.ts`

Preferred API shape:

```ts
generateGeographicTileWindow({
  project,
  topology,
  scale,
  extent,
  parentId,
  parentLevel,
  parentMembership,
  childLevel,
  childMembership,
  classificationRules,
  profile,
});
```

Required behavior:

1. Iterate only `extent.rMin..rMax` and the wrapped `extent.columns` span.
2. Normalize `q` into `0..worldColumns - 1`.
3. Use `worldHexCenter(...)` for tile center geography.
4. Resolve topology provenance with `cubedSphereCellForLonLat(...)`.
5. Mark exact parent membership from the supplied topology mask.
6. Attach child membership only when the sampled topology cell belongs to the exact parent.
7. Classify terrain through the extracted pure classifier.
8. Resolve rivers and ridges with stable world-neighbor behavior.
9. Return deterministic ordering and a deterministic signature.

### Edge halo strategy

River and ridge connectivity is the main extraction risk.

The existing full-grid implementation can inspect every neighbor in the exported map. A window generator must still produce identical edges when the same tile appears at a window boundary.

Recommended first strategy:

- classify the requested extent plus a one-hex neighbor halo;
- resolve river and ridge edges over the halo;
- return only the requested extent;
- normalize longitude wrapping at both the requested extent and halo;
- do not let the open parent alter edge calculation.

Alternative implementations are acceptable if tests prove:

- the same tile has identical edges in the center and at the edge of overlapping windows;
- seam-crossing windows agree with equivalent non-seam neighbor relationships;
- exporter full-world output agrees with runtime tile facts.

Do not solve boundary edges by generating an entire fine-resolution world grid.

### Exporter adaptation

Keep public export behavior available.

`generateHexTileMap(...)` should become an adapter over shared classification and, where practical, the same tile-window generator.

Possible implementation:

- construct a full-world scale and extent from the requested export width and height;
- generate the canonical tile result;
- map it into the existing `HexTileMap` format;
- retain existing SVG and JSON serializers;
- preserve existing IDs and output compatibility where reasonable;
- explicitly version any unavoidable output change.

Before extraction, add fixture coverage for representative tiles so accidental classifier drift is visible.

## Runtime 2D renderer

Suggested path:

`apps/desktop/src/regions/geographicTileWindowMap.ts`

Do not embed canonical classification inside the renderer.

The renderer should consume:

- `GeographicTileWindow`;
- presentation mode;
- parent boundary information;
- child boundary information;
- selected child identity;
- label data;
- display size.

### First accepted visual treatment

The first renderer should be clean and readable, not a miniature version of the future material system.

Render separate layers in a predictable order:

1. base background;
2. biome or terrain tile fills;
3. water and ice treatment;
4. morphology or elevation differentiation;
5. ridges;
6. rivers;
7. context dimming outside the parent;
8. child boundaries;
9. selected child highlight;
10. heavy parent boundary;
11. optional hex lines;
12. labels and interaction focus.

Natural and Terrain presentations must use the same canonical tile facts. They may change palettes and emphasis, but not membership, edges, labels, or hit targets.

### Hit testing

Prefer direct tile polygon or tile-coordinate hit testing over converting the click back to a topology cell through the old raster transform.

Required behavior:

- clicks on context-only tiles do not select children;
- boundary clicks choose the visible tile consistently;
- selected child highlighting matches selector state;
- tile hit identity remains stable after resize.

### Canvas sizing

The current canvas dimensions are tied to tile count and then constrained by CSS. For the widescreen layout, use the available map viewport as an input.

A `ResizeObserver` or equivalent bounded measurement can maintain:

- correct aspect ratio for the geographic extent;
- crisp device-pixel rendering;
- stable tile hit testing;
- no unnecessary internal scrolling at common desktop sizes.

## Generic hierarchy orchestration

The current controller has explicit region and subregion branches. Replace these with level relationships.

```ts
const childLevelByParent = {
  region: 'subregion',
  subregion: 'local',
  local: 'detail',
  detail: null,
};
```

Macro areas remain special because their first-level regions come from the accepted region preview rather than the generic child partition engine.

### Generic open-map record

Extend `GeographicHierarchyOpenMap.level` from the current three-level union to the full `GeographicHierarchyLevel` contract.

Each navigation entry should carry:

- ID and label;
- level and parent ID;
- exact membership;
- scale and extent;
- source partition reference where relevant;
- tile-window cache key or result where helpful.

### Generic partition creation

Use `buildGeographicChildPartition(...)` for:

- `region -> subregion`;
- `subregion -> local`;
- `local -> detail`.

The engine already accepts `parentLevel` and `childLevel` values for these transitions. The PI should extend orchestration and tests rather than fork the algorithm.

### Cache rules

Cache keys must include:

- project identity or current project key;
- algorithm versions;
- parent ID;
- parent level;
- child level;
- parent scale ID;
- relevant source-world revision or signature.

A partition for one parent must never be reused merely because another parent uses the same scale.

Tile-window caching is optional but may be useful within the session. It must use scale, extent, parent membership signature, and classification version.

### Navigation and selection

Selection state should be scoped by open parent rather than one global `selectedChildId`.

Returning to a parent should restore:

- its child partition;
- prior selected child when still valid;
- its scale and extent;
- presentation and hex preferences;
- identical tile IDs and boundaries.

The detail level is terminal. Do not present another incomplete child action.

## Widescreen atlas layout

The current modal already has a center-left map and right inspector, but spends too much height in separate header and toolbar bands.

### Desktop target

Record at least one primary QA resolution. Suggested baseline:

`1920 x 1080 browser viewport`

Also inspect one smaller laptop-class viewport.

### Target composition

- Modal uses most of the viewport without arbitrary fixed height waste.
- Title, breadcrumbs, and close action share one compact row.
- Back, presentation toggles, and hex toggle live in a compact map header.
- Map receives most available width and height.
- Inspector remains right-aligned and independently scrollable when necessary.
- Page-level or modal-level vertical scrolling is not required during normal drilldown.
- Narrow layouts may stack below the existing responsive breakpoint or a revised evidence-based breakpoint.

### Inspector behavior

Generalize the inspector for all levels:

- map contract and scale diagnostics;
- parent facts;
- child generation action when a next level exists;
- child selector and open action;
- terminal detail summary;
- error and progress treatment.

Do not add vertically stacked cards beneath the map on desktop.

## Scale-appropriate detail boundary

The tile window can sample more tiles than the source topology contains. Multiple close-scale tiles may initially share one topology cell.

This PI should not quietly invent a second authoritative terrain simulation.

Allowed:

- deterministic, world-anchored presentation-neutral variation;
- bounded interpolation of inherited elevation or climate tendencies;
- local feature hints that cannot contradict parent facts;
- retaining a seam for future scale-specific terrain refinement.

Not allowed without separate approval:

- moving coastlines;
- changing water identity;
- rerouting major rivers;
- contradicting major ridges;
- changing biome or climate identity arbitrarily;
- persisting refined terrain as authoritative saved-world facts;
- changing replay signatures.

A clean direct tile rendering of inherited facts is acceptable for the first implementation. Scale-specific detail should only enter where it materially improves legibility and remains fully deterministic.

## Proposed commit sequence

### Commit 1: Lock classifier fixtures and contracts

- add representative current exporter classification fixtures;
- add shared tile-window contracts and version constants;
- expose required package subpaths;
- no user-visible behavior change.

### Commit 2: Extract pure tile classification

- move classifier behavior from exporter ownership;
- preserve export parity;
- add direct classifier tests;
- keep existing export functions green.

### Commit 3: Generate extent-aware tile windows

- implement world-relative extent iteration;
- exact parent and context roles;
- topology provenance;
- halo-based edge resolution;
- overlap, seam, and maximum-footprint tests.

### Commit 4: Add clean tile-window renderer

- render canonical tile windows;
- add hit testing;
- retain parent, child, selection, labels, and hex overlays;
- switch region and subregion views from raster enlargement.

### Commit 5: Generalize hierarchy through detail

- generic partition orchestration;
- generic selection and navigation state;
- local and detail opening;
- generic inspector controls;
- deterministic cache and reopen tests.

### Commit 6: Correct widescreen atlas layout

- compact header and map controls;
- dominant map viewport;
- bounded right inspector;
- responsive and accessibility pass.

### Commit 7: Complete QA and handoff

- required seed and preset matrix;
- seam and larger-topology passes;
- screenshot sequence;
- performance notes;
- update the three active geographic references;
- record remaining 3D and material-system boundaries.

Implementation may combine compatible commits, but preserve reviewable boundaries. Avoid one 4,000-line geographic casserole.

## Automated test matrix

### Contract and classifier

- representative land, coast, ocean, lake, ice, snowline, river, ridge, wetland, and volcanic tiles;
- classifier output parity before and after extraction;
- deterministic tile signature;
- no parent-dependent terrain identity.

### Window generation

- ordinary non-seam extent;
- compact seam-crossing extent;
- minimum-size context;
- near-maximum `50 x 50` context;
- exceeded maximum state retained;
- overlapping windows share identical tile facts and IDs;
- context-only membership marked correctly;
- child index never assigned outside exact parent;
- world `q` wrapping and stable `r` values;
- topology provenance remains valid.

### Edges

- river crossing an ordinary window edge;
- river crossing the longitude seam;
- ridge crossing overlapping windows;
- no false edge caused solely by requested extent boundaries;
- exporter and runtime edge parity.

### Hierarchy

- region to subregion;
- subregion to local;
- local to detail;
- complete parent-only coverage at every level;
- disconnected components retained;
- stable child IDs and signatures;
- generic cache-key isolation;
- Back and breadcrumb restoration;
- detail terminal behavior.

### UI and renderer

- context tiles are not selectable;
- selected child stays synchronized with inspector selection;
- Natural and Terrain preserve boundaries;
- resize preserves hit testing;
- keyboard controls and focus remain usable;
- responsive breakpoint does not remove essential controls.

## Browser QA matrix

Use `refs/testing/geographic-region-drilldown-qa.md` as the authoritative checklist and extend it through detail.

At minimum run:

1. Star seed `2850873`, world seed `1001001`.
2. World seed `9776542`.
3. Fresh Archipelago preset.
4. Fresh Pangea preset.
5. One seam-crossing macro area or descendant.
6. One larger topology configuration.

For each useful path record:

- seed and preset;
- commit SHA;
- topology and map resolution;
- browser viewport;
- scale IDs and miles per hex;
- extent columns and rows;
- exact and context tile counts;
- child counts;
- generation time per level;
- visual result in Natural and Terrain;
- parent and child boundaries;
- river and ridge continuity;
- context selection behavior;
- seam behavior;
- close and reopen determinism;
- defects and screenshot paths.

Required final path:

`World -> macro area -> region -> subregion -> local -> detail`

## Acceptance checklist

### Architecture

- [ ] Tile-window contracts are versioned and shared.
- [ ] Tile classification no longer belongs only to exporters.
- [ ] Exporters consume the shared classifier.
- [ ] Tile IDs use world-relative coordinates and do not depend on the open parent.
- [ ] Exact parent membership is distinct from context.
- [ ] Window edges do not change canonical terrain facts.

### User experience

- [ ] Region and deeper maps no longer enlarge the world raster.
- [ ] Close-scale maps are materially cleaner and more legible.
- [ ] Widescreen layout uses the available map area.
- [ ] Normal desktop drilldown requires no page-level vertical scrolling.
- [ ] Local and detail levels are functional.
- [ ] Breadcrumb and Back navigation restore correct state.
- [ ] Detail is presented as terminal rather than unfinished.

### Determinism and performance

- [ ] Reopening reproduces scales, tile IDs, partitions, and facts.
- [ ] Adjacent windows agree on shared tiles.
- [ ] Seam windows remain compact and continuous.
- [ ] Maximum-footprint windows remain interactive.
- [ ] Larger-topology generation has acceptable progress and responsiveness.

### Validation

- [ ] `npm audit` reports zero vulnerabilities.
- [ ] `npm run verify` passes.
- [ ] `npm run evaluate:regions` passes.
- [ ] Required browser seeds and presets pass.
- [ ] Complete world-to-detail screenshots are retained.
- [ ] Active geographic handoff and QA files are updated.

## Explicit exclusions

- 3D terrain rendering;
- PBR materials;
- blend maps and control textures;
- procedural texture families;
- authored edge and corner transition atlases;
- persistent tile-window caching;
- persisted child partitions;
- activation of `world-regions-v2`;
- generator or replay-version changes;
- high-resolution authoritative terrain regeneration;
- politics, cultures, settlements, roads, resources, and naming;
- final URL routing and context menus;
- scientific ocean and sea decomposition;
- redesign of unrelated exports.

## Next PI after acceptance

Only after the canonical tile-window model is stable and visually accepted should the roadmap advance to the regional 3D proof:

- continuous terrain mesh;
- elevation and water;
- directional lighting and shadows;
- orthographic camera;
- optional hex grid;
- hierarchy boundaries and tile selection;
- simple biome colors.

The 3D proof must consume the accepted canonical tile model. It must not invent another geography pipeline with a nicer hat.