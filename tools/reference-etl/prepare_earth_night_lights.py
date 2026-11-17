#!/usr/bin/env python3
"""Prepare a reusable, source-backed Earth night-lights presentation layer.

Derived from the NASA Earth Observatory Black Marble 2016 *grayscale* equirectangular
global composite, not from generated population/climate guesses.
Optional reference ETL: never part of ordinary world generation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import urllib.request

from PIL import Image, ImageOps

SOURCE_URL = ("https://assets.science.nasa.gov/content/dam/science/esd/eo/images/"
              "imagerecords/144000/144897/BlackMarble_2016_01deg_gray.jpg")
SOURCE_PAGE = "https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/"
BUNDLE_SCHEMA = "world-forge-earth-night-lights-reference-v1"
SIZE = (4096, 2048)


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def prepare(source: Path, output: Path, size: tuple[int, int] = SIZE) -> dict:
    source = source.expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Night-lights source missing: {source}")
    with Image.open(source) as image:
        image.load()
        if image.width != image.height * 2 or image.width < 720:
            raise ValueError("Expected a complete 2:1 equirectangular Earth image, at least 720px wide")
        original_size = [image.width, image.height]
        # The NASA grayscale map already encodes spatial radiance.
        # Scale + normalize its presentation luminance without inventing cities.
        grayscale = ImageOps.grayscale(image)
        grayscale = grayscale.resize(size, Image.Resampling.LANCZOS)
        luminance = grayscale.point(lambda n: min(255, max(0, round((n / 255.0) ** 0.8 * 255))))
    output.mkdir(parents=True, exist_ok=True)
    destination = output / "earth-night-lights-4096.png"
    with tempfile.NamedTemporaryFile(prefix=".night-lights-", suffix=".png",
                                     dir=output, delete=False) as temp:
        temp_path = Path(temp.name)
    try:
        luminance.save(temp_path, format="PNG")
        temp_path.replace(destination)
    finally:
        temp_path.unlink(missing_ok=True)
    report = {
        "schema": BUNDLE_SCHEMA,
        "bodyId": "earth",
        "role": "presentation-night-lights",
        "authority": "derived",
        "sourceId": "NASA-Black-Marble-2016",
        "sourcePage": SOURCE_PAGE,
        "sourceAsset": SOURCE_URL,
        "credit": "NASA Earth Observatory / NOAA Suomi NPP VIIRS Black Marble 2016",
        "sourceFile": str(source),
        "sourceResolution": original_size,
        "sourceSha256": digest(source),
        "file": destination.name,
        "mediaType": "image/png",
        "projection": "equirectangular",
        "resolution": {"width": size[0], "height": size[1]},
        "sha256": digest(destination),
        "transform": {"grayscale": True, "luminanceGamma": 0.8, "resample": "Lanczos"},
        "notes": "Static observed composite, not realtime city illumination; shader must restrict glow to the unlit hemisphere.",
    }
    (output / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="Existing NASA grayscale global JPEG")
    parser.add_argument("--download", action="store_true",
                        help="Explicitly download NASA's 2016 grayscale 3600x1800 JPEG")
    parser.add_argument("--output", type=Path, default=Path(".local/reference-data/earth-night-lights"))
    args = parser.parse_args()
    if bool(args.source) == bool(args.download):
        parser.error("Choose exactly one of --source or --download")
    source = args.source
    if args.download:
        source = args.output / "BlackMarble_2016_01deg_gray.jpg"
        source.parent.mkdir(parents=True, exist_ok=True)
        if not source.exists():
            with urllib.request.urlopen(SOURCE_URL, timeout=90) as response:
                with tempfile.NamedTemporaryFile(dir=source.parent, delete=False) as output:
                    temp_path = Path(output.name)
                    while True:
                        block = response.read(1024 * 1024)
                        if not block:
                            break
                        output.write(block)
            try:
                temp_path.replace(source)
            finally:
                temp_path.unlink(missing_ok=True)
    result = prepare(source, args.output)
    print(f"PASS: Earth night lights: {args.output / result['file']}")
    print(f"PASS: NASA source SHA256: {result['sourceSha256']}")
    print("NOTE: Static observed reference, not dynamic population or a live cloud layer.")


if __name__ == "__main__":
    main()
