# Reference-system ETL and multi-body navigation handoff

Updated: 2026-08-04
Status: Earth and one-system foundations implemented on `dev`; exact-head verification, real ETOPO build, browser QA, and source-backed secondary-body assets remain open

Authoritative planning:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/planning/body-detail-tiers-and-payload-strategy.md`

Reference-data notes:

- `refs/research/reference-data/earth-reference-data.md`

Tracking:

- Parchment Worlds #22, Sol System reference project
- World Forge #124, preserve active body across System, Globe, Explorer, and Map

## Product direction

One World Forge project owns one coherent planetary system. Earth, Luna, Mars, giants, moons, belts, and minor bodies are not separate `.wforge` projects.

Real reference bodies use actual or best-available source data. Derived and procedural presentation may fill genuine gaps but must remain distinguishable and must not overwrite recognizable imported facts.

Full scientific provenance remains in repository documentation. Runtime records carry the compact origin, capability, shape, and asset information required for correct behavior.

## Implemented foundation

### Multi-body body catalog

Implemented in:

- `packages/shared/src/worldBodies.ts`
- `packages/shared/src/worldBodySession.ts`

`world-forge-body-catalog-v1` carries:

- stable body identity and parent relationships;
- durable `primaryBodyId`;
- initial durable `activeBodyId` plus session selection;
- body family;
- explicit Globe, Map, Explorer, and irregular-shape capabilities;
- physical and orbital facts;
- imported, derived, generated, authored, or edited origin;
- optional compact body detail;
- optional canonical `PrimaryWorld` surface.

Legacy projects receive an in-memory compatibility catalog. Their primary world is treated as geographic while unsurfaced secondary bodies remain catalog-only.

### Body detail tiers

Implemented in:

- `packages/shared/src/worldBodyDetails.ts`

Schema:

- `world-forge-body-detail-v1`

Accepted variants:

- `catalog`;
- `atmospheric-presentation`;
- `raster-surface`;
- `irregular-mesh`;
- `geographic-surface`;
- `population`.

Accepted tiers:

- catalog;
- presentation;
- reference surface;
- geographic.

This closes the previous binary model where a body had either metadata or a full Earthlike `PrimaryWorld`.

Large assets remain optional package-entry references with stable IDs, semantic roles, safe relative paths, media types, optional encodings, resolutions, and byte counts. The current contract validates paths but the exporter does not yet copy referenced binary assets into `.wforge`; that is the next package increment.

### Sol tier assignment

Implemented in:

- `packages/generator-core/src/solReferenceProject.ts`

Current scaffold:

- Earth: geographic tier with canonical imported surface;
- Mercury, Venus, and Mars: catalog tier until accepted source surfaces are added;
- Jupiter, Saturn, Uranus, and Neptune: compact atmospheric presentation tier;
- ordinary selected moons: catalog tier;
- Phobos and Deimos: catalog tier with irregular-shape intent, not fake meshes;
- Main Asteroid Belt and Kuiper Belt: deterministic population detail.

The giant palettes, ring profiles, and belt distributions are derived presentation scaffolds. They are not substitutes for later accepted source imagery and shape data.

### One-project `.wforge` serialization

Implemented in:

- `packages/exporters/src/multiBodyWforge.ts`
- `packages/exporters/src/desktop.ts`

The package preserves one system and multiple canonical surfaces:

```text
manifest.json
project.json
system/body-catalog.json
bodies/<body-id>/world.json
bodies/<body-id>/layers/*.json
bodies/<body-id>/topology-layers/*.json
```

Compact body detail records round-trip inline with the catalog. Existing single-world packages remain accepted.

Referenced albedo, mesh, compact raster, cloud, ring, and other binary body assets are not yet copied or checksum-validated by the exporter.

### Normalized reference-body raster import

Implemented in:

- `packages/generator-core/src/referenceBodyImport.ts`

The source-neutral seam accepts equirectangular elevation or radial displacement plus optional body layers and creates a canonical `PrimaryWorld`. Imported layers remain authoritative. Missing layers are derived only when absent.

### Earth ETOPO build path

Implemented in:

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

Default local outputs:

- `.local/reference-data/earth-etopo/`
- `.local/reference-data/sol-earth-reference.wforge`

The Python transform passed a synthetic GeoTIFF smoke for reprojection, output orientation, binary encoding, water-mask derivation, and manifest statistics. The real global ETOPO source has not yet been built and browser-validated in the recorded session.

### Active-body behavior

Implemented across the body session, renderer projection, Globe targeting, and embedded package bridge:

- supported surfaced bodies can remain selected across view changes;
- Map reports unsupported bodies rather than silently reverting to Earth;
- imported canonical secondary surfaces can resolve as Globe targets;
- the true primary body remains durable for save and export;
- embedded Parchment systems load and save as one package rather than device-wide inventory records.

Direct System selection, all Explorer paths, and every diagnostic panel still require exact browser validation under #124.

### Parchment package bridge

The Parchment side now supports package-contained `.wforge` attachments, body bindings, iframe transfer, and edited-system save-back. The Sol project no longer needs pre-existing World Forge browser storage.

The current `.pworld` attachment encoding is a functional initial path and still requires payload-size and memory measurement for high-resolution data.

## Automated coverage added

Committed tests cover:

- legacy compatibility catalogs;
- body identity and active-body selection;
- compact body-detail validation and safe package paths;
- detail-derived view capabilities;
- Sol detail-tier assignments;
- multi-surface `.wforge` round trips;
- body-detail round trips through the catalog;
- normalized raster validation and layer origin;
- active-body renderer and Globe resolution;
- Parchment package attachment and bridge behavior.

The new body-detail commits have not yet been observed running on the exact final `dev` head. Do not claim the repository verification suite passed for this increment until it is run after pulling the latest head.

## Current fidelity boundary

The current Earth path can produce recognizable elevation, bathymetry, and coastline geometry from ETOPO.

It does not yet provide complete real Earth environmental data:

- temperature remains derived when absent;
- wetness, precipitation, and biomes remain derived placeholders;
- rivers, lakes, wind, and currents remain empty placeholders;
- real albedo is not yet integrated;
- real hydrography, land cover, climate, and ice sources remain to be selected and licensed;
- package size and browser memory behavior are unmeasured.

Do not describe the current Earth as finished reference content.

## Immediate resume sequence

1. Pull the final World Forge `dev` head and run `npm ci` and `npm run verify`.
2. Correct any type or focused-test failure from the body-detail contract before adding assets.
3. Prepare a real ETOPO bundle at `512 x 256` and build the Earth-backed Sol `.wforge`.
4. Record `.wforge` size, build time, load time, and peak browser behavior.
5. Generate the enriched Parchment Sol starter from that `.wforge`.
6. Import through the normal Parchment UI and verify no dependency on device-local World Forge storage.
7. Perform Earth recognition QA in System, Globe, Map, and Explorer.
8. Extend `.wforge` export and import to copy and checksum referenced compact body assets.
9. Prove one Tier 1 giant using accepted imported appearance imagery.
10. Prove one Tier 2 solid body and one irregular mesh before expanding through the remaining Sol inventory.

## Guardrails

- One system remains one project.
- Do not force every body into `PrimaryWorld`.
- Do not create separate Earth, Mars, Luna, or giant projects to avoid multi-body work.
- Do not label derived giant palettes or procedural motion as observed data.
- Do not serialize decorative belt particles.
- Do not force Map or Explorer onto bodies where those views are not meaningful.
- Do not leak source-specific formats into durable body contracts.
- Do not claim validation passed until it runs on the exact final head.
