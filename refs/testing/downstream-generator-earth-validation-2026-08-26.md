# Downstream Generator Earth Validation Checkpoint

Updated: 2026-08-27

Branch: `dev`

## Outcome

World Forge now has a reusable component-metric validation framework and a maintained Earth scenario for atmospheric circulation, ocean circulation, hydration, biome assignment, and downstream performance. Earth observations remain isolated from generator inputs. Fast, Standard, and Ultra diagnostics pass after ten measured production corrections.

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

### Potential-evaporation hydration loss

An ablation showed that the uniform global-aridity precipitation term materially contributes to deserts but cannot simply be removed: doing so lowered the Standard dry-region mean from 0.370 to 0.244 while collapsing humid-region mean to 0.442 and reversing the orographic invariant. The accepted correction therefore leaves precipitation circulation unchanged and applies potential evaporation only when final land hydration is assembled.

The loss is a capped generic function of generated temperature, generated precipitation deficit, and the world's aridity control. A steep seventh-power deficit curve makes the effect negligible on humid surfaces, substantial on hot dry surfaces, zero on cold or zero-aridity surfaces, and no greater than 0.45. The integer power is evaluated with fixed multiplications. Focused tests protect selectivity, monotonic aridity response, and the cap.

At Ultra, dry-region mean improved from 0.3626 to 0.3195, Amazon-Sahara contrast from 0.2888 to 0.3232, and biome macro-F1 from 0.4674 to 0.4762. Humid-region mean changed from 0.6446 to 0.6274. Wetness rank and extreme balanced accuracy decreased by 0.0044 and 0.0085 respectively, within their accepted tolerances. Core time remained inside the performance envelope.

### Ascent-protected advected moisture

Marine fetch previously entered the precipitation base before atmospheric subsidence was considered. Nearby seas could therefore sustain high precipitation in descending subtropical air. Advected moisture now retains 75% to 100% of its value according to the existing subtropical-drying signal. ITCZ, storm-track, and orographic ascent protect the fetch, so the correction does not suppress generic monsoon or windward uplift mechanisms. No latitude forcing or named-region rule changed.

A stronger 60% minimum retention improved dry-region metrics further but made the cross-tier latitude contrast too large at Ultra. The validation suite now includes explicit equatorial-subtropical contrast absolute error, rather than rewarding an ever-larger contrast. The accepted 75% minimum produces errors of 0.007 Fast, 0.008 Standard, and 0.039 Ultra, all within the 0.08 evidence gate and better on average than the prior model.

At Standard, dry-region mean improved from 0.3270 to 0.3160, representative-region rank correlation from 0.7212 to 0.7697, coastal-interior contrast from 0.4004 to 0.3953, and biome macro-F1 from 0.4726 to 0.4773. Humid-region mean remained 0.579. Ultra dry-region mean reached 0.3097 and biome macro-F1 0.4804. The correction adds only constant arithmetic inside an existing topology pass.

## Wet/dry error-regime diagnostic

The evaluator now profiles both directions of extreme-wetness error on the fixed 128 x 64 grid. Observed and generated dry/wet thresholds remain their respective quartiles, matching the balanced-accuracy definition. False-wet and false-dry rates are segmented by generated temperature, coast distance, relative local-relief tercile, circulation latitude band, and temperature/circulation intersections with coast distance. Every regime reports rate, sample count, and lift over the overall error rate. These details are evaluator-only and do not enter production generation.

The result is stable across Standard and Ultra:

- observed-wet deep interiors have a 0.94-0.95 false-dry rate overall;
- cold, temperate, and hot deep-interior intersections each remain about 0.89-0.98 false dry;
- observed-dry coasts have a 0.88-0.91 false-wet rate;
- subsiding observed-dry coasts are about 0.81-0.83 false wet;
- relief bands have smaller, inconsistent lifts and are not the primary separator.

This localizes the dominant residual as excessive coastal concentration plus insufficient inland moisture reach, not a need for more global drying or a cold-only correction. A secondary missing behavior is dry-coast physics, plausibly including cold-current/upwelling effects that the current stage order cannot yet represent directly.

