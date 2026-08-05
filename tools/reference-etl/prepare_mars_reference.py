#!/usr/bin/env python3
"""Prepare a reusable Tier 2 Mars reference-surface bundle for World Forge.

The adapter deliberately consumes moderate-size public source products that
match the current coarse runtime target:

- the official 16-pixels/degree MGS MOLA MEGDR global topography image;
- the official reduced 1 km Viking MDIM 2.1 colorized global mosaic.

It emits a compact, checksum-protected prepared body bundle. The ordinary
World Forge system assembler remains responsible for producing the final
.wforge package. The same prepared-bundle contract is intended for future
in-application import and conversion tools.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import ssl
import tempfile
import urllib.request
from dataclasses import dataclass
from typing import Final

import numpy as np
import truststore
from PIL import Image

SCHEMA: Final = "world-forge-reference-body-bundle-v1"
DEFAULT_MOLA_URL: Final = (
    "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/"
    "mgsl_300x/meg016/megt90n000eb.img"
)
DEFAULT_VIKING_URL: Final = (
    "https://planetarymaps.usgs.gov/mosaic/Mars_Viking_MDIM21_ClrMosaic_1km.jpg"
)
DEFAULT_WIDTH: Final = 512
DEFAULT_HEIGHT: Final = 256
MOLA_WIDTH: Final = 5760
MOLA_HEIGHT: Final = 2880
MOLA_EXPECTED_BYTES: Final = MOLA_WIDTH * MOLA_HEIGHT * 2
VIKING_MAX_SOURCE_PIXELS: Final = 300_000_000
DOWNLOAD_SSL_CONTEXT: Final = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)

# The official reduced Viking JPEG is 21,339 x 10,670 pixels. Pillow's generic
# default limit rejects it before JPEG draft decoding can subsample the source.
# Raise the ceiling only for this trusted adapter and retain an explicit hard
# bound instead of disabling image-size protection globally.
Image.MAX_IMAGE_PIXELS = VIKING_MAX_SOURCE_PIXELS


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
    coordinate_convention: str
    value_range: tuple[float, float] | None = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mola-input",
        type=pathlib.Path,
        help="Existing MEGT90N000EB.IMG instead of downloading it.",
    )
    parser.add_argument(
        "--viking-input",
        type=pathlib.Path,
        help="Existing reduced Viking MDIM 2.1 global JPEG instead of downloading it.",
    )
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

    with source_path(
        args.mola_input,
        args.mola_source_url,
        "megt90n000eb.img",
        "mola",
    ) as mola_path:
        elevation, mola_evidence = read_mola_megdr_topography(mola_path, resolution)

    with source_path(
        args.viking_input,
        args.viking_source_url,
        "Mars_Viking_MDIM21_ClrMosaic_1km.jpg",
        "viking",
    ) as viking_path:
        color, viking_evidence = read_viking_color(viking_path, resolution)

    rounded_elevation = np.rint(elevation)
    prepared_minimum = float(np.nanmin(rounded_elevation))
    prepared_maximum = float(np.nanmax(rounded_elevation))
    if prepared_minimum < np.iinfo(np.int16).min or prepared_maximum > np.iinfo(np.int16).max:
        raise ValueError(
            "Prepared MOLA range "
            f"{prepared_minimum:.1f} to {prepared_maximum:.1f} m does not fit the int16 package contract."
        )
    elevation_i16 = np.asarray(rounded_elevation, dtype="<i2")
    albedo_rgb565 = encode_rgb565(color)

    albedo_file = "albedo.rgb565"
    elevation_file = "elevation.i16"
    albedo_bytes = albedo_rgb565.tobytes(order="C")
    elevation_bytes = elevation_i16.tobytes(order="C")
    (output / albedo_file).write_bytes(albedo_bytes)
    (output / elevation_file).write_bytes(elevation_bytes)

    source_minimum, source_maximum = mola_evidence.value_range or (
        prepared_minimum,
        prepared_maximum,
    )
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
                source_id="mars-mgs-mola-megdr-topography-16ppd",
                title="MGS MOLA MEGDR Global Topography 16 pixels/degree",
                publisher="MOLA Team / NASA Goddard Space Flight Center / NASA PDS Geosciences Node",
                url=args.mola_source_url,
                license_name="CC0 / U.S. government public domain",
                role="elevation",
                evidence=mola_evidence,
            ),
            source_manifest(
                source_id="mars-viking-mdim21-colorized-global-1km",
                title="Mars Viking MDIM 2.1 Colorized Global Mosaic 1km",
                publisher="USGS Astrogeology Science Center / NASA Ames",
                url=args.viking_source_url,
                license_name="U.S. government public domain",
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
                    "operation": "jpeg-decoder-subsample-lanczos-resample-and-rgb565-quantize",
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
                    "datum": "MOLA areoid (GMM3, degree and order 50)",
                    "sourceRange": {"min": source_minimum, "max": source_maximum},
                    "preparedRange": {"min": prepared_minimum, "max": prepared_maximum},
                    "interpretation": "absolute-elevation",
                },
                "byteLength": len(elevation_bytes),
                "sha256": sha256_label(elevation_bytes),
                "origin": "imported",
                "transform": {
                    "operation": "longitude-roll-bilinear-resample-and-nearest-meter-int16-quantize",
                    "coordinateNormalization": "0-to-360 source rolled to north-up positive-east -180-to-180 seam",
                },
            },
        ],
        "notes": [
            "Mars is a Tier 2 reference surface at the current coarse/default prepared resolution.",
            "The source products are moderate-resolution derivatives selected to avoid multi-gigabyte downloads that add no value at 512 x 256.",
            "The Viking appearance is artistically colorized and must not be labeled calibrated true color.",
            "No Earth climate, biome, water, hydrology, river, plate, or geographic-editor layers are present.",
        ],
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Prepared Mars reference bundle at {output}")
    print(f"Resolution: {resolution.width} x {resolution.height}")
    print(
        "Elevation: "
        f"{prepared_minimum:.0f} to {prepared_maximum:.0f} m relative to the MOLA areoid"
    )
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
    manifest: dict[str, object] = {
        "sourceId": source_id,
        "title": title,
        "publisher": publisher,
        "url": url,
        "license": license_name,
        "role": role,
        "sourceFile": evidence.path.name,
        "sourceResolution": {
            "width": evidence.resolution[0],
            "height": evidence.resolution[1],
        },
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
        "coordinateConvention": evidence.coordinate_convention,
    }
    if evidence.value_range is not None:
        manifest["sourceValueRange"] = {
            "min": evidence.value_range[0],
            "max": evidence.value_range[1],
        }
    return manifest


def read_mola_megdr_topography(
    source: pathlib.Path,
    resolution: OutputResolution,
) -> tuple[np.ndarray, SourceEvidence]:
    byte_length = source.stat().st_size
    if byte_length != MOLA_EXPECTED_BYTES:
        raise ValueError(
            f"Expected the 16 ppd MEGT90N000EB image to contain {MOLA_EXPECTED_BYTES} bytes, "
            f"received {byte_length}: {source}"
        )
    raw = np.fromfile(source, dtype=">i2")
    if raw.size != MOLA_WIDTH * MOLA_HEIGHT:
        raise ValueError(f"MOLA MEGDR source contains an unexpected cell count: {source}")
    source_grid = raw.reshape((MOLA_HEIGHT, MOLA_WIDTH))
    source_minimum = float(source_grid.min())
    source_maximum = float(source_grid.max())
    if source_minimum < -9000 or source_maximum > 22_000:
        raise ValueError(
            f"MOLA source range {source_minimum:.0f} to {source_maximum:.0f} m is outside the accepted product bounds."
        )

    # The PDS image is 0..360 east. Roll 180 degrees so the prepared raster
    # begins at -180 and ends at +180 while retaining positive-east ordering.
    normalized = np.roll(source_grid, -(MOLA_WIDTH // 2), axis=1).astype(np.float32)
    image = Image.fromarray(normalized, mode="F")
    resized = image.resize(
        (resolution.width, resolution.height),
        resample=Image.Resampling.BILINEAR,
    )
    elevation = np.asarray(resized, dtype=np.float32)
    if not np.isfinite(elevation).all():
        raise ValueError("Resampled MOLA raster contains non-finite cells.")

    evidence = SourceEvidence(
        path=source,
        byte_length=byte_length,
        sha256=sha256_file(source),
        resolution=(MOLA_WIDTH, MOLA_HEIGHT),
        band_count=1,
        bounds=(0.0, -90.0, 360.0, 90.0),
        crs="Mars 2000 simple cylindrical; MOLA GMM3 areoid",
        coordinate_convention="planetocentric latitude, positive-east longitude, source domain 0 to 360",
        value_range=(source_minimum, source_maximum),
    )
    return elevation, evidence


def read_viking_color(
    source: pathlib.Path,
    resolution: OutputResolution,
) -> tuple[np.ndarray, SourceEvidence]:
    byte_length = source.stat().st_size
    with Image.open(source) as source_image:
        source_width, source_height = source_image.size
        validate_global_image_dimensions(source_width, source_height, source)
        if source_image.mode not in {"RGB", "RGBA", "YCbCr"}:
            source_image = source_image.convert("RGB")
        # JPEG draft decoding asks the decoder to subsample before allocating the
        # full 21k x 10k image. It preserves ample detail for a 512 x 256 target.
        source_image.draft(
            "RGB",
            (
                max(resolution.width * 4, resolution.width),
                max(resolution.height * 4, resolution.height),
            ),
        )
        color_image = source_image.convert("RGB").resize(
            (resolution.width, resolution.height),
            resample=Image.Resampling.LANCZOS,
        )
        color = np.asarray(color_image, dtype=np.uint8)
    if color.shape != (resolution.height, resolution.width, 3):
        raise ValueError(f"Unexpected prepared Viking color shape {color.shape}.")

    evidence = SourceEvidence(
        path=source,
        byte_length=byte_length,
        sha256=sha256_file(source),
        resolution=(source_width, source_height),
        band_count=3,
        bounds=(-180.0, -90.0, 180.0, 90.0),
        crs="Mars 2000 simple cylindrical",
        coordinate_convention="planetocentric latitude, positive-east longitude, source domain -180 to 180",
    )
    return color, evidence


def validate_global_image_dimensions(width: int, height: int, source: pathlib.Path) -> None:
    if width <= 0 or height <= 0:
        raise ValueError(f"Image source contains no usable cells: {source}")
    if width * height > VIKING_MAX_SOURCE_PIXELS:
        raise ValueError(
            f"Image source exceeds the trusted Mars adapter ceiling of {VIKING_MAX_SOURCE_PIXELS} pixels: {source}"
        )
    if abs(width / height - 2.0) > 0.02:
        raise ValueError(
            f"Expected an approximately 2:1 global cylindrical image, received {width} x {height}: {source}"
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
    def __init__(
        self,
        local_path: pathlib.Path | None,
        source_url: str,
        file_name: str,
        label: str,
    ) -> None:
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
        with urllib.request.urlopen(
            request,
            timeout=300,
            context=DOWNLOAD_SSL_CONTEXT,
        ) as response, path.open("wb") as output:  # noqa: S310
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        return path

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self.temp_dir is not None:
            self.temp_dir.cleanup()


if __name__ == "__main__":
    main()
