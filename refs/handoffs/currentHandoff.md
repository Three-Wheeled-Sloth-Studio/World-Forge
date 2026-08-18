# Current Handoff

Updated: 2026-08-18

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Accepted runtime baseline

Accepted implementation/presentation checkpoint before this documentation handoff:

- commit: `b0197a4669d605ecd771810f589feae109bb94e3`
- visible version: `0.3.80`
- Validate World Forge run `#844` / run id `31980878852`
- 143 test files passed
- 517 tests passed
- typecheck/build, production harness tests, and both production smokes green

The current TTRPG direction is good enough to park. Owner QA on v0.3.80 identified two minor presentation debts that should remain deferred during the next increment:

1. TTRPG ocean is still too dark/heavy; desired direction is a very light, subtle watercolor wash.
2. TTRPG terrain icons are visibly misaligned in places; future work should improve anchoring/placement semantics without changing canonical geography.

Do not spend the next increment polishing these unless the Earth baseline work is complete and the owner explicitly reopens them.

## Next active priority

The next implementation focus is a **maintained Earth reference rebuild at Ultra 4096 x 2048**, using the current source-backed Earth ETL and normal Sol/Parchment packaging path.

Authoritative execution prompt:

- `refs/handoffs/next-dev-prompt.md`

Relevant reference-system context:

- `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
- `refs/research/reference-data/earth-reference-data.md`
- `refs/planning/reference-system-etl-and-multi-body-navigation.md`
- World Forge issue #124
- Parchment Worlds issue #22

## Earth target and source ceiling

World Forge's standard map resolutions top out at:

- Ultra 4096 x 2048.

The current Earth source stack supports that target without exceeding source fidelity:

- NOAA ETOPO 2022 v1 60 arc-second global Ice Surface elevation/bathymetry, approximately 21600 x 10800 native angular sampling;
- Beck et al. Koppen-Geiger 1991-2020 1 km climate classification, materially finer than the 4096 x 2048 target.

The Earth reference target for the next increment is therefore:

- map raster: 4096 x 2048;
- topology resolution: expected 512, but resolve through the existing canonical output-to-topology policy/helper rather than creating a new hardcoded rule.

Do not add a new Earth-only resolution tier above Ultra.

## Pipeline mismatch to address

Current defaults are inconsistent:

- `tools/reference-etl/prepare_etopo_earth.py` defaults to 2048 x 1024 with topology 256;
- `scripts/build-sol-reference-pipeline.ts` defaults to 512 x 256 with topology 64;
- the ordinary desktop generated-world default is now 1024 x 512;
- Ultra 4096 x 2048 is the highest existing standard map option.

The next developer should establish one explicit, tested maintained-Earth reference target consumed by the normal source-to-package pipeline. Do not change the ordinary fictional-world generation default as collateral work.

## Package/integration boundary

The high-resolution Earth must remain part of the existing one-project Sol system.

Rebuild through the normal multi-body pipeline and preserve currently accepted non-Earth content, including:

- Jupiter presentation assets;
- currently packaged Mars reference assets;
- stable body catalog identity and Parchment bindings.

Do not produce an Earth-only `.wforge` as the maintained output.

After rebuilding the World Forge package, republish the normal Parchment Worlds Sol starter through `npm run reference:publish-sol-starter` or the current canonical equivalent.

## Required evidence

Capture at minimum:

- Earth source bundle dimensions;
- canonical topology resolution;
- ETL/build time;
- normalized layer/bundle sizes;
- final `.wforge` byte size and digest;
- rebuilt `.pworld` size when available;
- browser open/import responsiveness;
- save/reopen behavior;
- Map, Globe, and Explorer behavior on Earth;
- confirmation that another packaged Sol body still works after the rebuild.

If 4096 x 2048 exposes a package-size, eager-loading, or memory problem, record the evidence and identify the architecture follow-up. Do not silently lower the Earth baseline merely to avoid measuring the cost.

## Earth acceptance boundary

Keep the existing imported-reference semantics:

- elevation/bathymetry from ETOPO;
- water mask derived from elevation/sea level;
- broad climate/biome identity derived from source-backed Koppen-Geiger classes;
- wetness derived from Koppen classes;
- permanent ice derived from EF;
- mountains driven by imported elevation.

Do not turn this increment into the separate Earth climate-calibration benchmark.

Do not claim missing source layers are solved. Real hydrography, measured precipitation, full temperature climatology, detailed land cover, tectonic plates, winds, and currents remain separate source-ingestion work unless explicitly reopened.

## Validation

Follow `refs/testing/validationCommands.yaml`.

For the completed Earth reference milestone, run at least:

```bash
npm run verify
```

Also run focused reference-pipeline, package roundtrip, body-awareness, and starter-publisher tests touched by the increment.

`npm run evaluate:regions` is required only if geographic partitioning/tile-window generation behavior changes.

Browser QA is mandatory before the rebuilt Earth baseline is accepted.

## Guardrails

- One Sol system remains one World Forge project.
- Preserve deterministic body identity and package/Parchment bindings.
- Do not create a second resolution policy.
- Do not change ordinary generated-world defaults.
- Do not drop Jupiter, Mars, or accepted body assets while rebuilding Earth.
- Do not start new source ingestion merely because higher resolution is being requested; the existing ETOPO/Koppen sources already support Ultra.
- Do not broaden into lazy-loading implementation, climate calibration, hydrography import, renderer rewrite, or additional TTRPG polish without concrete blocker evidence and owner approval.
