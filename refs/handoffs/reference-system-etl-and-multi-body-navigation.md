# Reference-system ETL and multi-body navigation handoff

Updated: 2026-08-04
Status: Earth, one-system, body-tier, and compact package foundations validated; source-backed Jupiter Tier 1 implementation on `dev` awaits exact-head verification, local source build, package measurement, and browser QA

Authoritative planning:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/planning/body-detail-tiers-and-payload-strategy.md`

Reference-data notes:

- `refs/research/reference-data/earth-reference-data.md`
- `refs/research/reference-data/jupiter-reference-data.md`

Tracking:

- Parchment Worlds #22, Sol System reference project
- World Forge #124, preserve active body across System, Globe, Explorer, and Map

## Product direction

One World Forge project owns one coherent planetary system. Earth, Luna, Mars, giants, moons, belts, and minor bodies are not separate `.wforge` projects.

Real reference bodies use actual or best-available source data. Derived and procedural presentation may fill genuine gaps but must remain distinguishable and must not overwrite recognizable imported facts.

Full scientific provenance remains in repository documentation. Runtime records carry the compact origin, capability, shape, encoding, and asset information required for correct behavior.

## Validated checkpoint

World Forge commit:

```text
8f06fa35e37a5d90aa5ee662cc1deb1ebecbd7f7
```

User-reported exact-head Windows validation:

- `npm ci`: 208 packages installed; 0 vulnerabilities;
- TypeScript project build passed;
- Vitest: 103 test files and 379 tests passed;
- multi-body package, checksum, local payload, and durable-primary tests passed;
- production page runner self-test passed;
- production page harness self-test passed;
- production rerank harness self-test passed;
- Vite production build passed.

The only build output was the existing Rollup warning for a main client chunk larger than 500 KB. It did not fail verification.

All commits after that checkpoint require a new exact-head verification run.

## Implemented system foundation

### Body catalog and active body

Implemented in:

- `packages/shared/src/worldBodies.ts`;
- `packages/shared/src/worldBodySession.ts`.

`world-forge-body-catalog-v1` carries stable body identity, parent relationships, durable primary body, initial active body, body family, view capabilities, physical/orbital facts, origin, optional compact detail, optional canonical surface, and typed runtime asset payloads.

Legacy projects receive a compatibility catalog. The primary remains geographic while unsurfaced secondary bodies remain catalog-only.

### Body detail tiers

Implemented in:

- `packages/shared/src/worldBodyDetails.ts`.

Schema:

- `world-forge-body-detail-v1`.

Variants:

- `catalog`;
- `atmospheric-presentation`;
- `raster-surface`;
- `irregular-mesh`;
- `geographic-surface`;
- `population`.

Tiers:

- catalog;
- presentation;
- reference surface;
- geographic.

This replaces the previous binary choice between metadata-only and a full Earthlike `PrimaryWorld`.

### One-project `.wforge` package

Implemented in:

- `packages/exporters/src/multiBodyWforge.ts`;
- `packages/exporters/src/bodyAssetPackage.ts`;
- `packages/exporters/src/desktop.ts`;
- `apps/desktop/src/storage.ts`.

Package layout:

```text
manifest.json
project.json
system/body-catalog.json
bodies/<body-id>/world.json
bodies/<body-id>/layers/*.json
bodies/<body-id>/topology-layers/*.json
bodies/<body-id>/<compact referenced assets>
```

Supported behavior:

- stable body-local asset references;
- optional build-time byte resolver;
- required and optional entries;
- body-local path enforcement;
- duplicate ID/path rejection;
- reserved-path collision rejection;
- byte-length validation;
- SHA-256 calculation and validation;
- import hydration into typed runtime payload storage;
- local save/reopen without base64 expansion;
- re-export without losing imported bytes;
- binary storage size counted once;
- durable primary preserved while another body is active.

Current `.wforge` import remains eager. Lazy per-body package-entry decoding is still open.

### Active-body view behavior

Implemented across session state, renderer projection, Globe targeting, package import, local serialization, and the Parchment bridge:

- supported surfaced bodies remain selected across compatible view changes;
- Map reports unsupported bodies instead of silently returning to Earth;
- imported canonical secondary surfaces resolve as Globe targets;
- package/local deserialization rehydrates the durable primary surface into the runtime catalog;
- saving or re-exporting while a secondary is active does not replace the primary;
- embedded Parchment systems load and save as one package.

Direct System selection propagation, all Explorer paths, body-specific diagnostics, and complete browser QA remain open under #124.

## Earth Tier 3 path

Implemented in:

- `packages/generator-core/src/referenceBodyImport.ts`;
- `tools/reference-etl/prepare_etopo_earth.py`;
- `scripts/referenceDataBundle.ts`;
- `scripts/build-earth-reference.ts`.

Commands:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-earth
npm run reference:build-earth
```

Default outputs:

```text
.local/reference-data/earth-etopo/
.local/reference-data/sol-earth-reference.wforge
```

The Python transform passed a synthetic GeoTIFF smoke for reprojection, orientation, binary encoding, water-mask derivation, and manifest statistics.

The real global ETOPO source has not yet been built and browser-validated in the recorded session.

Current Earth fidelity boundary:

- elevation, bathymetry, and coastline geometry can be source-backed;
- temperature remains derived when absent;
- wetness, precipitation, and biomes remain derived placeholders;
- rivers, lakes, wind, and currents remain empty placeholders;
- real albedo, hydrography, land cover, climate, and ice sources remain open;
- package size and browser memory remain unmeasured.

Do not describe the current Earth path as finished reference content.

## Jupiter Tier 1 path

Selected source:

- NASA/JPL Cassini cylindrical Jupiter map `PIA07782`;
- required credit: NASA/JPL/Space Science Institute.

Implemented in:

- `tools/reference-etl/prepare_jupiter_reference.py`;
- `scripts/referenceImageBundle.ts`;
- `packages/generator-core/src/referenceAtmosphericPresentation.ts`;
- `scripts/build-earth-reference.ts`;
- `packages/renderer/src/bodyAwarePresentation.ts`;
- `apps/desktop/src/globe/globeBodyTarget.ts`.

Preparation command:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-jupiter
```

Optional local source:

```powershell
npm run reference:prepare-jupiter -- `
  --input C:\path\to\PIA07782.jpg
```

Default local bundle:

```text
.local/reference-data/jupiter-cassini/
  PIA07782.jpg
  PIA07782-768x384.rgb565
  manifest.json
```

The ETL:

1. downloads or reads the official JPEG;
2. validates an approximately 2:1 cylindrical source;
3. preserves the source locally for QA;
4. resamples to 768 by 384 with Lanczos filtering;
5. quantizes to little-endian RGB565;
6. records source/prepared dimensions, byte lengths, checksums, source URLs, credit, and transform metadata.

Prepared payload:

- 768 by 384;
- little-endian RGB565;
- 589,824 bytes before `.wforge` compression;
- asset ID `jupiter-cassini-pia07782-albedo`;
- logical path `bodies/jupiter/albedo.rgb565`;
- detail tier `presentation`;
- origin `imported`;
- Globe capability only.

The Sol builder includes Jupiter only when the prepared bundle exists. Older JPEG-only local bundles are rejected with an instruction to rerun preparation.

The target resolver requires both the declared asset and hydrated bytes before Jupiter becomes selectable as an imported atmospheric Globe target. Missing bytes fall back rather than advertising broken presentation.

The body-aware renderer:

- keeps Map explicitly unsupported;
- stages the compact raster only for presentation-only atmospheric bodies;
- uses Globe's existing read-heavy seam-normalization context request as a one-shot activation boundary;
- synchronously expands RGB565 into the Globe texture canvas;
- leaves ordinary Map and export canvas paths on the unsupported state;
- records source asset/resolution metadata on the rendered texture canvas.

Search confirmed the Globe seam pass is the only current repository caller using `willReadFrequently`, which is the activation signal for this first slice.

Current Jupiter limitations:

- the legacy Globe geometry still uses its near-spherical geographic mesh;
- the oblate-spheroid shape contract is not yet consumed by Globe geometry;
- atmospheric-specific status/data attributes in the large Globe component are not yet wired;
- package-size delta, memory, seam quality, and recognizability are unmeasured;
- the real source bundle has not yet been prepared in the recorded session;
- the new Jupiter commits have not passed exact-head verification.

Do not call the Jupiter visual implementation complete until these are addressed.

## Parchment boundary

Parchment supports a package-contained `.wforge` attachment, body bindings, iframe transfer, and edited-system save-back.

Compact body assets travel inside the nested `.wforge`; no additional Parchment storage pointer is required. The current `.pworld` base64 attachment encoding still requires payload-size and peak-memory measurement with the enriched Earth-plus-Jupiter package.

## New automated coverage awaiting verification

Added or expanded tests cover:

- compact atmospheric appearance attachment;
- RGB565 payload validation;
- RGB565 decoding into RGBA;
- atmospheric raster resolution from active-body state;
- imported atmospheric target selection;
- missing-payload fallback;
- reference image manifest, dimension, byte-length, and checksum validation;
- inclusion of `scripts/**/*.test.ts` in the normal Vitest gate.

These tests are committed but have not yet been observed running on the final Jupiter implementation head.

## Immediate verification and QA sequence

From the World Forge repository:

```powershell
Get-Process node, esbuild -ErrorAction SilentlyContinue | Stop-Process -Force
npm ci
npm run verify
```

Then prepare reference data:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-jupiter
npm run reference:prepare-earth -- `
  --width 512 `
  --height 256 `
  --topology-resolution 64
