# Current Handoff: Geography-Aware Macro-Regions

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Portfolio epic: `Parchment-Worlds-Portfolio #14`

## Current status

Implementation and visual tooling are active directly on `dev`.

The first human browser review found the candidate to be a **credible first pass**, but also found **odd geographic edge cases**. The candidate is therefore **not approved for activation**.

The next owner should inspect rendered results directly, record the failing region numbers and conditions, identify the responsible algorithm or repair behavior, and make bounded corrections supported by repeatable evidence.

Do not activate the v2 region set merely because the broad shapes look better than the legacy grid. The legacy `world-regions-v1` latitude-longitude grid remains authoritative until the candidate passes visual QA, retained fixed-world evaluation, and full repository verification.

No generator-version or replay-compatibility change has been made because authoritative generated project output is still unchanged.

## Product outcome

Replace arbitrary latitude-longitude rectangles with stable broad geographic regions that:

- follow coastlines, terrain breaks, hydrology, climate, biome, and connectivity,
- fit the existing world overview and `world-60mi` display scales,
- expose deterministic identities and topology membership,
- reproduce under the same compatible world manifest,
- and serve as neutral territorial units for later resources, cultures, settlements, states, and campaign tools.

## What is implemented

### Geography-aware contract

`packages/shared/src/geographicRegions.ts`

Defines:

- `GeographicWorldRegionSetV2`
- stable algorithm-scoped region IDs
- compact `Uint16Array` topology membership
- land, water, mixed, and archipelago classification
- scale budgets
- neighbor relationships
- boundary-rationale tags
- per-region and region-set diagnostics
- deterministic region and evaluation signatures
- sliver-repair provenance
- legacy-baseline comparison metrics

The contract remains separate from the authoritative legacy `WorldRegionSet` during evaluation.

### Scale budget

`packages/generator-core/src/geographicRegionBudget.ts`

The current starting budget derives region count from the `world-500mi` overview level, targeting roughly 48 overview hexes per broad region and clamping the result to 4 through 64 regions.

These numbers are calibration inputs, not established acceptance values.

### Candidate partition

`packages/generator-core/src/geographicRegionPartition.ts`

The candidate uses:

- land and water seed quotas derived from area share,
- deterministic farthest-point seed selection,
- multi-source graph growth over cubed-sphere topology,
- strong cost for coast crossing,
- elevation, biome, climate, plate, lake, and river influences,
- stable seed-based IDs,
- wrap-aware bounds,
- connected membership,
- region summaries and neighbor relationships,
- boundary-rationale tags,
- and deterministic signatures.

The algorithm is locally cost-driven. Visually odd edge cases may come from seed placement, traversal weights, or a later sliver merge. Determine which one before changing constants.

### Sliver repair

`packages/generator-core/src/geographicRegionRepair.ts`

The repair:

- processes the smallest undersized region first,
- prefers an adjacent region with the same majority land/water class,
- then prefers the weakest geography-supported boundary,
- then the largest shared boundary and stable region ordering,
- preserves the retained region ID,
- rebuilds membership, summaries, and neighbors,
- records every merge,
- and creates a repair-aware deterministic signature.

Potential edge cases include tiny islands or coastal fragments being absorbed into a visually awkward neighboring region, especially when no credible same-surface neighbor exists.

### Evaluation and legacy baseline

`packages/generator-core/src/geographicRegionEvaluation.ts`

The same harness evaluates both the candidate and the active `4 x 8` grid for:

- complete membership,
- connected components,
- size distribution and slivers,
- geography-supported boundary share,
- coastline boundary share,
- meridional boundary share,
- latitude-boundary concentration,
- longitude-boundary concentration,
- and combined axis-boundary concentration.

Run:

```bash
npm run evaluate:regions
```

The script evaluates:

- seed `1001001`,
- seed `9776542`,
- an archipelago-oriented seed,
- and a seam-oriented seed.

### Browser preview

The right-side **World** panel contains **Geographic regions → Show region preview**.

Relevant files:

