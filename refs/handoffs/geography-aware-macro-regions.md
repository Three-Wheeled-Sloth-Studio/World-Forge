# Current Handoff: Geography-Aware Macro-Regions

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Portfolio epic: `Parchment-Worlds-Portfolio #14`

## PI status

Implementation is active directly on `dev`.

The first three increments now establish:

- the v2 geography-aware region contract,
- scale budgets derived from the existing hex hierarchy,
- a deterministic topology-graph partition candidate,
- an independent evaluation harness,
- direct comparison against the legacy latitude-longitude grid,
- deterministic undersized-region repair,
- seam-crossing coverage,
- fixed-world automated exercise against actual generator output,
- and a browser-visible map overlay and selection inspector for visual QA.

The browser preview is ready for inspection. See:

`refs/testing/geographic-region-visual-qa.md`

The candidate still does **not** replace the active `world-regions-v1` latitude-longitude scaffold. Production activation remains gated on browser findings, retained fixed-world evidence, full verification, and an explicit generator-version decision.

No generator-version change is included yet because authoritative generated project output remains unchanged.

## Product outcome

Replace arbitrary latitude-longitude rectangles with stable broad geographic regions that:

- follow coastlines, terrain breaks, hydrology, climate, biome, and connectivity,
- fit the existing world overview and `world-60mi` display scales,
- expose deterministic identities and topology membership,
- reproduce under the same compatible world manifest,
- and serve as neutral territorial units for later resources, cultures, settlements, states, and campaign tools.

## Implemented foundation

### Shared contract

`packages/shared/src/geographicRegions.ts` defines:

- `GeographicWorldRegionSetV2`
- stable algorithm and region identities
- topology-cell membership using a compact `Uint16Array`
- land, water, mixed, and archipelago classifications
- scale budgets
- geographic boundary rationale
- region and region-set diagnostics
- deterministic signatures
- sliver-repair provenance
- baseline and candidate evaluation output
- latitude, longitude, and combined axis-boundary concentration metrics

The contract remains separate from the legacy `WorldRegionSet` while the candidate is being evaluated. Production activation will update the authoritative `PrimaryWorld.regions` contract and declare the compatibility change.

### Scale budget

`packages/generator-core/src/geographicRegionBudget.ts` derives the broad-region target from the actual `world-500mi` overview dimensions.

The first budget uses approximately 48 overview hexes per broad region, bounded to 4 through 64 regions. It records preferred, minimum, and maximum overview footprints plus normalized area-share limits. These values remain calibration inputs rather than universal geography commandments.

### Candidate decomposition

`packages/generator-core/src/geographicRegionPartition.ts` provides a deterministic multi-source graph partition over the authoritative cubed-sphere topology.

The candidate uses:

- land and water seed quotas derived from area share,
- deterministic farthest-point seed selection,
- topology traversal costs influenced by coast crossings,
- elevation discontinuities,
- biome and climate transitions,
- plate changes,
- lakes and river corridors,
- connected graph growth,
- stable IDs based on seed topology cells,
- wrap-aware geographic bounds,
- neighbor relationships,
- dominant biome, high-point, and river summaries,
- boundary-rationale tags,
- compactness, cohesion, fragmentation, and sliver diagnostics,
- and a deterministic region-set signature.

This remains a candidate algorithm behind the evaluation boundary.

### Legacy baseline and alignment metrics

`packages/generator-core/src/geographicRegionEvaluation.ts` reconstructs the active `4 x 8` latitude-longitude grid as explicit topology membership and evaluates it through the same metrics as the candidate.

The evaluation includes:

- complete and valid membership,
- connected-component count per region,
- cell and area distribution,
- sliver count,
- geography-supported boundary share,
- coastline boundary share,
- meridional boundary share,
- concentration of zonal boundaries into latitude bands,
- concentration of meridional boundaries into longitude bands,
- and combined axis-boundary concentration.

This makes “less grid-like” measurable rather than a screenshot argument conducted by vibes.

### Deterministic sliver repair

`packages/generator-core/src/geographicRegionRepair.ts` repairs undersized regions through deterministic adjacent-region merges.

The repair:

- processes the smallest sliver first,
- prefers a neighboring region with the same majority land/water class,
- prefers the weakest geographic boundary,
- then prefers the largest shared boundary and stable region ordering,
- preserves the retained region ID,
- recompacts topology membership,
- rebuilds all summaries and neighbors,
- records every merge and its rationale,
- and produces a new deterministic signature including the repair contract.

