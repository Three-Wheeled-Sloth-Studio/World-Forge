---
type: "Handoff Record"
title: "Handoff: Mars and Venus reference ingestion"
tags:
- world-forge
- handoffs
---
# Handoff: Mars and Venus reference ingestion

Updated: 2026-08-05
Status: Definition of Ready accepted; Mars vertical slice implemented through code validation boundary; real-source build and browser acceptance pending
Priority: Active Sol reference-system implementation

## Purpose

Extend the accepted Earth-plus-Jupiter Sol package with durable, source-backed solid-body ingestion while building ETL infrastructure that can later be exposed through World Forge.

The ETL work is product infrastructure, not a set of disposable release scripts. Built-in real-body adapters, command-line conversion, and future user uploads should converge on the same prepared-body contract and normal `.wforge` exporter.

## Read first

1. `refs/decisions/mars-venus-product-direction-2026-08-05.md`
2. `refs/planning/body-detail-tiers-and-payload-strategy.md`
3. `refs/research/reference-data/mars-reference-data.md`
4. `refs/research/reference-data/venus-reference-data.md`
5. `refs/handoffs/currentHandoff.md`
6. `refs/engineering/ci-and-agent-workflow.md`
7. World Forge issue #124
8. Parchment Worlds issue #22

## Accepted baseline

The Earth-plus-Jupiter reference package completed the normal producer and consumer path:

```text
approved source bundles
  -> World Forge ETL
  -> one multi-body .wforge
  -> Parchment embedded .pworld
  -> ordinary UI import
```

Accepted evidence:

- `.wforge`: 2,428,738 bytes;
- `.pworld`: 3,400,610 bytes / 3.24 MiB;
- Earth visual acceptance: passed;
- Jupiter visual acceptance: passed;
- Parchment import: passed;
- responsiveness: subjectively instant/snappy;
- lazy body loading: not justified by current evidence.

Mars and Venus extend this same one-system path. Do not create separate projects or alternate final package writers.

## Accepted product decisions

### Mars

- Tier 2 `raster-surface`;
- coarse/default prepared resolution, currently 512 by 256;
- Globe and Map supported;
- Explorer and editors deferred until after the complete Sol system;
- MOLA topography and Viking MDIM 2.1 artistic colorization;
- no fabricated Earth climate, biome, water, hydrology, river, plate, or region layers;
- later Tier 3 enrichment preserves the same body identity.

### Venus

- one stable Venus body with layered presentations;
- default Globe shows the opaque cloud deck;
- Map shows Magellan radar imagery and topography;
- radar-surface Globe mode is deferred;
- Explorer and editors deferred until after the complete Sol system;
- cloud composite must remain clearly derived and must not imply a contemporaneous observed weather state.

### ETL product direction

ETL output is a durable reusable prepared-body bundle upstream of `.wforge`.

The same core should eventually support:

```text
PNG / JPG / WebP / SVG upload
  -> projection and layer-role interview
  -> orientation and seam normalization
  -> resampling and semantic conversion
  -> preview and correction
  -> provenance manifest
  -> prepared-body bundle
  -> normal .wforge creation or enrichment
```

Do not duplicate these transforms inside future UI components.

## Implemented Mars foundation

### Numeric raster metadata

`packages/shared/src/worldBodyDetails.ts` now describes scientific raster semantics:

- data type;
- byte order;
- units;
- scale and offset;
- datum;
- no-data value or mask;
- source and prepared ranges;
- absolute elevation, radius, normalized displacement, or scalar interpretation.

### Reusable prepared-body bundle

`scripts/referenceBodyBundle.ts` implements:

```text
world-forge-reference-body-bundle-v1
```

It validates:

- stable body and asset identity;
- source attribution;
- shape, projection, and resolution;
- safe body-local paths;
- unique IDs, files, and paths;
- byte lengths and SHA-256 checksums;
- RGB565 and numeric payload shape;
- conversion into a valid body-detail record.

### Mars ETL

`tools/reference-etl/prepare_mars_reference.py` uses moderate-size official products appropriate to the 512 by 256 target:

- MGS MOLA MEGDR global topography at 16 pixels per degree;
- reduced Viking MDIM 2.1 colorized global mosaic at approximately 1 km per pixel.

The adapter:

- downloads or accepts local overrides;
- validates source structure;
- records source evidence;
- normalizes seam and orientation;
- resamples deterministically;
- emits `albedo.rgb565` and `elevation.i16`;
- records all transforms, ranges, checksums, and caveats.

The earlier multi-gigabyte 463 m MOLA and 232 m Viking sources are deliberately not default inputs for this coarse product increment.

### Sol assembly

`scripts/build-earth-reference.ts` accepts repeatable:

```text
--body-input <prepared-body-directory>
```

The normal multi-body exporter remains the only final `.wforge` writer.

