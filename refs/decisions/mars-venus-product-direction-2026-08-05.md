---
type: "Decision Record"
title: "Mars and Venus product direction"
tags:
- world-forge
- decisions
---
# Mars and Venus product direction

Updated: 2026-08-05
Status: Product direction accepted; Mars implementation in progress; Venus implementation follows the complete Mars vertical slice

## Accepted decisions

### Mars starts at Tier 2

Initial Mars is a Tier 2 `raster-surface` body.

It provides:

- recognizable source-backed Globe presentation;
- source-backed projected Map presentation;
- scientific elevation available to appropriate Map modes;
- no fabricated Earth climate, biome, water, hydrology, river, plate, or region layers;
- no `PrimaryWorld` compatibility shell merely to satisfy old renderer assumptions.

Explorer and editors remain unsupported during the complete-Sol increment. Mars retains one stable identity and can later be enriched to Tier 3 when the post-Sol Explorer/editor work begins.

### Tier and prepared resolution are independent

A body-detail tier describes the durable data model and supported product behavior. It does not prescribe source resolution.

Mars and Venus may use the normal/default coarse prepared resolution. High-resolution assets are not required for the initial Sol reference package.

Mars defaults to:

```text
512 x 256
```

That produces 262,144 bytes of RGB565 appearance and 262,144 bytes of signed 16-bit elevation before package compression. Higher-resolution source products remain available for later increments, but downloading multi-gigabyte products is not justified for this target.

### Venus uses layered honest presentations

Initial Venus behavior is accepted as:

- **Default Globe:** opaque cloud-covered Venus, matching its visible appearance from space;
- **Map:** Magellan radar imagery and topography, explicitly labeled as radar-derived rather than visible-light photography;
- **Surface Globe:** deferred rather than required in the first Venus increment.

This remains one Venus body with one stable identity and layered source-backed presentations. It is not two projects or two body records.

The deterministic cloud-composite recipe remains a technical implementation decision to close during Venus source preparation. The product requirement is an honest opaque cloud Globe with source-backed large-scale structure, not a falsely contemporaneous weather snapshot.

### Explorer and editors follow the complete Sol system

Explorer and editors are the next major World Forge product work after the complete Sol system is assembled and accepted.

For the current Sol increment:

- unsupported Explorer/editor states remain honest;
- body identity and source packages must support later enrichment without replacement;
- compact tiers are not a statement that Mars, Luna, or other high-value bodies will never receive geographic/editor support.

### Real ETL is the implementation path

The implementation path is a real source-backed ETL vertical slice that emits a durable, reusable prepared package.

The prepared package includes:

- stable body and asset identifiers;
- source attribution and redistribution metadata;
- source and prepared checksums;
- coordinate and seam conventions;
- numeric raster units, datum, type, byte order, scale, offset, ranges, and no-data behavior;
- image and numeric transforms and resampling metadata;
- a manifest consumable by the normal Sol assembler;
- assets attached through the normal `.wforge` exporter and later embedded through the normal `.pworld` path.

Synthetic fixtures remain appropriate for narrow automated tests such as schema validation, checksum failure, missing assets, decoding, and package round trips. They are not a separate product milestone and do not replace the real ETL proof.

## ETL as future product infrastructure

The ETL layer is not merely a release-fixture build system. Its durable stages should be reusable by future application features.

Common conceptual pipeline:

```text
source acquisition or user upload
  -> format decoding
  -> source inspection
  -> projection / orientation / seam normalization
  -> semantic classification
  -> resampling and quantization
  -> preview and user correction
  -> provenance and transform manifest
  -> reusable prepared-body bundle
  -> normal system assembly
  -> normal .wforge exporter
```

The first Mars adapter exercises scientific image and elevation ingestion. Later application-facing tools should reuse the same boundaries for workflows such as:

```text
PNG / JPG / WebP / SVG map upload
  -> ask what the map represents
  -> identify or confirm projection and orientation
  -> assign albedo, elevation, biome, political, material, mask, or other roles
  -> normalize and preview
  -> preserve source and user decisions
  -> emit a prepared-body bundle
  -> create or enrich a .wforge project
```

The upload workflow will need interactive ambiguity resolution that trusted built-in adapters do not:

- map projection;
- seam location;
- north/south orientation;
- longitude direction;
- whether the source is global or partial;
- layer meaning;
- color or value interpretation;
- no-data/background behavior;
- physical units and datum for numeric content;
- whether the import creates a new body or enriches an existing one.

Those user-facing steps should wrap the durable ETL core rather than duplicating conversion logic in UI components.

## Implemented Mars consequences

The accepted direction has produced:

1. generic numeric-raster metadata in the body asset contract;
2. reusable `world-forge-reference-body-bundle-v1` prepared packages;
3. a source-backed Mars adapter using moderate-size official MOLA and Viking products;
4. repeatable `--body-input` support in the normal Sol assembler;
5. generic Tier 2 Map rendering without fabricated `PrimaryWorld` data;
6. a dedicated smooth Tier 2 Globe path without Earth ocean, atmosphere, weather, seasonal, or geographic assumptions;
7. checksum, path, payload-shape, numeric-decoding, attachment, Map, and Globe-target tests.

## Remaining Mars acceptance work

Implementation is not yet accepted as a fixture until the real source path completes:

1. run the Mars ETL against the official sources;
2. inspect and retain the generated manifest and checksums;
3. build the enriched Sol `.wforge` through the normal exporter;
4. verify Mars Globe and Map landmarks, orientation, and seam;
5. verify System-to-Globe-to-Map body continuity and explicit unsupported Explorer behavior;
6. save/reopen and `.wforge` round-trip the body assets;
7. generate and import the enriched Parchment `.pworld`;
8. record compressed package deltas and responsiveness.

## Venus sequence

After Mars acceptance:

1. define the generic layered solid-body detail contract;
2. select moderate-size official Magellan radar/topography products appropriate to the coarse target;
3. close the deterministic cloud-composite recipe;
4. produce a reusable Venus prepared bundle;
5. implement cloud-default Globe plus radar/topography Map through the generic layered contract;
6. complete World Forge and Parchment round-trip QA;
7. record package growth before reconsidering lazy loading.

## Guardrails

- Do not create separate per-body projects.
- Do not fabricate `PrimaryWorld` records for Tier 2 bodies.
- Do not label the Viking mosaic calibrated true color.
- Do not label Magellan radar visible imagery.
- Do not imply a derived Venus cloud composite is a contemporaneous observation.
- Do not let surface relief deform Venus's visible cloud shell.
- Do not add a Venus-only durable schema.
- Do not duplicate ETL logic in future upload UI.
- Do not enable Explorer or editing before the complete Sol system is accepted.
- Do not reopen lazy loading without package or runtime evidence.
