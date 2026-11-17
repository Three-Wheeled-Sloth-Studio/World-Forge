#!/usr/bin/env python3
"""Standard-library regression runner for the Earth Black Marble bundle."""
from pathlib import Path
import importlib.util
import json
import tempfile
import unittest
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "reference-etl" / "prepare_earth_night_lights.py"
spec = importlib.util.spec_from_file_location("night_lights", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class NightLightTests(unittest.TestCase):
    def test_derived_layer_records_source_and_does_not_invent_lights(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source.png"
            image = Image.new("L", (720, 360), 0)
            image.putpixel((100, 120), 180)
            image.save(source)
            result = module.prepare(source, root / "out", (720, 360))
            self.assertEqual(result["role"], "presentation-night-lights")
            self.assertEqual(result["sourceResolution"], [720, 360])
            self.assertEqual(result["sourceSha256"], module.digest(source))
            self.assertEqual(json.loads((root / "out" / "manifest.json").read_text())["schema"], module.BUNDLE_SCHEMA)
            with Image.open(root / "out" / result["file"]) as prepared:
                self.assertEqual(prepared.getpixel((200, 200)), 0)
                self.assertGreater(prepared.getpixel((100, 120)), 0)

    def test_wrong_aspect_ratio_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "bad.png"
            Image.new("RGB", (720, 720)).save(source)
            with self.assertRaises(ValueError):
                module.prepare(source, Path(temporary) / "out")


if __name__ == "__main__":
    unittest.main()
