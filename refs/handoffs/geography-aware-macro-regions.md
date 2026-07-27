# Current Handoff: Geography-Aware Macro-Regions

Updated: 2026-07-27

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Portfolio epic: `Parchment-Worlds-Portfolio #14`

## PI status

Implementation has started directly on `dev`.

The first increment establishes the contract, scale budget, deterministic candidate partition, and evaluation harness. It does **not** replace the active `world-regions-v1` latitude-longitude scaffold yet. Production activation remains gated on fixed-world evidence, budget tuning, and visual review.

No generator-version change is included in this increment because generated project output is unchanged until the new region set becomes authoritative.

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
- independent evaluation output

The contract is intentionally separate from the legacy `WorldRegionSet` while the candidate is being evaluated. Production activation will update the authoritative `PrimaryWorld.regions` contract and declare the compatibility change.

### Scale budget

`packages/generator-core/src/geographicRegionBudget.ts` derives the broad-region target from the actual `world-500mi` overview dimensions.

The first budget uses approximately 48 overview hexes per broad region, bounded to 4 through 64 regions. It records preferred, minimum, and maximum overview footprints plus normalized area-share limits. These values are starting calibration points, not immutable geology handed down on stone tablets.

### Candidate decomposition

`packages/generator-core/src/geographicRegionPartition.ts` provides a deterministic multi-source graph partition over the authoritative cubed-sphere topology.

The candidate currently uses:

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

This is a candidate algorithm behind the evaluation boundary. It is not yet the active production decomposition.

### Evaluation harness

`packages/generator-core/src/geographicRegionEvaluation.ts` independently checks:

- complete and valid membership,
- connected-component count per region,
- cell and area distribution,
- sliver count,
- geography-supported boundary share,
- coastline boundary share,
- meridional boundary share,
- and deterministic evaluation signatures.

Run:

```bash
npm run evaluate:regions
```

The initial script evaluates two established fixed seeds plus an archipelago-oriented case at compact investigative resolution and emits machine-readable JSON.

### Automated coverage

Focused tests cover:

- Earth-scale budget derivation,
- explicit budget safety bounds,
- deterministic region signatures and membership,
- complete topology coverage,
- region connectivity,
- world-60mi coverage,
- coastline rationale,
- and seed-scoped identity changes.

## Current boundary

The legacy `buildWorldRegions` latitude-longitude grid remains the generated world's authoritative region set.

That is deliberate. The candidate should not become authoritative merely because it compiles and produces blobs with IDs. Before activation, it must beat the grid baseline across several fixed worlds and survive visual review.

## Next implementation steps

Work directly on `dev`.

1. Run the fixed-world harness and retain compact JSON/CSV findings under `refs/testing/`.
2. Add the legacy `lat-lon-grid` output to the same evaluation report as a baseline.
3. Calibrate target count, sliver limits, and boundary weights across:
   - connected continents,
   - archipelagos,
   - mountain barriers,
   - major river systems,
   - broad plains,
   - and strong biome transitions.
4. Add deterministic repair for undersized slivers where the evaluation proves it is needed.
5. Add at least one case that crosses the longitude seam.
6. Produce compact visual evidence of candidate boundaries over Terrain and Natural View.
7. Decide whether geography costs need watershed or surface-structure inputs before activation.
8. Replace the active `world-regions-v1` scaffold only after the candidate passes.
9. At activation:
   - update the authoritative shared `PrimaryWorld.regions` contract,
   - bump the generator version,
   - mark older replay manifests incompatible,
   - update output-signature expectations,
   - and add the minimal map overlay and region inspector proof.

## Acceptance boundary for activation

The geography-aware candidate may replace the legacy grid when:

- every topology cell belongs to exactly one region,
- land regions are connected unless an explicit island or archipelago rule explains otherwise,
- IDs, membership, neighbors, and signatures are deterministic,
- target size and sliver budgets pass across the fixed-world set,
- boundaries are primarily supported by explainable geography,
- arbitrary latitude and longitude alignment is materially lower than the grid baseline,
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
