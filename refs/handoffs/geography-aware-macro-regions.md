# Current Handoff: Geography-Aware Macro-Regions

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Portfolio epic: `Parchment-Worlds-Portfolio #14`

## PI status

Implementation is active directly on `dev`.

The first two increments now establish:

- the v2 geography-aware region contract,
- scale budgets derived from the existing hex hierarchy,
- a deterministic topology-graph partition candidate,
- an independent evaluation harness,
- direct comparison against the legacy latitude-longitude grid,
- deterministic undersized-region repair,
- seam-crossing coverage,
- and fixed-world automated exercise against actual generator output.

The candidate still does **not** replace the active `world-regions-v1` latitude-longitude scaffold. Production activation remains gated on retained harness evidence, boundary-weight calibration, visual review, full verification, and an explicit generator-version decision.

No generator-version change is included yet because generated project output remains unchanged.

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

`packages/generator-core/src/geographicRegionEvaluation.ts` now reconstructs the active `4 x 8` latitude-longitude grid as explicit topology membership and evaluates it through the same metrics as the candidate.

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

The harness now evaluates:

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

### Automated coverage

Focused tests now cover:

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
- and candidate, repair, and baseline evaluation on two actual generated worlds.

## Current boundary

The legacy `buildWorldRegions` latitude-longitude grid remains the generated world's authoritative region set.

That is deliberate. The candidate should not become authoritative merely because it compiles, repairs slivers, and produces better-shaped nouns. Before activation, it must beat the grid baseline across retained fixed-world evidence and survive browser visual review.

## Next implementation steps

Work directly on `dev`.

1. Run `npm run evaluate:regions` and retain compact JSON or CSV findings under `refs/testing/`.
2. Review target count, sliver merges, geographic-boundary share, and axis concentration across all four fixed worlds.
3. Tune boundary weights only where the evidence exposes a repeatable defect.
4. Add compact visual evidence of repaired candidate boundaries over Terrain and Natural View.
5. Confirm seam-spanning bounds and coverage in the visual path.
6. Decide whether watershed or surface-structure inputs materially improve boundaries before adding them.
7. Decide whether the candidate meets the activation boundary.
8. At activation:
   - replace the authoritative `PrimaryWorld.regions` scaffold,
   - bump the generator version,
   - mark older replay manifests incompatible,
   - update output-signature expectations,
   - and add the minimal map overlay and region inspector proof.

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
- and visual QA accepts the broad regions before promotion beyond `dev`.

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
