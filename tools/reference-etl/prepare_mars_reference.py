#!/usr/bin/env python3
"""Prepare a reusable Tier 2 Mars reference-surface bundle for World Forge.

The adapter consumes the public MGS MOLA global DEM and Viking MDIM 2.1
colorized global mosaic. It emits a compact, checksum-protected prepared body
bundle. The ordinary World Forge system assembler remains responsible for
producing the final .wforge package.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import tempfile
import urllib.request
from dataclasses import dataclass
from typing import Final

import numpy as np
import rasterio
from rasterio.enums import Resampling

SCHEMA: Final = "world-forge-reference-body-bundle-v1"
DEFAULT_MOLA_URL: Final = "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"
DEFAULT_VIKING_URL: Final = "https://planetarymaps.usgs.gov/mosaic/Mars_Viking_MDIM21_ClrMosaic_global_232m.tif"
DEFAULT_WIDTH: Final = 512
DEFAULT_HEIGHT: Final = 256


@dataclass(frozen=True)
class OutputResolution:
    width: int
    height: int


@dataclass(frozen=True)
class SourceEvidence:
    path: pathlib.Path
    byte_length: int
    sha256: str
    resolution: tuple[int, int]
    band_count: int
    bounds: tuple[float, float, float, float]
    crs: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mola-input", type=pathlib.Path, help="Existing MOLA GeoTIFF instead of downloading it.")
    parser.add_argument("--viking-input", type=pathlib.Path, help="Existing Viking MDIM 2.1 GeoTIFF instead of downloading it.")
    parser.add_argument("--mola-source-url", default=DEFAULT_MOLA_URL)
    parser.add_argument("--viking-source-url", default=DEFAULT_VIKING_URL)
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=pathlib.Path(".local/reference-data/mars-mola-viking"),
        help="Prepared body-bundle directory.",
    )
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    resolution = OutputResolution(args.width, args.height)
    validate_resolution(resolution)
    output = args.output.expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)

    with source_path(args.mola_input, args.mola_source_url, "mars-mola-dem.tif", "mola") as mola_path:
        mola_evidence = inspect_source(mola_path)
        elevation = read_global_elevation(mola_path, resolution)

    with source_path(args.viking_input, args.viking_source_url, "mars-viking-mdim21.tif", "viking") as viking_path:
        viking_evidence = inspect_source(viking_path)
        color = read_global_color(viking_path, resolution)

    rounded_elevation = np.rint(elevation)
    minimum = float(np.nanmin(rounded_elevation))
    maximum = float(np.nanmax(rounded_elevation))
    if minimum < np.iinfo(np.int16).min or maximum > np.iinfo(np.int16).max:
        raise ValueError(
            f"Prepared MOLA range {minimum:.1f} to {maximum:.1f} m does not fit the int16 package contract."
        )
    elevation_i16 = np.asarray(rounded_elevation, dtype="<i2")
    albedo_rgb565 = encode_rgb565(color)

    albedo_file = "albedo.rgb565"
    elevation_file = "elevation.i16"
    albedo_bytes = albedo_rgb565.tobytes(order="C")
    elevation_bytes = elevation_i16.tobytes(order="C")
    (output / albedo_file).write_bytes(albedo_bytes)
    (output / elevation_file).write_bytes(elevation_bytes)

    manifest = {
        "schema": SCHEMA,
        "bodyId": "mars",
        "name": "Mars",
        "detailKind": "raster-surface",
        "shape": {
            "kind": "oblate-spheroid",
            "equatorialRadiusKm": 3396.19,
            "polarRadiusKm": 3376.20,
        },
        "projection": "equirectangular",
        "resolution": {"width": resolution.width, "height": resolution.height},
        "sources": [
            source_manifest(
                source_id="mars-mgs-mola-dem-463m",
                title="Mars MGS MOLA DEM 463m",
                publisher="MOLA Team / NASA Goddard Space Flight Center / USGS Astrogeology",
                url=args.mola_source_url,
                license_name="CC0 / public domain",
                role="elevation",
                evidence=mola_evidence,
            ),
            source_manifest(
                source_id="mars-viking-mdim21-color-232m",
                title="Mars Viking Colorized Global Mosaic 232m",
                publisher="USGS Astrogeology Science Center / NASA Ames",
                url=args.viking_source_url,
                license_name="Public domain",
                role="surface-appearance",
                evidence=viking_evidence,
            ),
        ],
        "assets": [
            {
                "assetId": "mars-viking-mdim21-albedo",
                "role": "albedo",
                "file": albedo_file,
                "logicalPath": "bodies/mars/albedo.rgb565",
                "mediaType": "application/vnd.world-forge.rgb565",
                "encoding": "rgb565-le",
                "resolution": {"width": resolution.width, "height": resolution.height},
                "byteLength": len(albedo_bytes),
                "sha256": sha256_label(albedo_bytes),
                "origin": "imported",
                "transform": {
                    "operation": "lanczos-resample-and-rgb565-quantize",
                    "coordinateNormalization": "north-up, positive-east, -180-to-180 seam",
                    "sourceNote": "Source-provided artistic colorization; not calibrated true color.",
                },
            },
            {
                "assetId": "mars-mgs-mola-elevation",
                "role": "elevation",
                "file": elevation_file,
                "logicalPath": "bodies/mars/elevation.i16",
                "mediaType": "application/vnd.world-forge.numeric-raster",
                "encoding": "int16-le",
                "resolution": {"width": resolution.width, "height": resolution.height},
                "numericRaster": {
                    "dataType": "int16",
                    "byteOrder": "little-endian",
                    "units": "m",
                    "scale": 1,
                    "offset": 0,
                    "datum": "MOLA areoid",
                    "sourceRange": {"min": minimum, "max": maximum},
                    "preparedRange": {"min": minimum, "max": maximum},
                    "interpretation": "absolute-elevation",
                },
                "byteLength": len(elevation_bytes),
                "sha256": sha256_label(elevation_bytes),
                "origin": "imported",
                "transform": {
                    "operation": "bilinear-resample-and-nearest-meter-int16-quantize",
                    "coordinateNormalization": "north-up, positive-east, -180-to-180 seam",
                },
            },
        ],
        "notes": [
            "Mars is a Tier 2 reference surface at the current coarse/default prepared resolution.",
            "The Viking appearance is artistically colorized and must not be labeled calibrated true color.",
            "No Earth climate, biome, water, hydrology, river, plate, or geographic-editor layers are present.",
        ],
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Prepared Mars reference bundle at {output}")
    print(f"Resolution: {resolution.width} x {resolution.height}")
    print(f"Elevation: {minimum:.0f} to {maximum:.0f} m relative to the MOLA areoid")
    print(f"Albedo: {len(albedo_bytes)} bytes, {manifest['assets'][0]['sha256']}")
    print(f"Elevation: {len(elevation_bytes)} bytes, {manifest['assets'][1]['sha256']}")


def source_manifest(
    *,
    source_id: str,
    title: str,
    publisher: str,
    url: str,
    license_name: str,
    role: str,
    evidence: SourceEvidence,
) -> dict[str, object]:
    return {
        "sourceId": source_id,
        "title": title,
        "publisher": publisher,
        "url": url,
        "license": license_name,
        "role": role,
        "sourceFile": evidence.path.name,
        "sourceResolution": {"width": evidence.resolution[0], "height": evidence.resolution[1]},
        "sourceBandCount": evidence.band_count,
        "sourceBounds": {
            "left": evidence.bounds[0],
            "bottom": evidence.bounds[1],
            "right": evidence.bounds[2],
            "top": evidence.bounds[3],
        },
        "sourceCrs": evidence.crs,
        "sourceByteLength": evidence.byte_length,
        "sourceSha256": evidence.sha256,
        "coordinateConvention": "planetocentric latitude, positive-east longitude, source domain -180 to 180",
    }


def inspect_source(source: pathlib.Path) -> SourceEvidence:
    byte_length = source.stat().st_size
    with rasterio.open(source) as dataset:
        validate_global_cylindrical_source(dataset, source)
        return SourceEvidence(
            path=source,
            byte_length=byte_length,
            sha256=sha256_file(source),
            resolution=(dataset.width, dataset.height),
            band_count=dataset.count,
            bounds=(dataset.bounds.left, dataset.bounds.bottom, dataset.bounds.right, dataset.bounds.top),
            crs=dataset.crs.to_string() if dataset.crs else None,
        )


def read_global_elevation(source: pathlib.Path, resolution: OutputResolution) -> np.ndarray:
    with rasterio.open(source) as dataset:
        validate_global_cylindrical_source(dataset, source)
        data = dataset.read(
            1,
            out_shape=(resolution.height, resolution.width),
            resampling=Resampling.bilinear,
            masked=True,
        )
        normalized = normalize_orientation(np.asarray(data.filled(np.nan), dtype=np.float32), dataset)
    if not np.isfinite(normalized).all():
        missing = int(normalized.size - np.count_nonzero(np.isfinite(normalized)))
        raise ValueError(f"Resampled MOLA raster contains {missing} missing cells.")
    return normalized


def read_global_color(source: pathlib.Path, resolution: OutputResolution) -> np.ndarray:
    with rasterio.open(source) as dataset:
        validate_global_cylindrical_source(dataset, source)
        if dataset.count < 3:
            raise ValueError(f"Viking color source requires at least three bands: {source}")
        data = dataset.read(
            (1, 2, 3),
            out_shape=(3, resolution.height, resolution.width),
            resampling=Resampling.lanczos,
            masked=True,
        )
        if np.any(np.ma.getmaskarray(data)):
            missing = int(np.count_nonzero(np.ma.getmaskarray(data)))
            raise ValueError(f"Resampled Viking raster contains {missing} missing channel cells.")
        color = np.moveaxis(np.asarray(data, dtype=np.float32), 0, -1)
        color = normalize_orientation(color, dataset)
    if not np.isfinite(color).all():
        raise ValueError("Resampled Viking raster contains non-finite values.")
    return np.asarray(np.clip(np.rint(color), 0, 255), dtype=np.uint8)


def normalize_orientation(data: np.ndarray, dataset: rasterio.io.DatasetReader) -> np.ndarray:
    normalized = data
    if dataset.transform.e > 0:
        normalized = np.flip(normalized, axis=0)
    if dataset.transform.a < 0:
        normalized = np.flip(normalized, axis=1)
    return np.ascontiguousarray(normalized)


def validate_global_cylindrical_source(dataset: rasterio.io.DatasetReader, source: pathlib.Path) -> None:
    if dataset.width <= 0 or dataset.height <= 0 or dataset.count < 1:
        raise ValueError(f"Raster source contains no usable cells: {source}")
    if abs(dataset.width / dataset.height - 2.0) > 0.02:
        raise ValueError(
            f"Expected an approximately 2:1 global cylindrical raster, received {dataset.width} x {dataset.height}: {source}"
        )
    longitude_span = abs(dataset.bounds.right - dataset.bounds.left)
    latitude_span = abs(dataset.bounds.top - dataset.bounds.bottom)
    if abs(longitude_span - 360.0) > 1.0 or abs(latitude_span - 180.0) > 1.0:
        raise ValueError(
            f"Expected global -180..180 / -90..90 coverage, received bounds {dataset.bounds}: {source}"
        )


def encode_rgb565(color: np.ndarray) -> np.ndarray:
    red = (color[:, :, 0].astype(np.uint16) >> 3) << 11
    green = (color[:, :, 1].astype(np.uint16) >> 2) << 5
    blue = color[:, :, 2].astype(np.uint16) >> 3
    return np.asarray(red | green | blue, dtype="<u2")


def validate_resolution(resolution: OutputResolution) -> None:
    if resolution.width <= 0 or resolution.height <= 0:
        raise ValueError("Prepared Mars dimensions must be positive.")
    if resolution.width != resolution.height * 2:
        raise ValueError("Prepared Mars dimensions must remain 2:1 equirectangular.")


def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def sha256_label(data: bytes) -> str:
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


class source_path:
    def __init__(self, local_path: pathlib.Path | None, source_url: str, file_name: str, label: str) -> None:
        self.local_path = local_path
        self.source_url = source_url
        self.file_name = file_name
        self.label = label
        self.temp_dir: tempfile.TemporaryDirectory[str] | None = None

    def __enter__(self) -> pathlib.Path:
        if self.local_path is not None:
            path = self.local_path.expanduser().resolve()
            if not path.exists():
                raise FileNotFoundError(path)
            return path

        self.temp_dir = tempfile.TemporaryDirectory(prefix=f"world-forge-mars-{self.label}-")
        path = pathlib.Path(self.temp_dir.name) / self.file_name
        print(f"Downloading {self.source_url}")
        request = urllib.request.Request(
            self.source_url,
            headers={"User-Agent": "World-Forge reference-data preparation"},
        )
        with urllib.request.urlopen(request, timeout=300) as response, path.open("wb") as output:  # noqa: S310
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        return path

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self.temp_dir is not None:
            self.temp_dir.cleanup()


if __name__ == "__main__":
    main()
