# Earth reference-data sources and ETL notes

Updated: 2026-08-18
Status: Source-backed elevation/climate-region ETL implemented; maintained Ultra 4096 x 2048 contract established; real Ultra source build, package measurement, and browser acceptance still pending

Related:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/currentHandoff.md`
- `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
- World Forge #124
- Parchment Worlds #22

## Product boundary

This document carries source, processing, redistribution, fidelity, and cost notes for the maintained Earth reference.

The runtime `.wforge` project records lightweight layer-origin and capability information. Full scientific provenance, source URLs, mapping rules, and redistribution notes remain here and in the normalized ETL manifest.

## Maintained Earth target

The maintained first-party Earth reference target is now:

- raster: `4096 x 2048`, the existing World Forge Ultra tier;
- cubed-sphere topology: `1024`;
- one Earth body inside the existing multi-body Sol project, not a separate Earth-only project.

The topology value is derived through the shared `topologyResolutionForOutput(...)` policy:

```ts
Math.max(16, Math.round(Math.min(width, height) / 2))
```

For `4096 x 2048`, that policy resolves to `1024`.

Implementation checkpoints establishing this contract:

- `5762eb03bf107c94284546bf64b19a01b2e67404`
- `d9201cea5bee0f925c81906823f771f69fc04277`
- `f9e8f73afdf0a71003dbf80030dd4a7afcf581f0`

The Sol pipeline now rejects a prepared Earth bundle with stale dimensions/topology or without the maintained minimum elevation, water, biome, wetness, and permanent-ice layer set.

## Elevation and bathymetry: NOAA ETOPO 2022

Official product page:

- `https://www.ncei.noaa.gov/products/etopo-global-relief-model`

Default source file:

- ETOPO 2022 v1, 60 arc-second, global Ice Surface elevation GeoTIFF
- `https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif`

NOAA describes ETOPO 2022 as an integrated global topography, bathymetry, and shoreline model. The Ice Surface product is used so Greenland and Antarctica represent the present visible upper surface rather than subglacial bedrock.

The 60 arc-second global grid is approximately `21600 x 10800`, materially finer than the maintained `4096 x 2048` output. Ultra therefore does not require upsampling beyond the coarser source's useful angular information content.

Citation:

- NOAA National Centers for Environmental Information
- ETOPO 2022 Global Relief Model
- DOI `10.25921/fd45-gt74`

## Climate regions: Koppen-Geiger 1991-2020

Default source file:

- Beck et al. high-resolution 1 km Koppen-Geiger climate classification, historical period 1991-2020
- `https://data.naturalcapitalalliance.stanford.edu/download/global/koppen_geiger_climatezones/koppen_geiger_climatezones_1991_2020_1km.tif`

Dataset landing page:

- `https://data.naturalcapitalalliance.stanford.edu/dataset.html?id=global-koppen-geiger-climatezones`

Primary publication:

- Beck, H. E. et al. High-resolution 1 km Koppen-Geiger climate classification maps for 1901-2099. Scientific Data 10, 724 (2023).

The 1 km climate source is also materially finer than the maintained global Ultra raster.

The Stanford distribution identifies the dataset as CC BY 4.0. Release packaging must include the required attribution and retain the source note when derived Earth fixtures are distributed.

## Implemented transform

Tool:

- `tools/reference-etl/prepare_etopo_earth.py`

Install ETL dependencies:

```bash
python -m pip install -r tools/reference-etl/requirements.txt
```

For the maintained complete Sol rebuild, prepare Mars and run the source-to-package pipeline rather than building an Earth-only fixture:

```bash
npm run reference:prepare-mars
npm run reference:pipeline-sol -- --body-input .local/reference-data/mars-mola-viking
```

The Sol pipeline supplies the maintained Earth dimensions/topology to the Earth ETL, prepares Jupiter, validates the prepared Earth manifest, and assembles Mars as an explicit body input.

The Earth ETL:

1. downloads ETOPO unless `--input` supplies a local file;
2. downloads the Koppen-Geiger GeoTIFF unless `--koppen-input` supplies a local file;
3. reprojects both sources to a shared global EPSG:4326 equirectangular grid;
4. resamples continuous elevation bilinearly and categorical climate classes with nearest-neighbor sampling;
5. writes Float32 elevation in meters and a derived water mask;
6. maps the 30 Koppen-Geiger subclasses into World Forge's compact biome taxonomy;
7. derives a representative wetness index from each climate class;
8. derives permanent ice from the EF class;
9. overrides non-ice land above the configurable mountain threshold, default 2500 meters, as mountain;
10. records source and derivation metadata in the normalized manifest.

Use `--skip-koppen` only for an elevation-only compatibility build. It is not suitable for the maintained recognizable-Earth fixture, and the Sol pipeline now rejects the resulting incomplete bundle before package assembly.

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

