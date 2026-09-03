---
type: "Handoff Record"
title: "Current Handoff: Structural Terrain Integrity"
tags:
- world-forge
- handoffs
---
# Current Handoff: Structural Terrain Integrity

Updated: 2026-07-26

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#2 [High Priority Investigation] Root-cause structural vertical striping`

## Implementation Status

PI complete. The focused root cause is confirmed, corrected, verified, and
accepted on the deployed `dev` build for World Forge 0.3.16 / generator
0.1.1-mvp.

- The investigation script now executes `generateProjectWithNativeStages`.
- Raw topology elevation is captured at six authoritative mutation boundaries.
- A controlled fragment-placement bypass confirmed ownership.
- Fragment placement v2 uses inverse-sampled rigid rotation rather than
  forward splatting, gap creation, and directional collision spill.
- Fixed-seed regression coverage prevents placement discontinuity amplification.
- The reference seed passes at topology 512 / output 2048 x 1024.
- The additional seed `9776542:9776542` passes at topology 256 / output
  1024 x 512.
- Root-cause evidence is in
  `refs/testing/vertical-striping-root-cause-v0.3.16.md`.
- Full repository verification passed with 154 tests.
- Hosted deployment smoke and exact bundle provenance passed for commit
  `19cebab197df3f05d151713c897e28c51f24804a`.
- Browser visual QA passed on 2026-07-26.

No work remains in this PI. A separate initial-tectonic orientation bias
remains deferred because the corrected fragment transform no longer materially
amplifies it.

## Takeover Prompt

Continue the structural terrain integrity work on the World Forge `dev` branch.

The active product problem is the long, narrow, primarily north-south plate or relief ribbons that remain visually dominant in generated worlds. Saving, project continuity, replay manifests, and synchronization are intentionally outside this slice. Do not reopen those contracts unless the defect investigation proves they prevent reliable fixed-input reproduction.

Start by proving the exact runtime and fresh-generation path being tested. Then identify the earliest authoritative or derived layer containing the visible ribbon family. Use controlled bypasses to confirm ownership before changing another algorithm. Correct only the confirmed owner, and add a regression signal that prevents the same structural failure from quietly returning.

Do not work on `main`.

## Product Outcome

Generated worlds should present geographically credible large-scale terrain without mechanically obvious longitude-aligned ribbons or extremely long straight uplift corridors dominating:

- topology-native terrain,
- projected maps,
- Natural View,
- globe presentation,
- and exported raster output.

The correction must preserve legitimate tectonic structure, continental-scale gradients, coastlines, watersheds, climate transitions, and deterministic generation within the newly declared compatible version.

## Why This Is the Next Slice

Persistence and project continuity are solid enough for now. The generator itself remains the product's most visible credibility boundary.

An obviously striped planet damages the core promise more than another project-management feature, thumbnail, export option, or metadata panel. Multi-scale regions, canonical world features, resources, cultures, settlements, and later editing all depend on trustworthy authoritative geography. Organizing or enriching broken geography would be impressively tidy and still wrong.

## Current Baseline

### Confirmed correction: pathological plate assignment

The former candidate-specific sine-hash plate perturbation behaved like cell noise rather than coherent spatial noise. It fragmented nominal tectonic plates into enormous numbers of tiny components.

The coherent 3D plate-coordinate warp corrected that defect and materially improved performance and plate cohesion.

Relevant commits include:

- `474295f829f671ebb5a58633cdc36a0c620742dd`
- `d17ff0e1bc491b12b28e41dc0f404a13cf72c3fc`
- `dd55c255c8c50e7a2141f4288809e482e8244285`

This was a real and worthwhile correction. It did not remove the visible ribbon pattern.

### Confirmed visual owner and correction: fragment placement

World Forge v0.3.9 replaced independent longitude and latitude fragment translation with rigid spherical rotation and improved deterministic collision placement.

Primary commit:

- `d65fb8f91d5ea986b51700328dd38c9cc0e666a6`

