# World Forge v0.3.9 Vertical Striping Investigation Handoff

## Ready-to-use takeover prompt

Continue the structural vertical striping investigation in:

- Repository: `https://github.com/Three-Wheeled-Sloth-Studio/World-Forge`
- Branch: `dev`
- Current build: `0.3.9`
- Tracking issue: `#2 [High Priority Investigation] Root-cause structural vertical striping`

Do not work on `main`.

Read this handoff first, then:

1. `refs/testing/vertical-striping-root-cause-first-pass.md`
2. World Forge issue `#2`, including all comments
3. `packages/generator-core/src/graph/nodes/plate-construction-node.ts`
4. `packages/generator-core/src/deepTimePipeline.ts`
5. `packages/generator-core/src/fragmentSphericalTransform.ts`
6. `packages/generator-core/src/plateMotionPipeline.ts`
7. Cubed-sphere topology and neighbor implementations under `packages/shared/`
8. Projection assembly and topology-to-raster mapping code

The user has visually tested v0.3.9. The version pill updated, but **plate behavior and the visible long north-south striping did not change**.

Before changing another algorithm, prove that the embedded World Forge runtime actually contains the v0.3.9 generation commits. The visible version pill is rendered by the separate Parchment Worlds shell and is not sufficient proof that the embedded World Forge bundle was rebuilt or deployed.

The immediate goal is evidence-based ownership, not another speculative correction.

---

## Current user finding

The latest test result is unambiguous:

- The header displays `v0.3.9`.
- The generated plate pattern appears unchanged.
- The long, narrow, primarily north-south plate ribbons remain.
- The relief continues to follow those plate ribbons.

Treat both recent corrections as **insufficient to solve the visible defect**.

Do not describe either correction as successful based only on tests, diagnostics, or build completion.

---

## Critical deployment caveat

The `v0.3.9` pill in the embedded experience was added to the **Parchment Worlds header**, with its own build constant.

That means the pill proves that the Parchment Worlds shell changed. It does not independently prove that:

- the World Forge `dev` branch was checked out by the deployment job,
- commit `d65fb8f91d5ea986b51700328dd38c9cc0e666a6` was included in the deployed bundle,
- the deployed JavaScript was replaced rather than served from cache,
- the iframe points at the expected dev deployment,
- or the currently running generator path calls the modified functions.

The Parchment Worlds deployment workflow checks out World Forge using:

```yaml
repository: Three-Wheeled-Sloth-Studio/World-Forge
ref: ${{ github.ref_name }}
```

This should select World Forge `dev` when the Parchment Worlds `dev` workflow is dispatched, but that assumption must be proven from the actual run and deployed asset.

### First required checkpoint

Before further generation changes, establish runtime provenance with at least two of the following:

1. Add or inspect a World Forge-owned runtime build identifier generated from `APP_VERSION` plus the source commit SHA.
2. Confirm the deployed JavaScript bundle contains a distinctive string from the rigid spherical transform implementation.
3. Confirm the deploy workflow run checked out the expected World Forge commit.
4. Add a temporary development diagnostic that reports the active plate assignment mode and fragment transform mode from inside the iframe.
5. Use cache-busting or asset-hash comparison to prove the browser loaded the new bundle.

Do not use the Parchment shell pill as provenance evidence.

---

## Work already completed

### 1. Original root-cause pass

The first investigation found that the old `plates.construct` assignment used candidate-specific sine-hash noise that pulverized nominal plates into massive numbers of tiny fragments.

Reference evidence for seed `1001001`, star seed `2850873`, topology resolution `512`, output `2048 x 1024` included:

- intended plate count: `23`
- initial moving fragment count: `132,854`
- final fragment count: `116,054`
- mean final fragment size: `9.11` topology cells
- continental fragment boundary share: `48.8%`
- direct-transform collision share: `27.7%`
- ownership-changed share: `37.1%`
- terrain response applied to `67.3%` of topology cells
- landmass count increased from `6,448` to `27,012`

A reconstruction showed:

| Assignment mode | Boundary share | Face-local components | Mean component size |
|---|---:|---:|---:|
| Legacy raw hash | `51.1%` | about `173,100` | `9.09` cells |
| No warp | `1.27%` | `49` | about `32,099` cells |
| Coherent 3D warp | `1.43%` | `59` | about `26,659` cells |

This was a real defect. It was corrected, and the user observed a substantial performance improvement. It did **not** remove the visible plate ribbons or striping.

Relevant commits:

- `474295f829f671ebb5a58633cdc36a0c620742dd`
- `d17ff0e1bc491b12b28e41dc0f404a13cf72c3fc`
- `dd55c255c8c50e7a2141f4288809e482e8244285`

