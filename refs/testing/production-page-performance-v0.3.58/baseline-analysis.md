---
type: "Testing Reference"
title: "Production Page Performance Baseline - v0.3.58"
tags:
- world-forge
- testing
---
# Production Page Performance Baseline - v0.3.58

Updated: 2026-08-02

Status: accepted production-path baseline; fine-operation reranking blocked by attribution gaps

Related:

- Issue #14
- `refs/planning/production-performance-instrumentation-plan.md`
- `refs/testing/production-page-performance-harness.md`
- `refs/testing/production-page-performance-v0.3.58/runs.csv`
- `refs/testing/production-page-performance-v0.3.58/summary.md`

## Evidence identity

- App and visible version: `0.3.58`
- Source commit: `42ae4b6d79994235031220869ea1dff3b444c012`
- Workflow: `core.performance-foundation` / World Generation (Detailed) `1.2.0`
- Browser: headed Chromium 149 on Windows
- Logical processors reported: 16
- Run shape: one warmup plus three measured runs for each case
- Valid measured records: 18 of 18
- Same-window generation fallback: not used
- Page visible and focused at launch: yes for all accepted records

## Source-file integrity

The uploaded source files used for this report had these SHA-256 hashes:

- `runs.csv`: `9270638aafc0a7ad25e4be35b0e924baf658b51bb40ac6e320d3b0ebb455e1be`
- `summary.json`: `044b614a640ada473e8531f3af3f7aad9e3c9aad2c117f55fed02782900218ef`
- `summary.md`: `0ad72e4995f2ff578909bbab4432bf5677f429a4ff1f0761985243c2e22e0f0b`

The repository retains the concise harness summary, run table, normalized stage medians, and this reconciliation report. The full per-run JSON remains the authoritative raw attachment until the centralized audit store lands.

## User-visible baseline

| Case | User-visible median | Worker median | Worker share | Handoff median | UI acceptance/render median | Slowest native bucket |
|---|---:|---:|---:|---:|---:|---|
| Earthlike 1024x512 | 17.2 s | 16.1 s | 93.6% | 47 ms | 820 ms | Biomes and features: 7.1 s |
| Earthlike 2048x1024 | 1m 24s | 1m 21s | 96.6% | 224 ms | 1.9 s | Biomes and features: 35.3 s |
| Earthlike 4096x2048 | 7m 09s | 7m 00s | 97.9% | 951 ms | 5.8 s | Biomes and features: 3m 11s |
| Archipelago 1024x512 | 21.6 s | 20.6 s | 95.5% | 54 ms | 689 ms | Biomes and features: 9.1 s |
| Archipelago 2048x1024 | 1m 49s | 1m 47s | 97.4% | 272 ms | 1.7 s | Biomes and features: 50.6 s |
| Archipelago 4096x2048 | 8m 26s | 8m 17s | 98.1% | 911 ms | 5.7 s | Biomes and features: 4m 23s |

The worker owns the product-performance problem. Transfer and rendering become noticeable at Ultra, but neither is a first-order optimization target.

## Default-resolution stage ranking

At 2048x1024, the three largest native buckets account for about 87% of worker time.

| Native bucket | Earthlike median | Earthlike share | Archipelago median | Archipelago share |
|---|---:|---:|---:|---:|
| Biomes and features | 35.3 s | 43.6% | 50.6 s | 47.5% |
| Initial world foundation | 23.9 s | 29.5% | 28.4 s | 26.7% |
| Deep-time aging | 11.6 s | 14.3% | 13.6 s | 12.8% |
| Plate and craton structure | 6.4 s | 7.9% | 8.0 s | 7.5% |
| Outputs and validation | 3.5 s | 4.3% | 4.1 s | 3.8% |
| Primordial crust | 2.5 s | 3.1% | 3.4 s | 3.2% |

The native buckets close exactly to worker generation time, so they are useful as an exhaustive wall-time partition. Their current labels are not yet reliable algorithm boundaries.

## Scaling

Each resolution step increases raster and topology cell counts by 4x.

- Earthlike user-visible time grows 4.89x and then 5.11x.
- Archipelago user-visible time grows 5.08x and then 4.62x.
- Across 16x as many cells, total wall time grows 25.0x for Earthlike and 23.5x for Archipelago.
- The `Biomes and features` bucket grows 26.7x for Earthlike and 29.1x for Archipelago across the same 16x cell increase.
- The observed scaling is superlinear, approximately `cells^1.14` to `cells^1.18` for total wall/worker time and up to `cells^1.22` for the dominant native bucket.

