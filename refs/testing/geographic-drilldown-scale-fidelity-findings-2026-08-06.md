# Geographic drilldown scale-fidelity findings

Updated: 2026-08-06

Tracking: World Forge issue `#10`

Observed runtime: visible version `0.3.61`

Corrective implementation target: visible version `0.3.62`

Canonical-path correction commit: `5093b8d7525528e1db43acf978cbebec9e3c2f3c`

## Accepted behavior from this pass

The main-workspace drilldown path remained usable from world through detail. Hierarchy navigation, Back behavior, child selection, parent/child boundaries, hex anchoring, and the contextual mini-map all behaved well enough to continue the visual acceptance pass.

This is not full issue `#10` acceptance. Two scale-dependent presentation failures remain.

## Terrain fidelity ceiling

Around subregion scale and below, the natural presentation visibly enlarges inherited terrain information beyond its useful source resolution. The result becomes soft or blocky as the hierarchy narrows.

This is not primarily a shell, hierarchy, or CSS defect. Local/detail terrain acceptance requires deterministic scale-specific surface refinement, or a higher-resolution inherited-fact-constrained source, while preserving:

- coastline and water identity;
- broad relief and drainage constraints;
- climate and biome;
- major ridges and rivers;
- stable world anchoring and replay behavior.

Sharpening the enlarged raster would make the artifact crisper, not add missing geographic information.

## River overgrowth diagnosis

Local and detail tile windows rendered dense repeated comb, spoke, and chevron patterns.

The original tile classifier copied one coarse topology-cell `riverStrength` value into many finer geographic hexes. Every qualifying tile then independently chose one or two neighboring directions. Repeated source values and deterministic direction tie-breaking manufactured a regular network that did not represent the generated world's authoritative river paths.

The two apparent line weights were the existing minor and navigable presentation widths. Both currently run center-to-edge, so reciprocal tile connections form center-to-center lines. That makes the density defect look as though every tributary is a navigable channel.

The centerline convention contributes to the artificial appearance, but it is not the primary cause of the spam. Replacing every thin connection with its crossed hex edge would create disconnected blue fence posts, not coherent minor rivers.

## v0.3.62 correction

The bounded correction is:

- project the generated world's canonical river paths into the active world-anchored tile grid;
- use the scalar river field only for inherited strength/classification, not to invent network topology;
- preserve longitude-seam routing and deterministic overlapping-window facts;
- allow no rendered tile-river network when canonical river paths are absent, regardless of scalar field strength;
- retain the current centerline presentation temporarily so this increment does not pretend to provide coherent edge-following tributaries.

## Required follow-ups

A later local-hydrology refinement must provide:

- deterministic tributary generation constrained by inherited drainage;
- river order and discharge;
- continuous edge-following paths for minor rivers where the game-map convention requires them;
- explicit, physically defensible navigability rather than a line-width threshold;
- scale-aware density and cartographic generalization;
- overlap, seam, and reopen stability.

Terrain refinement remains a separate increment. The river correction must not be represented as solving local/detail terrain resolution.

## Acceptance impact

- workspace and hierarchy behavior: provisionally passed for the tested path;
- local/detail terrain fidelity: failed pending scale-specific refinement;
- original local/detail river presentation: failed;
- canonical-path river correction: requires exact-head browser verification;
- issue `#10`: remains open.