- `apps/desktop/src/regions/geographicRegionPreview.ts`
- `apps/desktop/src/regions/GeographicRegionPreviewPanel.tsx`
- `apps/desktop/src/regions/geographicRegionPreview.css`
- `apps/desktop/src/panels/RightPanel.tsx`

The preview:

- builds and repairs the candidate from the loaded world,
- overlays lightly tinted numbered regions on the map,
- works over Terrain only and Natural View,
- shows candidate-versus-grid metrics,
- supports click selection and highlight,
- reports type, area, land/water balance, neighbors, boundary support, and strongest boundary rationale,
- is held only in UI memory,
- and does not modify or serialize the project.

The preview cache is lost when the World panel unmounts. Large topologies may take several seconds to rebuild.

## First visual-review verdict

The first human review concluded:

- the overall direction is useful,
- the result is not a bad first pass,
- odd edge cases are visibly present,
- and the candidate needs direct rendered-result inspection before further tuning or activation.

No specific region IDs or screenshots were recorded in that pass. The next owner should create that evidence.

Use:

`refs/testing/geographic-region-visual-qa.md`

## Next owner mission

Work directly on `dev`.

### 1. Reproduce and document edge cases

Inspect at minimum:

- seed `1001001`,
- seed `9776542`,
- one fresh Archipelago preset,
- one fresh Pangea preset,
- Terrain only,
- Biomes with Natural View,
- 100% and 225% zoom,
- the left and right longitude seam,
- representative land, coast, ocean, and island-heavy regions.

For every poor boundary, record:

- seed and preset,
- topology and map resolution,
- screenshot,
- visible region numbers,
- selected-region diagnostics,
- whether the defect exists before or only after sliver repair,
- and whether it repeats under exact regeneration.

### 2. Categorize before correcting

Classify each issue as one or more of:

- poor seed placement,
- excessive or insufficient coast-crossing cost,
- mountain or elevation break ignored,
- river corridor incorrectly connecting or dividing territory,
- biome or climate boundary overweighted,
- thin tendril or concavity,
- tiny-island or coastal-fragment repair merge,
- polar distortion,
- longitude-seam handling,
- region-count or size-budget problem,
- label or selection defect rather than partition defect.

### 3. Trace the responsible stage

Compare:

- raw candidate membership,
- repaired membership,
- merge provenance,
- region boundary rationales,
- candidate metrics,
- and legacy baseline metrics.

Do not tune all weights together. Change the narrowest confirmed owner and add a regression case for it.

### 4. Retain evidence

Store compact findings under `refs/testing/`, including:

- the fixed-world JSON or CSV evaluation output,
- a concise visual findings document,
- screenshots or paths to screenshots where repository policy permits,
- before-and-after metrics,
- and the exact dev commit tested.

### 5. Verify

Run focused tests during iteration and complete:

```bash
npm run verify
npm run evaluate:regions
```

Before declaring the candidate activation-ready, confirm:

- complete membership,
- zero unexplained disconnected regions,
- acceptable unresolved sliver count,
- deterministic IDs, membership, neighbors, repairs, and signatures,
- materially lower arbitrary axis concentration than the grid,
- credible geography-supported boundaries,
- coherent seam behavior,
- and acceptable rendered results across all review worlds.

## Activation remains a separate slice

Do not activate v2 as part of exploratory visual correction unless the evidence and acceptance checks are complete.

Activation must explicitly:

- replace the authoritative `PrimaryWorld.regions` contract,
- bump the generator version,
- update replay compatibility,
- update authoritative output signatures,
- preserve the overlay as the initial user-facing region view,
- remove or revise the diagnostic-only candidate warning,
- and pass browser QA before promotion beyond `dev`.

## Explicitly deferred

- Full macro-region, region, subregion, and local hierarchy
- Regional-detail generation
- User boundary editing
- Natural-language naming
- Political ownership
- Cultures and factions
- Settlements and roads
- Resources
- Canonical notable features
- Save and synchronization changes
- Broader tectonic orientation work unless region evidence proves it materially corrupts decomposition
