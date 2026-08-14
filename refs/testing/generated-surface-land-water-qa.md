# Generated Surface Land/Water Readability QA

Updated: 2026-08-14

Tracking: World Forge issue `#10`

## Why this note exists

The atlas-only presentation checkpoint at `7bc6b0b8775bbb023e365cfd127439aeffbe3d2e` passed automated validation but failed user visual acceptance: a freshly generated world's ordinary surface still showed cyan/blue-looking land.

The miss was scope, not a failed atlas test. The Generate workflow paints the ordinary world through `@world-forge/renderer`; the earlier palette work only changed bounded geographic-atlas presentation code.

## Corrected ownership

The generated surface now uses the renderer package's existing presentation-normalization seam before biome rendering. It must enforce these presentation invariants without changing authoritative world facts:

- `water: true` always presents through the ocean/water family even if a stale biome label disagrees;
- `water: false` must never present through the ocean family;
- stale non-permanent `ice_cap` land retains the accepted tundra fallback;
- an impossible `water: false` plus `biome: ocean` combination is reclassified for presentation using the shared configured biome rules, not a second classifier;
- land palette entries that are too close to the active ocean/shelf colors receive a warmer terrestrial fallback;
- source project arrays, generator output, saved-world data, `.wforge`, and `.pworld` remain unchanged.

The same renderer entry point supplies the ordinary map, primary-world globe texture, point diagnostics, and simplified SVG output, so these surfaces should agree on the base land/water color decision.

## Automated checks

Focused regression:

```bash
npx vitest run packages/renderer/src/biomeRendering.test.ts
```

Checkpoint validation:

```bash
npm run validate
npm run verify
```

`npm run evaluate:regions` is not required because this correction does not change geographic generation or partitioning.

## Required visual acceptance

After pulling the exact checkpoint and restarting the app:

1. Generate a fresh Earthlike world in the normal Generator workflow.
2. Leave Surface season on Annual mean.
3. In Map view, use Biomes and compare both Data and Natural presentation.
4. Confirm open ocean and shelf remain visibly blue/cyan.
5. Confirm non-ice lowland land, including wetland-heavy lowlands, does not read as shallow water.
6. Confirm coastlines remain easy to follow without turning adjacent land cyan.
7. Switch to Globe view and confirm the base surface texture uses the same land/water distinction.
8. Inspect at least one previously suspicious cyan-looking land point and confirm `isWater` is false and the reported base/final color is terrestrial.

## Acceptance boundary

Automated validation can prove the semantic and palette invariants. Final acceptance still requires the visual pass above because the defect is perceptual. Do not close the color issue solely from green CI.