### Tier 2 Map

The body-aware renderer can now:

- stage hydrated body-local raster assets;
- decode little-endian RGB565;
- decode typed numeric rasters with scale, offset, byte order, and no-data behavior;
- render imported appearance in normal Map presentation;
- render elevation/heightmap modes from the numeric raster;
- avoid all Earth `PrimaryWorld` assumptions;
- reject geographic point inspection explicitly.

### Tier 2 Globe

A dedicated reference-raster Globe viewer now provides:

- imported RGB565 texture;
- sphere, oblate-spheroid, and triaxial-ellipsoid scaling;
- orbital light, rotation, axial tilt, drag, and zoom;
- no Earth ocean, atmosphere, weather, seasonal, climate, or terrain-shell behavior;
- clear target and source instrumentation.

### Capability boundary

A fully validated and hydrated Tier 2 package enables:

```text
Globe: true
Map: true
Explorer: false
```

Missing or invalid prepared assets do not advertise those views.

## Automated coverage

Focused tests cover:

- numeric raster schema validation;
- invalid byte order and invalid role combinations;
- prepared manifest validation;
- duplicate and unsafe paths;
- payload length and checksum tampering;
- RGB565 and numeric raster decoding;
- body attachment without `PrimaryWorld` fabrication;
- honest capability assignment;
- Tier 2 Globe target resolution;
- missing-payload rejection;
- preservation of body-local asset bytes.

Exact-head CI still owns final typecheck, full test, production build, and browser-smoke acceptance.

## Required real-source acceptance

The code increment is not the accepted Mars fixture until all of the following pass.

### 1. Prepare the durable Mars bundle

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-mars
```

Expected directory:

```text
.local/reference-data/mars-mola-viking/
  manifest.json
  albedo.rgb565
  elevation.i16
```

Record:

- source dimensions, bytes, and checksums;
- prepared dimensions, bytes, and checksums;
- elevation ranges;
- elapsed time only if operationally meaningful.

### 2. Build the enriched Sol package

```powershell
npm run reference:build-sol -- --body-input .local/reference-data/mars-mola-viking
```

Expected output remains:

```text
.local/reference-data/sol-earth-reference.wforge
```

Record the new `.wforge` size and SHA-256.

### 3. Browser acceptance

Mars Globe:

- recognizable broad Viking appearance;
- correct seam and longitude orientation;
- smooth Mars shape without Earth ocean or atmosphere shells;
- no mirrored or upside-down texture;
- body selection remains Mars.

Mars Map:

- recognizable broad albedo character;
- elevation and heightmap modes show MOLA structure;
- Olympus Mons / Tharsis, Valles Marineris, Hellas, polar regions, and Syrtis Major are placed plausibly;
- no Earth palette or layers;
- unsupported Explorer remains on Mars and explains the limitation.

### 4. Package and Parchment round trip

- save/reopen preserves the detail and payloads;
- `.wforge` export/import preserves checksums;
- re-export preserves prepared bytes;
- enriched Parchment starter imports as one Sol system;
- Mars survives nested package round trip;
- record `.pworld` size and responsiveness.

## Venus implementation after Mars acceptance

1. Select moderate-size official Magellan radar and topography inputs for the coarse target.
2. Close the deterministic cloud-composite recipe.
3. Add a generic layered solid-body detail contract carrying both surface and atmosphere/cloud components.
4. Produce a reusable Venus prepared bundle.
5. Implement cloud-default Globe plus radar/topography Map.
6. Run the same one-system package and Parchment acceptance path.
7. Reassess lazy loading only from measured evidence.

## Future upload conversion implications

The first application-facing map importer will need an interview and preview layer around the ETL core. It must not guess silently when the source does not establish:

- projection;
- seam location;
- north-up orientation;
- longitude direction;
- global versus partial coverage;
- layer role;
- palette or numeric value meaning;
- no-data/background behavior;
- physical units and datum;
- new-body versus enrich-existing-body intent.

SVG imports additionally require deterministic rasterization or vector-role interpretation. A political boundary SVG and a shaded-relief SVG are not interchangeable simply because both are SVG files.

## Guardrails

- One system is one project.
- Do not fabricate `PrimaryWorld` records for Tier 2 bodies.
- Do not create a Mars-only or Venus-only final exporter.
- Do not infer scientific semantics from filenames.
- Do not label the Viking mosaic calibrated true color.
- Do not label Magellan radar visible imagery.
- Do not imply a derived Venus cloud composite is contemporaneous observation.
- Do not let Venus surface relief deform the visible cloud shell.
- Do not add a Venus-only durable schema.
- Do not implement Explorer or editors before the complete Sol system.
- Do not duplicate ETL transformations in future UI code.
- Do not claim real Mars acceptance until source build, browser QA, `.wforge`, and `.pworld` evidence exist.
