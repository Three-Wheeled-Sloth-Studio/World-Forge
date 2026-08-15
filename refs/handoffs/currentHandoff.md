# Current Handoff

Updated: 2026-08-15

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Tracking issue: `#10`

## Accepted generated-surface repair

The broad pale `Ice Cap` regression on freshly generated Earthlike worlds is resolved and visually accepted.

Accepted implementation checkpoint:

- commit: `0c2af70265fd862d34bbc517c84e3b24a8657892`
- root defect: final permanent-ice reconciliation used the earlier sampled sea-level parameter instead of authoritative present-day `primaryWorld.seaLevel`
- exact-seed regression: Sol-like / Earthlike `sol-reference-v1`
- human visual acceptance: 2026-08-15

Do not reopen this generation repair without new evidence.

## Rejected presentation checkpoints

Owner screenshot QA rejected both `0.3.75` and `0.3.76` for the same visible defect:

- Data -> Biomes showed broad pale-cyan continent-shaped land;
- TTRPG -> Biomes showed the same broad land areas as blue-gray/slate rather than parchment;
- the TTRPG palette itself was present but largely hidden;
- point inspection was no longer obvious while the right context panel was collapsed.

The `0.3.76` primary-body source-of-truth repair remains valid multi-body cleanup, but it did not cause this visual defect and must not be cited as its fix.

## Root cause: scalar river field used as visible paint

The full-world renderer had two river presentation passes:

1. `drawRiverChannels()` converted the scalar `primaryWorld.layers.river` hydrology field into cell-to-cell strokes for every land cell above a low `0.08` threshold.
2. `drawRivers()` then drew the explicit authoritative `primaryWorld.rivers` paths.

The first pass is the visual failure. It used very high-opacity river paint over a broad scalar drainage field:

- Data shadow alpha: `0.62`; channel alpha: `0.86`; channel color comes from the pale-cyan Data river theme.
- TTRPG shadow alpha: `0.62`; channel alpha: `0.86`; channel color `#58787d`.

Screenshot pixel comparison matched this composite closely: ordinary terrestrial base colors driven through the two river-field paint passes produce the observed Data cyan and TTRPG slate families.

This also violates the already-established geographic river contract in `geographicRiverTileProjection.test.ts`: authoritative paths must not be replaced by or inflated from the sampled scalar river field.

## Active checkpoint: v0.3.77

The repair boundary is presentation-only:

- normal full-world canvas presentation suppresses legacy scalar-river painting;
- visible rivers come only from deterministic `primaryWorld.rivers` paths;
- Data, Natural, and TTRPG share that contract;
- scalar `layers.river` remains available for hydrology, classification, diagnostics, and generation logic;
- no generation, water, sea-level, biome, geographic partition, saved-world, `.wforge`, or `.pworld` contract changes;
- point inspection should auto-expand the right context panel when a new inspected point is created, so QA can see the existing water/ice/river facts immediately.

The legacy low-level renderer retains its scalar channel routine for compatibility, but the supported presentation wrapper no longer enables it. Do not re-enable scalar river geometry in ordinary presentation without a deliberate diagnostic mode and a separate visual contract.

## Focused regression contract

Renderer regression coverage must prove:

- a project with `world.rivers = []` and scalar river fields filled with `1` produces no visible river strokes when river display is enabled;
- Data output with scalar-only river support is identical whether the river display toggle is on or off;
- TTRPG output with scalar-only river support is identical whether the river display toggle is on or off;
- explicit authoritative river paths still produce visible strokes.

## Manual visual acceptance

Use the same owner world that exposed the defect if possible. No regeneration is required.

Data -> Biomes:

- former cyan continent interiors must expose their underlying terrestrial biome colors;
- actual rivers remain narrow explicit lines;
- actual water remains blue.

TTRPG -> Biomes:

- land must read as warm parchment/tan at first glance;
- water must remain a distinct cooler/darker field;
- river ink must be sparse enough that it cannot recolor whole drainage basins;
- coastline remains legible.

Point inspector:

- with the inspection/search control active, clicking a map point creates the marker;
- if the right panel is collapsed, the first new point inspection expands it automatically;
- the existing inspector fields should make `water / lake / ice` and scalar `river` values visible for any remaining suspicious pixel.

## Validation contract

This is build-facing presentation work:

- focused renderer river-presentation regression tests;
- full exact-head unit/integration gate;
- type-check and production build;
- production harness tests and smokes.

`npm run evaluate:regions` is not required because generation and geographic partitioning are unchanged.

Manual visual acceptance remains mandatory. Automated green does not supersede screenshot rejection.

## Guardrails

- Do not create a second geography, hydrology, or terrain model.
- Canonical `primaryWorld.rivers` owns visible river path geometry.
- Scalar `layers.river` is supporting hydrology data, not permission to paint a continuous cartographic channel network.
- Preserve accepted generation behavior and Natural behavior except for removal of the diffuse scalar-river wash.
- Do not reopen broad 2.5D/PBR work.
- Do not claim the Data/TTRPG visual defect fixed until owner screenshot acceptance.
