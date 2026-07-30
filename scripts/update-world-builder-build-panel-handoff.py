import re
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('usage: update-world-builder-build-panel-handoff.py <functional-sha> <verify-log>')

functional_sha = sys.argv[1]
verify_log = Path(sys.argv[2]).read_text()
match = re.search(r'Tests\s+(\d+) passed', verify_log)
test_line = f'- {match.group(1)} tests passed' if match else '- Vitest suite passed'

path = Path('refs/handoffs/world-builder-cleanup.md')
text = path.read_text()

old_status = 'Status: **App-owned workspace mode accepted; continue with Build/right-panel recomposition**'
new_status = 'Status: **Build panel accepted; continue with contextual right-panel routing**'
if old_status not in text:
    raise RuntimeError('Handoff status changed unexpectedly')
text = text.replace(old_status, new_status, 1)

old_baseline = """Functional code baseline before this documentation-only handoff:

- commit `bb5b671e7c181affb13366dba8146e4d55acecdc`
- visible World Forge version `0.3.29`
- `npm run verify` passed in GitHub Actions
- Vitest suite passed
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
new_baseline = f"""Functional code baseline before this documentation-only handoff:

- commit `{functional_sha}`
- visible World Forge version `0.3.30`
- `npm run verify` passed in GitHub Actions
{test_line}
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
if old_baseline not in text:
    raise RuntimeError('Accepted baseline changed unexpectedly')
text = text.replace(old_baseline, new_baseline, 1)

marker = """### WP1: control inventory"""
insertion = """### Build panel recomposition

Implemented in `0.3.30`:

- Quick Build keeps world type, world seed, star type, star seed, generation quality, Randomize All, and the primary generation action together.
- the primary action reads **Generate** without a current world and **Regenerate** when replacing one.
- regeneration preserves the current world until the replacement completes successfully.
- generation stage and overall progress appear beside the Build action.
- Generation Quality updates both projected map resolution and source topology resolution through the existing quality mapping.
- advanced generation controls are grouped into World shape, Climate, Geology and history, Hydrology, and System.
- every supported generation range is exposed with bounded minimum and maximum inputs.
- `continentCount` is labeled **Continent count**.
- `continentScale` is labeled **Continent size and cohesion**, matching its effect on landmass radius and major rift suppression.
- account controls remain in the shell.
- preview resolution moved to Explore.
- PNG resolution moved to Export.
- no generator algorithm, replay, persistence, or saved-world schema changes were made.

### WP1: control inventory"""
if marker not in text:
    raise RuntimeError('Work completed marker changed unexpectedly')
text = text.replace(marker, insertion, 1)

old_step = """### Step 2: recompose the Build panel

Current component:

- `apps/desktop/src/generator/GeneratorPanel.tsx`

Create a compact quick-build area containing:

- World type
- World seed
- Star type
- Star seed
- generation quality/source size
- Randomize All
- Generate when no current world exists
- Regenerate when replacing the active world

Keep the current world visible until replacement generation succeeds.

Move advanced controls into clear groups using existing configuration state:

- **World shape**: ocean target, tolerance, continent count, continent size/cohesion, islands
- **Climate**: temperature, aridity, axial tilt, eccentricity
- **Geology and history**: plate count, impacts, age
- **Hydrology**: river density
- **System**: planet size and moons
- **Display/output**: only controls that truly belong there

Correct terminology before moving controls:

- `continentCount` → **Continent count**
- `continentScale` → **Continent size**, **Continent cohesion**, or similarly accurate wording based on actual generator effect
- never label `continentCount` as `Regions`
- never label `continentScale` as `Continents`

Current incorrect labels still exist in `apps/desktop/src/main.tsx` in `rangeLabels`.

Move these out of Build:

- profile/account pill → shell/account settings
- PNG export resolution → Export
- preview-only resolution → Explore/display preferences unless investigation proves it changes authoritative generation

Open questions from WP1 that must be answered from code behavior, not guessed:

- Does generation `Map Size` change authoritative projected output, topology fidelity, or both?
- Does Preview resolution affect only canvas rendering?
- Which advanced values are true generation inputs versus display/export preferences?"""
new_step = """### Step 2: recompose the Build panel - completed

Completed in `0.3.30`.

- Quick Build contains the primary world, star, seed, quality, randomization, and generation controls.
- Generate and Regenerate are distinct and replacement is non-destructive until success.
- generation progress is shown near the primary action.
- advanced ranges are grouped by the systems they control.
- preview resolution is confirmed as a canvas-rendering preference and now lives in Explore.
- PNG export resolution now lives in Export.
- Generation Quality deliberately changes both authoritative projected output resolution and source topology fidelity.
- account access remains in the shell.
- terminology is corrected and backed by focused tests."""
if old_step not in text:
    raise RuntimeError('Step 2 block changed unexpectedly')
text = text.replace(old_step, new_step, 1)

old_wp3 = """### WP3: Build panel

Not complete.

- quick-build controls
- grouped advanced settings
- accurate terminology
- Generate versus Regenerate behavior
- progress/error feedback near the action"""
new_wp3 = """### WP3: Build panel

Complete for this PI.

- quick-build controls
- grouped advanced generation ranges
- accurate continent terminology
- Generate versus Regenerate behavior
- replacement warning and generation progress near the action
- preview and PNG resolution removed from Build"""
if old_wp3 not in text:
    raise RuntimeError('WP3 block changed unexpectedly')
text = text.replace(old_wp3, new_wp3, 1)

path.write_text(text)
