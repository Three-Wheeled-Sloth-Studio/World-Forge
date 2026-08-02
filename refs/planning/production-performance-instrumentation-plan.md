# Production Performance Instrumentation Plan

Updated: 2026-08-02

Status: required next increment; blocks performance-optimization promotion

Primary issue: #14 — Generation performance foundation PI

Related:

- `refs/planning/pi-generation-performance-foundation.md`
- `refs/planning/current-generation-bottleneck-profiling.md`
- `refs/testing/current-generation-bottleneck-ranking.md`
- `apps/desktop/src/generation/useGenerationWorkflow.ts`
- `apps/desktop/src/generationWorker.ts`
- `packages/generator-core/src/nativeStagePipeline.ts`
- `scripts/profile-current-generation.ts`

## Purpose

Make production instrumentation the authoritative source for generation-performance decisions.

This plan exists because the current synthetic Node profiler and the in-app generation path do not have sufficient parity. The profiler has produced useful algorithm-level evidence, but its absolute timings and bottleneck ranking were treated too broadly. It used smaller resolutions, bypassed parts of the production-native pipeline, omitted worker transfer and UI work, and ran in a different runtime and environment.

That is a repeated process failure, not a minor reporting caveat. The correction is to establish an explicit measurement hierarchy and build the missing production telemetry before implementing or promoting another optimization candidate.

## Non-negotiable measurement hierarchy

1. **Instrumented production-path behavior is the source of truth.**
   - The primary metric is user-visible wall time from generation launch to an interactive rendered world.
   - Production-path stage and boundary timings explain that wall time.
2. **Parity harnesses reproduce and diagnose production telemetry.**
   - They must use the same workflow, configuration, resolution, generation entrypoint, and relevant options.
3. **Synthetic profilers isolate suspected algorithms.**
   - They may identify candidates and explain scaling behavior.
   - They may not establish expected in-app duration or independently justify promotion.
4. **Tests establish correctness, determinism, and regression safety.**
   - CI or test-suite duration is not a product-performance metric.

Any future performance claim must state which layer produced the evidence. Do not describe synthetic or CI timing as production generation performance.

## Immediate correction to current conclusions

The current profiling evidence remains useful but is reclassified:

- `basin-circulation.pack-gyres` is a credible synthetic hotspot and scaling-risk candidate.
- It is **not yet proven to be the dominant contributor to user-visible in-app generation time**.
- The proposed `pack-gyres-v2` optimization is paused until the production-path baseline and bottleneck ranking are complete.
- Existing profiler output remains supporting evidence and should not be deleted or rewritten to pretend it measured something it did not.

## Required implementation sequence

### Phase 1 — Define one durable generation timing record

Create a versioned timing record emitted for every completed or failed generation run.

Minimum identity fields:

- schema version;
- run/task ID;
- completed, failed, or cancelled status;
- app version and visible version;
- source commit;
- shell/runtime identity;
- workflow ID and workflow version;
- seed and semantic sub-seeds where available;
- world preset;
- selected parameter values or stable configuration hash;
- output resolution;
- topology resolution and topology cell count;
- launch source: generator, graph, replay, or another explicit source;
- browser/user-agent summary;
- logical processor count and other low-risk runtime capability fields available without permission prompts;
- whether the page was visible and focused during the run.

Minimum timing fields:

- UI launch timestamp;
- worker receipt timestamp;
- production generation start and finish;
- native stage timings;
- graph-node timings where measured;
- biome cohesion timing;
- biome diagnostics timing;
- preview generation count and total generation time;
- preview bytes emitted and UI preview-paint time;
- completed-project post timestamp;
- completed-project receipt timestamp in the UI;
- project acceptance/state-update time;
- first committed render time;
- first interactive paint time;
- total user-visible wall time;
- failed-stage and failure timestamp when applicable.

Use cross-context timestamps that are explicitly comparable between the window and worker. Do not assume independent `performance.now()` values are comparable without proving or normalizing their time origins.

### Phase 2 — Instrument the real worker boundary

Instrument `apps/desktop/src/generationWorker.ts` and `apps/desktop/src/generation/useGenerationWorkflow.ts` around the actual production call to `generateProjectWithNativeStages(...)`.

Separate at least:

1. UI dispatch to worker receipt.
2. Worker-side production generation CPU/wall time.
3. Preview construction and emission.
4. Final project handoff from worker post to UI receipt.
5. UI project acceptance and state update.
6. Render completion and return to interactivity.

The worker-to-window project handoff currently uses structured cloning for the completed `WorldProject`. The timing record must expose that boundary rather than burying it inside a single total. Also record an estimated serialized payload size or deterministic layer-byte total so transfer growth can be compared across resolutions.

Do not optimize the transfer mechanism in the same increment that establishes its baseline. Measurement first.

### Phase 3 — Close native-pipeline attribution gaps

Ensure every production-only operation is included in the stage hierarchy, including work performed after the lower-level deep-time generator returns.

At minimum, explicitly attribute:

- biome cohesion;
- biome diagnostics;
- final project reconciliation;
- final validation/diagnostic assembly;
- any production preview work;
- any other synchronous work between production generation return and worker completion.

Parent and child stages must have explicit relationships. Reports must not add parent and child durations together as though they are independent costs.

### Phase 4 — Expose and export instrumentation

Add a developer-facing generation timing view that makes the production record easy to retrieve without opening browser performance tools.

Required capabilities:

- show the most recent run summary;
- show user-visible wall time beside worker generation time;
- show stage and boundary timings;
- show resolution, workflow, seed, version, commit, and environment identity;
- copy a concise Markdown report;
- copy or download the complete JSON timing record;
- retain a small bounded local history for matched before/after comparisons;
- clearly label synthetic profiler results as synthetic when displayed or referenced.

The exported record must be usable as durable evidence in `refs/testing/` and GitHub issue/PR notes.

### Phase 5 — Establish the production baseline

Capture production-path runs before selecting the next optimization.

Primary baseline matrix:

- workflow: current World Generation (Detailed) control;
- resolutions: 1024 x 512, 2048 x 1024, and 4096 x 2048;
- required primary resolution: the actual in-app default, 2048 x 1024;
- at least three fixed representative seeds;
- Earthlike standard plus at least one known stress scenario;
- cold run and warmed repeat distinguished rather than silently mixed;
- no unrelated foreground activity during the primary comparison runs;
- app version and source commit captured automatically.

The user's normal development machine and actual app path are the primary environment. Hosted CI may provide supplemental repeatability checks but does not replace this baseline.

For each run, retain:

- complete timing JSON;
- concise Markdown summary;
- total user-visible wall time;
- worker generation time;
- project handoff time;
- UI acceptance/render time;
- native stage and fine-operation attribution;
- output validity and deterministic signature where available.

### Phase 6 — Build a matched parity harness

Update or add a supporting harness that uses the same production generation entrypoint and configuration as the app.

Requirements:

- call `generateProjectWithNativeStages(...)`, not only the lower-level deep-time instrumentation entrypoint;
- use the same workflow descriptor and configuration normalization;
- use the same resolution and topology rules;
- include production-only post-generation work;
- allow preview work to be enabled or disabled explicitly and report that choice;
- preserve the existing fine-operation trace sink for algorithm attribution;
- report its runtime and environment prominently;
- never present its absolute timing as a substitute for the instrumented app result.

A browser-driven harness may be added to exercise the production bundle and worker path automatically. It remains a diagnostic/parity tool; actual instrumented app runs remain authoritative.

### Phase 7 — Reconcile and rerank

Compare production instrumentation against the matched harness and synthetic profiler.

The resulting report must answer:

- Where is the user-visible time actually spent?
- How much is worker generation versus project transfer versus UI work?
- Which native stage dominates at 2048 x 1024?
- Which fine operation dominates inside that stage?
- Which costs scale worse than the growth in raster or topology cells?
- Which synthetic hotspots remain material in production?
- Which costs were missed or distorted by the previous profiler?

Replace the current production bottleneck ranking only after this reconciliation. Preserve the old report as historical synthetic evidence, with its scope clearly labeled.

### Phase 8 — Resume one optimization candidate

Only after the production ranking is accepted:

- choose one candidate;
- keep Detailed as the control;
- isolate the candidate in Experimental;
- require exact or explicitly approved output equivalence;
- compare before and after using the same instrumented production environment;
- use synthetic profiling to explain the measured gain, not to manufacture one;
- require a material improvement in user-visible wall time, not merely a local microbenchmark win.

`pack-gyres-v2` may remain the first candidate if production evidence confirms it. It is not entitled to remain first if production instrumentation identifies a larger or more actionable bottleneck.

## Performance evidence required in future PRs

A PR claiming a performance improvement must include:

- before and after app version/source commit;
- matched workflow, resolution, seed, parameters, and environment;
- production user-visible wall time;
- worker generation time;
- affected stage and fine-operation timing;
- transfer and UI timing to show the gain was not displaced elsewhere;
- median and range across the accepted run set;
- correctness and deterministic-output evidence;
- synthetic benchmark results only as secondary attribution;
- a statement of any remaining instrumentation gaps.

No performance claim should be accepted from:

- a single synthetic seed;
- CI wall-clock duration;
- test-suite duration;
- a different resolution than the product scenario being discussed;
- a lower-level entrypoint that omits production work;
- unmatched before/after environments;
- percentages that double-count parent and child phases.

## Definition of done

This instrumentation increment is complete when:

- production generation emits a versioned end-to-end timing record;
- worker generation, previews, final project handoff, UI acceptance, and interactive render are separately measurable;
- production-only post-generation work has explicit attribution;
- the app can copy/export the current record and retain bounded local history;
- 1024 x 512, 2048 x 1024, and 4096 x 2048 baseline evidence has been captured;
- a matched production-entrypoint harness exists;
- the production and synthetic results have been reconciled in a new bottleneck ranking;
- issue #14 and the active handoff identify the accepted next optimization candidate;
- no optimization has been promoted using synthetic timing alone.

## Next-developer starting point

Start here before modifying `packGyres` or any other performance-sensitive algorithm.

1. Read this document and issue #14.
2. Inspect the existing generation timer and worker message boundaries in:
   - `apps/desktop/src/generation/useGenerationWorkflow.ts`
   - `apps/desktop/src/generationWorker.ts`
   - `packages/generator-core/src/nativeStagePipeline.ts`
3. Define the versioned timing record and cross-context timestamp strategy.
4. Implement Phases 1–4 without changing generation behavior.
5. Capture the production baseline and reconcile it with the existing profiler.
6. Update the ranking and only then resume an Experimental optimization candidate.

The core rule is simple: **instrument what the user actually experiences first; use tests and profilers to explain it afterward.**