### Wind-aligned coastal moisture redistribution

The accepted transport moves a capped share of the existing marine-fetch and coastal-wetness contribution rather than creating new water. Donor moisture is reduced on authoritative land cells, transported downwind for fourteen passes on a fixed topology-64 land mask, expanded, normalized back to the authoritative donor total, and then applied before recycling. Each reference cell caches its downwind recipient, eliminating repeated geometry work. Directional transport and conservation have focused tests.

The authoritative pass stores wind direction in two signed 16-bit arrays because only direction is required. At Ultra these add about 32 MiB; donor and transported Float32 fields add about 64 MiB. The reference solve is small and resolution-stable. Measured core overhead is about 6% Fast/Standard and 4% Ultra.

Compared with the preceding checkpoint, Standard wetness rank improved from 0.4213 to 0.4357, extreme balanced accuracy from 0.4388 to 0.4515, observed-wet false-dry rate from 0.6622 to 0.6542, coastal-interior contrast from 0.3953 to 0.3623, Amazon-Sahara contrast from 0.2587 to 0.2757, and representative-region rank from 0.7697 to 0.7939. Ultra wetness rank reached 0.4809, false-dry rate 0.6262, coastal-interior contrast 0.3016, and biome macro-F1 0.4839.

The correction does not solve observed-dry coastal errors: their ranking remains poor where wind has no valid inland recipient, and overall Ultra false-wet rate increases from 0.4527 to 0.4604. Ultra latitude-contrast error also rises from 0.0391 to 0.0513 but remains below its 0.08 gate. Dry-region mean increases slightly within tolerance. These are explicit residuals, not hidden gains.

### Wind-oriented coastal exposure

The separate coastal-wetness bonus previously depended only on proximity to land and ocean. It now compares the existing surface-wind vector with the local gradient of ocean influence. Onshore flow retains the full bonus, alongshore flow retains 85%, and fully offshore flow retains 50%. Flat or unresolved gradients preserve the prior value. The generic orientation response is bounded, normalized for vector magnitude, and protected by focused unit tests. Marine fetch, rainfall belts, conserved inland transport, and total moisture are otherwise unchanged.

An initial 70% alongshore / 25% offshore calibration improved Standard dry-coast errors more strongly, but reversed the coarse Fast orographic invariant and was rejected. The accepted milder calibration keeps that invariant positive at all tiers. At Standard, observed-dry coastal false-wet rate improves from 0.911 to 0.867 and the subsiding-coastal rate from 0.870 to 0.826. At Ultra, those rates improve from 0.929 to 0.917 and 0.860 to 0.837 respectively. Overall false-wet rate improves from 0.481 to 0.473 Fast, 0.462 to 0.460 Standard, and 0.460 to 0.456 Ultra. Ultra false-dry rate also improves slightly from 0.6262 to 0.6248 and biome macro-F1 from 0.4839 to 0.4843.

The added work is a four-neighbor gradient only for affected coastal land cells and reuses precomputed topology geometry on optimized runs. Measured core time remains within the prior envelope: 158.0 ms Fast, 944.4 ms Standard, and 14,037.9 ms Ultra. The remaining dry-coast gap is too large for further unconditional-bonus tuning; representing cold-current/upwelling aridity would require evidence and a deliberate circulation/climate coupling design.

### Cool-current coastal stability

Evaluator-only candidate metrics first tested whether the generated circulation contains a usable generic coastal-cooling signal. Equatorward current exposure is derived from current direction, hemisphere, and bounded speed on the same fixed 128 x 64 analysis grid. It correlates with observed-proxy coastal dryness at rho 0.181 Fast, 0.266 Standard, and 0.227 Ultra. At Standard, the most exposed third of coastal cells contains 20.7% observed-dry cells versus 7.4% in the least exposed third. Weighting the current by generated subsidence improves the correlation to 0.282 Standard. These are association diagnostics, not evidence of observed current-route or sea-surface-temperature accuracy.

The alternative wind-driven offshore-Ekman proxy correlates in the wrong direction at every tier (-0.228 Fast, -0.194 Standard, and -0.187 Ultra), so it is explicitly retained as rejected diagnostic evidence and does not influence production.

