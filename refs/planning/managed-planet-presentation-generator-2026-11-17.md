# Managed Planet Presentation Generator for TWS-Video
Status: planned, approved architectural direction
Date: 2026-11-17
Branch policy: implement on World Forge dev; validate and promote through qa to main

## Goal
Allow local applications, initially TWS-Video, to request World Forge-generated planetary atmosphere and cloud presentation packages without opening World Forge's desktop UI or manually exporting a ZIP. World Forge remains the generator and provenance authority. The caller manages request, progress, caching policy and visual acceptance.

## Current reusable pieces
- `packages/generation-runtime/src/enrichment/atmosphericWeatherPresentation.ts` exports `atmosphericWeatherSourceFromProject`, `runAtmosphericWeatherPresentationWorkflow`, source-signature validation and versioned graph descriptors. The source requires current orbital context and generated climate/map fields (water, wind, moisture, precipitation, temperature, terrain).
- `apps/desktop/src/enrichmentWorker.ts` already runs weather enrichment in a Web Worker; `useAtmosphericWeatherEnrichment.ts` is the UI controller, not a suitable external API.
- `apps/desktop/src/globe/weatherPresentationTexture.ts` renders to HTMLCanvasElement. This browser dependency is the main blocker to direct headless generation.
- `apps/desktop/src/enrichment/exportWeatherCloudSnapshot.ts` creates the validated `world-forge-weather-cloud-snapshot-v1` ZIP with texture, source identity, seed, artifact signature, simulation epoch, workflow version, dimensions and SHA256.
- The optional NASA night-light ETL is Earth-specific. Do not apply it to generated worlds or claim illustrative clouds are observed weather.

## Proposed bounded interface
A managed local job accepts a saved WorldProject path, primary world ID, requested presentation layers, output resolution, simulationDays and output directory. It runs or reuses the current orbital + weather workflow as appropriate. It produces an immutable, checksummed planet-presentation package with manifest, cloud opacity texture and atmosphere parameters, plus optional validated surface layers. All layers have authority and provenance labels.
An initial Node entrypoint is acceptable behind an application-managed subprocess. It is not a user-facing command requirement and must not require the desktop UI. Use structured progress/events, cancellation, clear error classification and atomic output staging. No hosted dependency or credential flow.

## Initial implementation sequence
1. Decide the canonical saved WorldProject loader/export contract and validate signatures against the existing runtime, not serialized UI state alone.
2. Refactor texture rasterization into a reusable backend. Preserve existing canvas behavior, or provide a headless renderer adapter that shares the same texture math. Compare output for same artifact, seed, epoch and dimensions.
3. Add a small headless entrypoint that generates the atmosphere package from an existing saved project; no new planet generation in v1.
4. Add deterministic unit/integration fixtures: missing climate/orbital state, stale artifact, same-seed equality, different-world cache isolation, alpha/PNG dimensions, manifest SHA, cancellation and failure cleanup.
5. Integrate from TWS-Video's application-managed job controller, then extend to generated planet specifications after QA.

## API boundary and non-goals
This service outputs presentation assets, not rules or gameplay data. World Forge's existing scientific/climate maps remain the source of truth for generated worlds. Avoid inventing weather in the video renderer, copying visual-weather algorithms between repos, and screen-scraping the World Forge UI. Keep Earth NASA reference assets separate from fictional-world output. The manual Export Clouds button remains a supported fallback.

## Acceptance criteria
- TWS-Video requests cloud/atmosphere layers for a saved world through UI only.
- World Forge process can run headlessly and report stage progress, failure and cancellation.
- Output package carries source signature, versions, projection, layer roles, dimensions, hashes and credits.
- Matching requests reuse validated cache; changed source/seed/settings regenerate.
- Failure/cancel never corrupts an existing accepted package or project.
- Existing Globe rendering, weather generation and Export Clouds tests remain green.
- Full World Forge dev validation before promotion; Windows TWS-Video visual render and performance QA before release.

## Related consumer plan
Three-Wheeled-Sloth-Studio/TWS-Video: `refs/planning/world-forge-planet-presentation-bridge-2026-11-17.md`.

## Continuation note
Begin with the DOM-canvas dependency and saved project loading contract. The first deliverable should be a testable, source-backed static cloud package for an existing generated world. Do not prematurely expand to animations or full world generation.
