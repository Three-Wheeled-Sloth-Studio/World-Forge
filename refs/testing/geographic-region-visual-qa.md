# Geographic Region Preview: Visual QA

Updated: 2026-07-27

Branch: `dev`

Status: **Initial human review completed. Promising first pass, but odd edge cases remain. Not approved for activation.**

The preview is diagnostic only and does not replace `primaryWorld.regions`.

## Initial review result

The first reviewer found the broad result useful enough to continue, but observed visible edge cases that require direct rendered-result inspection by the next coding agent.

No exact screenshots, region IDs, or categorized failures were captured during that first pass. The next review should create reproducible evidence before changing weights or repair behavior.

## Setup

1. Pull the latest `dev` branch and restart the World Forge local server.
2. Generate a fresh world or open an existing `.wforge` world that contains topology layers and the world hex overlay.
3. Use **Map view**, not Globe view.
4. Open the right-side **World** tab.
5. In **Geographic regions**, choose **Show region preview**.
6. Allow the partition and repair pass to complete. Larger source topologies can take several seconds.

The preview is cached only while the World tab remains mounted. Switching away currently discards the in-memory preview.

## Required review worlds

Inspect at minimum:

- seed `1001001`,
- seed `9776542`,
- one fresh Archipelago preset,
- one fresh Pangea preset.

Record the exact generated seed for preset-based worlds.

## Visual passes

### Terrain pass

1. Set **Map filter** to **Terrain only**.
2. Leave hexes and plate boundaries off for the first read.
3. Inspect numbered boundaries at 100% zoom.
4. Inspect coastlines, mountain barriers, plains, islands, and narrow connections at 225% zoom.

### Natural View pass

1. Set **Map filter** to **Biomes**.
2. Set **Render mode** to **Natural View**.
3. Compare the same boundaries against the natural terrain presentation.
4. Toggle rivers to judge whether major corridors plausibly connect or divide regions.

### Selection pass

1. Select representative land, coast, ocean, and island-heavy regions.
2. Confirm the selected region receives a stronger tint.
3. Record:
   - region number,
   - type,
   - world-area share,
   - land and water shares,
   - neighbor count,
   - geography-supported boundary share,
   - strongest boundary rationale.
4. Confirm dragging to pan does not change the selected region.

### Longitude seam pass

1. Inspect the far left and far right edges.
2. Look for coherent regions continuing across the seam.
3. Confirm there is no full-height boundary caused only by the image edge.
4. Confirm labels and selection remain usable on both sides.

## Edge-case categories

Classify each defect before editing code:

- seed-placement problem,
- coast-crossing cost problem,
- ignored mountain or elevation break,
- river corridor over-connection or over-division,
- biome or climate transition overweighting,
- thin tendril or severe concavity,
- tiny-island or coastal-fragment repair merge,
- polar distortion,
- longitude-seam problem,
- region-count or size-budget problem,
- label or selection defect only.

Also record whether the defect exists in the raw candidate or appears only after sliver repair.

## Findings template

For each inspected world, record:

```text
Seed:
Preset:
Dev commit:
Topology resolution:
Map resolution:
Region count:
Sliver merges:
Disconnected regions:
Geographic boundaries: candidate % / grid %
Axis concentration: candidate % / grid %

Visual result:
- Terrain:
- Natural View:
- Seam:

Poor boundaries:
- Region numbers:
- Category:
- Raw candidate or repair-created:
- Selected-region rationale:
- Screenshot path:

Recommended action:
```

## Expected pass conditions

- Territories are recognizably geographic rather than `4 x 8` rectangles.
- Long arbitrary latitude and longitude cuts are materially reduced.
- Coastlines, terrain breaks, biome transitions, and climate transitions influence boundaries without producing bizarre local fragments.
- Regions remain connected unless an explicit archipelago rule explains the exception.
- Tiny fragments do not survive as useless slivers or merge into obviously absurd neighbors.
- The longitude seam is coherent.
- Labels remain readable.
- Selection matches the visible region.
- Axis concentration is generally below the grid baseline.
- Geography-supported boundary share generally meets or exceeds the grid baseline.

## Correction rule

Do not tune several weights at once.

For each repeatable defect:

1. identify whether partition or repair owns it,
2. make the narrowest correction,
3. add a focused regression case,
4. rerun the affected visual worlds,
5. run `npm run verify`,
6. run `npm run evaluate:regions`,
7. retain before-and-after evidence under `refs/testing/`.

## Activation boundary

This work remains evaluation and correction only.

Activation is a separate slice that must:

- replace the authoritative region contract,
- bump the generator version,
- update replay compatibility and output signatures,
- retain the preview overlay as the initial user-facing region view,
- pass full verification,
- and receive explicit browser approval before promotion beyond `dev`.
