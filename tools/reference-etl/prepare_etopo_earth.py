#!/usr/bin/env python3
"""Prepare a normalized Earth reference raster bundle from public global rasters.

Elevation comes from NOAA ETOPO 2022. By default, recognizable climate regions
come from the 1991-2020 Koppen-Geiger classification published by Beck et al.
This is a build-time ETL tool; runtime code consumes only the normalized bundle.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import tempfile
import urllib.request
from dataclasses import dataclass

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject

DEFAULT_ETOPO_URL = (
    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/"
    "60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif"
)
DEFAULT_KOPPEN_GEIGER_URL = (
    "https://data.naturalcapitalalliance.stanford.edu/download/"
    "global/koppen_geiger_climatezones/"
    "koppen_geiger_climatezones_1991_2020_1km.tif"
)

BIOME_OCEAN = 0
BIOME_ICE_CAP = 1
BIOME_TUNDRA = 2
BIOME_DESERT = 3
BIOME_GRASSLAND = 4
BIOME_FOREST = 5
BIOME_RAINFOREST = 6
BIOME_MOUNTAIN = 7

# Beck et al. Koppen-Geiger v2 numeric codes, 1 through 30.
# World Forge's compact biome taxonomy intentionally merges climate subclasses.
KOPPEN_TO_BIOME = np.asarray([
    BIOME_GRASSLAND,  # 0: source nodata fallback for land only
    BIOME_RAINFOREST,  # 1 Af
    BIOME_RAINFOREST,  # 2 Am
    BIOME_GRASSLAND,  # 3 Aw
    BIOME_DESERT,  # 4 BWh
    BIOME_DESERT,  # 5 BWk
    BIOME_GRASSLAND,  # 6 BSh
    BIOME_GRASSLAND,  # 7 BSk
    BIOME_GRASSLAND,  # 8 Csa
    BIOME_FOREST,  # 9 Csb
    BIOME_FOREST,  # 10 Csc
    BIOME_FOREST,  # 11 Cwa
    BIOME_FOREST,  # 12 Cwb
    BIOME_FOREST,  # 13 Cwc
    BIOME_FOREST,  # 14 Cfa
    BIOME_FOREST,  # 15 Cfb
    BIOME_FOREST,  # 16 Cfc
    BIOME_GRASSLAND,  # 17 Dsa
    BIOME_FOREST,  # 18 Dsb
    BIOME_TUNDRA,  # 19 Dsc
    BIOME_TUNDRA,  # 20 Dsd
    BIOME_GRASSLAND,  # 21 Dwa
    BIOME_FOREST,  # 22 Dwb
    BIOME_TUNDRA,  # 23 Dwc
    BIOME_TUNDRA,  # 24 Dwd
    BIOME_FOREST,  # 25 Dfa
    BIOME_FOREST,  # 26 Dfb
    BIOME_TUNDRA,  # 27 Dfc
    BIOME_TUNDRA,  # 28 Dfd
    BIOME_TUNDRA,  # 29 ET
    BIOME_ICE_CAP,  # 30 EF
], dtype="u1")

KOPPEN_TO_WETNESS = np.asarray([
    0.42,  # 0: source nodata fallback for land only
    0.92,  # Af
    0.84,  # Am
    0.54,  # Aw
    0.07,  # BWh
    0.10,  # BWk
    0.25,  # BSh
    0.28,  # BSk
    0.38,  # Csa
    0.48,  # Csb
    0.52,  # Csc
    0.58,  # Cwa
    0.60,  # Cwb
    0.58,  # Cwc
    0.68,  # Cfa
    0.70,  # Cfb
    0.66,  # Cfc
    0.36,  # Dsa
    0.48,  # Dsb
    0.42,  # Dsc
    0.36,  # Dsd
    0.44,  # Dwa
    0.52,  # Dwb
    0.46,  # Dwc
    0.40,  # Dwd
    0.58,  # Dfa
    0.60,  # Dfb
    0.50,  # Dfc
    0.44,  # Dfd
    0.25,  # ET
    0.10,  # EF
], dtype="<f4")


@dataclass(frozen=True)
class OutputResolution:
    width: int
    height: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=pathlib.Path,
        help="Existing ETOPO GeoTIFF. When omitted, the official 60 arc-second file is downloaded.",
    )
    parser.add_argument(
        "--source-url",
        default=DEFAULT_ETOPO_URL,
        help="ETOPO source URL used when --input is omitted.",
    )
    parser.add_argument(
        "--koppen-input",
        type=pathlib.Path,
        help="Existing Koppen-Geiger GeoTIFF. When omitted, the public 1991-2020 1 km COG is downloaded.",
    )
    parser.add_argument(
        "--koppen-source-url",
        default=DEFAULT_KOPPEN_GEIGER_URL,
        help="Koppen-Geiger source URL used when --koppen-input is omitted.",
    )
    parser.add_argument(
        "--skip-koppen",
        action="store_true",
        help="Build the elevation-only compatibility bundle without source-backed climate regions.",
    )
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=pathlib.Path(".local/reference-data/earth-etopo"),
        help="Output bundle directory.",
    )
    parser.add_argument("--width", type=int, default=2048)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument(
        "--topology-resolution",
        type=int,
        default=256,
        help="Cubed-sphere topology resolution requested by the World Forge import step.",
    )
    parser.add_argument(
        "--mountain-threshold-meters",
        type=float,
        default=2500.0,
        help="Land above this elevation is classified as World Forge mountain biome unless it is permanent ice.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    resolution = OutputResolution(args.width, args.height)
    validate_resolution(resolution)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    with source_path(args.input, args.source_url, "etopo-2022-60s.tif") as source:
        elevation = read_continuous_raster(source, resolution)

    elevation = np.asarray(elevation, dtype="<f4")
    water = np.asarray(elevation <= 0.0, dtype="u1")

    elevation_path = output / "elevation-meters.f32"
    water_path = output / "water-mask.u8"
    elevation.tofile(elevation_path)
    water.tofile(water_path)

    layers: dict[str, dict[str, object]] = {
        "elevationMeters": {
            "file": elevation_path.name,
            "encoding": "float32-little-endian",
            "units": "m",
            "origin": "imported",
        },
        "waterMask": {
            "file": water_path.name,
            "encoding": "uint8",
            "origin": "derived",
            "derivation": "elevationMeters <= seaLevelMeters",
        },
    }
    summary: dict[str, object] = {
        "minimumElevationMeters": float(np.nanmin(elevation)),
        "maximumElevationMeters": float(np.nanmax(elevation)),
        "waterCellShare": float(water.mean()),
    }
    sources: list[dict[str, str]] = [{
        "sourceId": "noaa-etopo-2022-v1",
        "title": "ETOPO 2022 Global Relief Model, Ice Surface",
        "publisher": "NOAA National Centers for Environmental Information",
        "url": args.source_url,
        "role": "elevation-bathymetry",
    }]

    if not args.skip_koppen:
        with source_path(
            args.koppen_input,
            args.koppen_source_url,
            "koppen-geiger-1991-2020-1km.tif",
        ) as koppen_source:
            koppen = read_categorical_raster(koppen_source, resolution)
        biomes, wetness, ice = derive_climate_layers(
            koppen,
            elevation,
            water,
            args.mountain_threshold_meters,
        )
        biome_path = output / "biome-codes.u8"
        wetness_path = output / "wetness.f32"
        ice_path = output / "ice-mask.u8"
        biomes.tofile(biome_path)
        wetness.tofile(wetness_path)
        ice.tofile(ice_path)
        layers.update({
            "biomeCodes": {
                "file": biome_path.name,
                "encoding": "uint8",
                "origin": "derived",
                "derivation": "Koppen-Geiger 1991-2020 climate class mapped to World Forge biome taxonomy, with water and high-elevation overrides",
            },
            "wetness": {
                "file": wetness_path.name,
                "encoding": "float32-little-endian",
                "origin": "derived",
                "derivation": "representative moisture index assigned from Koppen-Geiger climate class",
            },
            "iceMask": {
                "file": ice_path.name,
                "encoding": "uint8",
                "origin": "derived",
                "derivation": "Koppen-Geiger EF permanent-ice class",
            },
        })
        land = water == 0
        summary.update({
            "koppenClassCount": int(np.unique(koppen[land]).size),
            "desertLandShare": share_of_land(biomes, land, BIOME_DESERT),
            "rainforestLandShare": share_of_land(biomes, land, BIOME_RAINFOREST),
            "mountainLandShare": share_of_land(biomes, land, BIOME_MOUNTAIN),
            "meanLandWetness": float(wetness[land].mean()) if np.any(land) else 0.0,
        })
        sources.append({
            "sourceId": "beck-koppen-geiger-1991-2020-v2",
            "title": "High-resolution 1 km Koppen-Geiger climate classification for 1991-2020",
            "publisher": "Beck et al.; distributed by Stanford Natural Capital Alliance",
            "url": args.koppen_source_url,
            "role": "climate-region-classification",
        })

    manifest = {
        "schema": "world-forge-reference-raster-bundle-v1",
        "bodyId": "earth",
        "name": "Earth",
        "resolution": {"width": resolution.width, "height": resolution.height},
        "topologyResolution": args.topology_resolution,
        "physical": {
            "radiusKm": 6371.0088,
            "massEarth": 1.0,
            "axialTiltDeg": 23.439,
            "orbitalEccentricity": 0.0167,
            "averageTemperatureC": 14.0,
            "seaLevelMeters": 0.0,
            "tideInfluence": 1.0,
        },
        "layers": layers,
        "sources": sources,
        "summary": summary,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared Earth reference bundle: {output}")
    print(f"Resolution: {resolution.width} x {resolution.height}")
    print(f"Elevation range: {summary['minimumElevationMeters']:.1f} to {summary['maximumElevationMeters']:.1f} m")
    if "desertLandShare" in summary:
        print(f"Desert land share: {float(summary['desertLandShare']) * 100:.1f}%")


def derive_climate_layers(
    koppen: np.ndarray,
    elevation: np.ndarray,
    water: np.ndarray,
    mountain_threshold_meters: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    safe_codes = np.clip(np.asarray(koppen, dtype=np.int16), 0, len(KOPPEN_TO_BIOME) - 1)
    biomes = KOPPEN_TO_BIOME[safe_codes].astype("u1", copy=True)
    wetness = KOPPEN_TO_WETNESS[safe_codes].astype("<f4", copy=True)
    ice = np.asarray(safe_codes == 30, dtype="u1")
    land = water == 0
    mountain = land & (elevation >= mountain_threshold_meters) & (ice == 0)
    biomes[mountain] = BIOME_MOUNTAIN
    biomes[water == 1] = BIOME_OCEAN
    wetness[water == 1] = 1.0
    ice[water == 1] = 0
    return biomes, wetness, ice


def share_of_land(values: np.ndarray, land: np.ndarray, target: int) -> float:
    land_count = int(np.count_nonzero(land))
    return float(np.count_nonzero((values == target) & land) / max(1, land_count))


def validate_resolution(resolution: OutputResolution) -> None:
    if resolution.width <= 0 or resolution.height <= 0:
        raise ValueError("Output dimensions must be positive.")
    if resolution.width != resolution.height * 2:
        raise ValueError("The Earth import requires a 2:1 equirectangular raster.")


class source_path:
    def __init__(self, local_path: pathlib.Path | None, source_url: str, file_name: str) -> None:
        self.local_path = local_path
        self.source_url = source_url
        self.file_name = file_name
        self.temp_dir: tempfile.TemporaryDirectory[str] | None = None
        self.path: pathlib.Path | None = None

    def __enter__(self) -> pathlib.Path:
        if self.local_path:
            path = self.local_path.resolve()
            if not path.exists():
                raise FileNotFoundError(path)
            self.path = path
            return path

        self.temp_dir = tempfile.TemporaryDirectory(prefix="world-forge-earth-")
        self.path = pathlib.Path(self.temp_dir.name) / self.file_name
        print(f"Downloading {self.source_url}")
        urllib.request.urlretrieve(self.source_url, self.path)
        return self.path

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self.temp_dir:
            self.temp_dir.cleanup()


def read_continuous_raster(source: pathlib.Path, resolution: OutputResolution) -> np.ndarray:
    destination = np.empty((resolution.height, resolution.width), dtype=np.float32)
    reproject_global(source, destination, resolution, Resampling.bilinear, np.nan)
    if not np.isfinite(destination).all():
        missing = int(np.size(destination) - np.count_nonzero(np.isfinite(destination)))
        raise ValueError(f"Resampled continuous raster contains {missing} missing cells.")
    return destination


def read_categorical_raster(source: pathlib.Path, resolution: OutputResolution) -> np.ndarray:
    destination = np.zeros((resolution.height, resolution.width), dtype=np.uint8)
    reproject_global(source, destination, resolution, Resampling.nearest, 0)
    if int(destination.max()) > 30:
        raise ValueError(f"Koppen-Geiger raster contains unsupported class {int(destination.max())}.")
    return destination


def reproject_global(
    source_path_value: pathlib.Path,
    destination: np.ndarray,
    resolution: OutputResolution,
    resampling: Resampling,
    destination_nodata: float | int,
) -> None:
    destination_transform = from_bounds(-180.0, -90.0, 180.0, 90.0, resolution.width, resolution.height)
    with rasterio.open(source_path_value) as dataset:
        if dataset.count < 1:
            raise ValueError(f"Raster source contains no bands: {source_path_value}")
        reproject(
            source=rasterio.band(dataset, 1),
            destination=destination,
            src_transform=dataset.transform,
            src_crs=dataset.crs,
            src_nodata=dataset.nodata,
            dst_transform=destination_transform,
            dst_crs="EPSG:4326",
            dst_nodata=destination_nodata,
            resampling=resampling,
        )


if __name__ == "__main__":
    main()