### 2. Rigid spherical fragment placement pass

The next hypothesis was that authoritative fragment placement sheared shapes because it added independent longitude and latitude deltas to every cell.

Build v0.3.9 changed this to:

- one rigid 3D spherical rotation per fragment,
- the same rigid transform model for stored-history previews,
- angular-fit selection for local collision spill targets,
- focused transform tests for distance and shape preservation.

Primary commit:

- `d65fb8f91d5ea986b51700328dd38c9cc0e666a6`

Full `npm run verify` passed before that commit was pushed.

The user reports **no visible plate behavior change**.

Therefore:

- rigid transform correctness may still be worthwhile,
- but fragment coordinate shear is not currently demonstrated as the owner of the visible stripe pattern,
- or the modified code was not present in the tested runtime,
- or the generator path does not consume this transform in the way assumed.

Do not keep tuning this transform without first resolving those three possibilities.

---

## What is ruled out, and what is not

### Confirmed defect, but not the visible root cause

- Legacy candidate-specific sine-hash plate assignment was pathological.
- Correcting it reduced fragmentation and improved performance.
- It did not remove the user-visible ribbons.

### Correction with no observed product effect

- Replacing independent longitude/latitude translation with rigid spherical rotation did not visibly change the user's test result.

### Not yet ruled out

- The new World Forge generator bundle was not actually deployed or loaded.
- A different generation path bypasses `applyAuthoritativeFragmentTransforms`.
- The long ribbons are already present before fragment placement.
- Boundary-normal or relative-motion calculations impose a meridional bias.
- Cubed-sphere face adjacency or coordinate conversion creates long aligned ownership corridors.
- A topology-to-raster mapping bug makes structurally different topology layers look the same in output.
- A later reconciliation or terrain-response pass rewrites coherent plate ownership into ribbons.
- Cached worlds, retained local project state, or regeneration behavior caused the user to inspect old generated data.

---

## Investigation order

### Phase 0: Prove the test exercised new generation code

This is mandatory.

1. Confirm the tested world was newly regenerated, not reopened from stored data.
2. Confirm the iframe URL points to the expected dev World Forge deployment.
3. Confirm the loaded World Forge asset hash or source commit.
4. Confirm active runtime modes:
   - plate assignment: `coherent`
   - fragment transform: rigid spherical rotation
5. Confirm the code path reaches `applyAuthoritativeFragmentTransforms` for the tested preset.

If runtime provenance fails, fix deployment or caching before touching generation logic.

### Phase 1: Find the earliest ribboned authoritative layer

Use the same fixed seed and configuration for every comparison.

Capture or export the following topology-native fields before projection:

1. Plate ownership immediately after `plates.construct`.
2. Initial elevation before plate-boundary terrain response.
3. Boundary interaction classification and boundary normals.
4. Elevation immediately after initial tectonic uplift/subsidence.
5. Fragment IDs and ownership before authoritative transform.
6. Plate ownership immediately after authoritative fragment transform.
7. Collision spill targets and merged collision targets.
8. Fragment-history collision/rift/subduction/trench response masks.
9. Elevation immediately after fragment-history terrain response.
10. Final topology elevation before equirectangular projection.

Then capture:

11. Projected plate ownership.
12. Projected elevation.
13. Natural View.
14. Globe texture and displacement inputs.
15. Exported raster.

The first field that contains the same long ribbons as the final result owns or immediately follows the defect.

### Phase 2: Add controlled bypasses

Prefer explicit development-only controls over more speculative rewrites.

Useful controls:

- no plate warp
- coherent plate warp
- zero plate motion
- identity fragment transforms
- authoritative fragment placement disabled
- collision spill disabled or merge-only
- fragment-history terrain response disabled
- initial boundary terrain response disabled
- projection bypass using a direct topology diagnostic view

Run one variable at a time.

Do not compare unrelated random generations.

### Phase 3: Measure orientation, not just cohesion

The current plate cohesion metrics can pass while the map still contains absurdly long ribbons.

Add metrics for each relevant field:

- boundary edge orientation histogram
- share of boundary edges within 10 or 15 degrees of north-south
- longest approximately meridional connected run
- longest approximately zonal connected run
- connected component aspect-ratio distribution
- thin-component share, such as components with high geodesic length and low width
- row and column autocorrelation in projected fields
- ownership-change orientation after fragment remapping
- cube-face-edge crossing rate for suspicious components

A world with 20 coherent but extremely thin pole-to-pole plates should fail validation.

---

## Highest-value code review targets

### 1. Runtime and deployment provenance

Review:

