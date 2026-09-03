---
type: "Planning Reference"
title: "PI: Sol Reference System and Accurate Earth"
tags:
- world-forge
- planning
---
# PI: Sol Reference System and Accurate Earth

Status: Planned

## Product outcome

Any World Forge user can load a curated Sol reference system containing an accurately structured modern Solar System and an Earth that is geographically recognizable, analytically useful, and compatible with the existing Map, Globe, System, seasonal, weather, export, and future drilldown workflows.

The reference system is distributed as a versioned, immutable source asset. Opening it creates an editable user-owned copy rather than modifying the canonical reference.

The first production target is not a live scientific Earth service or a replacement for GIS tooling. It is a trustworthy, documented reference world that is accurate enough for casual inspection, comparative worldbuilding, alternate-history starting points, demos, and future reference-content packs.

## Recommended release target

Deliver `Sol Reference System v1` with:

- the Sun;
- all eight planets;
- a curated dwarf-planet and belt representation;
- major moons sufficient to make each planetary system recognizable;
- documented physical and orbital properties at a fixed reference epoch;
- accurate names and parent relationships;
- an Earth built from real global source data rather than procedural geography;
- existing illustrative weather, cloud, seasonal, and presentation systems operating over the real Earth baseline;
- current generated or curated casual-plausibility presentation for non-Earth surfaces;
- a user-facing `Reference Worlds -> Sol System -> Create editable copy` flow;
- versioned source provenance, checksums, and licensing records;
- on-demand download and local caching rather than bundling the full asset into every installer.

## Accuracy boundary for v1

### Sol system

The reference system should represent:

- body names and canonical parent relationships;
- orbital order;
- broad dimensions and mass;
- semimajor axis or equivalent orbital distance;
- orbital period;
- eccentricity;
- inclination;
- rotation period;
- axial tilt;
- ring presence and broad ring scale where relevant;
- a documented static orbital state at a selected epoch;
- major moons as explicit inspectable bodies;
- minor moons and small-object populations as summarized counts or grouped populations where full enumeration would create UI noise without useful worldbuilding value.

The v1 reference does not require live ephemerides, N-body integration, spacecraft-grade positional accuracy, or continuous network calls to astronomy services.

### Earth

Earth should include:

- accurate coastlines;
- global elevation and bathymetry;
- ocean and land identity;
- permanent ice and broad seasonal ice potential;
- broadly accurate annual temperature;
- broadly accurate precipitation or wetness;
- broad biome classification;
- major rivers and lakes;
- recognizable mountain ranges and major terrain structure;
- correct axial tilt, orbital eccentricity, rotation, year length, and Moon relationship;
- enough analytical compatibility for current renderer, inspection, seasonal surface, weather presentation, export, and future tile-window workflows.

The v1 Earth is a modern global reference, not a date-specific weather snapshot. It does not attempt parcel-level geography, road networks, political boundaries, settlements, live climate, historical coastlines, or a full GIS feature catalog.

## Why this fits the current architecture

World Forge already supports most of the delivery path:

- complete `WorldProject` loading and saving;
- `.wforge` import and export;
- persisted primary-world layers and topology layers;
- Map, Globe, and System views;
- stars, planets, moons, belts, orbital relationships, and generated body presentation;
- optional persisted enrichment artifacts;
- shared simulation-clock presentation;
- local world-library storage;
- user-owned project identity and save behavior.

The main architectural additions are:

1. a first-class reference-asset catalog and source contract;
2. richer exact physical and orbital fields for curated systems;
3. a reusable real-world data ingestion pipeline;
4. a compact binary asset format suitable for high-resolution reference layers;
5. clone-on-load behavior that preserves an immutable canonical source.

This should be implemented as reference-data ingestion and packaging, not as a special-case procedural generation workflow.

## Reference project contract

Add explicit project-origin metadata. Exact field names may change, but the contract should represent:

```ts
projectOrigin: {
  kind: 'generated' | 'reference' | 'imported';
  referenceId?: string;
  referenceVersion?: string;
  sourceEpoch?: string;
  sourceManifestSignature?: string;
}
```

A reference project should also identify:

- reference title and description;
- publisher or maintainer;
- version;
- release date;
- compatibility range;
- source epoch;
- manifest checksum;
- package checksum;
- license and attribution records;
- download size;
- installed size;
- required versus optional asset segments;
- superseded versions;
- migration or invalidation behavior.

Each imported or derived Earth layer should retain provenance:

- source dataset;
- source version or publication date;
- source license;
- original coordinate system and resolution;
- transformation pipeline version;
- target topology and resolution;
- quantization method;
- authority classification;
- derivation notes;
- checksum.