This intentionally handles tiny islands and similar unavoidable fragments as mixed or archipelago regions when no credible same-surface territorial unit exists.

### Fixed-world harness

Run:

```bash
npm run evaluate:regions
```

The harness evaluates:

- fixed seed `1001001`,
- fixed seed `9776542`,
- an archipelago-oriented seed,
- and a seam-oriented seed.

For each world it reports:

- raw candidate diagnostics,
- repaired candidate diagnostics and merge provenance,
- the legacy grid baseline,
- geography-boundary delta,
- axis-concentration delta,
- sliver delta,
- and connectivity delta.

### Browser preview

The World details panel now contains a **Geographic regions** preview control.

When enabled, the preview:

- builds and repairs the candidate from the loaded world's authoritative topology,
- overlays lightly tinted, numbered regions on the existing map canvas,
- remains visible over Terrain only and Natural View,
- displays candidate-versus-grid metrics,
- allows click selection without replacing map pan behavior,
- highlights the selected region,
- and reports its type, area, land/water balance, neighbor count, geography-supported boundary share, and strongest boundary rationale.

Relevant files:

- `apps/desktop/src/regions/geographicRegionPreview.ts`
- `apps/desktop/src/regions/GeographicRegionPreviewPanel.tsx`
- `apps/desktop/src/regions/geographicRegionPreview.css`
- `apps/desktop/src/panels/RightPanel.tsx`

The overlay is a React portal into the existing map frame. It is not serialized and does not modify the project.

### Automated coverage

Focused tests cover:

- Earth-scale budget derivation,
- explicit budget safety bounds,
- deterministic region signatures and membership,
- complete topology coverage,
- region connectivity,
- `world-60mi` coverage,
- coastline rationale,
- legacy grid membership and axis metrics,
- deterministic tiny-island sliver repair,
- wrap-aware regions across the longitude seam,
- candidate, repair, and baseline evaluation on actual generated worlds,
- and the browser preview adapter, raster, selection lookup, and summary output.

## Current boundary

The legacy `buildWorldRegions` latitude-longitude grid remains the generated world's authoritative region set.

That is deliberate. The candidate should not become authoritative merely because it compiles, repairs slivers, and now looks fancy on a canvas. It must pass the documented browser inspection and produce retained evidence first.

## Immediate QA

Use:

`refs/testing/geographic-region-visual-qa.md`

The initial browser pass should cover:

1. Terrain only view.
2. Biomes with Natural View.
3. Several selected land, coast, ocean, and archipelago regions.
4. The left and right longitude seam.
5. Seeds `1001001` and `9776542`.
6. One Archipelago preset and one Pangea preset.

Capture the visible region numbers involved in any poor boundary. That provides a precise target for weight tuning instead of “the bit near the green continent looked weird.”

## Next implementation steps

Work directly on `dev`.

1. Complete browser visual QA and retain findings under `refs/testing/`.
2. Run `npm run evaluate:regions` and retain compact JSON or CSV findings under `refs/testing/`.
3. Tune target count or boundary weights only where repeated evidence identifies a defect.
4. Decide whether watershed or surface-structure inputs materially improve the failing boundaries before adding them.
5. Decide whether the candidate meets the activation boundary.
6. At activation:
   - replace the authoritative `PrimaryWorld.regions` scaffold,
   - bump the generator version,
   - mark older replay manifests incompatible,
   - update output-signature expectations,
   - retain the overlay as the first user-facing region view,
   - and remove the diagnostic-only candidate warning.

## Acceptance boundary for activation

The geography-aware candidate may replace the legacy grid when:

- every topology cell belongs to exactly one region,
- land regions are connected unless an explicit island or archipelago rule explains otherwise,
- IDs, membership, neighbors, repair history, and signatures are deterministic,
- target size and sliver budgets pass across the fixed-world set,
- boundaries are primarily supported by explainable geography,
- latitude and longitude boundary concentration is materially lower than the grid baseline,
- seam-crossing regions behave correctly,
- fixed tests and full `npm run verify` pass,
- and browser QA accepts the broad regions before promotion beyond `dev`.

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
- The broader initial-tectonic orientation bias unless region evidence shows it materially corrupts decomposition