- World Forge deployment workflow and dispatch history
- Parchment Worlds `deploy-world-forge-tool.yml`
- iframe URL construction and environment selection
- browser and CDN caching behavior
- whether generated worlds are persisted and reopened rather than regenerated

### 2. Boundary-normal calculations

Inspect every place that derives direction or normal vectors from longitude and latitude differences.

`packages/generator-core/src/plateMotionPipeline.ts` currently analyzes boundary direction using wrapped longitude delta and raw latitude delta. That is a useful diagnostic approximation, but similar math in terrain mutation code could create systematic coordinate bias.

Search for patterns such as:

```ts
wrappedAngle(longitudeB - longitudeA)
latitudeB - latitudeA
Math.cos(latitude)
```

For physical or geometric response on the sphere, prefer local tangent vectors derived from 3D unit positions rather than treating longitude and latitude as a flat Cartesian plane.

### 3. Cubed-sphere adjacency

Audit:

- neighbor lookup at all six face edges
- corner transitions
- orientation and handedness across face boundaries
- duplicate, missing, or reflected neighbors
- reciprocal-neighbor invariants
- geodesic step-length distribution

Add tests that prove:

- every neighbor relation is reciprocal where expected,
- no face edge maps long runs onto the wrong edge,
- local orientation remains consistent through transitions,
- neighbor step distances do not spike at face boundaries.

### 4. Fragment and collision rasterization

Even with rigid target coordinates, many cells can map to the same discrete target.

Inspect:

- claim density by orientation
- whether collision resolution grows thin corridors
- deterministic ordering effects from fragment size and source-cell order
- whether three-step spill searches walk preferentially along topology indexing or face orientation
- whether source cells should be assigned using a global matching, area-preserving resampling, or forward-plus-inverse map rather than sequential claims

The v0.3.9 angular-fit spill search is more geometrically sensible than first-available neighbor selection, but it remains a local greedy rasterizer. Do not assume it is area-preserving.

### 5. Downstream terrain response

Inspect where plate ownership, fragment boundaries, collision fields, or motion vectors are converted into elevation.

The user reports that final relief mirrors the plate ribbons. Determine whether:

- plate ownership is ribboned first and elevation follows it,
- or an elevation response creates ribbons while plate ownership is actually reasonable.

---

## Fixed-seed baseline

Start with the documented high-visibility reproduction:

- world seed: `1001001`
- star seed: `2850873`
- topology resolution: `512`
- output: `2048 x 1024`

Also test lower topology resolutions `128` and `256` to determine whether ribbon width scales with:

- topology resolution,
- cube-face width,
- output raster width,
- or a fixed iteration/search radius.

Preserve all evidence under `refs/testing/`.

Recommended new report:

- `refs/testing/vertical-striping-v0.3.9-runtime-and-layer-isolation.md`

Recommended machine-readable companion:

- `refs/testing/vertical-striping-v0.3.9-metrics.json`

---

## Guardrails

- Do not work on `main`.
- Preserve determinism unless a documented correction intentionally versions output.
- Do not add blur, smoothing, palette changes, or cosmetic masking.
- Do not revert coherent plate assignment solely because it did not solve this separate defect.
- Do not keep modifying fragment rotation without proving the tested runtime contains it and the bad layer appears at that stage.
- Keep the single globe wrap seam separate.
- Do not mix general performance tuning or broad orogeny redesign into this investigation.
- Keep topology-native evidence separate from projected and rendered evidence.
- Treat user visual QA as the product acceptance signal. Passing unit tests is necessary, not dispositive.

---

## Definition of done for this investigation pass

The next developer should not close issue #2 merely by committing another plausible correction.

The investigation pass is complete when all of the following are true:

1. The exact World Forge source commit used by the tested runtime is proven.
2. The test is confirmed to generate a new world through the expected code path.
3. The earliest authoritative field containing the long north-south ribbons is identified.
4. The owning function, node, or topology boundary is named with evidence.
5. At least two competing hypotheses are explicitly ruled out through controlled bypasses.
6. Orientation and long-thin-component metrics reproduce the visual defect.
7. A bounded correction is proposed or implemented.
8. Any implementation is validated on fixed seeds at multiple topology resolutions.
9. `npm run verify` passes.
10. User visual QA confirms an actual behavior change before the issue is closed.

---

## Expected next update to issue #2

The next issue comment should report:

- deployed/runtime World Forge commit SHA
- whether the test regenerated or reopened a world
- earliest ribboned layer
- orientation metrics for that layer
- controls run and their result
- confirmed owner or remaining narrowed candidates
- correction scope and risk
- whether the user should expect a build-number increment

Avoid another update that says only that tests passed or a mathematically cleaner transform was committed.