The accepted production correction advances the existing current evaluation ahead of the final pressure/hydration pass. This is a dependency reorder, not another ocean solve: currents already depend on the fixed pressure model rather than pressure-adjusted hydration. During the existing final current loop, vectors are accumulated to the fixed 128 x 64 grid. Adjacent land receives a bounded equatorward-current potential. Final pressure applies a small precipitation response and a larger bounded hydration response, strengthened by subsiding air and protected by convergence. The circulation model is now `basin-circulation-v7`.

Standard dry-coast false-wet rate improves from 0.867 to 0.856 and subsiding dry-coast rate from 0.826 to 0.804. Standard representative-region rank improves from 0.794 to 0.855 and biome macro-F1 from 0.4733 to 0.4754. At Ultra, representative-region rank improves from 0.879 to 0.891, observed-wet false-dry rate from 0.6248 to 0.6196, wetness rank from 0.4832 to 0.4849, and balanced accuracy from 0.4654 to 0.4667. Overall Ultra false-wet remains 0.4560; the current signal does not disguise the remaining polar-coast errors.

The auxiliary current accumulators are fixed-grid arrays under 100 KiB. No additional full-resolution circulation pass or solver was added. Measured core time is 163.1 ms Fast, 975.7 ms Standard, and 14,568.1 ms Ultra, about 3.8% above the preceding Ultra checkpoint and within the accepted envelope.

### Permanent-ice liquid hydration

The post-current residual audit showed that every observed-dry cold-coastal sample at Fast and Standard is Köppen EF-derived permanent ice, and every one is also classified as permanent ice by the generator. Mean generated precipitation remained about 0.40-0.45, so the defect was semantic: final wetness treated frozen precipitation and atmospheric moisture as immediately usable liquid surface hydration. The Köppen proxy assigns EF wetness 0.10.

An evaluator-only counterfactual applied a generic temperature-dependent frozen-water availability factor. Before production promotion, it improved global wetness rank by about 0.08 Fast and 0.12 Standard and balanced accuracy by 0.06-0.07. Applying it indiscriminately to all cold land damaged Siberian/boreal regional ordering. The accepted correction therefore applies only to already-generated permanent-ice land after precipitation, atmospheric moisture, hydrology, and ice classification are complete. Surfaces at 5 C are unchanged; the usable-liquid fraction decreases linearly with frozen severity and retains at least 25% of pre-adjustment wetness. A stronger second application did not improve the targeted Standard error and worsened Fast, providing a measured stopping point.

This correction changes no observed input, ice extent, precipitation, atmospheric moisture, river routing, or warm/cold non-ice land. Basin circulation advances to `basin-circulation-v8` because final raster hydration is owned by that pass. A durable permanent-ice liquid-wetness error metric now reports generated and proxy means plus generated-ice agreement; its cross-tier error is 0.015 Fast, 0.057 Standard, and 0.062 Ultra, below the 0.12 evidence gate.

Compared with the preceding checkpoint, Fast wetness rank improves from 0.489 to 0.593, balanced accuracy from 0.483 to 0.544, false-wet rate from 0.474 to 0.437, and false-dry rate from 0.553 to 0.494. Standard wetness rank improves from 0.439 to 0.592, balanced accuracy from 0.455 to 0.524, false-wet rate from 0.459 to 0.407, and false-dry rate from 0.649 to 0.563. Ultra wetness rank improves from 0.485 to 0.637, balanced accuracy from 0.467 to 0.544, false-wet rate from 0.456 to 0.396, and false-dry rate from 0.620 to 0.534. Representative-region ordering, humid/dry means, orography, biome F1, and runtime remain within or better than their prior envelopes.

The manual 80-case fictional preset harness was made callable from Node by safely handling absent Vite environment metadata. All 80 worlds generated without runtime errors. Its status remains globally red because the harness expects plate-advection-v3 diagnostics that its native-stage generation path does not emit; four cases also retain pre-existing tiny-biome-patch findings. Focused fictional preset, polar-climate, downstream, and determinism tests pass. The stale manual harness contract is recorded as separate validation debt rather than misreported as climate evidence.