The earlier rigid transform remained a forward raster splat. Native-stage
snapshots and a controlled bypass subsequently proved that fragment placement
amplified adjacent-cell elevation discontinuities by `2.91x` on the
investigative reference run.

World Forge 0.3.16 replaces that rasterization with inverse-sampled rigid
rotation. At full reference resolution, placement amplification is `1.035x`
and meridional high-gradient share decreases through the placement boundary.

### Runtime provenance now exists

World Forge can report its application version and source commit to the Parchment shell. Exact-replay work also provides stable recorded generation inputs and authoritative signatures.

Use these capabilities to prove that each diagnostic run:

- loaded the expected World Forge bundle,
- used the expected source commit,
- generated fresh authoritative data,
- and used the intended fixed inputs.

A Parchment header version pill alone is not sufficient evidence.

### Latest layer-isolation evidence

The current report is:

- `refs/testing/vertical-striping-v0.3.11-runtime-and-layer-isolation.md`

For seed pair `2850873:1001001`, topology resolution `512`, output `2048 x 1024`, that run found:

- initial topology plate components: `28`
- final topology plate components: `28`
- initial and final boundary-edge count: `13,388`
- initial and final meridional boundary share: `0.538243`
- no measured long-thin plate components in either initial or final ownership

This weakens the hypothesis that downstream fragment placement is shredding coherent ownership in the current generation path.

It does not identify the visible defect owner. The next useful evidence is finer-grained internal snapshots around elevation response, boundary calculations, fragment-history terrain response, cubed-sphere adjacency, and projection.

## Required Reading

Read these before changing generation behavior:

1. `refs/handoffs/structural-terrain-integrity.md`
2. World Forge issue `#2`, including every comment
3. `refs/testing/vertical-striping-root-cause-first-pass.md`
4. `refs/testing/vertical-striping-v0.3.11-runtime-and-layer-isolation.md`
5. `scripts/investigate-vertical-striping.ts`
6. `packages/generator-core/src/graph/nodes/plate-construction-node.ts`
7. `packages/generator-core/src/deepTimePipeline.ts`
8. `packages/generator-core/src/fragmentSphericalTransform.ts`
9. `packages/generator-core/src/plateMotionPipeline.ts`
10. Cubed-sphere topology and neighbor code under `packages/shared/`
11. Topology-to-equirectangular projection and raster assembly code
12. `apps/desktop/src/appVersion.ts`
13. `apps/desktop/src/generation/useGenerationWorkflow.ts`
14. `apps/desktop/src/diagnostics/buildWorldDiagnostics.ts`

The older `refs/handoffs/vertical-striping-investigation-v0.3.9.md` is historical context. This document supersedes it as the active handoff.

## Slice Boundary

This is a focused generator-integrity slice.

### In scope

- Runtime and generation-path provenance.
- Fixed-input reproduction.
- Topology-native and projected intermediate-layer capture.
- Controlled development-only bypasses.
- Orientation, continuity, aspect-ratio, and run-length metrics.
- Root-cause isolation.
- One bounded correction after ownership is proven.
- Deterministic regression coverage.
- Fixed-seed visual QA across map, globe, and export.

### Out of scope

- Project persistence or cloud synchronization.
- `.wforge` synchronization.
- Project Hub expansion.
- Thumbnails and world summaries.
- Resource placement.
- Multi-scale region decomposition.
- Canonical world features.
- Settlement, culture, faction, or political simulation.
- User terrain editing.
- General performance optimization unrelated to the confirmed owner.
- Broad coherent-orogeny calibration.
- The single globe wrap seam unless evidence proves it shares the same owner.
- Cosmetic smoothing, blur, palette, or material changes intended to hide the defect.

## Phase 0: Prove the Test Path

This phase is mandatory before another generation correction.

For every fixed-seed run, record:

- World Forge application version.
- World Forge source commit.
- Generator version.
- Graph contract or relevant node versions.
- Root world seed and star seed.
- Generation profile and selected settings.
- Topology resolution.
- Output resolution.
- Whether the world was freshly generated, replayed, loaded, or restored.
- Active plate-assignment mode.
- Active fragment-transform mode.
- Whether the expected deep-time and fragment-history code paths executed.

