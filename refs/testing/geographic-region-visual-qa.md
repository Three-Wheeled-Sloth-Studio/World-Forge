# Geographic Region Preview: Visual QA

Updated: 2026-07-27

Branch: `dev`

Status: Ready for browser inspection. The preview is diagnostic only and does not replace `primaryWorld.regions`.

## Setup

1. Pull the latest `dev` branch and restart the World Forge local server.
2. Generate a fresh world or open an existing `.wforge` world that contains topology layers and the world hex overlay.
3. Use **Map view**, not Globe view.
4. Open the right-side **World** tab.
5. In **Geographic regions**, choose **Show region preview**.
6. Allow the partition and repair pass to complete. Larger source topologies can take several seconds.
7. Use the **Raw / Repaired** control to identify whether a defect came from partitioning or repair.

The preview is cached while the World tab remains mounted. Switching away from the World tab currently discards that in-memory cache and may require rebuilding the preview when returning.

## Visual passes

### Terrain pass

1. Set **Map filter** to **Terrain only**.
2. Leave hexes and plate boundaries off for the first read.
3. Inspect the numbered region boundaries at 100% zoom.
4. Zoom to 225% and inspect coastlines, mountain barriers, broad plains, and island groups.

### Natural View pass

1. Set **Map filter** to **Biomes**.
2. Set **Render mode** to **Natural View**.
3. Compare the same region boundaries against the natural terrain presentation.
4. Toggle rivers on and off to judge whether major river corridors act as plausible connectors rather than arbitrary cuts.

### Selection pass

1. Click several large land regions, coastal regions, ocean regions, and island-heavy regions.
2. Confirm the selected region receives a stronger tint.
3. Confirm the World panel updates with:
   - raw or repaired stage,
   - parent surface domain,
   - region type,
   - world-area share,
   - land and water shares,
   - neighbor count,
   - geography-supported boundary share,
   - and strongest boundary rationale.
4. Dragging to pan should not change the selected region.

### Longitude seam pass

1. Pan to the far left and far right edges of the equirectangular map.
2. Look for regions that continue coherently across the seam.
3. Confirm there is no artificial full-height boundary solely because the map image ends.
4. Confirm labels and selection remain usable on both sides.

## What should pass

- The 500-mile level is treated as four overview sectors rather than geographic regions.
- First-level geographic regions are budgeted from the 60-mile overlay.
- Region footprints respect a `10 x 10` minimum, `20 x 20` preference, and `50 x 50` maximum as closely as geography permits.
- Boundaries form recognizable geographic territories rather than `4 x 8` rectangles.
- Long straight latitude and longitude cuts are materially reduced.
- Coastlines, terrain breaks, biome transitions, and climate transitions visibly influence boundaries.
- Regions remain connected.
- Tiny isolated regions are merged or classified as mixed or archipelago regions rather than surviving as useless slivers.
- A landmass or archipelago below the minimum display footprint remains identifiable in surface metadata but does not force a tiny first-level display region.
- Nearby small islands may share an archipelago identity or participate in the surrounding mixed ocean region until lower-scale decomposition.
- Territorial water is capped at 12 nautical miles or the nearest representable topology edge and does not cross the midpoint to competing land.
- Number labels remain readable without overwhelming Terrain or Natural View.
- Number labels sit inside the region they identify, including concave ocean regions.
- Clicking selects the region under the pointer.
- The preview metrics report zero disconnected regions and zero unresolved slivers for ordinary worlds.
- Axis concentration should generally be lower than the grid baseline.
- Geographic boundary support should generally meet or exceed the grid baseline.

## Findings to capture

For each inspected world, record:

- seed,
- preset,
- source topology resolution,
- region count,
- sliver merge count,
- geographic-boundary percentage versus grid,
- axis-concentration percentage versus grid,
- any visibly poor boundary and the region numbers involved,
- whether the boundary exists in **Raw**, **Repaired**, or both,
- the selected parent surface domain,
- any seam issue,
- and a screenshot in Terrain and Natural View.

Recommended first seeds:

- `1001001`
- `9776542`
- one Archipelago preset world
- one Pangea preset world

## Activation boundary

This browser pass is evidence for the activation decision. Passing it does not itself activate v2.

Activation remains a separate change that must:

- replace the authoritative region contract,
- bump the generator version,
- update replay compatibility and output signatures,
- and retain the preview overlay as the initial user-facing region view.
