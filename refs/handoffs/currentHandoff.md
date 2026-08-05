# Current Handoff: Sol Reference System

Updated: 2026-08-05

Status: Earth and Jupiter have passed World Forge and Parchment acceptance. Mars Tier 2 scope is accepted and the reusable ETL/package/Map/Globe code path is implemented on `dev`. Exact-head CI and a real-source Mars build are the active acceptance boundary. Venus follows Mars as a cloud-default Globe plus radar/topography Map. Explorer and editors remain the next major World Forge work after the complete Sol system.

## Read first

1. `refs/decisions/mars-venus-product-direction-2026-08-05.md`
2. `refs/handoffs/mars-venus-reference-ingestion-readiness.md`
3. `refs/research/reference-data/mars-reference-data.md`
4. `refs/research/reference-data/venus-reference-data.md`
5. `refs/planning/body-detail-tiers-and-payload-strategy.md`
6. `refs/testing/sol-reference-pipeline.md`
7. `refs/engineering/ci-and-agent-workflow.md`
8. `refs/handoffs/earth-climate-calibration-benchmark.md`
9. World Forge issue #124
10. Parchment Worlds issue #22

## Accepted Earth and Jupiter baseline

User-confirmed:

- Jupiter's smooth oblate silhouette and imported banding look correct;
- moons are nested under their parent worlds in the selector;
- canonical body names remain intact;
- imported Earth geography and climate/biome presentation look great;
- normal Parchment import is very snappy.

Accepted World Forge artifact evidence:

```text
path: .local/reference-data/sol-earth-reference.wforge
Earth resolution: 512 x 256
topology resolution: 64
package bytes: 2,428,738
package SHA-256: 286794b798d9ec6d80d65056319ca0664369292b8ced3f43c46e29fd47f016e6
Earth manifest SHA-256: 805881ef229dc9dce649a5c077bc2a82ba7515a733b026e32d35aaf1772261f6
Jupiter manifest SHA-256: a12bb1bfc8e2c066b6bf60526d557a24a27d2a604ebbf76ba547f574ad772ae1
```

The pipeline report did not record `sourceCommit`; do not infer one.

Accepted Parchment artifact evidence:

```text
path: apps/web/public/starter-projects/sol-system.pworld
package bytes: 3,400,610
package size: 3.24 MiB
SHA-256 displayed prefix: e41ef0d15cd9d88362f66baa…
```

The full `.pworld` digest is not recorded. Do not fabricate the suffix.

### Loading decision

At 3.24 MiB with subjectively immediate import/open behavior, lazy per-body loading remains deferred. Reconsider only after measured package growth, latency, memory, or browser-stability evidence.

## Accepted Mars direction

Mars is:

- Tier 2 `raster-surface`;
- coarse/default resolution, currently 512 by 256;
- Globe-capable;
- Map-capable;
- Explorer/editor-disabled until after the complete Sol system;
- backed by MOLA topography and Viking MDIM 2.1 artistic colorization;
- one body in the existing Sol project, not a separate project;
- upgradeable later without changing identity.

Tier, resolution, and enabled tools are independent.

## ETL product direction

ETL is durable product infrastructure. Built-in reference adapters and later user-facing imports should target the same prepared-body contract.

Long-term application path:

```text
PNG / JPG / WebP / SVG upload
  -> projection, orientation, seam, and layer-role interview
  -> decoding and normalization
  -> resampling and semantic conversion
  -> preview and correction
  -> provenance and transform manifest
  -> reusable prepared-body bundle
  -> normal .wforge creation or enrichment
```

Do not duplicate transformation logic in UI components. The UI should orchestrate and resolve ambiguity around the reusable ETL core.

## Implemented Mars vertical slice

### Durable scientific raster semantics

`packages/shared/src/worldBodyDetails.ts` now supports:

- numeric data type and byte order;
- units, scale, and offset;
- datum;
- no-data value or mask;
- source and prepared ranges;
- absolute elevation, radius, normalized displacement, or scalar interpretation.

### Prepared-body bundle

`scripts/referenceBodyBundle.ts` implements:

```text
world-forge-reference-body-bundle-v1
```

It validates source evidence, stable identity, body-local paths, payload dimensions, byte lengths, SHA-256 digests, numeric semantics, and conversion into `RasterSurfaceDetailV1`.

### Real Mars ETL

`tools/reference-etl/prepare_mars_reference.py` consumes moderate-size official products appropriate to the coarse target:

- MGS MOLA MEGDR global topography at 16 pixels per degree;
- reduced Viking MDIM 2.1 colorized global mosaic at approximately 1 km per pixel.

It emits:

```text
.local/reference-data/mars-mola-viking/
  manifest.json
  albedo.rgb565
  elevation.i16
```

