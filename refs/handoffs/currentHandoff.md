# Current Handoff: Geographic Atlas WP2 Representative Terrain Patch

Updated: 2026-08-06

Status: **WP0 and WP1 complete on `dev`; WP2 is the active next slice**

Primary tracking:

- World Forge issue `#10`
- `refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md`
- `refs/planning/geographic-atlas-2.5d-architecture-spike.md`
- `refs/planning/geographic-atlas-2.5d-wp0-inventory.md`
- `refs/handoffs/geographic-drilldown-rendering-roadmap.md`

Implementation baseline:

- repository: `Three-Wheeled-Sloth-Studio/World-Forge`
- branch: `dev`
- architecture commit: `3144aa7fafad45118bc28c92b04efbc20a0155da`
- WP0/WP1 commit: `df752d39f31f485643a9c5819ac33b710b91f6a6`
- visible version: `0.3.66`

Integration repository:

- `Three-Wheeled-Sloth-Studio/Parchment-Worlds`
- branch: `dev`
- integration handoff: `refs/handoffs/world-forge-2.5d-atlas-integration.md`

## Completed in WP0 and WP1

### Inventory

`refs/planning/geographic-atlas-2.5d-wp0-inventory.md` now classifies the current geographic seams as Reuse, Extend, Replace, or Reference-only.

Important findings:

- canonical hierarchy, tile-window, topology, river projection, surface-domain, width-scaling, label, and hex-overlay seams are reusable;
- the flat atlas remains QA evidence and an explicit temporary fallback during the spike, not the production rendering authority;
- Three.js is already a repository dependency, but the current tracked source contains no reusable `WebGLRenderer` or `OrbitControls` host found by the audit;
- WP2 should introduce the renderer adapter deliberately instead of reviving an unverified legacy seam.

### Pure scene contract

`packages/shared/src/geographicScene.ts` now defines the renderer-neutral `GeographicScene` boundary for:

- deterministic source identity and signatures;
- projection and visible extent;
- elevation-displaced terrain patches;
- explicit reciprocal patch seams and skirt fallback metadata;
- separate water surfaces;
- canonical rivers;
- region boundaries;
- progressive hex overlays;
- screen-space label anchors;
- selection and context metadata;
- deterministic diagnostics;
- structural cancellation and progress reporting.

The module imports no DOM, React, Canvas, WebGL, or Three.js types.

### Tests and validation

`packages/shared/src/geographicScene.test.ts` covers:

- stable signatures across object key order;
- signature changes when scene truth changes;
- symmetric seam identities;
- same-order and reverse-order reciprocal seams;
- deterministic seam diagnostics;
- AbortError-compatible cancellation;
- normalized progress reporting.

Validation completed in the available runtime:

- strict isolated TypeScript compile for the contract;
- strict isolated TypeScript compile for the tests using a local Vitest declaration shim;
- executable smoke checks for signatures, seams, progress, and cancellation.

Full repository validation still needs to run in the normal repository checkout or CI because the current execution runtime cannot clone GitHub directly.

## Architecture remains locked

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

## Active next slice: WP2

Build one fixed representative continental fixture and prove the terrain and water path end to end.

### Required implementation sequence

1. Add a pure scene builder that consumes a bounded canonical tile window and produces one deterministic `GeographicScene` fixture.
2. Build continuous terrain vertices and triangle indices from authoritative elevation.
3. Build a separate water surface from authoritative water classification and level.
4. Populate explicit patch seams and run `validateGeographicScenePatchSeams` before rendering.
5. Add a desktop Three.js scene adapter for terrain and water only.
6. Mount the adapter behind an explicit spike path in the existing atlas workspace.
7. Render Natural and Elevation or Slope views over the same terrain geometry.
8. Expose deterministic scene diagnostics and explicit cancelled, unsupported, and failed states.

Do not add rivers, boundaries, labels, or hexes to the renderer until terrain and water are proven. Their contracts are ready; their rendering belongs to later vertical slices.

### WP2 acceptance

The representative fixture must prove:

- visible and useful elevation relief;
- continuous terrain rather than raised hex columns;
- a separate water surface with no material-color inference;
- Natural and analytical views sharing one geometry;
- deterministic scene signatures;
- no visible cracks at declared patch seams;
- bounded fixture size and build time;
- explicit failure behavior with no silent Auto fallback;
- no saved-world, `.wforge`, `.pworld`, or Parchment host-contract change.

A screenshot without these seams is not acceptance.

## Ownership boundaries

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

## Read first for WP2

1. `refs/planning/geographic-atlas-2.5d-wp0-inventory.md`
2. `packages/shared/src/geographicScene.ts`
3. `packages/shared/src/geographicScene.test.ts`
4. `refs/planning/geographic-atlas-2.5d-architecture-spike.md`
5. `refs/decisions/geographic-atlas-2.5d-architecture-pivot-2026-08-06.md`
6. World Forge issue `#10`
7. `packages/shared/src/geographicTileWindow.ts`
8. `packages/generator-core/src/geographicTileWindow.ts`
9. `packages/generator-core/src/geographicSurfaceDomains.ts`
10. `packages/generator-core/src/geographicTopologyAdjacency.ts`

## Validation commands

Run from the repository root after WP2 changes:

```bash
npm run validate
npm run validate:desktop
npm run validate:api
npm run adr:guard -- --base HEAD~1
```

Also run the focused geographic scene and representative fixture tests directly when practical.

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
