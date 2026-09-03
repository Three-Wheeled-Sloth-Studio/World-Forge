---
type: "Testing Reference"
title: "Production Page Performance Harness"
tags:
- world-forge
- testing
---
# Production Page Performance Harness

Updated: 2026-08-02

Related:

- Issue #14
- `refs/planning/production-performance-instrumentation-plan.md`
- `refs/planning/generation-resolution-semantics.md`
- `refs/planning/durable-production-performance-audit.md`
- `scripts/profile-production-page-runner.ts`
- `scripts/profile-production-page.ts`
- `refs/testing/production-page-performance-plan.example.json`

## Purpose

Run repeatable generation-performance tests through the actual World Forge page instead of calling generator functions directly.

The harness:

1. resolves the current Git commit;
2. builds the production Vite bundle with that commit embedded as provenance;
3. starts the production preview server;
4. launches a real Chromium or Google Chrome browser through Playwright;
5. uses the visible Generator controls to select the preset, star preset, workflow, resolution, and seeds;
6. clicks the page's real Generate button;
7. waits for the page's versioned production timing record;
8. rejects runs that bypass the production worker or do not match the requested configuration;
9. writes the complete timing JSON, page-generated Markdown report, CSV run table, and aggregate summary.

This is a browser-driven parity and evidence harness. It exercises the production page bundle, React state path, generation worker, structured-clone handoff, project acceptance, render commit, and first interactive paint. It does not substitute a lower-level Node generation call.

The public npm command first runs `scripts/profile-production-page-runner.ts`. That runner invokes npm through the active Node/npm CLI rather than spawning `npm.cmd` directly, so build and preview orchestration work on Windows paths as well as Linux/macOS. The inner browser harness remains `scripts/profile-production-page.ts`.

## Evidence durability

The browser page's bounded `localStorage` history is a telemetry buffer. It is not a durable audit log and is not centrally accessible.

The command-line harness writes durable local evidence under `.local/performance/production-page/`. These files survive the browser session and are the current authoritative evidence for a commanded baseline run, but they are still local to the machine unless uploaded or committed.

A centralized PostgreSQL audit pipeline is not yet implemented. Its required shape is specified in `refs/planning/durable-production-performance-audit.md`. Until that work lands, reports must not imply that page timing records were written to a shared audit table.

## Installation

Install repository dependencies normally:

```bash
npm ci
```

If Playwright Chromium is not already installed:

```bash
npx playwright install chromium
```

Google Chrome can be used instead with `--browser chrome`.

## Standard use

Single matched case:

```bash
npm run profile:production-page -- --seed 1001001 --preset Earthlike --workflow core.performance-foundation --resolution 2048x1024 --runs 3 --warmup 1
```

Cartesian matrix from repeated or comma-separated values:

```bash
npm run profile:production-page -- --seed 1001001,3141592,8675309 --preset Earthlike,Archipelago --resolution 1024x512,2048x1024,4096x2048 --runs 3 --warmup 1
```

Exact plan file:

```bash
npm run profile:production-page -- --plan refs/testing/production-page-performance-plan.example.json
```

Drive an already running page without building or starting Vite:

```bash
npm run profile:production-page -- --base-url http://127.0.0.1:4173 --seed 1001001 --resolution 2048x1024
```

Use `--help` for the complete option list.

## Defaults and measurement semantics

- Headed browser mode is the default because the primary metric is user-visible page behavior.
- One fresh browser context is created per test case.
- Warmup and measured runs share the same page by default. This preserves JavaScript JIT and page-state warming within the case.
- Warmup records are retained but excluded from aggregate statistics.
- `--reload-between-runs` reloads and reconfigures the real page before every run. It is not equivalent to restarting the browser process or operating system.
- The harness builds before testing unless `--skip-build` or `--base-url` is supplied.
- The production page's own timing record remains authoritative. Harness stopwatch timing is intentionally not used as a competing metric.
- Parent native-stage timings and child diagnostic-operation timings must not be added together.

## Resolution semantics

The resolution argument selects a combined generation-quality tier. Under the current architecture it changes both:

- the projected equirectangular output dimensions;
- the authoritative cubed-sphere topology resolution used for geography, geology, hydrology, climate, and related world generation.

It is therefore not equivalent to choosing only a larger or smaller final image.

For deterministic and performance comparisons:

- repeated runs at the same resolution, workflow, resolved settings, and seed are expected to produce identical authoritative results;
- the same seed at different resolutions is expected to produce a recognizably similar world with legitimate local differences;
- cross-resolution runs must not be compared for exact output signatures;
- cross-resolution scaling results include both increased simulation work and increased projection, transfer, and rendering work;
- before/after optimization claims must use a matched resolution unless the stated purpose is scaling analysis.

Expected cross-resolution differences include coastline detail, small islands, local relief, drainage boundaries, river paths, local climate and biome boundaries, and other threshold-sensitive features. Broad preset intent, land-versus-ocean character, continental or archipelago character, climate character, and seed provenance should remain recognizable.

The complete current contract and future direction for separating simulation detail from export resolution are defined in `refs/planning/generation-resolution-semantics.md`.

## Output

The default output folder is:

```text
.local/performance/production-page/<timestamp>/
```

Each case receives:

- `warmup-NN.json`
- `warmup-NN.md`
- `run-NN.json`
- `run-NN.md`
- optional `*-harness.json` files containing warnings or validation failures
- a failure screenshot when the page can still be captured

The root folder receives:

- `summary.json`
- `summary.md`
- `runs.csv`

The aggregate summary reports median and range for:

- user-visible wall time;
- worker generation time;
- completed-project handoff;
- UI acceptance through interactive paint;
- slowest native stage by median duration.

## Validation rules

A measured run is invalid when:

- generation did not complete;
- the page record identifies a non-generator launch source;
- workflow, seed, or resolution differs from the requested case;
- worker receipt or worker generation timing is missing;
- the same-window fallback was used instead of the production worker.

Page visibility, focus state, browser console errors, and declared instrumentation gaps are retained as warnings in the evidence.

## Plan format

```json
{
  "runs": 3,
  "warmupRuns": 1,
  "reloadBetweenRuns": false,
  "cases": [
    {
      "id": "earthlike-default",
      "seed": "1001001",
      "starSeed": "1001001",
      "preset": "Earthlike",
      "starPreset": "sol-like",
      "workflow": "core.performance-foundation",
      "resolution": "2048x1024"
    }
  ]
}
```

`runs`, `warmupRuns`, and `reloadBetweenRuns` may also be overridden per case.

## Boundary

This harness runs the real production web page and worker bundle. It does not yet launch the Tauri desktop shell itself. That distinction must remain explicit in reports. Shell startup, native webview differences, and operating-system packaging overhead require a separate Tauri-driven harness if they become material.
