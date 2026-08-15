# Current Handoff

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Accepted generated-surface repair

The broad pale `Ice Cap` regression on freshly generated Earthlike worlds is resolved and visually accepted.

Accepted implementation checkpoint:

- commit: `0c2af70265fd862d34bbc517c84e3b24a8657892`
- message: `fix: use final sea level for permanent ice`
- GitHub Actions: Validate World Forge run `#824` / `31843938037`
- tests: 135 files / 488 tests green
- type-check, production build, harness tests, and production smokes green

Root defect: post-deep-time system/orbit reconciliation re-ran permanent-ice classification against an earlier sampled sea-level parameter instead of authoritative present-day `primaryWorld.seaLevel`. The accepted repair uses `world.seaLevel`. Human visual acceptance was completed on 2026-08-15 with the reported Sol-like / Earthlike `sol-reference-v1` case.

## Current active item: TTRPG/cartographic atlas presentation

The first 2D `TTRPG` presentation remains a presentation-only view over canonical `GeographicTileWindow` facts. User screenshot review accepted the subdued parchment/terrain palette and inked coastline, but identified three refinement needs:

- Hexes on/off was too subtle;
- generated numeric child labels made the map read like a diagnostic surface;
- the map needed restrained hand-drawn terrain symbols.

The project owner supplied a normalized stippled map token set on 2026-08-15. The Phase 1 implementation uses an optimized sprite and semantic asset manifest rather than scattering filenames through renderer code.

### Phase 1 symbol behavior

Eligible symbols are derived only from facts already present on canonical tiles:

- mountainous terrain -> mountain-chain family;
- mountainous + forest/taiga -> mountain-with-trees family;
- rough terrain -> hills;
- explicit forest/taiga detail -> pine forest;
- explicit rainforest detail -> rainforest;
- explicit wetland facts -> swamp;
- explicit volcano detail -> volcano.

Placement is deterministic from stable tile IDs, sparse, collision-limited, and bounded per visible window. Icons are drawn only inside the selected parent map and never mutate source facts. Large illustration tokens are skipped on canonical river tiles so river paths remain readable.

The asset manifest also reserves reef, settlement, and compass artwork. Reef placement is deliberately deferred because the current canonical tile contract has no reef fact; generic aquatic/coastal water is not sufficient evidence to assert a reef. Castle, tower, village, and compass rose remain a later map-dressing increment.

### TTRPG cleanup

- existing subtle palette and coastline treatment remain unchanged;
- Hexes-on receives a stronger ink grid while Hexes-off remains clean;
- generated labels such as `Region 138`, `Subregion 4`, `Local 22`, and `Detail 3` are suppressed in TTRPG mode;
- meaningful future names continue to use the existing cartographic serif treatment;
- Natural and Terrain presentations remain unchanged.

## Validation

Focused coverage should include:

```bash
npx vitest run \
  apps/desktop/src/regions/ttrpgMapSymbols.test.ts \
  apps/desktop/src/regions/geographicTileWindowMap.test.ts \
  apps/desktop/src/regions/geographicAtlasPresentation.test.ts
```

Then run the standard exact-head build-facing validation gate. `npm run evaluate:regions` is not required for this Phase 1 symbol pass because it does not change generation, geographic classification, or partition behavior.

Manual visual acceptance is still required. Re-open the same coastal TTRPG sample with Hexes off and on and verify:

- hand-drawn symbols are present but sparse;
- major terrain patterns remain readable beneath the symbols;
- icons do not overwhelm coasts, rivers, or hierarchy boundaries;
- Hexes-on is visibly different from Hexes-off;
- generated numeric labels no longer clutter the map;
- the existing subtle palette and coastline remain intact.

## Guardrails

- Do not reopen broad 2.5D or PBR work as part of this pass.
- Do not add a second geography or terrain classifier.
- Do not infer specific terrain features that are absent from canonical facts merely because an icon exists.
- Do not change hierarchy, tile IDs, membership, generation, `.wforge`, `.pworld`, or saved-world contracts for styling.
- Preserve Natural/Terrain behavior while refining TTRPG.
- Settlement symbols and decorative map furniture remain later work unless explicitly reopened.
