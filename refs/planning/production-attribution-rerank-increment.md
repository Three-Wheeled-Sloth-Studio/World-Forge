---
type: "Planning Reference"
title: "Production attribution and focused rerank increment"
tags:
- world-forge
- planning
---
# Production attribution and focused rerank increment

Updated: 2026-08-02

Status: implemented candidate

Related:

- Issue #14
- `refs/testing/production-page-performance-v0.3.58/production-bottleneck-reconciliation.md`
- `refs/testing/production-attribution-rerank.md`
- `scripts/profile-production-rerank.ts`

## Intent

Close the attribution defects exposed by the first complete browser-driven production baseline before selecting another optimization candidate.

The previous record mixed two different jobs:

- native stage events were useful for user-visible progress;
- the same events were treated as authoritative performance partitions even though their boundaries were inferred from progress messages.

That produced impossible parent-child relationships and a broad `Biomes and features` catch-all. This increment keeps progress reporting intact but adds a separate performance ledger whose stages are non-overlapping and derived from explicit wrapper spans already measured by the production generator.

## Authoritative production stages

Worker-generated projects now receive these diagnostic phases:

| Stable phase ID | Meaning |
|---|---|
| `production.stage.foundation` | Initial primary-world generation through the existing `primary-world` wrapper span |
| `production.stage.motion` | Plate-motion scaling and pre-aging coupling |
| `production.stage.history` | The complete deep-time foundation wrapper span |
| `production.stage.reconciliation` | Terminal orbital alignment and craton reconciliation |
| `production.stage.postprocess` | Biome cohesion and biome diagnostics applied after deep-time generation |
| `production.stage.unattributed` | Residual wrapper time not covered by the five named spans |

These phases are siblings. Their durations may be summed. They replace the overlapping wrapper phase names in the worker-returned project diagnostics.

The existing native stages remain available for progress display and backward-compatible telemetry, but they are no longer the source of truth for performance ranking.

## Fine-operation propagation

The production worker now subscribes to the existing generator performance trace stream without replacing synthetic-profiler sinks.

For each completed generation:

- non-parent trace records are aggregated by operation ID;
- one diagnostic phase is written as `performance.operation.<operation-id>`;
- parent wrapper traces are excluded to prevent double counting;
- production timing export automatically carries the resulting phases through its existing diagnostic-phase path.

This makes operations such as `basin-circulation.pack-gyres` available in real production-page timing records.

Fine operations are nested attribution. They must never be added to production-stage totals.

## Fresh-context focused rerank

`npm run profile:production-rerank` runs the focused Earthlike and Archipelago default-resolution comparison with stronger isolation:

- one production-page inner-harness invocation per measured run;
- a fresh browser process, browser context, page, and generation worker for every run;
- alternating case order by round;
- one production build and preview server shared across the full matrix;
- validation that all six production stages and at least one fine operation were captured;
- aggregate JSON, Markdown, and CSV output.

Default command:

```bash
npm run profile:production-rerank -- --plan refs/testing/production-attribution-rerank-plan.example.json --browser chrome
```

Default output:

```text
.local/performance/production-rerank/<timestamp>/
```

## Decision gate

The next optimization candidate may be selected only after the focused rerank answers:

1. Which non-overlapping production stage dominates at 2048 x 1024?
2. Which fine operation dominates within production generation?
3. Does `basin-circulation.pack-gyres` remain material in both Earthlike and Archipelago?
4. How stable are fresh-context repetitions compared with the original shared-context run?
5. Is the candidate large enough to produce a material user-visible gain?

No algorithm optimization is included in this increment.
