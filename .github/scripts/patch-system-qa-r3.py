from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
old = """const bounds = await surface.boundingBox();
if (!bounds) throw new Error('System render surface has no bounding box.');
await page.mouse.move(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.58);
"""
new = """const canvas = surface.locator('canvas');
const bounds = await canvas.boundingBox();
if (!bounds) throw new Error('System render canvas has no bounding box.');
// Use the open center of the canvas, away from the left options, right inspector,
// and bottom clock panel, so the actual Three.js surface receives the drag.
await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.35);
"""
count = text.count(old)
if count != 1:
    raise RuntimeError(f'Expected one System QA drag block, found {count}')
path.write_text(text.replace(old, new), encoding='utf-8')
print('Moved System QA drag to the unobstructed canvas center.')