### Continental convergence recycling

The next evaluator-only residual audit compared observed-wet deep-interior cells that failed the generated wet quartile with those that succeeded. At Standard, failures averaged 0.451 precipitation, 0.372 atmospheric moisture, and 0.091 recyclable-source potential; successes averaged 0.765, 0.653, and 0.429. Net hydration loss differed by only 0.015, relief by 0.005, and subsidence by 0.036. This identifies insufficient interior moisture supply as the dominant separator, not evaporation or terrain.

Three counterfactuals constrained the correction. Doubling recycling diffusion reach improved Standard false-dry rate by only 0.0027. Globally easing source activation improved it by about 0.004 while wetting dry controls. Raising the cold-source floor also improved it by only 0.0027. All three were rejected. The useful generic separator was generated large-scale convergence over land that is genuinely distant from water. The fixed pressure grid therefore now carries a complementary land-to-water distance field, and final circulation adds a bounded convergence recycling term only beyond two reference cells inland, suppressed to zero by subsidence and capped at 0.13. Basin circulation advances to `basin-circulation-v9`.

The accepted calibration improves Standard wetness rank from 0.5919 to 0.6017, false-dry rate from 0.5634 to 0.5594, Amazon-Sahara contrast from 0.2760 to 0.3000, and humid-region mean from 0.6045 to 0.6375 while leaving the dry-region mean at 0.3135. Ultra wetness rank improves from 0.6370 to 0.6449, balanced accuracy from 0.5442 to 0.5485, false-dry rate from 0.5337 to 0.5218, and humid-region mean from 0.6447 to 0.6752 while dry-region mean remains 0.3032. A stronger calibration improved false-dry further but exceeded the maintained latitude-contrast tolerance and was rejected.

This adds one 32 KiB fixed-grid field, one queue traversal over 8,192 cells when the pressure model is built, and one nearest-cell lookup per final land cell. It adds no full-resolution solver or transport pass. Canonical Ultra core time is 14,942.7 ms versus 14,637.0 ms before the change, about 2.1% higher and within the performance envelope.

### Temperate dry-coast residual audit

The evaluator now compares observed-dry temperate coastal misses with correctly ranked cells using generated precipitation, atmospheric moisture, net hydration loss, subsidence, convergence, relief, equatorward-current exposure, current-plus-subsidence stability, offshore Ekman exposure, and whether adjacent ocean lies west of land. These details remain attached to the existing false-wet metric and add no production work.

At Standard, the 46 misses versus four successes average 0.500 versus 0.100 precipitation, 0.550 versus 0.200 atmospheric moisture, 0.588 versus 0.846 subsidence, 0.092 versus 0.309 current exposure, 0.067 versus 0.278 current stability, and 0.279 versus 0.750 ocean-west exposure. Fast shows the same ordering. Ultra retains strong subsidence separation but much weaker coastline-geometry and current separation, with only four successful samples. Offshore Ekman again points the wrong way and relief remains neutral.

Two production counterfactuals were rejected. A direct temperate coastal-subsidence loss improved the targeted Standard rate from 0.92 to 0.88 at full strength but worsened overall false-wet classification and exceeded the latitude-contrast baseline; half strength reached only 0.90 and would exceed Ultra's hard 0.08 latitude-error gate. A western-margin fallback for unresolved cool-current exposure passed global guards but left the targeted Standard rate unchanged at 0.92. No production behavior or baseline changed. The remaining coast error requires better current-route or seasonal coastal-climate structure, not another drying coefficient.

### Biome confusion and reference coverage

The Köppen-derived reference contains no wetland class, but the macro-F1 calculation previously counted generated wetland false positives as evidence that wetland was represented and assigned that unsupported class F1=0. The corrected metric scores only classes present in the reference while continuing to report generated wetland prevalence and the complete compact confusion matrix. This is an evaluator correction, not a production improvement. Corrected macro-F1 is 0.523 Fast, 0.552 Standard, and 0.563 Ultra.