Payload size remains approximately linear:

| Resolution | Earthlike estimated payload | Layer bytes |
|---|---:|---:|
| 1024x512 | 48.8 MB | 42.2 MB |
| 2048x1024 | 190.9 MB | 168.8 MB |
| 4096x2048 | 757.6 MB | 675.3 MB |

The roughly 758 MB Ultra project explains the near-1-second structured-clone handoff and 5-6 second render completion, but worker generation still dominates.

## Exposed child timings

The largest consistently exposed child operation at 2048x1024 is `climate.glaciation`:

| Child operation | Earthlike median | Archipelago median |
|---|---:|---:|
| Climate and glaciation | 11.9 s | 14.5 s |
| Topology climate | 7.0 s | 8.3 s |
| Crust fields | 5.4 s | 6.8 s |
| Hydrology and biomes | 4.8 s | 5.0 s |
| Topology hydrology | 4.3 s | 4.5 s |
| Terrain finalization | 3.3 s | 4.4 s |

Parent and child entries overlap and must not be added together.

## Attribution defects exposed by the baseline

The baseline successfully measures end-to-end product behavior, but it also proves that the current fine attribution is not sufficient to choose the next algorithm rewrite.

1. `world.present-climate`, `world.hydrology`, and `world.final-water` often report zero elapsed time while their graph children report substantial work. At default Earthlike, `topology.climate-glaciation-node` reports 11.9 seconds and `topology.hydrology-biomes-node` reports 4.8 seconds despite zero native time in the corresponding named buckets.
2. The graph entry named `deep-time-aging` is larger than the native `world.deep-time-aging` bucket while being recorded as its child. At default resolution the mismatch is 49.9 seconds versus 11.6 seconds for Earthlike and 67.2 seconds versus 13.6 seconds for Archipelago. That relationship is structurally impossible as a parent/child timing hierarchy.
3. The native progress mapper classifies unmatched deep-time messages as `world.biomes-features`. The dominant bucket is therefore partly a catch-all, not an isolated biome algorithm.
4. The production records contain no `basin-circulation.pack-gyres` or equivalent fine-operation event. The earlier synthetic gyre result remains a credible lead, but production evidence has not confirmed that it is the dominant user-visible target.
5. Lower-level preview raster construction remains an explicit instrumentation gap.

## Run stability

The medians are sufficient for broad product ranking, but repeated runs were not uniformly stable.

- Earthlike 1024 worker range: 12.7-19.2 seconds.
- Archipelago 1024 worker range: 13.5-22.3 seconds.
- Earthlike 4096 worker range: 409.2-480.3 seconds.
- Several cases became slower across sequential repeats, consistent with memory pressure, garbage collection, thermal effects, or retained page/worker state.

Preset comparisons are directionally useful, but Earthlike ran before Archipelago, so the observed stress-case premium cannot be attributed entirely to world shape.

## Decision

Do not resume `pack-gyres-v2` yet.

The next implementation increment is production attribution closure:

1. replace progress-message bucketing with explicit timed boundaries for final water, present climate, hydrology, biome/feature work, final reconciliation, and validation;
2. classify `primary-world` and broad `deep-time-aging` timers as wrapper spans rather than children of narrower native stages;
3. propagate the fine-operation trace into the production timing record, including basin circulation and gyre packing;
4. record enough run-isolation context to identify retained-worker, memory, GC, or thermal drift;
5. add a harness mode that creates a fresh browser context and worker for every measured run and supports alternating or randomized case order.

After that increment, rerun the 2048x1024 Earthlike and Archipelago cases as the primary reranking matrix. Use one 4096x2048 confirmation case only after selecting an optimization candidate.

## Current product conclusions

- 2048x1024 is usable but still slow at roughly 1.4-1.8 minutes.
- 4096x2048 is a stress/final-output tier at roughly 7-8.5 minutes, not an interactive iteration tier.
- Worker-side generation is the overwhelming priority.
- Transfer-format optimization should wait until worker time is materially reduced.
- The dominant broad cost is post-foundation/deep-time work currently collected under `Biomes and features`, but the exact algorithm inside that bucket is not yet proven.
