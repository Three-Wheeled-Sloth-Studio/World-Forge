---
type: "Research Reference"
title: "Earth reference-data sources and ETL notes"
tags:
- world-forge
- research
---
# Earth reference-data sources and ETL notes

Updated: 2026-08-18
Status: Source-backed Ultra 4096 x 2048 Earth baseline built successfully; canonical topology is 1024; complete Sol package and Parchment import path measured; final owner visual acceptance remains open

Related:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/currentHandoff.md`
- `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
- World Forge #124
- Parchment Worlds #22

## Product boundary

This document carries source, processing, redistribution, fidelity, and measured-cost notes for the maintained Earth reference.

The runtime `.wforge` project records lightweight layer-origin and capability information. Full scientific provenance, source URLs, mapping rules, redistribution notes, and fidelity limits remain here and in the normalized ETL manifest.

## Maintained baseline

The accepted maintained reference target is:

- raster: `4096 x 2048`;
- projection: global EPSG:4326 equirectangular;
- canonical cubed-sphere topology resolution: `1024`.

The topology value is produced by the existing shared `topologyResolutionForOutput(...)` helper. It is not an Earth-specific constant.

The earlier planning estimate of topology 512 was wrong. For a 4096 x 2048 output, the shared helper resolves to 1024.

## Why Ultra is source-supported

### Elevation and bathymetry: NOAA ETOPO 2022

Official product page:

- `https://www.ncei.noaa.gov/products/etopo-global-relief-model`

Default source file:

- ETOPO 2022 v1, 60 arc-second, global Ice Surface elevation GeoTIFF
- `https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif`

NOAA describes ETOPO 2022 as an integrated global topography, bathymetry, and shoreline model. The Ice Surface product is used so Greenland and Antarctica represent the visible upper surface rather than subglacial bedrock.

Citation:

- NOAA National Centers for Environmental Information
- ETOPO 2022 Global Relief Model
- DOI `10.25921/fd45-gt74`

The 60 arc-second global source is approximately 21600 x 10800 in angular sampling, materially finer than the World Forge Ultra target.

### Climate regions: Koppen-Geiger 1991-2020

Default source file:

- Beck et al. high-resolution 1 km Koppen-Geiger climate classification, historical period 1991-2020
- `https://data.naturalcapitalalliance.stanford.edu/download/global/koppen_geiger_climatezones/koppen_geiger_climatezones_1991_2020_1km.tif`

Dataset landing page:

- `https://data.naturalcapitalalliance.stanford.edu/dataset.html?id=global-koppen-geiger-climatezones`

Primary publication:

- Beck, H. E. et al. High-resolution 1 km Koppen-Geiger climate classification maps for 1901-2099. Scientific Data 10, 724 (2023).

The Stanford distribution identifies the dataset as CC BY 4.0. Release packaging must include the required attribution and retain the source note when derived Earth fixtures are distributed.

The 1 km source is also materially finer than a 4096 x 2048 global target.

The maintained Ultra baseline therefore does not upsample beyond the useful information content of the current source stack. Payload/runtime cost, not scientific source resolution, is the limiting concern.

## Implemented transform

Tool:

- `tools/reference-etl/prepare_etopo_earth.py`

Maintained source-to-package path:

```bash
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-mars
npm run reference:pipeline-sol -- --body-input .local/reference-data/mars-mola-viking
```

The Sol reference pipeline now supplies the maintained Earth resolution and topology explicitly from the shared reference-resolution contract.

The Earth ETL:

1. downloads ETOPO unless `--input` supplies a local file;
2. downloads the Koppen-Geiger GeoTIFF unless `--koppen-input` supplies a local file;
3. reprojects both sources to a shared global EPSG:4326 equirectangular grid;
4. resamples continuous elevation bilinearly and categorical climate classes with nearest-neighbor sampling;
5. writes Float32 elevation in meters and a derived water mask;
6. maps the 30 named Koppen-Geiger subclasses plus source nodata/fallback behavior into World Forge's compact biome taxonomy;
7. derives a representative wetness index from each climate class;
8. derives permanent ice from the EF class;
9. overrides non-ice land above the configurable mountain threshold, default 2500 meters, as mountain;
10. records source and derivation metadata in the normalized manifest.

Use `--skip-koppen` only for an elevation-only compatibility build. It recreates the older placeholder-biome behavior and is not suitable for the maintained recognizable-Earth fixture.

## Koppen-Geiger mapping

World Forge currently carries a deliberately compact global biome vocabulary. Climate subclasses are grouped as follows:

