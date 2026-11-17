# TWS-Video headless atmosphere bridge: implementation checkpoint

Date: 2026-11-17
Branch: dev
Status: in progress; not yet usable from TWS-Video

## Completed first extraction

The existing weather presentation renderer now accepts an optional injected canvas factory, including its low-resolution intermediate cloud field. The default factory remains the browser DOM canvas, preserving existing Globe and Export Clouds call sites. A headless host can supply a compatible Canvas2D backend without spoofing the global document. This is a dependency-injection seam, **not yet a functioning headless generator or a verified pixel-identical backend**.

## Next implementation in World Forge

1. Select and package a local Node-compatible Canvas2D backend, or an explicitly managed local headless browser backend, and prove PNG parity with the existing UI exporter. Test filter blur, lighter compositing, gradients and drawImage scaling; do not assume backends match pixel-for-pixel.
2. Add a managed JSON job entrypoint for a saved .wforge project. Reuse the current project reader, orbital enrichment, atmosphericWeatherSourceFromProject and runAtmosphericWeatherPresentationWorkflow; do not duplicate climate logic.
3. Emit line-delimited machine-readable progress and typed failure codes. Support cancellation and source-signature validation. Produce immutable staged manifest.json plus SHA256-verified clouds.png and atmosphere metadata. Never modify source .wforge.
4. Validate with npm run verify and fixture parity tests; follow dev -> qa -> main promotion policy.

## Then implement in TWS-Video main

Add automatic sibling World Forge discovery with explicit optional setting, subprocess lifecycle, visible progress/cancel/errors, staging cache validation, preview and explicit acceptance. Existing Everybody Sells the Sky project and accepted package must remain unchanged until acceptance. The existing downloadable ZIP importer is fallback only, not the intended normal workflow.

## Evidence boundary

The extraction commit has been pushed to World Forge dev. CI, runtime smoke, PNG parity and Windows visual QA have **not** been run in this session. Do not describe this as integrated or release-ready.