The default payload is 524,288 bytes before compression and manifest overhead.

The earlier multi-gigabyte 463 m MOLA and 232 m Viking products are deliberately not default inputs for this increment.

### Generic Sol assembly

`scripts/build-earth-reference.ts` accepts repeatable:

```text
--body-input <prepared-body-directory>
```

The normal multi-body exporter remains the sole final `.wforge` writer.

### Tier 2 Map

The body-aware renderer now:

- stages active-body RGB565 and numeric rasters;
- decodes scientific values from stored metadata;
- renders imported appearance in normal Map presentation;
- renders numeric elevation/heightmap modes;
- supports target-resolution resampling;
- explicitly rejects geographic point inspection;
- never fabricates a `PrimaryWorld`.

### Tier 2 Globe

The dedicated reference-raster Globe viewer now provides:

- imported RGB565 appearance;
- smooth sphere, oblate-spheroid, or triaxial-ellipsoid geometry;
- axial tilt, rotation, orbital lighting, drag, and zoom;
- no Earth ocean, atmosphere, cloud, weather, seasonal, or terrain-shell assumptions;
- explicit reference-body instrumentation.

A valid hydrated Tier 2 package enables Globe and Map while keeping Explorer false. Missing or corrupt assets do not advertise those capabilities.

## Active acceptance commands

Install ETL dependencies and prepare Mars:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-mars
```

Build the normal enriched Sol package:

```powershell
npm run reference:build-sol -- --body-input .local/reference-data/mars-mola-viking
```

Expected final World Forge output:

```text
.local/reference-data/sol-earth-reference.wforge
```

Do not claim accepted Mars hashes or package sizes until this real-source run completes.

## Mars browser acceptance

### Globe

- recognizable Mars appearance;
- correct seam and longitude orientation;
- no mirroring or vertical flip;
- smooth Mars shape;
- no Earth ocean, atmosphere, clouds, weather, or seasonal shells;
- Mars remains the active body.

### Map

- Viking appearance visible in normal presentation;
- MOLA structure visible in elevation/heightmap presentation;
- Olympus Mons / Tharsis, Valles Marineris, Hellas, polar regions, and Syrtis Major appear in plausible locations;
- no Earth biome or ocean palette;
- Explorer remains on Mars and explains that it is unsupported.

### Package

- save/reopen preserves assets and detail metadata;
- `.wforge` import/export preserves bytes and checksums;
- re-export does not mutate prepared payloads;
- enriched Parchment starter imports as one Sol system;
- Mars survives nested `.pworld` round trip;
- record new `.wforge` and `.pworld` sizes and responsiveness.

## Venus next

After Mars acceptance:

1. select moderate-size official Magellan radar and topography inputs for the coarse target;
2. close a deterministic derived cloud-composite recipe;
3. implement a generic layered solid-body contract;
4. emit a reusable Venus prepared bundle;
5. default Globe to the opaque cloud deck;
6. use radar/topography in Map;
7. keep surface Globe deferred;
8. complete normal World Forge and Parchment package acceptance.

## Later Sol sequence

1. Venus.
2. Luna.
3. Mercury.
4. Saturn, Uranus, and Neptune source-backed presentation.
5. Selected major moons.
6. Phobos and Deimos irregular meshes.
7. Belts and remaining reference bodies.
8. Complete-Sol acceptance.
9. Explorer and editor increment.

The exact body sequence may be adjusted by source availability, but Explorer/editor implementation must not absorb the current complete-Sol work.

## Separate non-blocking tracks

### Earth climate calibration

`refs/handoffs/earth-climate-calibration-benchmark.md` remains a separate enrichment project. It must not block imported-reference development or mutate the accepted Earth fixture.

### Selector flicker

Intermittent selector flicker remains a parallel browser-QA issue. It does not block Mars/Venus implementation unless it prevents reliable body-continuity acceptance.

## Guardrails

- One system is one project.
- Parchment body assets are body nodes, not independent systems.
- Do not fabricate `PrimaryWorld` for Tier 2 bodies.
- Do not infer scientific semantics from filenames.
- Do not label Viking artistic color calibrated true color.
- Do not label Magellan radar visible imagery.
- Do not imply a derived Venus cloud composite is a contemporaneous observation.
- Do not let Venus surface relief deform the visible cloud shell.
- Do not add Mars-only or Venus-only durable schemas.
- Do not duplicate ETL logic in future upload UI.
- Unsupported views must never silently switch to Earth.
- Use the normal exporter and normal Parchment path for release fixtures.
- Do not enable Explorer/editors before complete-Sol acceptance.
- Do not reopen lazy loading without evidence.
- Keep refs and issues current with each accepted increment.
