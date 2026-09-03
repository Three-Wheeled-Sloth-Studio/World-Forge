---
type: "Research Reference"
title: "Mars reference data"
tags:
- world-forge
- research
---
# Mars reference data

Updated: 2026-08-05
Status: Tier 2 scope accepted; coarse source-backed ETL and reusable prepared-body contract implemented; real source run and visual acceptance pending

## Product role

Mars is the first source-backed solid secondary planet after Earth.

The initial Mars increment proves a reusable compact solid-body path rather than forcing Mars into the full Earth-oriented `PrimaryWorld` contract. The target is a recognizable Globe and projected Map with imported surface appearance and topography. Explorer, editing, climate, biome, hydrology, plate, and civilization layers are not required for this increment.

Accepted detail tier: Tier 2 `raster-surface`.

Accepted initial capabilities:

- Globe: supported when the prepared appearance asset is hydrated;
- Map: supported through the body-local raster path;
- Explorer: unsupported with an explicit capability explanation;
- geographic editors: unsupported;
- generated climate and biome layers: absent.

Tier, source resolution, prepared resolution, and tool capability are separate decisions. Tier 2 does not imply high-resolution assets.

## Selected source products

The first draft pointed at the highest-resolution convenient global mosaics. That would have downloaded roughly 2 GB of MOLA data and roughly 12 GB of Viking imagery only to prepare a 512 by 256 runtime surface. The accepted coarse implementation instead uses moderate-size official products from the same scientific lineages.

### MGS MOLA MEGDR global topography, 16 pixels per degree

Publisher and access:

- MOLA Team / NASA Goddard Space Flight Center;
- distributed through the NASA PDS Geosciences Node;
- product: `MEGT90N000EB.IMG` from the 16-pixels-per-degree MEGDR set;
- default source URL is recorded in `tools/reference-etl/prepare_mars_reference.py`;
- access and use: CC0 / U.S. government public domain.

Source characteristics used by the adapter:

- global digital topography;
- 5,760 by 2,880 cells;
- signed 16-bit big-endian source values;
- approximately 16 pixels per degree;
- simple cylindrical global grid;
- planetocentric latitude;
- positive-east longitude;
- source longitude domain 0 to 360;
- elevation relative to the MOLA GMM3 areoid;
- expected source byte length and broad physical range are validated before conversion.

Use in World Forge:

- authoritative imported topography;
- source grid rolled from the 0-to-360 source seam to the shared -180-to-180 seam;
- bilinearly resampled to the accepted prepared dimensions;
- rounded to nearest metre and stored as little-endian signed 16-bit values;
- packaged with explicit datum, units, type, byte order, scale, offset, source range, prepared range, and checksum;
- never interpreted as Earth elevation relative to sea level.

### Viking MDIM 2.1 colorized global mosaic, reduced 1 km derivative

Publisher and access:

- USGS Astrogeology Science Center / NASA Ames;
- product: `Mars_Viking_MDIM21_ClrMosaic_1km.jpg`;
- default source URL is recorded in `tools/reference-etl/prepare_mars_reference.py`;
- access and use: U.S. government public domain.

Source characteristics:

- global reduced derivative of the controlled MDIM 2.1 colorized mosaic;
- approximately 21,339 by 10,670 pixels;
- approximately 1 km per pixel;
- simple cylindrical global presentation;
- planetocentric latitude;
- positive-east longitude;
- longitude domain -180 to 180.

Critical provenance note:

The product is an artistically colorized mosaic. NASA Ames warped an earlier colorized Viking product and blended it over the controlled MDIM 2.1 grayscale mosaic. It is useful and recognizable presentation data, but it must not be described as calibrated true-color or direct per-pixel observed surface color.

Use in World Forge:

- imported source-backed presentation raster;
- JPEG draft decoding requests decoder-side subsampling before the full source is materialized in memory;
- Lanczos resampling produces the prepared surface;
- the runtime payload is deterministic little-endian RGB565;
- stored with `origin: imported` and an explicit source-provided artistic-color note;
- not used to derive scientific material or mineral classes without a separately accepted method.

## Prepared package

Default prepared resolution:

```text
512 x 256
```

This is the current coarse/default reference-body target. The ETL exposes width and height overrides, but higher resolution is not required for initial Mars acceptance.

Body-local assets:

```text
bodies/mars/albedo.rgb565
bodies/mars/elevation.i16
```

Prepared bundle directory:

```text
.local/reference-data/mars-mola-viking/
  manifest.json
  albedo.rgb565
  elevation.i16
```

The bundle uses:

```text
world-forge-reference-body-bundle-v1
```

The manifest records:

- stable body and asset IDs;
- source titles, publishers, URLs, roles, licenses, dimensions, byte lengths, and SHA-256 digests;
- source coordinate conventions;
- prepared dimensions;
- body shape;
- output media types and encodings;
- output byte lengths and SHA-256 digests;
- numeric raster semantics;
- resampling, seam, orientation, and quantization transforms;
- the Viking artistic-color caveat.

## Implemented durable contracts

### Numeric raster descriptor

`WorldBodyAssetRefV1` can now carry a generic numeric raster descriptor covering:

