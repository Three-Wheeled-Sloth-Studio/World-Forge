# Current Handoff: Deferred Complete Sol Globe QA

Updated: 2026-08-05

Status: Earth, Jupiter, and Mars remain user-accepted. The enriched Sol starter rebuild and normal Parchment publish path succeeded, but the new basic Globe baseline for Sol, the remaining planets, and moons did **not** pass user visual QA. This work is pinned for later rather than treated as complete. Main Asteroid Belt and Kuiper Belt remain intentional System placeholders.

## Read first

1. `refs/testing/sol-basic-globe-acceptance.md`
2. `refs/testing/sol-reference-pipeline.md`
3. `refs/decisions/mars-venus-product-direction-2026-08-05.md`
4. `refs/planning/body-detail-tiers-and-payload-strategy.md`
5. World Forge issue #124
6. Parchment Worlds issue #22

## Accepted baseline

User-confirmed:

- Earth looks great.
- Jupiter's imported atmospheric presentation and selector hierarchy look correct.
- Mars' real Viking/MOLA Tier 2 Globe and Map look good.
- Normal Parchment starter generation and import remain responsive.

Do not regress these three body paths while revisiting the deferred basic presentations.

## Latest successful package evidence

The root `refresh_sol_starter.bat` completed successfully and published through the normal World Forge and Parchment package paths.

```text
Bodies: 23
Earth map: 512 x 256
Jupiter appearance: 768 x 384 RGB565
Mars prepared surface: 512 x 256, 2 assets
Prepared body bundles: 1

World Forge package:
.local/reference-data/sol-earth-reference.wforge
package bytes: 2,763,277
SHA-256: 99852f4549b778d097f94511562381f572394803b297011ac9c183404b4defbd

Pipeline report:
.local/reference-data/sol-earth-reference.wforge.pipeline.json

Parchment starter:
apps/web/public/starter-projects/sol-system.pworld
```

The latest `.pworld` byte size and full digest were not captured. Do not invent them.

## Automated implementation evidence

Validated implementation head:

```text
b9997fdd7a124f16d44b10e4b6bcac5ca5a4fa94
```

Workflow:

```text
Validate World Forge
run 31035846677
```

Passed:

- complete unit and integration suite;
- production TypeScript build;
- production page-harness self-test;
- production attribution-rerank self-test;
- both browser smokes.

A later handoff/documentation head also passed exact-head validation, but automated success did not establish visual acceptance.

## Deferred user QA findings

The complete-Sol basic Globe pass is **not accepted**.

Observed:

- Sol appears as a flat yellow orb with no useful definition.
- Luna, Phobos, Deimos, Io, and the remaining moons do not expose working Globes.
- Mercury, Venus, Saturn, and Uranus render but lack sufficient visual definition.
- Testing was stopped after confirming the moon Globe path was broadly absent and the new planet presentations were below the desired bar.
- Earth, Mars, and Jupiter still look good.

Disposition:

- Preserve the current generic contracts and package evidence as groundwork.
- Do not close the complete-Sol visual increment.
- Return later with repaired moon Globe routing and materially richer presentation quality.
- Source-backed textures, deterministic generated detail, or a stronger procedural material path are all valid future approaches.
- Belts may remain placeholders.

## Existing generic contract

`basic-presentation` currently carries generic package data for:

- sphere, oblate, or triaxial shape;
- palette;
- roughness and metalness;
- optional emissive treatment;
- optional halo;
- optional ring plane;
- approximation/source note.

The viewer does not require body-name-specific visual rules. The failure is therefore a presentation-quality and routing problem, not a reason to add Sol-specific durable schemas.

## One-click local refresh

The repository root includes:

```text
refresh_sol_starter.bat
```

It runs the normal enriched Sol exporter and regenerates Parchment Worlds' bundled `sol-system.pworld`.

## Candidate next slices

### 1. Canonical tile-window geographic drilldown — recommended

World Forge issue #10 is the strongest next product slice.

Why:

- it is already defined as the immediate next geographic increment;
- it delivers obvious user value beyond global map inspection;
- it replaces the current soft raster enlargement with deterministic world-anchored tile windows;
- it establishes the spatial model needed by Explorer, later editors, resources, settlements, and civilization simulation;
- it is independent of the deferred Sol presentation work.

Best bounded start: WP1 and WP2 from Issue #10 — extract the shared classifier, define the versioned tile-window contract, and prove seam-aware overlapping windows before committing to the full renderer/UI pass.

### 2. Editing and versioning foundation — strategic, but not yet ready

The user direction remains easy-to-do/easy-to-undo editing for coastlines, biomes, and feature placement. This is strategically important, but it lacks a current implementation issue and should begin with a focused planning slice covering revision identity, reversible operations, invalidation, regeneration blending, and `.wforge` persistence.

This becomes substantially easier after canonical tile windows exist, because edits can target stable world coordinates instead of screen pixels or enlarged rasters.

### 3. Active-body and moon-routing cleanup — small tactical slice

World Forge issue #124 still owns generic body continuity and unsupported-view behavior. A narrow slice could diagnose why published moon records do not become Globe targets and close the routing defect without attempting richer art.

This is lower priority unless the goal is to reduce known technical debt. It risks pulling work back into the deliberately deferred Sol visual track.

### 4. Production performance audit store — infrastructure slice

World Forge issue #116 would add a PostgreSQL-backed append-only production timing trail. It is useful for long-term performance governance, but it offers less immediate user value than drilldown or editing and is not required to continue local benchmark work.

## Future return criteria for Sol

Before asking for another complete-Sol acceptance pass:

1. Verify every selected moon exposes a working Globe target from the normal starter package.
2. Add visible surface or atmospheric definition beyond flat-color spheres.
3. Make Sol read as a star rather than a yellow planet.
4. Preserve the accepted Earth, Jupiter, and Mars paths unchanged.
5. Keep asteroid and Kuiper belts as placeholders unless separately scoped.
6. Run the normal `.wforge` and `.pworld` paths and record fresh package evidence.
7. Perform browser QA before describing the increment as accepted.

## Guardrails

- One stellar system remains one project.
- Unsupported views must not silently switch to Earth.
- Basic presentation does not imply source-backed surface accuracy.
- Venus Globe presentation must not be mislabeled as Magellan visible-light imagery.
- Belts remain population records, not fake spherical worlds.
- Do not fabricate `PrimaryWorld` for non-geographic bodies.
- Keep normal `.wforge` and `.pworld` package paths authoritative.
- Do not reopen lazy loading without measured evidence.
- Earth climate calibration and selector flicker remain separate tracks.
