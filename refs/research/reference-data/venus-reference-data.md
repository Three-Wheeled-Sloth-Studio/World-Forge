---
type: "Research Reference"
title: "Venus reference data"
tags:
- world-forge
- research
---
# Venus reference data

Updated: 2026-08-04
Status: Candidate source set selected for readiness review; no ETL implementation started

## Product role

Venus is the first body that requires two truthful and materially different presentations:

- the ordinary visible Globe should present the opaque cloud deck;
- the projected Map should present the radar-observed solid surface beneath the clouds.

A single radar-textured sphere is useful as a surface-analysis mode, but it is not an honest default visible presentation of Venus. A generic yellow procedural sphere is recognizable only in the loosest sense and should not replace available source-backed cloud data.

Recommended initial capabilities:

- Globe default: source-backed or source-derived cloud-deck presentation;
- Map: source-backed Magellan radar surface with imported topography;
- optional Globe surface mode: radar surface beneath the cloud presentation;
- Explorer: unsupported for the first increment;
- geographic editors: unsupported;
- Earth climate, biome, water, and hydrology layers: absent.

## Recommended authoritative surface sources

### Magellan C3-MIDR global radar mosaic 2025 m

Publisher and access:

- Magellan Project / NASA Planetary Data System;
- distributed by USGS Astrogeology;
- source product: `Venus Magellan Global C3-MDIR Mosaic 2025m`;
- source URL: `https://planetarymaps.usgs.gov/mosaic/Venus_Magellan_C3-MDIR_Global_Mosaic_2025m.tif`;
- access and use: public domain.

Source characteristics:

- global 8-bit radar backscatter mosaic;
- 18,775 by 9,388 pixels;
- approximately 2,025 m/pixel;
- Equirectangular projection;
- planetocentric latitude;
- positive-east longitude;
- longitude domain -180 to 180;
- built from successively compressed Magellan mosaicked image records;
- cross-track seam correction is present in parts of the product.

Use in World Forge:

- authoritative imported surface appearance for Map and optional radar-surface Globe mode;
- resampled as categorical/image data rather than interpreted as optical albedo;
- labeled as radar backscatter, not visible color;
- optionally mapped through an authored display palette while preserving the underlying imported intensity raster.

### Magellan global topography 4641 m version 2

Publisher and access:

- Magellan Project / NASA PDS;
- distributed by USGS Astrogeology;
- source product: `Venus Magellan Global Topography 4641m`;
- source URL: `https://planetarymaps.usgs.gov/mosaic/Venus_Magellan_Topography_Global_4641m_v02.tif`;
- access and use: public domain; source asks users to cite the authors.

Source characteristics:

- global topographic elevation raster;
- 8,192 by 4,096 pixels;
- 16-bit source;
- approximately 4,641.06 m/pixel;
- Simple Cylindrical projection;
- planetocentric latitude;
- positive-east longitude;
- longitude domain -180 to 180;
- vertical units in meters;
- best-effort vertical accuracy and control-network registration.

Use in World Forge:

- authoritative imported topography for Map and optional radar-surface Globe relief;
- stored with an explicit numeric raster descriptor, datum, units, scale, offset, no-data policy, range, and checksum;
- not applied as terrain displacement to the default cloud-deck Globe.

## Recommended cloud source

### Akatsuki UVI Level 3 longitude-latitude maps

Publisher and access:

- Venus Climate Orbiter Akatsuki project, ISAS/JAXA;
- DARTS dataset: `Venus Climate Orbiter Akatsuki UVI Level3 dataset: Map data`;
- dataset ID: `darts:vco-00016`;
- DOI: `10.17597/isas.darts/vco-00016`;
- data distribution: `https://data.darts.isas.jaxa.jp/pub/pds3/extras/vco_uvi_l3_v1.1/`;
- license: ISAS Data Policy, Government of Japan Standard Terms of Use, and CC BY 4.0 as listed by DARTS.

Source characteristics:

- calibrated ultraviolet map products on equally spaced longitude-latitude grids;
- 283 nm and 365 nm products;
- Level 3 NetCDF map data derived from calibrated imagery and corrected geometry;
- time-dependent observations rather than one timeless canonical global texture;
- dataset version 1.1, published 2023-06-12;
- documented temporal coverage from 2010-12-09 through 2023-12-02.

Use in World Forge:

- source material for a derived representative cloud-deck presentation;
- 365 nm should be the primary visual-contrast candidate because it maps the ultraviolet absorber pattern;
- any composite must remain labeled `origin: derived`, with the source observations, time window, normalization, weighting, gap fill, and seam handling recorded;
- attribution must satisfy CC BY 4.0 and the DARTS/ISAS acknowledgment requirements selected for the release package.

## Cloud-composite decision required

Akatsuki Level 3 data are dynamic observation maps. They are not a single finished full-globe texture ready for direct shipping.

Before implementation, explicitly choose one of these approaches:

### Option A: narrow-window stitched composite — recommended

Select a bounded set of observations close enough in time to preserve plausible coherent cloud structure, then:

- regrid them to the accepted global target;
- normalize viewing and intensity differences;
- weight by coverage and observation quality;
- fill only uncovered cells from nearby observations or a low-frequency derived field;
- preserve the resulting composite as a deterministic source-derived artifact.