## Immutable source and editable copies

The canonical cached reference must never be edited in place.

Opening the reference should:

1. verify the installed package checksum;
2. deserialize the canonical project;
3. create a new project ID;
4. retain `projectOrigin.kind = 'reference'` and reference provenance;
5. mark the project as an editable user copy;
6. use the normal world library for subsequent saves;
7. leave the cached canonical asset unchanged.

The UI should distinguish:

- reference source;
- editable copy;
- generated world;
- externally imported world.

The user may later change coastlines, climate, biomes, orbital facts, names, or any other editable content without corrupting the shared Sol source.

## Sol system data model extensions

The existing system model uses broad size, mass, and orbital classes. A curated reference system needs exact optional fields while preserving current generated-system compatibility.

Candidate additions include:

- display name;
- canonical body kind and subtype;
- mean radius in kilometers;
- mass in kilograms or Earth masses;
- density;
- surface gravity;
- semimajor axis;
- periapsis and apoapsis where useful;
- orbital period;
- rotation period;
- eccentricity;
- inclination;
- obliquity;
- longitude of ascending node;
- argument of periapsis;
- mean anomaly or static epoch position;
- ring facts;
- atmosphere summary;
- reference authority and source.

Generated systems may continue using classes and derived values. Reference bodies may provide exact values. Renderers and inspectors should prefer exact values when present and fall back to generated classes otherwise.

## Earth data pipeline

Create a repeatable offline build pipeline rather than hand-editing a giant project file.

### Candidate source categories

The final source list must be selected during implementation and reviewed for license compatibility. Likely categories include:

- global topography and bathymetry;
- coastline and land polygons;
- lakes and major rivers;
- annual temperature climatology;
- precipitation or moisture climatology;
- permanent ice or land-cover data;
- biome or ecological-region inputs;
- astronomical and physical facts for Sol bodies.

Authoritative or public-domain government and scientific sources should be preferred. The build pipeline must record exact versions and terms rather than relying on undocumented downloads.

### Ingestion stages

1. Download or stage approved source datasets outside the runtime application.
2. Validate source checksums and metadata.
3. Normalize raster sources into a common geographic coordinate system.
4. Normalize vector features and simplify them at target scale.
5. Reconcile coastline, land, water, bathymetry, rivers, lakes, and ice identity.
6. Resample the source fields onto the World Forge cubed-sphere topology.
7. Produce required map-resolution layers.
8. Derive slope, broad morphology, wetness, biome, and presentation-support fields.
9. Run seam, pole, coverage, and known-Earth validation.
10. Quantize and package the result.
11. Generate provenance and validation reports.
12. Produce the immutable reference package and manifest.

The ingestion code should be reusable for later real-world references, alternate Earth baselines, Mars, or curated fictional source packs.

## Earth target resolution

The recommended v1 global target is:

- map presentation: 2048 x 1024;
- topology resolution selected to retain useful global structure without creating an unreasonable package;
- compact derived display resources for System and Globe overview;
- no requirement to retain the full resolution of every upstream source dataset in the user package.

The build pipeline may use substantially higher-resolution source data, then downsample it with documented rules.

Issue #10 should remain the owner of local and detail-scale tile-window rendering. Sol v1 should provide enough globally aligned source data and provenance to support a later real-data drilldown extension, but should not quietly become a second implementation of geographic drilldown.

## Binary reference asset format

The current `.wforge` package stores arrays as JSON inside ZIP. That remains suitable for ordinary projects but is inefficient for a high-resolution reference Earth.

Add a reference-oriented binary layer format with:

- typed numeric arrays;
- 8-bit or 16-bit quantization where appropriate;
- lossless storage for discrete identifiers and masks;
- per-layer metadata;
- checksums;
- ZIP or existing package compression;
- lazy layer decoding where practical;
- explicit format and codec versions;
- compatibility with normal `WorldProject` deserialization after loading.

The canonical package should remain exportable to a normal editable project after load. The binary format is a delivery optimization, not a second world model.

### Initial size target

A realistic first target is approximately 30 to 100 MiB downloaded for a 2048 x 1024 Earth reference with multiple analytical layers. This is an estimate until a representative packing spike measures:

- raw typed-array size;
- quantized size;
- compressed size;
- load time;
- decode time;
- browser memory;
- save-copy size.

The production asset should be downloadable on demand and cached locally rather than increasing every installer by the full reference-package size.

## Reference catalog and distribution

Add a small built-in catalog manifest containing:

- reference ID;
- title;
- description;
- version;
- thumbnail or compact preview;
- download URL;
- download size;
- package checksum;
- compatibility range;
- license summary;
- installed or update-available state.

Initial user flow:

1. Open `Reference Worlds`.
2. Select `Sol System - Modern Earth`.
3. Review size, version, source epoch, and summary.
4. Download if not installed.
5. Verify checksum.
6. Create an editable copy.
7. Open the copy in the ordinary workspace.

The first implementation may use a static application-owned catalog. A larger hosted marketplace or community reference library is explicitly out of scope.

## Presentation behavior

### Earth

Earth should work immediately in:

- Map;
- Globe;
- System;
- diagnostics;
- seasonal surface mode;
- illustrative clouds and weather;
- PNG, SVG, JSON, `.wforge`, hex, and VTT export where current contracts permit.

Real baseline layers remain authoritative. Weather and seasonal presentation remain derived and illustrative unless a future reference explicitly supplies authoritative time-series data.

### Non-Earth bodies

For v1:

- physical and orbital facts should be curated and accurate;
- broad body type, rings, color family, and major visual identity should be curated where inexpensive;
- existing generated-body presentation may fill missing close-surface detail;
- no requirement exists for photogrammetric or spacecraft-derived global maps for every body;
- the Moon should receive special priority because it is directly paired with accurate Earth and highly recognizable.

## Work packages

### WP1: Reference contracts and clone-on-load

- add project-origin metadata;
- define reference manifest and package contracts;
- add immutable source versus editable-copy behavior;
- add compatibility and checksum validation;
- add focused save/load and identity tests.

Estimated effort: 2 to 4 days.

### WP2: Exact curated-system fields

- extend body and orbit contracts with optional exact values;
- retain fallback support for generated systems;
- update System and inspector presentation;
- define source authority and epoch handling;
- add Sol fixture tests.

Estimated effort: 2 to 4 days.

### WP3: Reference catalog and delivery

- add Reference Worlds UI;
- add on-demand download, progress, cancellation, retry, checksum, caching, and update state;
- add Create editable copy flow;
- keep full assets out of the base installer.

Estimated effort: 3 to 5 days.

### WP4: Earth ingestion proof

- select representative topography, coastline, climate, water, and ice sources;
- build a reproducible import script;
- generate a lower-resolution proof asset;
- measure package size, decode time, and memory;
- validate seams, poles, and recognizable geography.

Estimated effort: 4 to 7 days.

### WP5: Production Earth layer build

- generate 2048 x 1024 and topology-aligned layers;
- derive broad terrain, climate, wetness, ice, and biome fields;
- import major rivers and lakes;
- produce provenance and validation evidence;
- correct renderer assumptions exposed by real data.

Estimated effort: 6 to 10 days.

### WP6: Binary package and cache integration

- implement compact typed-array packaging;
- quantize suitable layers;
- add lazy decoding and bounded memory behavior;
- verify normal save/export compatibility for editable copies;
- measure final package and load performance.

Estimated effort: 3 to 5 days.

### WP7: Sol curation and visual pass

- encode the Sun, planets, dwarf/belt representation, and major moons;
- record physical/orbital sources and epoch;
- add curated palette and ring facts;
- ensure Earth, Moon, gas giants, and major moons are recognizable in System View;
- generate or curate missing casual-inspection surface presentation.

Estimated effort: 3 to 5 days.

### WP8: QA, provenance, and release closeout

- complete automated validation;
- run browser QA at supported desktop resolutions;
- test clean install, download, interrupted download, checksum failure, update, clone, save, reopen, export, and deletion;
- validate reference immutability;
- publish source and license documentation;
- record known accuracy boundaries.

Estimated effort: 3 to 5 days.

## Overall level of effort

### Fast proof of concept

A hand-built Sol scaffold plus a recognizable Earth raster and basic load action:

- approximately 3 to 5 focused days;
- useful for validating the experience;
- insufficient for production because it would have weak provenance, weak analytical layers, and likely oversized JSON storage.

### Production Sol Reference System v1

Recommended planning estimate:

- 3 to 5 focused engineer-weeks;
- approximately 2 to 4 calendar weeks with current agentic implementation and validation patterns;
- first visible vertical slice after roughly one week;
- schedule depends primarily on source-data cleanup, license review, and mismatches between real datasets and current layer assumptions.

### Real-data local geographic drilldown

A later extension coordinated with issue #10:

- approximately 6 to 12 additional engineer-weeks;
- requires tiled or pyramidal source data, scale-aware vector selection, and canonical tile-window integration;
- not required for Sol Reference System v1.