The initial reference case remains:

- star seed: `2850873`
- world seed: `1001001`
- topology resolution: `512`
- output resolution: `2048 x 1024`

Use topology resolution `256` and output `1024 x 512` for faster investigative loops where the defect remains measurable. Confirm final findings again at the full reference resolution.

Capture one additional stripe-heavy seed from current QA evidence before declaring the correction general.

## Phase 1: Find the Earliest Bad Layer

Use identical generation inputs for every comparison.

Capture topology-native fields in this order:

1. Plate ownership immediately after `plates.construct`.
2. Initial elevation before boundary terrain response.
3. Plate-boundary classification.
4. Boundary normals and relative-motion vectors.
5. Uplift, subsidence, rift, trench, collision, and transform masks produced by initial tectonic response.
6. Elevation immediately after initial tectonic response.
7. Fragment identities before authoritative remapping.
8. Plate ownership before authoritative remapping.
9. Plate ownership immediately after authoritative remapping.
10. Intended remap targets, direct claims, collision spill targets, and merged targets.
11. Fragment-history collision, rift, subduction, trench, and transform masks.
12. Elevation immediately after fragment-history terrain response.
13. Final topology plate ownership.
14. Final topology elevation before projection.

Then capture derived and presentation fields:

15. Projected plate ownership.
16. Projected elevation.
17. Terrain-only presentation.
18. Data View elevation.
19. Natural View.
20. Globe texture input.
21. Globe displacement input.
22. Final globe presentation.
23. Exported raster.

The earliest field containing the same long ribbon family as the final output owns the defect or sits immediately after its owner.

Do not jump to the prettiest downstream screenshot. The point is to catch the first bad fact, not the last place it becomes embarrassing.

## Phase 2: Controlled Bypasses

Add development-only controls rather than speculative rewrites.

Useful controls include:

- coherent plate warp versus no plate warp,
- zero plate motion,
- identity fragment transforms,
- authoritative fragment placement disabled,
- collision spill disabled,
- merge-only collision handling,
- initial boundary terrain response disabled,
- fragment-history terrain response disabled,
- boundary-normal contribution disabled,
- direct topology diagnostic rendering without equirectangular interpolation,
- alternate cubed-sphere face-edge neighbor handling for diagnostic comparison.

Change one variable at a time.

Every control run must use the same fixed generation inputs and record its active control state in the evidence output.

## Phase 3: Measure the Visible Failure

Existing cohesion metrics are necessary but insufficient. A plate map can contain a reasonable number of connected components and still produce absurdly long narrow structures.

Add or refresh machine-readable measurements for the relevant ownership, response, and elevation fields:

- horizontal and vertical high-gradient shares,
- north-south versus east-west orientation distribution,
- longest continuous high-response run,
- longest near-straight run,
- component width, height, area, perimeter, and aspect ratio,
- long-thin component share,
- boundary tangent orientation,
- uplift and subsidence corridor orientation,
- row and column autocorrelation,
- cube-face edge correlation,
- topology-face segmentation correlation,
- longitude-column correlation after projection,
- and cross-layer correlation between ownership ribbons and relief ribbons.

Metrics should help distinguish:

- coherent but naturally elongated tectonic structure,
- pathological topology-native ownership corridors,
- boundary-response artifacts,
- face-edge adjacency artifacts,
- projection interpolation artifacts,
- and renderer-only presentation artifacts.

No single threshold should be treated as universal geology. Use the measurements to locate and prevent the known failure family, not to ban every long mountain chain from the planet.

## Phase 4: Ownership Decision

Before implementing a correction, produce an evidence note that states:

- the first bad layer,
- the owning node or transformation,
- the control that removes or materially changes the defect,
- competing hypotheses eliminated,
- whether the change is authoritative, derived, or presentation-only,
- determinism impact,
- replay and generator-version impact,
- expected performance impact,
- and the bounded remediation options.

