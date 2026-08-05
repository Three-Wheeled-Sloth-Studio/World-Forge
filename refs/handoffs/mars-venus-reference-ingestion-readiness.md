# Handoff: Mars and Venus reference ingestion readiness

Updated: 2026-08-04
Status: Definition of Ready draft complete; material implementation must wait for acceptance
Priority: Active Sol reference-system planning slice

## Purpose

Prepare the next source-backed Sol bodies without repeating the Earth mistake of starting significant implementation before the product and technical decisions are ready.

This handoff defines:

- the recommended source datasets;
- licensing and attribution boundaries;
- body-detail and renderer gaps;
- proposed target fidelity;
- package-growth expectations;
- acceptance evidence;
- the smallest implementation sequence after readiness is accepted.

It does not authorize ETL, schema, renderer, or package implementation by itself.

## Read first

1. `refs/planning/reference-system-etl-and-multi-body-navigation.md`
2. `refs/planning/body-detail-tiers-and-payload-strategy.md`
3. `refs/research/reference-data/mars-reference-data.md`
4. `refs/research/reference-data/venus-reference-data.md`
5. `refs/handoffs/currentHandoff.md`
6. World Forge issue #124
7. Parchment Worlds issue #22

## Accepted starting baseline

The Earth-plus-Jupiter reference package has completed the normal producer and consumer path:

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
- lazy body loading: not currently justified by evidence.

Mars and Venus should extend this same pipeline. Do not create separate projects or test-only package writers.

## Recommended product decisions

### Mars

Use a compact Tier 2 source-backed solid-body surface.

Initial capabilities:

- Globe: yes;
- Map: yes;
- Explorer: no;
- editing: no;
- climate, biome, water, hydrology, and plates: absent.

Recommended sources:

- MGS MOLA global DEM 463 m for elevation;
- Viking MDIM 2.1 colorized global mosaic 232 m for recognizable presentation.

Important source caveat:

The Viking color mosaic is artistically colorized and must not be labeled calibrated true-color.

Prepared target:

```text
1024 x 512 RGB565 appearance
1024 x 512 numeric elevation
```

### Venus

Treat Venus as a layered solid body with an optically opaque atmosphere.

Initial capabilities:

- Globe default: cloud deck;
- Map: radar surface and topography;
- optional Globe surface mode: radar surface;
- Explorer: no;
- editing: no;
- Earth climate, biome, water, and hydrology: absent.

Recommended sources:

- Magellan C3-MIDR global radar mosaic 2025 m;
- Magellan global topography 4641 m version 2;
- Akatsuki UVI Level 3 map data, primarily 365 nm, for a deterministic derived cloud composite.

Prepared target:

```text
1024 x 512 radar
1024 x 512 numeric elevation
1024 x 512 cloud presentation
```

A 768 x 384 cloud texture may be accepted only if visual review shows no meaningful loss.

## Architecture audit findings

### 1. Body-local raster surfaces are modeled but not rendered

`RasterSurfaceDetailV1` declares Globe and Map capability, but the current active render path still obtains a mappable body through `WorldBodyRecordV1.surface` and `projectForWorldBody()`, which requires a full `PrimaryWorld` surface.

Result:

- a Mars `raster-surface` record can validate and package;
- it cannot yet honestly open in the existing Map or canonical Globe path without a body-local raster renderer/accessor;
- capability flags must remain false until the runtime path exists.

Do not work around this by fabricating a Mars `PrimaryWorld` full of meaningless Earth layers.

### 2. Numeric raster interpretation is underspecified

`WorldBodyAssetRefV1` records path, role, encoding, resolution, byte length, and checksum, but it cannot yet express the physical meaning of an elevation raster.

A generic numeric raster descriptor is required for at least:

- stored type and byte order;
- units;
- scale and offset;
- datum or reference surface;
- no-data value or mask;
- source and prepared ranges;
- absolute elevation versus normalized display displacement.

Do not bury those semantics in Mars- or Venus-specific filenames or custom parsing branches.

### 3. Venus requires more than one body-detail component

A body currently owns one `detail` discriminated union.