## Suggested implementation sequence

1. Build a low-resolution Sol and Earth spike to prove reference loading and identify schema mismatches.
2. Finalize project-origin, body-fact, manifest, and layer-provenance contracts.
3. Implement immutable catalog download and editable-copy behavior.
4. Build and validate the reusable Earth ingestion pipeline.
5. Add compact binary packaging and memory measurements.
6. Produce the production Earth asset and curated Sol manifest.
7. Complete visual integration, exports, QA, documentation, and release packaging.

## Validation requirements

### Automated

- reference manifest schema validation;
- package checksum validation;
- immutable-source clone behavior;
- stable editable-copy identity;
- exact body and orbit fixture validation;
- Earth layer dimensions and topology compatibility;
- longitude-seam and pole continuity;
- land/ocean coverage within accepted real-Earth bounds;
- known elevation and bathymetry sample checks;
- major river and lake presence;
- seasonal and weather enrichment compatibility;
- `.wforge` save and reopen of an editable copy;
- binary package round trip;
- stale reference-version behavior;
- no changes to ordinary generated-world signatures or runtime.

### Browser QA

At 1440 x 900 and 1920 x 1080:

- browse the reference catalog;
- download Sol;
- cancel and resume or retry;
- verify installed state;
- create an editable copy;
- inspect Earth in Map, Globe, and System;
- inspect the Moon, gas giants, rings, and representative major moons;
- run seasonal presentation;
- run illustrative weather and clouds;
- save, close, reopen, and export the copy;
- confirm the canonical source remains unchanged;
- confirm no normal page overflow or unusable loading pause.

## Guardrails

- Do not pretend a procedurally generated Earthlike world is an accurate Earth.
- Do not edit the cached canonical reference in place.
- Do not make reference loading depend on live astronomy or weather services.
- Do not require network access after the package is installed.
- Do not place the full Earth asset in every installer unless later size evidence justifies it.
- Do not create a second world or geography model.
- Do not fork Map, Globe, System, seasonal, weather, export, or drilldown into reference-only implementations.
- Do not treat illustrative weather or seasonal presentation as measured historical data.
- Do not enumerate every minor moon or small body when a grouped population is more useful.
- Do not introduce user-facing source data without recorded provenance and license review.
- Do not let this PI absorb issue #10's canonical local and detail-scale drilldown work.
- Do not break generated-world replay, signatures, save compatibility, or ordinary generation performance.

## Explicit non-goals for v1

- live weather;
- real-time ephemerides;
- date-specific astronomical playback;
- N-body orbital simulation;
- political borders;
- roads, settlements, or population;
- parcel or street-level resolution;
- historical Earth eras;
- paleogeography;
- every named Solar System object;
- spacecraft-grade surface maps for every planet and moon;
- a public reference-content marketplace;
- automatic online data refresh without a reviewed reference release.

## Definition of ready

- reference-package ownership and hosting location are selected;
- the v1 Sol body and major-moon roster is agreed;
- the fixed reference epoch is selected;
- Earth source datasets and licenses are approved;
- the initial topology and map resolutions are selected;
- binary packing spike targets are recorded;
- generated-system compatibility rules for new exact fields are documented;
- issue #10 integration boundaries are confirmed;
- download and cache location behavior is defined for browser and desktop builds.

## Definition of done

- any user can discover and install the Sol reference package;
- installation verifies version and checksum;
- opening the reference creates an editable user-owned copy;
- the canonical source remains immutable;
- Sol includes the accepted planet, dwarf/belt, and major-moon roster with documented physical and orbital facts;
- Earth has accurate global coastlines, elevation, bathymetry, ocean/land identity, broad climate, wetness, ice, biome, major rivers, and major lakes;
- Earth is immediately recognizable in Map and Globe;
- the full system is coherent in System View;
- existing seasonal, weather, cloud, inspection, save, reopen, and supported export paths work;
- the compact package meets the accepted download, load-time, and memory budgets;
- all source datasets, transformations, licenses, and authority boundaries are documented;
- ordinary generated-world output, replay signatures, performance, and saved-world behavior remain unchanged;
- automated and browser QA pass;
- a closeout handoff records remaining accuracy limitations and follow-up opportunities.

## Follow-up opportunities

After v1 proves the reference framework:

- high-resolution real-data Earth drilldown coordinated with issue #10;
- curated Mars and Moon analytical surfaces;
- historical and alternate-history Earth baselines;
- paleogeographic eras;
- date-specific orbital playback;
- optional live weather overlays;
- curated fictional reference systems;
- community or studio reference packs;
- reference diffing and update migration tools.