If evidence points to more than one visually similar defect, split the work. Do not force unrelated failures into one heroic patch.

## Phase 5: Bounded Correction

Implement a correction only after Phase 4 identifies the owner.

The correction must:

- change the owning fact or transformation rather than masking its output,
- declare any generator or graph-node version change,
- preserve deterministic output within the new version,
- keep incompatible old manifests explicit rather than pretending they replay exactly,
- add focused unit or property tests,
- add a regression metric or validation rule for the known failure family,
- retain legitimate coastlines, climatic gradients, plate-scale structure, and connected terrain,
- and pass full repository verification.

Do not casually revert the coherent plate assignment or rigid spherical transform. Both corrected independent defects. Replace them only if new evidence proves they are themselves wrong.

## Likely Owners Still Worth Testing

These remain hypotheses, not conclusions:

1. Boundary-normal or relative-motion calculations imposing meridional response bias.
2. Initial tectonic uplift or subsidence rasterization creating long straight corridors.
3. Fragment-history terrain-response masks amplifying aligned paths.
4. Cubed-sphere face-edge adjacency producing extended ownership or response corridors.
5. Topology-to-equirectangular interpolation creating or exaggerating vertical bands.
6. A later reconciliation pass rewriting otherwise credible elevation into aligned ribbons.

The v0.3.11 evidence makes widespread downstream ownership shredding a weaker active hypothesis.

## Required Deliverables

The slice should leave behind:

1. An updated fixed-seed investigation script or equivalent repeatable command.
2. Machine-readable metrics for the tested layers.
3. Topology-native and projected visual evidence under `refs/testing/`.
4. A concise root-cause report under `refs/testing/`.
5. A comment on World Forge issue `#2` summarizing findings and linking the evidence commit.
6. A bounded correction PR if ownership is proven and the correction is appropriately scoped.
7. Focused regression tests and full `npm run verify` results.
8. Browser QA instructions covering map, globe, and export.
9. A version-impact and replay-compatibility statement.

Do not commit large generated binary evidence unless the repository already has an approved pattern for it. Prefer compact images, summaries, fingerprints, CSV or JSON metrics, and reproducible scripts.

## Investigation Acceptance Criteria

The investigation phase is complete when:

- The exact runtime commit and generation path are proven.
- A fresh fixed-input reproduction is recorded.
- The earliest layer containing the visible ribbon family is identified.
- At least one controlled bypass materially changes or removes that family.
- Competing primary hypotheses are confirmed or eliminated.
- The owning node or transformation is named.
- A bounded correction, estimate, regression approach, and version-impact decision are documented.
- No cosmetic mitigation is presented as a root-cause fix.

## Correction Acceptance Criteria

The corrective phase is complete when:

- The change is demonstrated in the owning authoritative or derived layer.
- The known longitude-aligned ribbon family is no longer visually dominant.
- The result passes fixed-seed comparison at investigative and reference resolutions.
- At least one additional stripe-heavy seed passes.
- Terrain-only, Data View, Natural View, globe, and exported raster all show the improvement.
- Legitimate plate boundaries, continental forms, coastlines, drainage structure, climate gradients, and biome regions remain credible.
- Determinism passes for the new declared version.
- Exact replay incompatibility is explicit when the version change requires it.
- Focused tests and full `npm run verify` pass.
- Browser visual QA passes before promotion beyond `dev`.

## Promotion Boundary

- Work from `dev` through a focused feature branch unless the user explicitly directs otherwise.
- Do not modify or merge directly to `main`.
- Do not promote to `qa` until fixed-seed evidence and browser visual QA pass on `dev`.
- Use the normal exact-SHA `dev -> qa -> main` promotion path after approval.

## Next Product Slice After Closure

Once structural terrain integrity is accepted, the recommended next product slice is automatic multi-scale geographic region decomposition.

That work should define stable hierarchical geographic regions around coastlines, terrain barriers, watersheds, climate and biome structure, and travel corridors before adding political ownership, cultures, settlements, roads, or natural-language naming.