## Current layer fidelity

| Layer | Current origin | Current fidelity |
| --- | --- | --- |
| Elevation and bathymetry | Imported from ETOPO | Recognizable global relief |
| Ocean/land water mask | Derived from ETOPO elevation and zero-meter sea level | Suitable for current global coastline proof |
| Topology projection | Derived from imported raster | Canonical cubed-sphere support |
| Temperature | Derived placeholder | Not yet a real Earth temperature climatology |
| Wetness | Derived from imported Koppen-Geiger class | Recognizable broad hydroclimate regions, not measured precipitation |
| Biomes | Derived from imported Koppen-Geiger class | Recognizable broad regions including Sahara, Arabian, Australian, and other arid zones |
| Permanent ice | Derived from Koppen-Geiger EF | Broad permanent-ice classification |
| Rivers and lakes | Empty placeholder | Real hydrography import remains pending |
| Wind and currents | Empty placeholder | Real climatology or derived circulation remains pending |

## Normalized bundle size at Ultra

The maintained Earth ETL writes five required binary layers before the manifest:

- elevation: Float32, 4 bytes/cell;
- water mask: Uint8, 1 byte/cell;
- biome codes: Uint8, 1 byte/cell;
- wetness: Float32, 4 bytes/cell;
- permanent ice: Uint8, 1 byte/cell.

At `4096 x 2048`, there are `8,388,608` raster cells. The five required binaries therefore total exactly `92,274,688` bytes, or `88 MiB`, before the small JSON manifest.

This is a format-derived expectation, not the final measured prepared-bundle result. The pipeline now records actual per-file sizes and digests when the real bundle is built.

## Eager import/package cost signal

The normalized source bundle is not the largest current cost. `importReferenceBodyRaster(...)` eagerly expands the Earth reference into the full runtime Map and topology layer contracts.

At the maintained target:

- raster cells: `8,388,608`;
- topology cells at resolution 1024: `6,291,456`.

From the current typed-array definitions, before source-array duplication, JS objects, JSON conversion, ZIP buffers, renderer copies, or browser persistence:

- projected Map layers are approximately `400 MiB`;
- topology-layer arrays are approximately `228 MiB`;
- cubed-sphere positions/latitudes/longitudes/area weights/neighbors are approximately `240 MiB` while the topology is materialized.

These values are static contract-derived preflight estimates, not measured peak RSS or browser heap. They identify the likely architecture boundary to observe during the first Ultra build.

The current exporter also converts typed arrays to ordinary number arrays for JSON layer serialization before ZIP compression. The real build must therefore measure both memory pressure and package behavior rather than extrapolating from the 88 MiB normalized input alone.

Do not respond to this evidence by silently lowering the maintained Earth target or splitting Earth out of Sol. If the real run fails at eager materialization or JSON serialization, record the exact failure and treat binary/lazy payload architecture as the follow-on decision.

## Acceptance checks for the refreshed Earth fixture

The rebuilt Sol package must prove:

- Africa, Eurasia, the Americas, Australia, Antarctica, and major islands remain recognizable;
- coastlines materially benefit from the higher raster resolution;
- the Sahara and Arabian deserts read as large contiguous desert regions;
- interior Australia, western North America, the Atacama region, and central Asian arid regions remain represented;
- Amazon, Congo, and Southeast Asian humid tropical regions do not collapse into generic grassland;
- permanent ice remains visible in Antarctica and Greenland without turning all high-latitude terrain into ice;
- mountains remain driven by imported elevation rather than climate class;
- Map and Globe use the same refreshed Earth surface;
- Explorer addresses Earth through the normal active-body path;
- `.wforge` save and reopen preserve the new arrays and body identity;
- Jupiter and Mars remain usable in the same package;
- layer-origin metadata describes biome and wetness as derived from imported climate classes, not directly observed ecological biomes.

## Remaining source layers

Still requiring separate selection and implementation:

- actual surface-temperature climatology;
- measured precipitation or soil-moisture climatology;
- land-cover detail beyond the compact climate-to-biome mapping;
- rivers, lakes, and drainage networks;
- tectonic plates, boundaries, and volcanism;
- prevailing winds and ocean currents;
- seasonal surface imagery or albedo presentation.

## Measurement status

Still pending on a machine/environment that can execute the full source and browser workflow:

- actual Earth ETL elapsed time;
- actual prepared-bundle byte total and digests;
- package-build elapsed time;
- final `.wforge` size and digest;
- `.pworld` size after republishing;
- process/browser memory measurements;
- browser import/open and save/reopen timings;
- Map, Globe, and Explorer responsiveness at Ultra.

Do not convert the static estimates above into claimed runtime measurements.
