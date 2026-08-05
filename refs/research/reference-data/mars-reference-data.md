# Mars reference data

Updated: 2026-08-04
Status: Candidate source set selected for readiness review; no ETL implementation started

## Product role

Mars is the first source-backed solid secondary planet after Earth.

The initial Mars increment should prove a reusable compact solid-body path rather than forcing Mars into the full Earth-oriented `PrimaryWorld` contract. The target is a recognizable Globe and projected Map with imported surface appearance and topography. Explorer, editing, climate, biome, hydrology, plate, and civilization layers are not required for the first increment.

Recommended detail tier: Tier 2 `raster-surface`.

Recommended initial capabilities:

- Globe: supported;
- Map: supported;
- Explorer: unsupported with an explicit capability explanation;
- geographic editors: unsupported;
- generated climate and biome layers: absent.

## Recommended authoritative sources

### Mars Global Surveyor MOLA DEM 463 m

Publisher and access:

- MOLA Team / NASA Goddard Space Flight Center;
- distributed by USGS Astrogeology and NASA PDS;
- USGS product: `Mars MGS MOLA DEM 463m`;
- source URL: `https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif`;
- access and use: CC0 / public domain, no use constraints.

Source characteristics:

- global digital elevation model;
- 46,080 by 23,040 pixels;
- 16-bit source;
- approximately 463.08 m/pixel at the equator;
- Simple Cylindrical projection;
- planetocentric latitude;
- positive-east longitude;
- longitude domain -180 to 180;
- elevation above the MOLA areoid;
- polar gaps and track gaps in the distributed mosaic include documented interpolation or reprojection fills.

Use in World Forge:

- authoritative imported topography;
- resampled with a continuous-data filter;
- converted to a compact numeric raster with an explicit datum, unit, scale, offset, no-data treatment, source range, prepared range, and checksum;
- optional radial-displacement or normal presentation derived from the imported elevation;
- never interpreted as Earth elevation relative to sea level.

### Viking MDIM 2.1 colorized global mosaic 232 m

Publisher and access:

- USGS Astrogeology Science Center / NASA Ames;
- source product: `Mars Viking Colorized Global Mosaic 232m`;
- source URL: `https://planetarymaps.usgs.gov/mosaic/Mars_Viking_MDIM21_ClrMosaic_global_232m.tif`;
- access and use: public domain, no use constraints.

Source characteristics:

- global 3-band image mosaic;
- 92,160 by 46,080 pixels;
- approximately 231.54 m/pixel at the equator;
- Simple Cylindrical projection;
- planetocentric latitude;
- positive-east longitude;
- longitude domain -180 to 180;
- positional control aligned to MDIM 2.1 and MOLA-era standards.

Critical provenance note:

The product is an artistically colorized mosaic. NASA Ames warped an earlier colorized Viking product and blended it over the controlled MDIM 2.1 grayscale mosaic. It is useful and recognizable presentation data, but it must not be described as calibrated true-color or direct per-pixel observed surface color.

Use in World Forge:

- imported source-backed presentation raster;
- prepared as compact RGB565 or another accepted deterministic runtime encoding;
- stored with `origin: imported` and a simplification note that the color is source-provided artistic colorization;
- not used to derive scientific material or mineral classes without a separate accepted method.

## Recommended prepared package

Initial target resolution:

```text
1024 x 512
```

Recommended body-local assets:

```text
bodies/mars/albedo.rgb565
bodies/mars/elevation.u16
```

Optional derived assets should be created only if the renderer benefits materially:

```text
bodies/mars/normal.rgb8
bodies/mars/feature-catalog.json
```

The first increment should not add an Earth-style canonical layer inventory merely to satisfy existing renderer assumptions.

## Required contract work before ETL

The existing body asset reference contract records role, path, media type, encoding, resolution, size, and checksum, but does not yet define enough metadata to interpret scientific numeric rasters.

Before encoding MOLA elevation, agree a generic numeric raster descriptor that can carry at least:

- stored data type and byte order;
- physical units;
- scale and offset;
- datum or reference surface;
- no-data value or mask policy;
- source and prepared minimum and maximum;
- whether the values are absolute elevation, radius, or display-only normalized displacement.

Do not encode those semantics into a Mars-specific file name or opaque custom encoding string.

The current `raster-surface` detail also declares Globe and Map capability, but the active render path still resolves projected surfaces through `WorldBodyRecordV1.surface` and the `PrimaryWorld` contract. A body-local raster surface renderer/accessor must exist before Mars is marked Map- or Globe-capable.

## ETL transformation rules

The eventual adapter should:

1. download or accept local source overrides;
2. record source URL, source size, source checksum, projection, coordinate convention, and license;
3. reproject only when required to reach the accepted common equirectangular grid;
4. normalize longitude orientation and raster row direction explicitly;
5. resample MOLA elevation with a continuous-data method;
6. resample the color mosaic with a color-image method;
7. preserve the seam and polar handling deterministically;
8. emit a prepared manifest with all transforms and digests;
9. avoid deriving Earth climate, water, biome, river, or plate layers;
10. remain reproducible from local source overrides after the original downloads are staged.

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

At 1024 by 512:

- one RGB565 raster is 1,048,576 uncompressed bytes;
- one 16-bit elevation raster is 1,048,576 uncompressed bytes;
- optional normals or feature catalogs add further cost.

Compressed `.wforge` growth must be measured from the real prepared assets. The current accepted `.pworld` baseline is 3,400,610 bytes and imports subjectively instantly, so lazy body loading is not a prerequisite for this first Mars increment. Reconsider it only after measured package and memory growth.

## Deferred sources and layers

Do not broaden the first increment into:

- global CTX or THEMIS high-resolution ingestion;
- mineralogy or spectroscopy;
- seasonal dust simulation;
- observed weather replay;
- polar-cap seasonal dynamics;
- crater catalogs beyond a small optional feature list;
- a full Mars climate or hydrology reconstruction.

Those may become later source-backed enrichments after the compact solid-body path is accepted.
