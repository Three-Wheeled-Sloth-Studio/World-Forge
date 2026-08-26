# Downstream Generator Earth Validation Checkpoint

Updated: 2026-08-26

Branch: `dev`

## Outcome

World Forge now has a reusable component-metric validation framework and a maintained Earth scenario for atmospheric circulation, ocean circulation, hydration, biome assignment, and downstream performance. Earth observations remain isolated from generator inputs. Fast, Standard, and Ultra diagnostics pass after three measured production corrections.

This diagnostic is intentionally outside routine push CI. Routine tests cover framework math, schema/report behavior, the production adapter seam, circulation contracts, and small deterministic generation only.

## Audited production stage order

```text
initial graph climate/hydrology (provisional)
  -> deep-time terrain and final water
  -> topology climate refresh
  -> topology hydrology rebuild
  -> topology biome classification and cohesion
  -> topology-to-raster projection
  -> fixed-grid pressure systems and raster basin circulation
  -> final metrics and biome diagnostics
```

The topology climate refresh calculates temperature, moisture fetch, orographic lift/shadow, precipitation, wetness, and permanent ice. Hydrology consumes those fields. Basin circulation uses a fixed 128 x 64 pressure model, writes final raster winds, applies bounded pressure/orographic precipitation reconciliation, and evaluates raster currents with at most ten basin gyres.

The dominant downstream scaling work is topology traversal plus linear raster projection/circulation. Basin current evaluation declares four Float32 buffers plus one Int16 owner buffer: about 144 MiB at Ultra.

## Validation architecture

The generic `packages/validation-core` contract is:

```text
scenario -> production adapter -> observations/invariants -> component metrics
         -> performance -> JSON/Markdown report -> baseline comparison
```

Each metric declares its evidence kind, unit, threshold where justified, what it proves, and what it does not prove. Directional baseline comparison supports absolute or relative tolerances. No combined realism score is produced.

The Earth adapter receives only elevation, water, physical constants, resolution, and topology resolution. Köppen-derived wetness, biome, and ice layers exist only in the observation object passed to metric evaluators. The adapter invokes `reconcilePresentDayDownstream`; it does not duplicate production generator logic.

Plausibility comparisons aggregate to a fixed 128 x 64 analysis grid so all tiers evaluate the same broad physical structures and do not reward native-pixel or topology-projection artifacts.

## Evidence limits

- Elevation/bathymetry is observed ETOPO 2022 evidence.
- Wetness is a Köppen-derived proxy, not measured precipitation or soil moisture.
- Biomes are compact classes derived from Köppen-Geiger 1991-2020. Reference mountain overrides are excluded because World Forge treats mountain as terrain rather than ecology.
- Permanent ice is derived from Köppen EF.
- No observed wind/current layers are present. Circulation metrics prove structural band direction, convergence, water confinement, and gyre rotation only.

## Measured corrections

### Final biome ownership

Before correction, topology cohesion could reproject pre-pressure biomes after raster pressure classification. Delivered land-biome consistency was 93.32% Fast and 92.73% Standard. Cohesion now runs before final projection and pressure-aware classification. Consistency is 100% at every tier. Köppen macro-F1 also improved at the measured checkpoints.

### Final-wind orography

Scientific evaluation initially exposed an evaluator-coordinate error: stored vectors are geographic north-positive while raster rows increase southward. The production three-cell signs were already correct. The evaluator was corrected and a three-cell contract test now protects that coordinate convention.

The existing pressure pass now applies a bounded final-wind orographic adjustment using its already-computed terrain gradient. This adds no raster traversal. Fixed-grid windward-minus-leeward precipitation is positive at every tier, while Köppen wetness correlation and biome macro-F1 did not regress.

### Resolution-stable moisture influence

Ocean and land influence radii were raw topology-cell counts, so their physical reach shrank by 4x from Fast to Standard and another 4x from Standard to Ultra. Radii are now scaled from the ordinary topology-256 product reference. The former repeated in-place distance scans were replaced by deterministic multi-source shortest-path traversal, keeping the larger Ultra radius linear in topology cells.