- stored data type;
- byte order;
- physical units;
- scale and offset;
- datum or reference surface;
- no-data value or mask asset;
- source and prepared ranges;
- absolute elevation, radius, normalized displacement, or generic scalar interpretation.

These semantics are not inferred from filenames and are not Mars-specific.

### Prepared-body bundle

`scripts/referenceBodyBundle.ts` loads and validates reusable body bundles before they enter a system package. It verifies:

- schema and body identity;
- shape, projection, and shared resolution;
- source attribution records;
- safe body-local package paths;
- unique asset IDs, paths, and files;
- byte lengths and checksums;
- payload shape for RGB565 and numeric rasters;
- conversion into a valid `RasterSurfaceDetailV1`.

The prepared-body bundle is intentionally upstream of `.wforge`. It is designed to become the common output of:

- built-in reference ETL adapters;
- future command-line conversion tools;
- future in-application source import;
- later user workflows such as PNG, JPG, WebP, or SVG map conversion.

### Normal Sol assembly

The Sol builder accepts repeatable:

```text
--body-input <prepared-body-directory>
```

The normal exporter remains the sole final `.wforge` writer. Mars does not have a separate package writer or separate system project.

## Implemented runtime path

### Map

Tier 2 Map rendering reads the active body's hydrated raster assets directly. It does not fabricate a `PrimaryWorld`.

Behavior:

- default and natural surface presentation use the imported RGB565 appearance;
- elevation and heightmap modes decode the scientific numeric raster;
- target-resolution resampling is supported;
- compact reference surfaces explicitly reject geographic point inspection rather than returning Earth fields;
- Explorer remains unsupported.

### Globe

Tier 2 Globe rendering uses a dedicated smooth reference-body viewer rather than Earth geographic geometry.

Behavior:

- imported RGB565 texture;
- sphere, oblate-spheroid, or triaxial-ellipsoid shape scaling;
- axial tilt, rotation, orbital lighting, drag, and zoom;
- no Earth ocean shell, cloud shell, atmosphere shell, weather, seasonal surface, or terrain displacement assumptions;
- explicit reference-surface status instrumentation.

## ETL transformation sequence

`tools/reference-etl/prepare_mars_reference.py`:

1. downloads the selected official sources or accepts local source overrides;
2. validates the MOLA binary dimensions, byte length, and broad physical range;
3. validates the Viking source as an approximately 2:1 global image;
4. records source URLs, sizes, dimensions, checksums, coordinate conventions, and licenses;
5. rolls MOLA from the 0-to-360 seam to -180-to-180;
6. bilinearly resamples topography;
7. decoder-subsamples and Lanczos-resamples the Viking appearance;
8. quantizes elevation to little-endian signed 16-bit metres;
9. quantizes appearance to little-endian RGB565;
10. emits the reusable manifest and checksum-protected assets.

The ETL remains reproducible from local source overrides after downloads are staged.

## Commands

Prepare Mars:

```powershell
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-mars
```

Attach the prepared bundle to the normal Sol package:

```powershell
npm run reference:build-sol -- --body-input .local/reference-data/mars-mola-viking
```

These commands have not yet been run against the real source products for accepted evidence. Do not record output hashes or package deltas until that run completes.

## Visual and functional acceptance

Mars should be recognizably Mars in both Globe and Map.

Minimum visual checks:

- Olympus Mons and the Tharsis rise;
- Valles Marineris;
- Hellas Planitia;
- the north and south polar regions;
- recognizable broad albedo character including Syrtis Major;
- no Earth oceans, vegetation, biome palette, or blue atmospheric presentation;
- no seam or mirrored-longitude error.

Functional checks:

- Mars remains active between System, Globe, and Map;
- Map uses the Mars raster surface rather than Earth `PrimaryWorld` data;
- Explorer explains that it is unsupported;
- save, reopen, `.wforge` export/import, and Parchment nesting preserve both Mars assets and their checksums;
- re-export does not mutate the prepared bytes;
- unsupported modes never silently return to Earth.

## Package expectation

At 512 by 256:

- one RGB565 raster is 262,144 uncompressed bytes;
- one signed 16-bit elevation raster is 262,144 uncompressed bytes;
- the core prepared payload is therefore 524,288 bytes before package compression and manifest overhead.

Compressed `.wforge` and `.pworld` growth must be measured from the real prepared assets. The current accepted `.pworld` baseline is 3,400,610 bytes and imports subjectively instantly, so lazy body loading is not a prerequisite for this increment.

## Deferred sources and layers

Do not broaden the first increment into:

- the multi-gigabyte 463 m MOLA or 232 m Viking global mosaics unless a later high-resolution product increment justifies them;
- global CTX or THEMIS high-resolution ingestion;
- mineralogy or spectroscopy;
- seasonal dust simulation;
- observed weather replay;
- polar-cap seasonal dynamics;
- crater catalogs beyond a small optional feature list;
- a full Mars climate or hydrology reconstruction;
- Explorer or editing before the complete Sol system is accepted.

Those may become later source-backed enrichments after the complete Sol reference and subsequent Explorer/editor increment.
