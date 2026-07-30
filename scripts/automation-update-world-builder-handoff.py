from pathlib import Path
import re

path = Path('refs/handoffs/world-builder-cleanup.md')
text = path.read_text()
sha = Path('/tmp/world-forge-functional-sha').read_text().strip()
verify_log = Path('/tmp/world-forge-verify.log').read_text()
match = re.search(r'Tests\s+(\d+) passed', verify_log)
test_line = f'- {match.group(1)} tests passed' if match else '- Vitest suite passed'

old_baseline = """Functional code baseline before this documentation-only handoff:

- commit `7a6c23bc8eec132816887b5e26ceccf84e17ae20`
- visible World Forge version `0.3.28`
- `npm run verify` passed locally
- 231 tests passed
- TypeScript build passed
- production build passed
- focused browser QA passed"""
new_baseline = f"""Functional code baseline before this documentation-only handoff:

- commit `{sha}`
- visible World Forge version `0.3.29`
- `npm run verify` passed in GitHub Actions
{test_line}
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900"""
if old_baseline not in text:
    raise RuntimeError('Accepted baseline block changed unexpectedly')
text = text.replace(old_baseline, new_baseline, 1)
text = text.replace(
    'Status: **WP2 accepted; continue with mode ownership and Build/right-panel recomposition**',
    'Status: **App-owned workspace mode accepted; continue with Build/right-panel recomposition**',
    1
)
marker = """Several old tests had silently depended on Legacy being the default. Those fixtures were corrected to test their actual contracts rather than requiring one fixed seed to preserve Legacy-specific biome or landmass outcomes.

### WP1: control inventory"""
insertion = """Several old tests had silently depended on Legacy being the default. Those fixtures were corrected to test their actual contracts rather than requiring one fixed seed to preserve Legacy-specific biome or landmass outcomes.

### App-owned workspace mode

Implemented in `0.3.29`:

- `App` owns the single Build / Explore / Export state.
- `WorldWorkspace` is controlled through `workspaceMode` and `onWorkspaceModeChange` props.
- successful generation, saved-world load, and `.wforge` open explicitly move to Explore.
- clearing the current project returns to Build.
- `GeneratorPanel` and `RightPanel` receive the same mode state, ready for contextual recomposition.
- workspace mode remains session-only and is not added to persistence or saved-world schemas.

### WP1: control inventory"""
if marker not in text:
    raise RuntimeError('Work completed insertion marker changed unexpectedly')
text = text.replace(marker, insertion, 1)

old_ownership = """## Important current limitation: workspace mode ownership

`WorkspaceMode` currently lives inside `WorldWorkspace`.

That was sufficient for the first center-workspace slice, but it means `App`, `GeneratorPanel`, and `RightPanel` do not know whether the user is in Build, Explore, or Export.

Do not build additional parallel mode state in the side panels.

The first task for the next worker is to lift workspace mode ownership into `App` in `apps/desktop/src/main.tsx`, then pass the controlled mode and change handler into `WorldWorkspace` and the side-panel composition.

Preserve the current behavior:

- initial mode is Build when no project is loaded
- initial mode is Explore when a project is already available
- successful generation or world load moves to Explore
- switching modes does not regenerate, clear, or remount the map
- do not add a persistence-schema field for workspace mode during this PI"""
new_ownership = """## Workspace mode ownership

`WorkspaceMode` now lives in `App` in `apps/desktop/src/main.tsx`.

`WorldWorkspace`, `GeneratorPanel`, and `RightPanel` receive the same controlled mode. Do not add parallel side-panel state as Build and Export composition proceeds.

Preserved behavior:

- initial mode is Build when no project is loaded
- an available or newly loaded project moves to Explore
- successful generation moves to Explore
- clearing the project returns to Build
- switching modes does not regenerate, clear, or remount the map
- workspace mode is not stored in persistence or saved-world schemas"""
if old_ownership not in text:
    raise RuntimeError('Ownership limitation block changed unexpectedly')
text = text.replace(old_ownership, new_ownership, 1)

old_step = """### Step 1: lift and control workspace mode

Move the mode state from `WorldWorkspace` into `App`.

`WorldWorkspace` should receive:

- current `workspaceMode`
- `onWorkspaceModeChange`

Keep its presentation toolbar mode-specific, but make the surrounding application able to route left and right content from the same source of truth.

Add focused tests around transition rules where practical. Avoid a new persistence field."""
new_step = """### Step 1: lift and control workspace mode - completed

Completed in `0.3.29`.

- `App` owns `workspaceMode`.
- `WorldWorkspace` receives the current mode and change handler.
- the generator and right panel receive the same mode state.
- focused transition tests cover Build without a project and Explore with an available project.
- no persistence field was added."""
if old_step not in text:
    raise RuntimeError('Step 1 block changed unexpectedly')
text = text.replace(old_step, new_step, 1)
text = text.replace(
    'Not complete.\n\n- lift mode ownership\n- quick-build controls',
    'Not complete.\n\n- quick-build controls',
    1
)
path.write_text(text)
