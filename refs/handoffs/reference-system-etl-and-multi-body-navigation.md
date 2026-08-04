# Reference-system ETL and multi-body navigation handoff

Updated: 2026-08-04
Status: Foundation implemented on `dev`; real ETOPO package build, browser QA, Explorer integration, and Parchment embedding remain open

Authoritative planning:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`

Reference-data notes:

- `refs/research/reference-data/earth-reference-data.md`

Tracking:

- Parchment Worlds #22, Sol System reference project
- World Forge #124, preserve active body across System, Globe, Explorer, and Map

## Product direction

The target remains one World Forge project containing one coherent planetary system. Earth, Luna, Mars, and other bodies are not separate `.wforge` projects.

`Do not fabricate replay data` means do not invent real-body facts or substitute procedural lookalikes where recognizable source data exists. Procedural and analytical gap filling remains allowed when it is distinguishable and documented.

Full dataset provenance belongs in repository reference documents. The runtime model carries only the origin and capability distinctions required for correct product behavior.

## Implemented foundation

### Multi-body project contract

Added:

- `packages/shared/src/worldBodies.ts`
- `packages/shared/src/worldBodySession.ts`

The optional `world-forge-body-catalog-v1` extension provides:

- durable `primaryBodyId`;
- durable initial `activeBodyId`;
- stable body identity and parent relationship;
- body family;
- per-view capability flags;
- lightweight imported, derived, generated, authored, or edited origin;
- physical and orbital facts where known;
- optional canonical body surface data.

Legacy projects receive an in-memory compatibility catalog around the existing primary world. Legacy generated orbit classes are not mislabeled as physical kilometers or days.

### One-project `.wforge` serialization

Added:

- `packages/exporters/src/multiBodyWforge.ts`
- `packages/exporters/src/desktop.ts`

The normal desktop `.wforge` exporter now preserves one system and multiple surfaced bodies in one package:

```text
manifest.json
project.json
system/body-catalog.json
bodies/<body-id>/world.json
bodies/<body-id>/layers/*.json
bodies/<body-id>/topology-layers/*.json
```

The primary surface remains in the established package location. Secondary surfaces are package entries, not unrelated files or saved projects.

Local project serialization also preserves secondary body surfaces, so IndexedDB save and reopen can use the same project model.

Existing single-world packages remain accepted by the base importer path.

### Normalized reference-body raster import

Added:

- `packages/generator-core/src/referenceBodyImport.ts`

The normalized import seam accepts source-neutral equirectangular body layers and produces a canonical `PrimaryWorld`:

- elevation or radial displacement;
- optional water, temperature, wetness, ice, and biome layers;
- physical body values;
- output and topology resolution;
- lightweight per-layer origin.

Missing canonical layers are derived only when absent. Imported inputs are not replaced by generator output. The import projects the source raster onto the current cubed-sphere topology so existing Map, Globe, and geographic readers can share the same body.

### Sol system builder

Added:

- `packages/generator-core/src/solReferenceProject.ts`

The builder creates one Sol project containing:

- Sol context;
- the eight planets;
- Luna, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Enceladus, Titan, Titania, Oberon, and Triton;
- the Main Asteroid Belt;
- the Kuiper Belt;
- rounded physical and orbital facts in the body catalog;
- Earth as the initial primary and active body.

Only Earth is marked mappable in the first slice. Other bodies remain in the same project and gain Map, Globe, and Explorer capabilities as real body data is imported.

### Earth ETOPO build path

Added:

- `tools/reference-etl/prepare_etopo_earth.py`
- `tools/reference-etl/requirements.txt`
- `scripts/referenceDataBundle.ts`
- `scripts/build-earth-reference.ts`

Commands:

```bash
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-earth
npm run reference:build-earth
```

The first tool downloads or accepts NOAA ETOPO 2022, resamples it to a configurable 2:1 equirectangular raster, and writes a source-neutral binary bundle. The second command imports that bundle, builds the one-system Sol project, and exports a `.wforge` package.

Default local outputs:

- `.local/reference-data/earth-etopo/`
- `.local/reference-data/sol-earth-reference.wforge`

Large scientific source and derived binaries remain outside Git until redistribution terms, package size, and accepted release resolution are resolved.

### Active-body Map selection

Added:

- `packages/renderer/src/bodyAwarePresentation.ts`

The desktop renderer now resolves Map and point inspection against the session's active body instead of unconditionally reading `project.primaryWorld`.

When the selected body has no projected surface, Map displays an explicit unsupported-state message rather than silently showing Earth.

Globe target resolution now shares its selected body with Map through the session body context. This closes the reported System-to-Globe-to-Map reversion path for supported surfaced bodies and makes unsupported bodies visible as capability gaps.

Direct System-selection-to-Map synchronization and imported secondary-body Globe geometry still require additional UI/view integration under #124.

## Automated coverage added

Focused tests cover:

- legacy project compatibility catalogs;
- multiple surfaces inside one system project;
- body identity and active-body selection;
- multi-body `.wforge` and local serialization round trips;
- normalized raster validation and layer-origin handling;
- one-system Sol inventory and belt ordering;
- renderer projection to the active surfaced body;
- Globe-to-Map active-body continuity.

These tests are committed but have not yet been observed running on the final exact `dev` head. GitHub exposes no completed status checks for the current commits.

## Current fidelity boundary

The current Earth importer is capable of creating a recognizable elevation and coastline proof from ETOPO.

It does not yet create a complete real Earth:

- temperature is currently derived when no real field is supplied;
- wetness and precipitation are currently derived placeholders;
- biomes are currently derived placeholders;
- rivers, lakes, wind, and currents remain empty placeholders;
- Blue Marble or another real albedo layer is not yet integrated;
- no ETOPO source file or built `.wforge` has been committed or browser-validated.

Do not describe the current implementation as a finished Earth reference.

## Parchment package boundary discovered

Parchment's current `.pworld` envelope is JSON and supports attachment and nested-package entry kinds, but its current exporter writes only `project.json`.

A realistic Earth `.wforge` contains high-volume binary-compressible layers. Embedding it as base64 in the current JSON envelope would add size and memory overhead. The next Parchment increment must choose and test one of:

1. a bounded base64 attachment for the initial reference package;
2. a binary or ZIP `.pworld` container revision that preserves the existing manifest contracts;
3. another package-contained attachment representation that remains one portable project.

A pointer to unrelated device-local World Forge storage is not acceptable.

## Resume sequence

1. Run the final World Forge typecheck and focused tests on the exact `dev` head; correct any failures before expanding scope.
2. Prepare an ETOPO bundle and build the first real Earth-backed Sol `.wforge` locally.
3. Record package sizes, layer compression, load time, and memory behavior at `512 x 256`, `1024 x 512`, and `2048 x 1024` where practical.
4. Perform Map and Globe recognition QA against major continents, ocean basins, mountain systems, and trenches.
5. Complete imported-secondary-surface support in Globe and direct System-to-Map active-body synchronization.
6. Make Explorer consume the active body's compatible surface rather than `primaryWorld` directly.
7. Implement the Parchment package-contained `.wforge` attachment or container path.
8. Import through the normal Parchment UI with no dependency on pre-existing World Forge storage.
9. Add real albedo and hydrography, then select actual climate and biome sources.
10. Extend the same system project to Luna, Mars, Phobos, and Deimos.

## Guardrails

- One system remains one project.
- Do not create Earth, Mars, and Luna as unrelated `.wforge` projects.
- Do not make Map or Explorer permanently primary-world-only.
- Do not force gas giants or irregular bodies into Earthlike surface assumptions.
- Do not require full scientific provenance inside the product.
- Do not leak source-specific ETL formats into durable contracts.
- Do not label derived placeholder climate as observed Earth data.
- Do not claim validation passed until it runs on the exact final head.
