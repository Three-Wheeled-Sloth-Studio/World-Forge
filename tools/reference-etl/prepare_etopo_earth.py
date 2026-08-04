#!/usr/bin/env python3
"""Prepare a normalized Earth reference raster bundle from NOAA ETOPO 2022.

This is a build-time ETL tool. Dataset provenance, licensing, and processing notes
belong in refs/research/reference-data/earth-reference-data.md rather than in the
runtime World Forge project.
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
        help="Source URL used when --input is omitted.",
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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    resolution = OutputResolution(args.width, args.height)
    validate_resolution(resolution)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    with source_path(args.input, args.source_url) as source:
        elevation = read_and_resample(source, resolution)

    elevation = np.asarray(elevation, dtype="<f4")
    water = np.asarray(elevation <= 0.0, dtype="u1")

    elevation_path = output / "elevation-meters.f32"
    water_path = output / "water-mask.u8"
    elevation.tofile(elevation_path)
    water.tofile(water_path)

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
        "layers": {
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
        },
        "summary": {
            "minimumElevationMeters": float(np.nanmin(elevation)),
            "maximumElevationMeters": float(np.nanmax(elevation)),
            "waterCellShare": float(water.mean()),
        },
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared Earth reference bundle: {output}")
    print(f"Resolution: {resolution.width} x {resolution.height}")
    print(f"Elevation range: {manifest['summary']['minimumElevationMeters']:.1f} to {manifest['summary']['maximumElevationMeters']:.1f} m")


def validate_resolution(resolution: OutputResolution) -> None:
    if resolution.width <= 0 or resolution.height <= 0:
        raise ValueError("Output dimensions must be positive.")
    if resolution.width != resolution.height * 2:
        raise ValueError("The initial Earth import requires a 2:1 equirectangular raster.")


class source_path:
    def __init__(self, local_path: pathlib.Path | None, source_url: str) -> None:
        self.local_path = local_path
        self.source_url = source_url
        self.temp_dir: tempfile.TemporaryDirectory[str] | None = None
        self.path: pathlib.Path | None = None

    def __enter__(self) -> pathlib.Path:
        if self.local_path:
            path = self.local_path.resolve()
            if not path.exists():
                raise FileNotFoundError(path)
            self.path = path
            return path

        self.temp_dir = tempfile.TemporaryDirectory(prefix="world-forge-etopo-")
        self.path = pathlib.Path(self.temp_dir.name) / "etopo-2022-60s.tif"
        print(f"Downloading {self.source_url}")
        urllib.request.urlretrieve(self.source_url, self.path)
        return self.path

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self.temp_dir:
            self.temp_dir.cleanup()


def read_and_resample(source_path: pathlib.Path, resolution: OutputResolution) -> np.ndarray:
    destination = np.empty((resolution.height, resolution.width), dtype=np.float32)
    destination_transform = from_bounds(-180.0, -90.0, 180.0, 90.0, resolution.width, resolution.height)

    with rasterio.open(source_path) as dataset:
        if dataset.count < 1:
            raise ValueError("ETOPO source contains no raster bands.")
        reproject(
            source=rasterio.band(dataset, 1),
            destination=destination,
            src_transform=dataset.transform,
            src_crs=dataset.crs,
            src_nodata=dataset.nodata,
            dst_transform=destination_transform,
            dst_crs="EPSG:4326",
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )

    if not np.isfinite(destination).all():
        missing = int(np.size(destination) - np.count_nonzero(np.isfinite(destination)))
        raise ValueError(f"Resampled ETOPO raster contains {missing} missing cells.")
    return destination


if __name__ == "__main__":
    main()