The confusion profile localizes the remaining classifier ceiling. At Standard, reference/generated counts are 532/356 grassland and 396/662 forest; 201 reference grassland cells and 121 reference desert cells are generated as forest. Fast and Ultra show the same direction. Raising the forest threshold from 0.50 to 0.55 improves Standard macro-F1 by only 0.003 and regresses Fast because it trades grassland recall for forest recall. The threshold counterfactual was rejected. Distinguishing these classes materially requires better seasonal moisture/temperature structure or another generic ecological signal, not a global final-wetness threshold.

## Accepted component baselines

| Metric | Fast 256 x 128 | Standard 1024 x 512 | Ultra 4096 x 2048 |
| --- | ---: | ---: | ---: |
| Zonal wind-band direction | 0.9163 | 0.9109 | 0.9094 |
| Tropical convergence direction | 0.9987 | 1.0000 | 1.0000 |
| Current confinement to ocean | 1.0000 | 1.0000 | 1.0000 |
| Gyre rotation agreement | 0.9663 | 0.9620 | 0.9639 |
| Equatorward-current dry-coast separation | 0.1808 | 0.2655 | 0.2273 |
| Current-plus-subsidence dry-coast separation | 0.2031 | 0.2820 | 0.2437 |
| Offshore-Ekman dry-coast separation (rejected) | -0.2278 | -0.1942 | -0.1874 |
| Köppen wetness rank correlation | 0.5999 | 0.6017 | 0.6449 |
| Wet/dry extreme balanced accuracy | 0.5441 | 0.5282 | 0.5485 |
| Observed-dry false-wet rate | 0.4367 | 0.4055 | 0.3956 |
| Observed-wet false-dry rate | 0.4909 | 0.5594 | 0.5218 |
| Permanent-ice liquid-wetness error | 0.0150 | 0.0572 | 0.0621 |
| Amazon-Sahara wetness contrast | 0.2260 | 0.3000 | 0.3653 |
| Orographic precipitation delta | 0.0007 | 0.0116 | 0.0222 |
| Coastal-interior contrast | 0.3063 | 0.3381 | 0.2820 |
| Equatorial-subtropical contrast | 0.4120 | 0.4374 | 0.4647 |
| Equatorial-subtropical contrast error | 0.0210 | 0.0477 | 0.0767 |
| Representative-region rank correlation | 0.7333 | 0.8545 | 0.8909 |
| Humid-region mean | 0.7814 | 0.6375 | 0.6752 |
| Dry-region mean | 0.4503 | 0.3135 | 0.3032 |
| Köppen biome macro-F1 | 0.5230 | 0.5518 | 0.5634 |
| Final biome consistency | 1.0000 | 1.0000 | 1.0000 |
| Core downstream time | 176.5 ms | 1,058.5 ms | 14,942.7 ms |

Core time excludes reference-file loading and report serialization. The current Ultra adapter wall time was 21.6 seconds. The earlier full-generator Ultra baseline remains 204.0 seconds; validation no longer generates a disposable procedural shell before installing the reference surface.

Versioned tolerances are stored under `refs/testing/downstream-earth-baselines/` and are loaded automatically by the manual runner.

## Commands

```text
npm run validate:downstream-earth:fast
npm run validate:downstream-earth:standard
npm run validate:downstream-earth:ultra
```

All three commands write JSON and Markdown reports beneath ignored `.local/validation/downstream-earth/`.

## Next evidence-led work

The deep-interior correction, temperate dry-coast audit, and biome confusion audit are complete. Static forest-threshold tuning cannot materially improve the grassland/forest confusion. The next material slice requires a generic seasonal climate or ecological-structure signal that can separate grassland, forest, rainforest, and dry-summer coasts without answer keys or another expensive full-resolution solver. Begin evaluator-only: derive low-cost continentality/circulation seasonality candidates on the fixed grid and test whether they separate the reference classes across all tiers. Preserve permanent-ice semantics, inland gains, dry-region controls, latitude error, regional ordering, memory, and performance. Keep Earth and expensive performance diagnostics outside routine push CI.
