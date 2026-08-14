# Generated Surface Land/Water Readability QA

Updated: 2026-08-14

Tracking: World Forge issue `#10`

## Why this note exists

Generated Earthlike worlds have repeatedly failed visual acceptance because large continental areas read as pale cyan or waterlogged, while the bundled/default Earth reference renders with normal land/water separation.

Two presentation-only repairs were insufficient:

- the atlas-only palette/TTRPG checkpoint did not own the ordinary post-Generate surface;
- the ordinary renderer semantic/palette guard passed automated checks but did not remove the broad pale coverage visible in a fresh generated-world screenshot.

The second visual rejection triggered the repair-loop architecture reassessment required by `AGENTS.md`.

## Current diagnosis

The user screenshot shows dark ocean rendering normally while large generated continental areas use a very pale cool color. That pattern is more consistent with generated permanent-ice presentation than with the normal ocean/shelf palette.

The repository's last dedicated map-lines/polar-ice evidence was captured on 2026-07-29, before the production latitude-temperature profile changed. On 2026-08-02, commit `9305862028fe83d380652f509185fbc06e57ca98` promoted the 52 C `mean-centered-power-v1` latitude profile from Experimental into `core.performance-foundation`, the normal desktop generation workflow.

That promotion had deterministic and warm-versus-cold tests, but no explicit Earthlike maximum land-ice coverage and no repeat of the earlier generated-surface visual QA.

The immediate repair therefore restores production to `legacy-linear-v1`, the last profile with accepted generated polar-ice evidence, while retaining `mean-centered-power-v1` under Experimental for future calibration.

## Automated climate regression contract

Focused tests:

```bash
npx vitest run \
  packages/generator-core/src/latitudeTemperatureProfile.test.ts \
  packages/generator-core/src/polarClimateIntegration.test.ts
```

Production Earthlike acceptance for representative deterministic seeds:

- average temperature input: 15 C;
- axial tilt: 23.4 degrees;
- total permanent land-ice share must remain below 20 percent;
- permanent land-ice share at absolute normalized latitude <= 0.45 must remain below 2 percent;
- warm worlds must remain less icy than cold worlds;
- repeated production generation must remain deterministic;
- `core.performance-foundation` must select `legacy-linear-v1`;
- `core.world-generation-experimental` must retain `mean-centered-power-v1`.

The 20 percent ceiling is deliberately broad. It is not an Earth climatology target. It is a regression barrier against the visually dominant pale-ice failure mode while leaving room for colder deterministic Earthlike outcomes.

## Renderer defense in depth

The renderer guard introduced after the first failed visual pass remains required:

- canonical `water: true` presents through the water family;
- canonical `water: false` cannot remain an ocean presentation biome;
- stale non-permanent `ice_cap` land falls back to tundra;
- source project arrays remain authoritative and unmodified by presentation normalization;
- land palette entries that collide perceptually with ocean/shelf colors receive terrestrial presentation fallbacks.

These are semantic safety rails, not the current root fix.

## Checkpoint validation

Run:

```bash
npm run validate
npm run verify
npm run evaluate:regions
```

`npm run evaluate:regions` is required for this checkpoint because production generation behavior changes, even though geographic partition algorithms themselves are untouched. The manual `Geographic Drilldown Diagnostic` GitHub workflow also runs this command when workflow dispatch is available.

## Required visual acceptance

After pulling the exact checkpoint and restarting the app:

1. Generate a fresh Earthlike world in the normal Generator workflow.
2. Leave Surface season on Annual mean.
3. Use Map view, Biomes, and the same presentation mode that previously showed the pale coverage.
4. Confirm open ocean and shelf remain unmistakably water.
5. Confirm ordinary low- and mid-latitude land is primarily terrestrial biome color rather than pale ice/cyan.
6. Confirm permanent ice is geographically plausible and concentrated toward high latitude and genuinely cold/high terrain rather than dominating continental interiors.
7. Switch between Data and Natural presentation and confirm both tell the same land/water/ice story.
8. Switch to Globe view and confirm the primary-world texture agrees with Map view.

If suspicious pale land remains, enable point diagnostics and inspect a representative pale cell. Record at minimum:

- `isWater`;
- `isIce` / `permanentIce`;
- latitude;
- elevation relative to sea level;
- temperature;
- biome and topology biome;
- base biome color and final albedo.

Do not make another palette or climate-threshold change without that point-level evidence.

## Acceptance boundary

Automated validation proves the climate-profile selection, ice-coverage regression bounds, determinism, build integrity, and renderer invariants. Final closure still requires the human visual pass because the original defect is perceptual and was only exposed by user QA.
