---
type: "Handoff Record"
title: "Handoff: production attribution rerank"
tags:
- world-forge
- handoffs
---
# Handoff: production attribution rerank

Updated: 2026-08-02

Status: implementation complete; target-machine rerank pending

## Accepted baseline

The v0.3.58 browser-driven production baseline is preserved under:

```text
refs/testing/production-page-performance-v0.3.58/
```

It established that worker generation dominates user-visible time but also exposed invalid performance attribution from message-driven native progress buckets.

## Implemented correction

The production worker now runs through `generateProjectWithProductionAttribution(...)`.

Each completed project records:

- six non-overlapping `production.stage.*` spans;
- aggregated non-parent `performance.operation.*` timings from the existing trace stream;
- no overlapping `primary-world`, `deep-time-aging`, or related wrapper spans in the exported diagnostic phase list.

Existing native events remain in place for UI progress and compatibility. They are not the authoritative ranking source.

## Focused rerank harness

Run from current `dev` after pulling the merged increment:

```powershell
npm run profile:production-rerank -- --plan refs/testing/production-attribution-rerank-plan.example.json --browser chrome
```

The harness:

- runs Earthlike and Archipelago at 2048 x 1024;
- uses three measured runs per case by default;
- launches a fresh browser process, context, page, and generation worker for each run;
- alternates case order each round;
- requires all canonical stages and fine-operation timing;
- writes evidence under `.local/performance/production-rerank/<timestamp>/`.

## Decision after evidence

Use the rerank to choose one optimization candidate. Do not assume `pack-gyres-v2` remains first merely because it dominated the synthetic profile. It must appear materially in the production fine-operation ranking and offer a credible user-visible gain.

Do not combine production-stage totals with nested fine-operation timings.