That can be either:

- atmospheric presentation, Globe only; or
- raster surface, Globe and Map.

Venus requires both.

The preferred solution is one additive, versioned, generic layered solid-body detail variant with:

- a solid raster surface component;
- an optional atmosphere or cloud presentation component;
- an explicit default component per view;
- independent origin and asset metadata;
- optional user-selectable surface Globe mode;
- one shared body identity and shape.

The contract must be useful for Venus, Titan, Earth cloud layers, and future solid worlds with optically significant atmospheres. Do not add a Venus-only branch.

### 4. The Sol build command is still body-name-specific

The current producer takes explicit Earth and Jupiter inputs.

Before broad body expansion, prefer a repeatable body-bundle assembly seam over adding one new CLI flag per planet. A suitable implementation may use repeated body-bundle arguments or a source-controlled Sol assembly manifest that declares:

- body ID;
- prepared bundle directory;
- adapter kind;
- required/optional status;
- expected manifest schema;
- package attachment policy.

The normal exporter remains the only final `.wforge` writer.

### 5. Lazy loading remains deferred

The current 3.24 MiB `.pworld` imports quickly. Mars and Venus must record package and memory deltas, but lazy package-entry loading is not a prerequisite for the first implementation.

Reconsider only when evidence shows:

- materially slower import/open behavior;
- problematic peak browser memory;
- or package growth that makes continued eager hydration unreasonable.

## Definition of Ready

Material implementation may begin only when the following are explicitly accepted.

### Product scope

- Mars is Tier 2, Globe plus Map, with Explorer and Earthlike layers deferred.
- Venus uses a cloud-deck default Globe and radar/topography Map.
- Venus optional surface Globe mode is either in or out of the first increment.
- No climate-algorithm calibration work is included.
- Phobos, Deimos, and Luna remain separate later increments.

### Source and legal boundary

- MOLA DEM and Viking color mosaic are accepted for Mars.
- Magellan radar and topography are accepted for Venus.
- Akatsuki UVI Level 3 is accepted as the cloud-composite source.
- The required JAXA/DARTS/CC BY 4.0 attribution wording and location are agreed.
- The Viking artistic-color caveat and Magellan radar/non-visible caveat are agreed.

### Prepared-data contract

- 1024 x 512 is accepted as the initial prepared resolution for Mars and Venus surface layers.
- Venus cloud resolution is accepted.
- Numeric raster type, units, scale, offset, datum, and no-data contract are accepted.
- Image and numeric resampling methods are identified.
- Coordinate normalization is fixed to equirectangular, planetocentric latitude, positive-east longitude, and one documented seam convention.

### Renderer and model contract

- The body-local raster Map/Globe accessor shape is accepted.
- The generic layered solid-body detail variant is accepted.
- Default component behavior per view is accepted.
- Capability flags remain false until runtime support exists.
- Unsupported Explorer behavior is accepted.

### Venus cloud recipe

- A narrow-window stitched composite, long-period statistical composite, or authored fallback is selected.
- The observation selection rule is deterministic.
- Gap fill and intensity normalization are documented.
- The output remains labeled derived rather than imported.

### Pipeline and evidence

- The Sol assembly input shape is accepted.
- Prepared manifests must include source and output checksums and transform metadata.
- Package size is recorded after Mars and after Venus.
- Browser memory is measured only if package or runtime behavior raises concern; subjective snappiness is sufficient for the current baseline.
- Required visual landmarks and view-continuity tests are accepted.

## Recommended implementation sequence after readiness acceptance

### Increment 1: reusable raster-surface foundation

Implement only the generic seams needed by both bodies:

- numeric raster metadata;
- body-local raster asset hydration and access;
- raster-surface Globe and Map presentation;
- explicit unsupported Explorer state;
- package round-trip tests;
- no Sol-specific renderer logic.

Use small synthetic fixtures for tests. Do not download Mars or Venus data merely to prove the contract.

### Increment 2: Mars ETL and package integration