npm run reference:build-earth
```

Expected package:

```text
.local/reference-data/sol-earth-reference.wforge
```

Record:

- source Jupiter dimensions, byte length, and digest;
- prepared Jupiter dimensions, byte length, and digest;
- Earth-only `.wforge` size;
- Earth-plus-Jupiter `.wforge` size;
- package delta;
- build time;
- import time;
- local save/reopen behavior;
- browser memory where practical.

Browser QA:

1. Import the generated Sol `.wforge` directly into World Forge or through the enriched Parchment starter.
2. Confirm Earth remains the primary body.
3. Select Jupiter in System and open Globe.
4. Confirm broad bands and the Great Red Spot are recognizable.
5. Confirm no conspicuous longitude seam.
6. Confirm Map reports unsupported rather than showing Earth or treating the appearance raster as terrain.
7. Save while Jupiter is active.
8. Reopen and confirm Earth remains primary and Jupiter remains available.
9. Re-export and verify the Jupiter asset/checksum survive.
10. Generate/import the enriched Parchment Sol starter and repeat the save/re-import check.

## Next implementation increments

1. Correct exact-head failures from the Jupiter batch, if any.
2. Measure and browser-QA the real Earth-plus-Jupiter package.
3. Make Globe geometry consume atmospheric oblate-spheroid shape.
4. Add atmospheric-specific Globe status and diagnostics.
5. Complete direct System-selection propagation and Explorer audits under #124.
6. Add lazy package-entry decoding.
7. Add a compact Luna or Mars Tier 2 surface.
8. Add a decimated Phobos or Deimos mesh.
9. Extend source-backed presentation to Saturn, Uranus, and Neptune.
10. Replace provisional payload budgets with measured limits.

## Guardrails

- One system remains one project.
- Do not force every body into `PrimaryWorld`.
- Do not create separate Earth, Mars, Luna, or giant projects to avoid multi-body work.
- Do not label derived giant palettes, motion, haze, or storms as observed data.
- Do not describe `PIA07782` as current Jupiter weather.
- Do not expose Map or Explorer solely because a cylindrical appearance raster exists.
- Do not serialize decorative belt particles.
- Do not leak source-specific formats into the durable body model beyond explicit asset media/encoding metadata.
- Do not claim the Jupiter batch passed until `npm run verify` succeeds on its exact final head.
