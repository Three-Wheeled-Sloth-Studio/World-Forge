# /// script
# dependencies = ["numpy", "rasterio"]
# ///
"""Reduce GLWD v2 combined GeoTIFFs to a compact World Forge validation grid."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-directory", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--resolution", default="4096x2048")
    return parser.parse_args()


def parse_resolution(value: str) -> tuple[int, int]:
    width, separator, height = value.lower().partition("x")
    if not separator or not width.isdigit() or not height.isdigit():
        raise ValueError(f"Invalid resolution: {value}")
    return int(width), int(height)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def reproject_layer(source_path: Path, width: int, height: int, resampling: Resampling) -> np.ndarray:
    destination = np.full((height, width), 255, dtype=np.uint8)
    with rasterio.open(source_path) as source:
        reproject(
            source=rasterio.band(source, 1),
            destination=destination,
            src_transform=source.transform,
            src_crs=source.crs,
            src_nodata=source.nodata,
            dst_transform=from_bounds(-180, -90, 180, 90, width, height),
            dst_crs="EPSG:4326",
            dst_nodata=255,
            resampling=resampling,
        )
    return destination


def main() -> None:
    options = arguments()
    width, height = parse_resolution(options.resolution)
    area_path = options.source_directory / "GLWD_v2_0_area_pct.tif"
    class_path = options.source_directory / "GLWD_v2_0_main_class.tif"
    if not area_path.is_file() or not class_path.is_file():
        raise FileNotFoundError("Expected GLWD v2 combined area-percent and main-class GeoTIFFs.")

    wetland_percent = reproject_layer(area_path, width, height, Resampling.average)
    dominant_class = reproject_layer(class_path, width, height, Resampling.nearest)
    options.output.mkdir(parents=True, exist_ok=True)
    wetland_percent.tofile(options.output / "wetland-percent.u8")
    dominant_class.tofile(options.output / "dominant-class.u8")
    manifest = {
        "schema": "world-forge-glwd-reference-v1",
        "resolution": {"width": width, "height": height},
        "coverage": {"northLatitude": 84, "southLatitude": -56, "excludesAntarctica": True},
        "layers": {
            "wetlandPercent": {"file": "wetland-percent.u8", "encoding": "uint8", "nodata": 255},
            "dominantClass": {"file": "dominant-class.u8", "encoding": "uint8", "nodata": 255},
        },
        "source": {
            "dataset": "Global Lakes and Wetlands Database v2.0",
            "doi": "10.6084/m9.figshare.28519994",
            "license": "CC BY 4.0",
            "areaPercentSha256": sha256(area_path),
            "dominantClassSha256": sha256(class_path),
        },
        "interpretation": {
            "wetlandPercent": "Fractional coverage of all 33 GLWD inland aquatic and wetland classes.",
            "dominantClass": "Used to identify human rice-paddy-dominated cells (class 33).",
        },
    }
    (options.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    valid = wetland_percent != 255
    natural = valid & (dominant_class != 33)
    print(f"Prepared {width}x{height} GLWD validation grid")
    print(f"Valid cells: {int(valid.sum())}; rice-dominant cells excluded from natural comparisons: {int((valid & (dominant_class == 33)).sum())}")
    print(f"Mean combined wetland coverage outside rice-dominant cells: {float(wetland_percent[natural].mean()):.3f}%")


if __name__ == "__main__":
    main()