- implement MOLA and Viking adapters;
- emit the prepared Mars bundle and manifest;
- add Mars through the generic Sol assembly seam;
- perform Globe, Map, active-body, save/reopen, `.wforge`, and Parchment QA;
- record package delta.

Mars is the simpler proof and should land before the Venus layered-body contract is exercised with real data.

### Increment 3: layered solid-body presentation

- add the generic surface-plus-atmosphere detail variant;
- implement default component selection by view;
- support cloud-deck Globe plus radar Map without duplicating body identity;
- preserve compatibility for existing catalog, atmospheric, raster, and geographic records.

### Increment 4: Venus ETL and cloud composite

- implement Magellan radar and topography adapters;
- implement the accepted deterministic Akatsuki cloud-composite recipe;
- attach all components through the generic layered contract;
- perform Globe, Map, optional surface-mode, active-body, package, and Parchment QA;
- record package delta.

### Increment 5: reassess loading policy

Compare the accepted baseline, Mars package, and Venus package.

Do not implement lazy loading merely because it appears on the long-term roadmap. Proceed only if measured package/runtime behavior now justifies it.

## Acceptance evidence

### Mars visual checks

- Olympus Mons and Tharsis;
- Valles Marineris;
- Hellas Planitia;
- polar regions;
- broad albedo character including Syrtis Major;
- correct longitude and seam orientation;
- no Earth palette or layers.

### Venus visual checks

Default Globe:

- opaque pale cloud deck;
- source-backed ultraviolet contrast;
- no radar bleed-through;
- no terrain displacement of the cloud shell.

Map or surface mode:

- recognizable Magellan radar character;
- Ishtar Terra and Maxwell Montes;
- Aphrodite Terra;
- Beta Regio;
- broad lowland/highland distinction;
- clear radar/topography labeling;
- no Earth palette or layers.

### Shared functional checks

- body selection remains stable through System, Globe, and Map;
- unsupported Explorer never resets to Earth;
- package import/export preserves bytes and checksums;
- Parchment imports one coherent Sol project;
- imported copies remain editable without mutating the distributed starter;
- generated ordinary worlds remain unaffected.

## Package budgets

These are observation thresholds, not hard product limits.

Uncompressed prepared assets at 1024 x 512:

- RGB565: 1,048,576 bytes;
- u16 elevation: 1,048,576 bytes;
- u8 radar: 524,288 bytes.

Expected raw additions:

- Mars core assets: approximately 2.0 MiB before package compression;
- Venus core assets: approximately 2.5 MiB before package compression;
- optional normals, masks, or feature catalogs add more.

Record actual compressed deltas. Trigger a loading-policy review if the enriched `.pworld` approaches 15 MiB, import/open ceases to feel immediate, or memory inspection reveals a disproportionate eager-hydration cost. Do not treat 15 MiB as a release failure by itself.

## Guardrails

- Do not create per-body projects.
- Do not fabricate full `PrimaryWorld` records for Mars or Venus.
- Do not label the Viking mosaic true-color.
- Do not label Magellan radar visible imagery.
- Do not label a stitched Akatsuki cloud composite imported or contemporaneous.
- Do not let Venus surface relief deform the visible cloud shell.
- Do not add a Venus-only durable schema.
- Do not set capabilities before the runtime path exists.
- Do not start ETL until this Definition of Ready is accepted.
- Do not let this work absorb Luna, Phobos, Deimos, climate calibration, or lazy-loading implementation.

## Decisions requested from product owner

Recommended defaults are ready for acceptance:

1. Mars starts as Tier 2 Globe plus Map, not Tier 3.
2. Mars uses MOLA elevation and Viking MDIM 2.1 artistic colorization at 1024 x 512.
3. Venus defaults to cloud Globe and radar/topography Map.
4. Venus uses Magellan surface data plus a narrow-window stitched Akatsuki UVI 365 nm cloud composite.
5. Explorer and editors remain out of scope for both bodies.
6. A generic layered solid-body contract and numeric raster descriptor precede real ETL.
7. Lazy loading remains deferred until package/runtime evidence changes.

After those decisions are accepted, the next developer should begin with Increment 1 and synthetic fixtures, not with dataset downloads.