| Koppen-Geiger classes | World Forge biome |
| --- | --- |
| Af, Am | rainforest |
| Aw | grassland |
| BWh, BWk | desert |
| BSh, BSk | grassland |
| C climates | forest or grassland, depending on subclass |
| Warmer D climates | forest or grassland |
| Subarctic D climates | tundra |
| ET | tundra |
| EF | ice cap |
| Non-ice land above 2500 m | mountain |
| ETOPO water cells | ocean |

This is a recognizable-world transform, not a claim that Koppen climate classes and ecological biomes are identical. The mapping is explicit, deterministic, and replaceable when World Forge gains a richer ecological taxonomy.

## Measured Ultra build

Authoritative source-build run:

- World Forge Actions run `32136329836`
- source commit `b9977e298bb8bec2168d824c5b241517e5c2d50b`

Prepared Earth bundle:

- resolution: `4096 x 2048`
- topology resolution: `1024`
- total normalized bytes: `92,277,263`

Layer bytes:

| File | Bytes |
| --- | ---: |
| elevation-meters.f32 | 33,554,432 |
| water-mask.u8 | 8,388,608 |
| biome-codes.u8 | 8,388,608 |
| wetness.f32 | 33,554,432 |
| ice-mask.u8 | 8,388,608 |
| manifest.json | 2,575 |

Measured summary:

| Metric | Value |
| --- | ---: |
| Minimum elevation | -10250.2744 m |
| Maximum elevation | 6320.3843 m |
| Water share | 0.6590461 |
| Koppen class count including fallback/nodata code | 31 |
| Desert land share | 0.1178108 |
| Rainforest land share | 0.0427358 |
| Mountain land share | 0.0220696 |
| Mean land wetness | 0.3274100 |

Measured stage cost:

| Stage | Time |
| --- | ---: |
| Earth ETL | 56,884 ms |
| Jupiter preparation | 383 ms |
| Sol package assembly | 50,033 ms |
| Pipeline report total | 107,494 ms |
| `/usr/bin/time` wall clock | 1:48.23 |

Peak RSS for the complete source-to-package run was `5,921,352 kB`, about 5.65 GiB.

## Current layer fidelity

| Layer | Current origin | Current fidelity |
| --- | --- | --- |
| Elevation and bathymetry | Imported from ETOPO | Recognizable global relief at Ultra raster resolution |
| Ocean/land water mask | Derived from ETOPO elevation and zero-meter sea level | Source-backed coastline mask |
| Topology projection | Derived from imported raster | Canonical 1024 cubed-sphere support |
| Temperature | Derived placeholder | Not a real Earth temperature climatology |
| Wetness | Derived from imported Koppen-Geiger class | Recognizable broad hydroclimate regions, not measured precipitation |
| Biomes | Derived from imported Koppen-Geiger class | Recognizable broad climate/biome identity |
| Permanent ice | Derived from Koppen-Geiger EF | Broad permanent-ice classification |
| Rivers and lakes | Empty placeholder | Real hydrography import remains pending |
| Wind and currents | Empty placeholder | Real climatology or derived circulation remains pending |

## Complete Sol package cost

The Ultra Earth remains inside one complete Sol project with the accepted Jupiter and Mars assets.

Measured package from run `32136329836`:

- bodies: `23`
- compressed `.wforge`: `193,507,559` bytes
- run-specific SHA-256: `ee6d98314fe7447c42ca8545abb7fa7e2acf8b95fddaba3be3683c80c6b16915`

The digest includes build/source metadata and is evidence for that exact run rather than a universal content hash.

Inspection of the built ZIP found approximately `1.325 GB` of uncompressed content. High-volume map and topology typed arrays are currently converted to JSON number arrays before ZIP compression. Examples from the measured package include large elevation, temperature, and topology JSON entries.

This is now the primary World Forge payload issue exposed by Ultra.

## Parchment package cost

Parchment Worlds run `32137360931` generated the enriched Sol starter through the normal package generator and then inspected it through the normal package reader.

Measured output:

- nested `.wforge`: `193,507,559` bytes
- `.pworld`: `258,172,374` bytes
- `.pworld` SHA-256: `f4ce8d3b354bc47b976ebfccbe9f695619b10483738cafe31c86c1e44462b74e`
- starter generation: `1:03.30`
- starter generation peak RSS: `7,233,688 kB`
- normal package inspection: `14.66 s`
- package inspection peak RSS: `2,102,408 kB`

The current Parchment package stores the nested binary package as base64 within the JSON package envelope. Ultra therefore exposes a second avoidable payload expansion after World Forge packaging.

## Browser measurements

Parchment browser run `32139014646` successfully reviewed, imported, reloaded, and transferred the measured Ultra starter into World Forge.

Measured Parchment browser costs:

- review: `8.558 s`
- import: `14.499 s`
- reload: `16.460 s`
- JS heap after review: `791,584,316` bytes
- JS heap after import: `275,142,820` bytes
- JS heap after reload: `274,855,776` bytes

The embedded World Forge surface then reported the maintained Ultra contract and Earth facts:

- `4096 x 2048` raster;
- `1024` cubed-sphere topology;
- `Sol System` project;
- `65.90460538864136%` ocean;
- `1 Earth radii`;
- `23.439 deg` axial tilt;
- `0.0167` eccentricity;
- Luna present;
- Earth biome counts populated.

That proves the package handoff reached the imported Earth surface. A follow-up diagnostic is using explicit Map, Globe, and geographic-drilldown controls and screenshots for final presentation evidence.

## Acceptance checks

The final visual acceptance pass should confirm:

- Africa, Eurasia, the Americas, Australia, Antarctica, and major islands remain recognizable;
- Sahara and Arabian deserts read as broad contiguous arid regions;
- interior Australia, western North America, the Atacama region, and central Asian arid regions are represented appropriately for the compact biome vocabulary;
- Amazon, Congo, and Southeast Asian humid tropical regions remain visible;
- permanent ice is concentrated in Antarctica and Greenland rather than flooding ordinary high-latitude terrain;
- mountains remain driven by imported elevation;
- coastlines visibly benefit from the Ultra raster over the old 512 x 256 integration fixture;
- Map and Globe agree on land/water and broad biome identity;
- geographic drill-down remains on the active Earth project.

## Remaining source layers

Still requiring separate selection and implementation:

- actual surface-temperature climatology;
- measured precipitation or soil-moisture climatology;
- land-cover detail beyond the compact climate-to-biome mapping;
- rivers, lakes, and drainage networks;
- tectonic plates, boundaries, and volcanism;
- prevailing winds and ocean currents;
- seasonal surface imagery or albedo presentation.

Do not describe any of these as solved by the Ultra rebuild.

### Wetland extent evidence

The maintained Earth/Köppen bundle does not include an observed wetland layer. Köppen classes are not a safe wetland answer key, so generated wetland cells remain excluded from biome macro-F1 as a reference class. The separate manual downstream diagnostic can now ingest a locally prepared GLWD v2 fractional reference without adding that large source to the maintained Earth package or ordinary CI.

Published global extent varies substantially with definition and source resolution. GLWD v2 reports a maximum combined waterbody/wetland extent of 18.2 million km², or 13.4% of land excluding Antarctica, while multi-source potential-wetland estimates reach about 21% and narrower inventories report materially less.

GLWD v2 is selected for the spatial slice because it supplies fractional coverage, a dominant class, a deterministic 33-class typology, WGS84 GeoTIFFs, and CC BY 4.0 terms. The source combined-class archive is about 925 MB and remains ignored under `.local/reference-data/glwd-v2`. `scripts/prepare-glwd-reference.py` creates compact `4096 x 2048` percent-coverage and dominant-class layers under `.local/reference-data/glwd-v2-derived`. Its manifest records source hashes, DOI, license, coverage (`84 N` to `56 S`, excluding Antarctica), and nodata semantics.

The validation scope matches World Forge's current categorical semantics: generated lakes and river wetlands are compared with GLWD inland aquatic/wetland classes 1-32; rice-dominant class 33, project ocean cells, and GLWD nodata are excluded. Fractional prevalence error, recall for cells with at least 50% reference coverage, and reference-fraction separation validate broad spatial association and budget, not exact boundaries, seasonal inundation, subtype, or causal hydrology.

Primary references:

- GLWD v2: https://doi.org/10.5194/essd-17-2277-2025
- GLWD v2 data deposit: https://doi.org/10.6084/m9.figshare.28519994
- Multi-source wetland maps: https://doi.org/10.5194/essd-11-189-2019
- GWL_FCS30: https://doi.org/10.5194/essd-15-265-2023

Preparation command after staging the combined GLWD GeoTIFFs:

```text
uv run scripts/prepare-glwd-reference.py --source-directory=.local/reference-data/glwd-v2/extracted/GLWD_v2_0_combined_classes --output=.local/reference-data/glwd-v2-derived --resolution=4096x2048
```

## Payload follow-up

The Ultra result should not be downgraded to hide package cost.

The evidence supports a separate payload-strategy increment, preferably in this order:

1. encode high-volume typed map/topology arrays as binary `.wforge` entries instead of JSON number arrays;
2. keep backward-compatible package reading while the new binary representation rolls in;
3. re-measure size, import, save/reopen, and browser memory;
4. add staged/lazy body or layer decode only where post-binary measurements justify it;
5. remove Parchment base64 expansion for large binary attachments if its remaining cost still justifies a container change.

One logical Sol system must remain one project throughout that work.
