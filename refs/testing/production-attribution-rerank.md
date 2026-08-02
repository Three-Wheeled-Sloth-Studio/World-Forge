# Production attribution rerank harness

Updated: 2026-08-02

## Purpose

Run the accepted 2048 x 1024 Earthlike and Archipelago production cases with clean attribution and fresh execution context before choosing the next optimization candidate.

## Command

```bash
npm run profile:production-rerank -- --plan refs/testing/production-attribution-rerank-plan.example.json --browser chrome
```

Chromium remains supported:

```bash
npm run profile:production-rerank -- --plan refs/testing/production-attribution-rerank-plan.example.json --browser chromium
```

## Isolation semantics

Each measured run receives a new:

- browser process;
- browser context;
- page;
- production generation worker.

The production build and Vite preview server remain shared. This isolates browser and worker retained state while avoiding a rebuild between measurements.

Case order alternates by round. With the example plan, the sequence is:

1. Earthlike round 1
2. Archipelago round 1
3. Archipelago round 2
4. Earthlike round 2
5. Earthlike round 3
6. Archipelago round 3

This reduces the fixed ordering bias in the v0.3.58 baseline.

## Required record content

Every accepted run must contain:

- successful production-worker completion;
- exact workflow, seed, preset, resolution, app version, and commit provenance;
- all six `production.stage.*` phases;
- one or more `performance.operation.*` phases;
- no legacy `deep-time-aging` diagnostic wrapper represented as a child of a smaller native stage.

## Evidence output

The output root contains:

- `summary.json`
- `summary.md`
- `runs.csv`
- `runs/<sequence>-round-<round>-<case>/` with the complete inner-harness evidence for each run

The aggregate summary reports:

- user-visible, worker, handoff, and UI medians;
- production-stage median duration and worker share;
- fine-operation median duration and worker share;
- exact run ordering and source directories.

Production stages are non-overlapping and may be summed. Fine operations are nested and must not be added to stage totals.
