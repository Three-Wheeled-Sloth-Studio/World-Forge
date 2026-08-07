# Current Handoff: Geographic Atlas WP2 Visual QA

Updated: 2026-08-06

Status: **WP0 and WP1 complete; WP2 implementation is on `dev`; exact-head repository validation and visual QA are active**

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
- WP0/WP1 contract commit: `df752d39f31f485643a9c5819ac33b710b91f6a6`
- WP2 implementation commit: `30fd1cb0b0e4f5cc22d6200890f6c68191b049c4`
- WP2 renderer validation fix commit: `db1f5163bf713f892776e950a4fb11ae784c034b`
- final-river diagnostic validation fix commit: `9a852f8c03039d382f86ff9afffdcba209c5641a`
- visible version: `0.3.68`

## Completed

### WP0 and WP1

The repository inventory and renderer-neutral `GeographicScene` contract are complete. The contract owns deterministic source identity, projected extent, terrain patches and seams, separate water surfaces, later river and overlay seams, diagnostics, progress, and cancellation without importing React, DOM, Canvas, WebGL, or Three.js types.

### WP2 scene builder

`packages/generator-core/src/geographicSceneBuilder.ts` now:

- consumes a bounded canonical `GeographicTileWindow`;
- builds elevation-displaced continuous terrain;
- splits representative windows into four overlapping seam-sharing patches;
- records reciprocal shared-sample seam metadata;
- rejects invalid seams before finalizing the scene;
- builds separate clipped water geometry from authoritative water classification;
- assigns deterministic natural material weights;
- reports progress and honors structural cancellation;
- finalizes a deterministic `GeographicScene` signature;
- leaves rivers, boundaries, labels, and hexes empty for this slice.

`packages/generator-core/src/geographicSceneFixture.ts` provides a deterministic 9 by 7 continental fixture with ocean, inlet coast, lowlands, mixed biomes, permanent ice, and a mountain ridge.

### WP2 renderer adapter

`apps/desktop/src/regions/GeographicSceneViewer.tsx` now:

- converts each terrain patch into a Three.js buffer geometry;
- renders water as a separate mesh;
- uses an orthographic camera with shallow map-like pitch;
- renders Natural and Elevation presentations from identical positions and indices;
- owns resize and GPU disposal lifecycle explicitly.

The first exact-head Windows validation caught a TypeScript boundary mismatch where the readonly scene water indices were passed directly to Three.js. Commit `db1f5163bf713f892776e950a4fb11ae784c034b` preserves the readonly scene contract and creates an explicit `Uint32Array`/`BufferAttribute` copy at the renderer boundary.

The second Windows validation reached the full test suite and exposed stale hydrology telemetry: the deep-time hydrology builder accepted 22 rivers, then `supplementNamedTopologyRivers` added 12 final named rivers after the diagnostics object had already been finalized. Commit `9a852f8c03039d382f86ff9afffdcba209c5641a` synchronizes every named-river-dependent diagnostic after supplementation, including count, capacity use, covered path share, path lengths, source and mouth elevations, terminus shares, and conditional notes. A focused regression test covers the synchronization and verifies the original diagnostic object is not mutated.

### Workspace spike path

`GeographicAtlasWorkspace.tsx` now exposes an explicit `2.5D spike` toggle for an open bounded geographic area.

The spike path:

- builds from the same canonical tile window used by the current atlas;
- does not silently enter through Auto presentation;
- shows explicit unsupported, cancelled, and failed states;
- preserves the flat canvas only as an intentional comparison path during the spike;
- does not change saved-world, `.wforge`, `.pworld`, or Parchment host contracts.

## Validation completed in the available runtime

- strict isolated TypeScript compilation of the scene builder and fixture;
- strict isolated TypeScript compilation of the Three.js adapter;
- workspace syntax and type-shape review against the current controller boundary;
- executable builder smoke run:
  - deterministic signature: `geographic-scene-v1:55ba8116`;
  - terrain patches: `4`;
  - seam defects: `0`;
  - water surfaces: `1`;
  - clipped water triangles: `84`;
  - relief range: `-4.6224` through `9.05904` scene units;
  - final progress ratio: `1`.

GitHub currently reports no workflow runs or commit statuses for the WP2 implementation or validation-fix commits. Do not treat that absence as passing CI.

## Active next work: exact-head WP2 acceptance

Run the normal repository validation and perform desktop visual QA on commit `9a852f8c03039d382f86ff9afffdcba209c5641a` or its documented descendant.

### Repository validation

```bash
npm run validate
npm run validate:desktop
npm run validate:api
npm run adr:guard -- --base HEAD~1
```

Also run the focused tests:

```bash
npx vitest run packages/generator-core/src/plateMotionPipelineDiagnostics.test.ts packages/generator-core/src/geographicSceneBuilder.test.ts apps/desktop/src/regions/GeographicSceneViewer.test.ts
```

### Desktop visual QA path

1. Open a generated world in the normal workspace.
2. Enter the geographic atlas.
3. Open a bounded landmass or region.
4. Toggle `2.5D spike`.
5. Verify useful visible relief with no raised-hex-column appearance.
6. Switch between Natural and Elevation and verify geometry does not move.
7. Verify water remains a separate surface and follows the authoritative coastline.
8. Check all four terrain patch joins for cracks or lighting discontinuities.
9. Resize the workspace repeatedly and confirm the renderer resizes cleanly.
10. Toggle back to the flat comparison path and reopen the same area.
11. Exercise an unsupported or malformed scene and confirm an explicit error rather than a hidden fallback.
12. Capture exact commit, operating system, GPU, viewport, and screenshots in issue `#10`.

## WP2 acceptance boundary

WP2 is accepted only when exact-head QA proves:

- useful elevation relief;
- continuous terrain rather than raised hex columns;
- separate water geometry with no material-color inference;
- Natural and analytical presentations sharing one geometry;
- deterministic signatures;
- no visible cracks at declared seams;
- bounded scene-build and desktop rendering cost;
- explicit failure behavior;
- no saved-world or integration contract change.

A screenshot without seam, geometry-sharing, and failure-state evidence is not acceptance.

## Next architecture slice after WP2 acceptance

WP3 adds map interaction over the accepted geometry:

- orthographic pan and continuous zoom;
- map reset;
- shallow pitch and limited rotation;
- canonical picking;
- region boundaries and selection overlays;
- screen-space labels;
- synchronized context map.

Do not pull rivers or progressive hex rendering forward. They remain WP4 after terrain, water, and interaction are accepted.

## Guardrails

- Do not create a second geography model for 2.5D.
- Do not build production terrain from raised hex columns.
- Do not make terrain geometry the source of region membership.
- Do not infer rivers or boundaries from material colors.
- Do not allocate a full-world fine terrain mesh.
- Do not make every hex a scene object.
- Do not add unrestricted flight controls.
- Do not persist spike-only scene artifacts.
- Do not change `.wforge`, `.pworld`, or Parchment host contracts during the spike.
- Do not retain the flat atlas as a hidden production fallback after spike acceptance.
- Do not absorb issue `#12` tuning or issue `#126` location actions into this slice.

## Existing Sol reference status

The Sol package pipeline remains operational. Earth, Jupiter, and Mars remain the accepted body-presentation baseline. Broader body presentation remains outside this atlas spike.