This made coastal/interior and representative-region behavior more comparable across tiers. Standard core downstream time improved by about 9% and Ultra by about 7%. Ultra representative-region wetness rank correlation reached 0.879. Ultra biome macro-F1 decreased by about 0.012 and wetness rank correlation by about 0.005; both remain inside accepted component tolerances.

### Bounded land-moisture recycling

Present-day climate now derives a recyclable source only from already-humid land, weights it by warmth, and diffuses it through land-bearing cells at a fixed topology-64 reference scale. The contribution is capped, favors continental interiors, requires established local humidity, and is suppressed by 90% in the subtropical subsidence belt. Broad ocean barriers remain excluded at the propagation scale. A small reduction in the separate coastal bonus avoids double-counting marine influence.

The fixed-scale solve is resolution-stable and linear in authoritative topology cells: one reduction, five small reference-grid passes, and one expansion. Tests protect resolution comparability and ocean-barrier confinement. Manual validation also adds explicit humid-region and dry-region means so an inland-moisture change cannot hide desert wetting behind an aggregate score.

At Ultra, wetness rank correlation improved from 0.4632 to 0.4707, extreme balanced accuracy from 0.4582 to 0.4647, Amazon-Sahara contrast from 0.2687 to 0.2888, coastal-interior contrast from 0.3427 to 0.3288, and biome macro-F1 from 0.4636 to 0.4674. Equatorial-subtropical contrast reached 0.3941 versus about 0.3897 in the proxy. Core time remained inside the prior envelope.

## Accepted component baselines

| Metric | Fast 256 x 128 | Standard 1024 x 512 | Ultra 4096 x 2048 |
| --- | ---: | ---: | ---: |
| Zonal wind-band direction | 0.9163 | 0.9109 | 0.9094 |
| Tropical convergence direction | 0.9987 | 1.0000 | 1.0000 |
| Current confinement to ocean | 1.0000 | 1.0000 | 1.0000 |
| Gyre rotation agreement | 0.9663 | 0.9620 | 0.9639 |
| Köppen wetness rank correlation | 0.4769 | 0.4226 | 0.4707 |
| Wet/dry extreme balanced accuracy | 0.4814 | 0.4411 | 0.4647 |
| Amazon-Sahara wetness contrast | 0.1611 | 0.2260 | 0.2888 |
| Orographic precipitation delta | 0.0010 | 0.0150 | 0.0268 |
| Coastal-interior contrast | 0.3590 | 0.3928 | 0.3288 |
| Equatorial-subtropical contrast | 0.3505 | 0.3689 | 0.3941 |
| Representative-region rank correlation | 0.6364 | 0.6848 | 0.8788 |
| Humid-region mean | 0.7594 | 0.6025 | 0.6446 |
| Dry-region mean | 0.5014 | 0.3700 | 0.3626 |
| Köppen biome macro-F1 | 0.4360 | 0.4616 | 0.4674 |
| Final biome consistency | 1.0000 | 1.0000 | 1.0000 |
| Core downstream time | 144.5 ms | 916.4 ms | 12,731.3 ms |

Core time excludes reference-file loading and report serialization. The current Ultra adapter wall time was 19.5 seconds. The earlier full-generator Ultra baseline remains 204.0 seconds; validation no longer generates a disposable procedural shell before installing the reference surface.

Versioned tolerances are stored under `refs/testing/downstream-earth-baselines/` and are loaded automatically by the manual runner.

## Commands

```text
npm run validate:downstream-earth:fast
npm run validate:downstream-earth:standard
npm run validate:downstream-earth:ultra
```

All three commands write JSON and Markdown reports beneath ignored `.local/validation/downstream-earth/`.

## Next evidence-led work

Hydration remains the weakest observed-proxy component: fixed-grid wetness rank correlation is 0.42 Standard and wet/dry extreme balanced accuracy is 0.44. Recycling reduces but does not eliminate excessive coastality. More importantly, the Standard dry-region mean is 0.37 versus 0.086 in the proxy; future work should diagnose why generic subtropical deserts remain too wet without retuning latitude belts or adding named-region rules. Observed wind/current datasets would be required before making local circulation-match claims.
