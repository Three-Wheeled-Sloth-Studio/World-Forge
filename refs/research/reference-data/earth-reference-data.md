# Earth reference-data sources and ETL notes

Updated: 2026-08-04
Status: Elevation and bathymetry import implemented; source-backed climate-region and biome ETL implemented; refreshed Sol fixture still requires rebuild and browser acceptance

Related:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- `refs/testing/sol-earth-biome-and-selector-stability-qa.md`
- World Forge #124
- Parchment Worlds #22

## Product boundary

This document carries source, processing, redistribution, and fidelity notes for the maintained Earth reference.

The runtime `.wforge` project records lightweight layer-origin and capability information. Full scientific provenance, source URLs, mapping rules, and redistribution notes remain here and in the normalized ETL manifest.

## Elevation and bathymetry: NOAA ETOPO 2022

Official product page:

- `https://www.ncei.noaa.gov/products/etopo-global-relief-model`

Default source file:

- ETOPO 2022 v1, 60 arc-second, global Ice Surface elevation GeoTIFF
- `https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif`

NOAA describes ETOPO 2022 as an integrated global topography, bathymetry, and shoreline model. The Ice Surface product is used so Greenland and Antarctica represent the present visible upper surface rather than subglacial bedrock.

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

The Stanford distribution identifies the dataset as CC BY 4.0. Release packaging must include the required attribution and retain the source note when derived Earth fixtures are distributed.

## Implemented transform

Tool:

- `tools/reference-etl/prepare_etopo_earth.py`

Install and run:

```bash
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-earth
npm run reference:build-earth
```

The default ETL now:

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

Use `--skip-koppen` only for an elevation-only compatibility build. It intentionally recreates the older placeholder-biome behavior and is not suitable for recognizable Earth acceptance.

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

## Acceptance checks for the refreshed Earth fixture

The rebuilt Sol package must prove:

- Africa, Eurasia, the Americas, Australia, Antarctica, and major islands remain recognizable;
- the Sahara and Arabian deserts read as large contiguous desert regions;
- interior Australia, western North America, the Atacama region, and central Asian arid regions are visibly represented at the available resolution;
- Amazon, Congo, and Southeast Asian humid tropical regions do not collapse into generic grassland;
- permanent ice remains visible in Antarctica and Greenland without turning all high-latitude terrain into ice;
- mountains remain driven by imported elevation rather than climate class;
- Map and Globe use the same refreshed Earth surface;
- `.wforge` save and reopen preserve the new biome and wetness arrays exactly;
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

## Package-size concern

A `2048 x 1024` Float32 layer contains roughly eight MiB before compression. Adding wetness and biome layers increases both package size and import materialization cost.

The next package-size study must measure:

- `.wforge` ZIP size by layer;
- browser import and IndexedDB cost;
- memory required to materialize Map and Globe layers;
- whether optional high-volume layers should remain compressed or load lazily;
- whether Parchment's current package envelope remains efficient for the enriched Earth fixture.

Do not solve this by splitting Earth and the rest of Sol into unrelated projects.
