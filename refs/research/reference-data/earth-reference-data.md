# Earth reference-data sources and ETL notes

Updated: 2026-08-04
Status: Initial elevation and bathymetry ETL implemented; recognizable full Earth reference remains incomplete

Related:

- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- World Forge #124
- Parchment Worlds #22

## Product boundary

This document carries source, processing, redistribution, and fidelity notes for the maintained Earth reference.

The runtime `.wforge` project does not need full cell-level scientific provenance. It records only the lightweight layer origin and capability information needed to distinguish imported, derived, generated, and edited data.

## Initial source: NOAA ETOPO 2022

Official product page:

- `https://www.ncei.noaa.gov/products/etopo-global-relief-model`

Initial source file:

- ETOPO 2022 v1, 60 arc-second, global Ice Surface elevation GeoTIFF
- `https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif`

NOAA describes ETOPO 2022 as an integrated global topography, bathymetry, and shoreline model. The official product provides 15, 30, and 60 arc-second GeoTIFF and NetCDF products in Ice Surface and Bedrock forms.

The first vertical slice uses the Ice Surface version because the visible reference world should represent the present upper surface of Greenland and Antarctica rather than subglacial bedrock.

NOAA citation information identifies:

- NOAA National Centers for Environmental Information;
- ETOPO 2022 Global Relief Model;
- DOI `10.25921/fd45-gt74`.

A release packaging review must confirm the redistribution terms and any source-component attribution obligations before generated Earth reference files are committed or distributed. The ETL code may be developed and validated before that review completes.

## Implemented transform

Tool:

- `tools/reference-etl/prepare_etopo_earth.py`

Default command:

```bash
python -m pip install -r tools/reference-etl/requirements.txt
npm run reference:prepare-earth
```

The tool currently:

1. downloads the official 60 arc-second GeoTIFF unless `--input` supplies an existing file;
2. reprojects and resamples to a global EPSG:4326 equirectangular raster;
3. requires a 2:1 output aspect ratio;
4. defaults to `2048 x 1024` cells;
5. writes little-endian Float32 elevation in meters;
6. derives an initial binary water mask from `elevation <= 0 m`;
7. writes a normalized reference-raster manifest under `.local/reference-data/earth-etopo`.

The normalized bundle is deliberately source-neutral. World Forge consumes the manifest and binary layers rather than reading GeoTIFF, rasterio, or NOAA-specific structures in durable runtime code.

## World Forge import

Code:

- `packages/generator-core/src/referenceBodyImport.ts`
- `scripts/referenceDataBundle.ts`
- `scripts/build-earth-reference.ts`

Build command:

```bash
npm run reference:build-earth
```

Default output:

- `.local/reference-data/sol-earth-reference.wforge`

The import currently treats:

| Layer | Current origin | Current fidelity |
| --- | --- | --- |
| Elevation and bathymetry | Imported from ETOPO | Recognizable global relief at the selected output resolution |
| Ocean/land water mask | Derived from ETOPO elevation and zero-meter sea level | Suitable for the initial coastline proof; not yet a curated hydrography model |
| Topology projection | Derived from the imported raster | Canonical cubed-sphere support for current World Forge readers |
| Temperature | Derived placeholder | Not yet a real Earth climate field |
| Wetness and precipitation | Derived placeholder | Not yet a real Earth hydroclimate field |
| Biomes | Derived placeholder | Not yet a real Earth land-cover or biome reference |
| Rivers and lakes | Empty placeholder | Real hydrography import remains pending |
| Wind and currents | Empty placeholder | Real climatology or derived circulation remains pending |

A recognizable coastline or mountain range does not mean the Earth vertical slice is complete. The imported geometry is the first proof that real source layers can survive Map, Globe, save, and `.wforge` packaging.

## Planned recognizable-surface additions

### NASA Blue Marble: Next Generation

Official overview:

- `https://earthobservatory.nasa.gov/features/BlueMarble/BlueMarble.php`

NASA describes Blue Marble: Next Generation as cloud-free global monthly surface imagery derived from MODIS, available at up to 500 meters per pixel. The collection is a strong candidate for recognizable Globe albedo and seasonal surface presentation.

Before integration, document:

- selected month or annual compositing rule;
- ocean treatment and known deep-ocean color limitations;
- image credit requirements;
- resampling and color-space handling;
- whether imagery remains presentation-only or also informs surface classification.

### Natural Earth physical vectors

Official downloads:

- `https://www.naturalearthdata.com/downloads/10m-physical-vectors/`

Candidate uses:

- coastline and land polygons for a cleaner vector boundary check;
- lakes and lake centerlines;
- rivers and lake centerlines;
- optional named physical features at a later stage.

Natural Earth is useful for practical map-scale hydrography and vector validation. It is not a substitute for ETOPO elevation or for higher-fidelity scientific hydrography where later requirements justify it.

## Additional Earth layers still to select

The following sources or source families require a separate evaluation before implementation:

- actual surface temperature climatology;
- precipitation and moisture climatology;
- land cover or biome classification;
- permanent and seasonal ice;
- rivers, lakes, and drainage networks;
- tectonic plates, boundaries, and volcanism;
- prevailing winds and ocean currents;
- political or cultural overlays, which are outside the physical Earth reference slice.

Selection criteria should prioritize recognizable results, redistribution safety, stable public access, manageable resolution, and clear coordinate semantics over maximal scientific precision.

## Procedural and derived gap filling

Procedural or analytical filling is permitted when no suitable source layer is selected or when a source has bounded gaps.

Rules:

- imported facts remain unchanged unless an explicit transform requires resampling or normalization;
- derived cells and layers must remain distinguishable from imported data;
- procedural filling must not be represented as observed Earth data;
- the method and affected layers belong in this document;
- user edits after import may replace either imported or filled values in the user's independent project copy.

## Acceptance checks for the elevation slice

The first ETOPO-backed package should prove:

- Africa, Eurasia, the Americas, Australia, Antarctica, and major islands are recognizable;
- the Atlantic, Pacific, Indian, Arctic, and Southern Ocean basins are recognizable;
- the Himalayas, Andes, Rockies, East African highlands, and major ocean trenches are visibly located and proportioned at the chosen resolution;
- longitude wrapping has no visible discontinuity beyond source/resampling limits;
- Map and Globe use the same imported surface;
- `.wforge` save and import preserve the elevation arrays exactly;
- the Earth body remains inside the one Sol system project;
- unsupported or placeholder climate layers are not described as real climatology.

## Known package-size concern

A `2048 x 1024` Float32 layer contains roughly eight MiB before compression. A complete Earth reference with multiple real layers can become much larger.

The first package-size study must measure:

- `.wforge` ZIP size by layer;
- browser import and IndexedDB cost;
- memory required to materialize Map and Globe layers;
- whether high-volume optional layers should remain compressed or lazily materialized;
- whether Parchment's current JSON `.pworld` envelope can embed the `.wforge` efficiently or requires a binary container revision.

Do not solve this by splitting Earth and the rest of Sol into unrelated projects.