This produces a recognizable static presentation while keeping the temporal synthesis bounded and documented.

### Option B: long-period statistical composite

Aggregate many observations into a median or percentile field.

This is easier to make global but risks washing away the cloud structures that make Venus visually recognizable. It should be used only if the narrow-window coverage review fails.

### Option C: authored cloud texture informed by Akatsuki

Use observed maps to define palette, contrast, scale, and broad pattern character, then author a deterministic texture.

This is acceptable only as an explicit fallback and must remain `origin: authored` or `derived`, not `imported`.

Do not select an arbitrary single partial observation and silently smear it around the planet.

## Current contract gap

`WorldBodyRecordV1` currently owns one `detail` discriminated union.

That can represent:

- an atmospheric presentation with Globe-only capability; or
- a raster surface with Globe and Map capability.

It cannot truthfully represent both the cloud-deck presentation and the radar/topography surface as first-class body-local components. Assets include a `clouds` role, but `raster-surface` does not expose a cloud component and `atmospheric-presentation` does not support Map.

Before Venus ingestion, accept a generic layered-body contract. The preferred shape is an additive versioned detail variant representing:

- one solid raster surface;
- one optional atmosphere or cloud presentation;
- explicit default presentation by view;
- optional user-selectable surface Globe mode;
- independent origin and provenance for surface and atmosphere assets;
- one shared physical shape and body identity.

This must be generic enough for Venus, Titan, Earth cloud layers, and other solid bodies with optically significant atmospheres. Do not create a `venus-detail` special case.

## Required numeric raster contract

As with Mars, the current asset reference does not carry enough information to interpret scientific numeric elevation.

Before encoding Magellan topography, accept generic metadata for:

- stored data type and byte order;
- physical units;
- scale and offset;
- datum or reference radius;
- no-data value or mask;
- source and prepared range;
- absolute elevation versus normalized display displacement.

## Recommended prepared package

Initial target resolutions:

```text
surface radar: 1024 x 512
surface elevation: 1024 x 512
cloud presentation: 1024 x 512, or 768 x 384 if evidence shows no visible loss
```

Recommended body-local assets:

```text
bodies/venus/radar.u8
bodies/venus/elevation.u16
bodies/venus/clouds.rgb565
```

Optional derived assets:

```text
bodies/venus/normal.rgb8
bodies/venus/feature-catalog.json
```

A synthetic-color Magellan mosaic is available from USGS, but it is explicitly simulated color. It may be useful as a review reference or optional display palette source; it should not be presented as observed visible surface color.

## ETL transformation rules

The eventual adapter should:

1. download or accept local source overrides for each selected dataset;
2. record source URLs, source sizes, source checksums, licenses, and required acknowledgments;
3. normalize all rasters to one explicit equirectangular, planetocentric, positive-east grid;
4. resample radar and cloud imagery with image-appropriate methods;
5. resample topography with a continuous-data method;
6. preserve no-data and gap-fill distinctions;
7. emit separate source and prepared checksums;
8. emit independent origin records for radar, topography, and cloud composite;
9. keep the cloud composite recipe deterministic and reviewable;
10. never apply surface relief to the visible cloud shell by accident.

## Visual and functional acceptance

Default Venus Globe:

- reads immediately as an opaque pale yellow or cream cloud-covered planet;
- shows source-backed ultraviolet cloud contrast rather than generic gas-giant bands;
- does not expose Magellan radar texture through the default cloud layer;
- does not use terrain displacement on the cloud shell;
- has no Jupiter-style band-count semantics unless the generalized atmosphere contract explicitly supports the chosen pattern model.

Venus Map and optional surface Globe mode:

- preserve recognizable Magellan radar structure;
- preserve broad topography including Ishtar Terra and Maxwell Montes, Aphrodite Terra, Beta Regio, and major lowland provinces;
- label the view as radar/topography rather than visible color;
- contain no Earth biome, water, vegetation, or hydrology presentation;
- show no seam, longitude reversal, or pole mirroring.

Functional checks:

- Venus remains active between System, Globe, and Map;
- default Globe and Map choose their declared components consistently;
- optional surface Globe mode does not replace the default visible presentation;
- Explorer explains that it is unsupported;
- `.wforge` and Parchment round trips preserve all assets, checksums, and component origins;
- unsupported modes never silently return to Earth.

## Package expectation

At 1024 by 512:

- one 8-bit radar raster is 524,288 uncompressed bytes;
- one 16-bit elevation raster is 1,048,576 uncompressed bytes;
- one RGB565 cloud raster is 1,048,576 uncompressed bytes.

The actual compressed delta must be measured from the real prepared data. The accepted starter baseline is 3.24 MiB and imports subjectively instantly. Lazy loading is not a readiness prerequisite for Venus, but package size and peak memory must be measured after Mars and again after Venus.

## Deferred work

Do not broaden the first Venus increment into:

- time-varying cloud replay;
- full Akatsuki observation browsing;
- atmospheric circulation simulation;
- surface temperature reconstruction;
- mineral or dielectric classification;
- high-resolution FMAP ingestion;
- Explorer or local surface navigation;
- speculative active-volcanism overlays.

Those may become later source-backed enrichments after the layered solid-body contract is accepted.
