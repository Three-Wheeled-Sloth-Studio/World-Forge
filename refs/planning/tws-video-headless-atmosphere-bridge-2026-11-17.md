---
type: "Planning Reference"
title: "TWS-Video Headless Atmosphere Bridge Implementation"
tags:
- world-forge
- atmosphere
- handoff
---
# TWS-Video headless atmosphere bridge: implementation checkpoint

Date: 2026-11-17
Branch: dev
Status: World Forge JSON job implemented; TWS-Video integration pending

## Completed first extraction

The existing weather presentation renderer now accepts an optional injected canvas factory, including its low-resolution intermediate cloud field. The default factory remains the browser DOM canvas, preserving existing Globe and Export Clouds call sites. A headless host can supply a compatible Canvas2D backend without spoofing the global document. This is a dependency-injection seam, **not yet a functioning headless generator or a verified pixel-identical backend**.

## Implemented managed job

`scripts/generate-atmosphere-job.ts` is the World Forge-owned, process-managed interface. It accepts a JSON request file with `schema: world-forge-atmosphere-job-v1`, absolute `sourceWforge` and `outputDirectory`, optional `simulationDays` and optional absolute `browserExecutable`. The internal `npm run bridge:atmosphere -- --request <path>` target is for an application subprocess, not a user workflow.

The job imports an existing saved `.wforge`, validates/rebuilds orbital and weather enrichment, and runs the exact Globe cloud texture module inside local headless Chromium. It reports newline-delimited JSON `progress`, `completed` or `error` records. Completed output consists of `clouds.png`, `atmosphere.json`, and `manifest.json` with SHA256 of both products and the source project. Output is staged in a sibling directory and only published on complete generation; it does not mutate the input project. A previously completed output destination is not overwritten.

## Remaining validation and hardening

1. Complete Windows headless-Chromium discovery and app-managed runtime smoke. This environment's Chromium launch is blocked by a local socket sandbox (`EPERM`), so no browser pixel parity is claimed.
2. Cover reruns, cancellation, incompatible `.wforge`, output destination collisions and explicit browser-unavailable errors. The core project-to-artifact and manifest checksum integration test uses an injected PNG stub because this sandbox cannot launch Chromium.
3. Run `npm run verify`, complete visual parity validation, and follow dev -> qa -> main promotion policy.

## Then implement in TWS-Video main

Add automatic sibling World Forge discovery with explicit optional setting, subprocess lifecycle, visible progress/cancel/errors, staging cache validation, preview and explicit acceptance. Existing Everybody Sells the Sky project and accepted package must remain unchanged until acceptance. The existing downloadable ZIP importer is fallback only, not the intended normal workflow.

## Evidence boundary

The extraction commit has been pushed to World Forge dev. CI, runtime smoke, PNG parity and Windows visual QA have **not** been run in this session. Do not describe this as integrated or release-ready.
