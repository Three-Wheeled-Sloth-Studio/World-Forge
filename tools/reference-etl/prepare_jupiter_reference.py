#!/usr/bin/env python3
"""Prepare a compact source-backed Jupiter appearance bundle for World Forge."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
from typing import Final
from urllib.request import Request, urlopen

import numpy as np
from PIL import Image

SCHEMA: Final = "world-forge-reference-image-bundle-v1"
SOURCE_ID: Final = "PIA07782"
SOURCE_PAGE: Final = "https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/"
SOURCE_ASSET: Final = "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia07/pia07782/PIA07782.jpg"
CREDIT: Final = "NASA/JPL/Space Science Institute"
DEFAULT_WIDTH: Final = 768
DEFAULT_HEIGHT: Final = 384


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Optional local PIA07782 JPEG instead of downloading it.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".local/reference-data/jupiter-cassini"),
        help="Output bundle directory.",
    )
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH, help="Prepared RGB565 width.")
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT, help="Prepared RGB565 height.")
    parser.add_argument("--source-url", default=SOURCE_ASSET, help="Override the source JPEG URL.")
    return parser.parse_args()


def read_source_bytes(input_path: Path | None, source_url: str) -> bytes:
    if input_path is not None:
        return input_path.expanduser().resolve().read_bytes()
    request = Request(
        source_url,
        headers={
            "User-Agent": "World-Forge reference-data preparation",
            "Accept": "image/jpeg",
        },
    )
    with urlopen(request, timeout=120) as response:  # noqa: S310 - fixed or user-supplied source URL
        content_type = response.headers.get_content_type()
        if content_type != "image/jpeg":
            raise ValueError(f"Expected image/jpeg from Jupiter source, received {content_type}.")
        return response.read()


def prepare_rgb565(source_bytes: bytes, width: int, height: int) -> tuple[bytes, tuple[int, int]]:
    if width <= 0 or height <= 0:
        raise ValueError("Prepared Jupiter dimensions must be positive.")
    if abs(width / height - 2.0) > 0.02:
        raise ValueError("Prepared Jupiter dimensions must remain approximately 2:1.")

    with Image.open(io.BytesIO(source_bytes)) as source:
        source.load()
        source_resolution = source.size
        if abs(source.width / source.height - 2.0) > 0.03:
            raise ValueError(
                f"Expected approximately 2:1 cylindrical Jupiter imagery, received {source.width} x {source.height}."
            )
        resized = source.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
        pixels = np.asarray(resized, dtype=np.uint8)

    red = (pixels[:, :, 0].astype(np.uint16) >> 3) << 11
    green = (pixels[:, :, 1].astype(np.uint16) >> 2) << 5
    blue = pixels[:, :, 2].astype(np.uint16) >> 3
    packed = (red | green | blue).astype("<u2", copy=False)
    return packed.tobytes(order="C"), source_resolution


def sha256_label(data: bytes) -> str:
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def main() -> None:
    args = parse_args()
    output_directory = args.output.expanduser().resolve()
    source_bytes = read_source_bytes(args.input, args.source_url)
    prepared_bytes, source_resolution = prepare_rgb565(source_bytes, args.width, args.height)

    output_directory.mkdir(parents=True, exist_ok=True)
    source_file = f"{SOURCE_ID}.jpg"
    prepared_file = f"{SOURCE_ID}-{args.width}x{args.height}.rgb565"
    (output_directory / source_file).write_bytes(source_bytes)
    (output_directory / prepared_file).write_bytes(prepared_bytes)

    manifest = {
        "schema": SCHEMA,
        "bodyId": "jupiter",
        "sourceId": SOURCE_ID,
        "sourcePage": SOURCE_PAGE,
        "sourceAsset": args.source_url,
        "credit": CREDIT,
        "sourceFile": source_file,
        "sourceResolution": {"width": source_resolution[0], "height": source_resolution[1]},
        "sourceByteLength": len(source_bytes),
        "sourceSha256": sha256_label(source_bytes),
        "file": prepared_file,
        "mediaType": "application/vnd.world-forge.rgb565",
        "encoding": "rgb565-le",
        "projection": "equirectangular",
        "resolution": {"width": args.width, "height": args.height},
        "byteLength": len(prepared_bytes),
        "sha256": sha256_label(prepared_bytes),
        "transform": {
            "operation": "lanczos-resample-and-rgb565-quantize",
            "sourceId": SOURCE_ID,
        },
    }
    (output_directory / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Prepared Jupiter reference bundle at {output_directory}")
    print(f"Source: {source_resolution[0]} x {source_resolution[1]} ({len(source_bytes)} bytes)")
    print(f"Prepared: {args.width} x {args.height} RGB565 ({len(prepared_bytes)} bytes)")
    print(f"Digest: {manifest['sha256']}")


if __name__ == "__main__":
    main()
