# Downstream Generator Earth Validation Checkpoint

Updated: 2026-08-27

Branch: `dev`

## Outcome

World Forge now has a reusable component-metric validation framework and a maintained Earth scenario for atmospheric circulation, ocean circulation, hydration, biome assignment, and downstream performance. Earth observations remain isolated from generator inputs. Fast, Standard, and Ultra diagnostics pass after eleven measured production corrections.

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

### Temperature-adjusted forest moisture demand

Evaluator-only ecological profiles showed that reference grassland and forest cells have nearly identical generated wetness and precipitation at Standard, but forest cells are materially cooler: 8.8 C versus 12.3 C. A low-cost tilt/latitude/continentality seasonality proxy did not cleanly separate them; forest was actually more seasonal because the reference includes broad boreal forest. Temperature therefore provides the reusable physical separator without adding a seasonal solver.

The accepted classifier keeps the forest wetness threshold at 0.50 through 8 C, raises it linearly to 0.60 at 20 C, and caps it there. Rainforest, desert, tundra, ice, wetland, and mountain precedence are unchanged. Unlike the rejected flat 0.55 threshold, this preserves cool forest while converting marginal warm forest to grassland. Macro-F1 improves from 0.5230 to 0.5286 Fast, 0.5518 to 0.5735 Standard, and 0.5634 to 0.5864 Ultra. Standard grassland F1 improves from 0.268 to 0.322 and forest F1 from 0.405 to 0.430; Ultra grassland and forest also improve. Climate fields and downstream runtime are unchanged.

### Desert-confusion hydration diagnosis

The biome evaluator now reports generated climate and ecological signals for each reference-desert confusion branch. The Köppen transform maps only BWh and BWk to desert; semi-arid BSh and BSk remain grassland, so the reference-desert errors are not caused by folding steppe into the desert class.

The result is stable across all tiers. Correct reference deserts average generated wetness 0.149 Fast, 0.172 Standard, and 0.204 Ultra. Reference deserts generated as grassland average 0.449, 0.432, and 0.449; those generated as forest average 0.714, 0.586, and 0.521. The low-cost dry-season-stress proxy is nearly identical for grassland and forest errors and slightly stronger for already-correct deserts. At Standard, correct deserts also have stronger generated subsidence (0.654) than grassland (0.445) or forest (0.500) errors.

This proves that the remaining desert confusion is upstream annual hydration and longitudinal circulation error, not a biome threshold or missing steppe category. Reclassifying wet surfaces as desert would hide the climate defect and was not attempted. No production behavior or baseline value changes in this diagnostic increment.

### Longitudinal desert attribution

The evaluator now reconstructs the fixed latitude-belt, basin-center, and local thermal terms of the generated pressure field for each biome-confusion sample. At Standard, correctly generated reference deserts average 0.444 latitude pressure, 0.066 center pressure, 0.654 subsidence, and 0.172 wetness. Desert cells generated as grassland average 0.235, 0.048, 0.445, and 0.432; those generated as forest average 0.265, 0.049, 0.500, and 0.586. The basin-center difference is only about 0.02 and the thermal term is near zero. Fixed latitude placement is the largest pressure attribution, but it is not a safe global tuning seam.

An evaluator-only 12-degree subtropical-belt counterfactual adds about 0.046-0.054 pressure to missed Standard deserts, but also adds about 0.052 to all reference grassland and forest samples and 0.044 to rainforest. An end-to-end 10-to-11-degree prototype moves macro-F1 by only +0.0006 Fast and +0.0004 Standard while slightly softening wetness rank and circulation-linked metrics. It was rejected and fully removed.

Reference-desert confusion is now localized to broad geographic regions. Correct/generated-desert counts are 38/109, 4/44, 23/54, 17/47, 0/7, and 0/13 at Fast for Sahara, Arabia, Central Asia, Australia, Patagonia, and the Horn of Africa. At Standard they are 66/123, 17/47, 14/50, 27/47, 0/8, and 0/13; at Ultra they are 77/125, 16/46, 11/48, 33/46, 0/8, and 0/12. Patagonia and the Horn fail at every tier, while Central Asia worsens as resolution increases. This is multiple mechanism-specific residuals, not one dry-belt coefficient.

At Standard, missed Sahara cells have nearly the same subsidence as correct Sahara cells (0.54 versus 0.52) but much higher precipitation (0.50 versus 0.23) and lie nearer the coast. Missed Arabia and Central Asia cells have substantially weaker subsidence; missed Australia cells retain very strong subsidence but excessive precipitation. A final-wind upwind-barrier proxy identifies Patagonia weakly but is stronger in already-correct Central Asian deserts. A final-wind coastal-exposure proxy separates some Sahara, Australia, and Namib/Kalahari errors but reverses in Arabia, Central Asia, southwest North America, and the Horn.

Two further production prototypes were rejected. Strengthening the legacy topology-wind rain-shadow term from 0.92 to 1.15 made Fast orographic separation negative, reduced macro-F1 at both measured tiers, and over-dried humid controls. Applying a bounded onshore/offshore factor to the main topology marine-fetch term improved a few Standard hydration aggregates but reduced Standard macro-F1 from 0.5735 to 0.5668 and also made Fast orographic separation negative. Both exposed an architectural mismatch: initial precipitation uses an approximate topology wind, while the authoritative climatological wind is constructed later. No production behavior or accepted baseline changed.

Evaluator-only final-circulation counterfactuals then tested the structural alternative without changing production. Because the counterfactual reclassifies fixed-grid mean signals while the baseline class is the modal full-resolution result, it now reports an explicit zero-adjustment reconstruction control; candidate deltas are compared only with that control. A final-wind coastal potential improves reconstructed macro-F1 by 0.0066 Fast, 0.0064 Standard, and 0.0085 Ultra. An upwind-barrier potential is mixed (+0.0044, -0.0017, +0.0046). A subsidence-protected deep-continental potential improves the reconstructed score by about 0.008-0.009 at every tier.

End-to-end testing did not reproduce a shippable continental result. Reducing precipitation and moisture broke the Fast orographic invariant and moved macro-F1 by only about 0.001-0.002. A hydration-only 0.10 calibration passed Fast and Standard, improving macro-F1 by 0.0036 and 0.0017 and Standard regional rank from 0.855 to 0.879, but failed Ultra's latitude-contrast guard at 0.0866 and left Ultra macro-F1 flat. Protecting the subtropical belt with `(1 - subsidence)` preserved latitude structure but reduced Standard macro-F1 to 0.5696 and regional rank to 0.782. All production prototypes were removed.

A low-cost two-season water-balance proxy used tilt/latitude/continental temperature amplitude, convergence-linked precipitation redistribution, and the existing nonlinear evaporative-demand equation. Its best reconstructed macro-F1 delta is only +0.0018 Fast, +0.0006 Standard, and -0.0004 Ultra. This proxy is also rejected; a useful seasonal model would require actual seasonal circulation structure, not another annual-field coefficient.

### Ocean current structure and equatorial countercurrent

Three fixed-grid structural metrics now cover important ocean behavior that gyre rotation alone did not prove. Western-boundary current speed is 1.406 times eastern-boundary speed Fast, 1.390 Standard, and 1.376 Ultra. Southern circumpolar continuity is 0.893, 0.912, and 0.912, with complete longitude coverage at Standard and Ultra. These confirm the intended western-boundary intensification and open Southern Ocean flow without claiming observed current-route fidelity.

The new equatorial metric separated westward equatorial flow from the eastward north-equatorial countercurrent. Before correction, Standard westward support was 0.988 but countercurrent support only 0.041; the configured eastward pulse could not overcome the base westward flow. Basin circulation v10 raises only that fixed-cost pulse. Combined direction agreement is now 0.799 Fast, 0.769 Standard, and 0.781 Ultra, above the 0.65 component gate, while gyre rotation remains above 0.96 and land confinement remains 1.0.

The accepted 0.64 calibration is a balance rather than a free gain. Equatorward-current dry-coast association changes from 0.181 to 0.153 Fast, 0.266 to 0.234 Standard, and 0.227 to 0.204 Ultra; current-plus-subsidence association changes from 0.203 to 0.179, 0.282 to 0.254, and 0.244 to 0.223. Both remain positive and inside their maintained tolerances. Hydration rank, extremes, biome F1, regional ordering, and latitude structure are effectively unchanged. The correction adds constant arithmetic only and no arrays, traversal, or solver pass.

### Explicit seasonal-circulation diagnostic

The earlier two-season water-balance proxy merely redistributed annual precipitation and was neutral. The replacement diagnostic constructs local-summer and local-winter pressure states directly: the equatorial trough and its longitudinal centers migrate up to 65% of axial tilt (capped at 18 degrees), the seasonal trough narrows to 8 degrees, subtropical/subpolar belts migrate more weakly, and bounded continental temperature amplitude adds thermal pressure. Everything remains evaluator-only on the 128 x 64 grid.

Seasonal drying in excess of annual subsidence is a materially useful ecological signal. Against the required zero-adjustment reconstruction control, a 0.40 biome-stress counterfactual improves macro-F1 by 0.0140 Fast, 0.0208 Standard, and 0.0292 Ultra. At Standard, reconstructed desert F1 improves from 0.353 to 0.411 and grassland from 0.325 to 0.389; ice and tundra are unchanged. Desert true positives rise from 91 to 118 while false positives rise from 70 to 102. Regional true positives rise by 14 Sahara, five Arabia, four Australia, and one Namib/Kalahari; the counterfactual does not claim to solve Patagonia or the Horn.

A late fixed-grid production overlay was rejected. At 0.40 it improved Fast macro-F1 by 0.013 but reduced Standard by 0.003; at 0.20 it improved Fast by 0.005 but reduced Standard by 0.004. It also intentionally diverged from the annual-only consistency classifier. The mismatch proves that aggregated seasonal evidence cannot be safely applied after topology classification, cohesion, and modal projection. All production seasonal fields and behavior were removed. The next implementation must let a fixed-grid seasonal signal participate before topology biome classification/cohesion, without allocating full-resolution seasonal arrays.

That earlier-stage implementation was then tested and rejected as well. A single 128 x 64 seasonal pressure solve was built from authoritative topology, sampled during topology biome classification, passed through cohesion, and reused by raster circulation without allocating topology-sized seasonal arrays. The existing circulation pass subsequently reclassified adjusted raster cells and erased the early seasonal decisions, leaving Standard macro-F1 at 0.5735. Preserving the early topology/cohesion result instead raised Fast only from 0.5286 to 0.5304 but reduced Standard to 0.5489; annual-climate consistency fell to 0.897/0.900. The production experiment was fully removed.

This falsifies the coarse-grid counterfactual as a production predictor: its positive result depends materially on classifying already-aggregated climate and modal biome cells. Seasonal circulation is therefore paused until a counterfactual performed in production order and at production resolution improves Fast, Standard, and Ultra. Future evaluator changes must report both the coarse explanatory counterfactual and a native-resolution/project-then-aggregate counterfactual so modal aggregation cannot create a false acceptance signal.

The evaluator now enforces that distinction without adding anything to routine CI. At seasonal strength 0.40, the coarse counterfactual scores 0.5284/0.5802/0.5961 Fast/Standard/Ultra, while native-first reclassification scores 0.5422/0.5712/0.5906 against native controls of 0.5286/0.5735/0.5864. The native result reproduces the measured late-overlay direction: Fast and Ultra improve, Standard regresses. This production-order counterfactual is now the acceptance screen; the coarse result remains useful only for explaining broad spatial mechanisms.

### Temperature-conditioned forest moisture demand

The next generic classifier signal used the same native-first screen. Reference grassland and forest have nearly identical generated precipitation and wetness at Standard, but reference forest is cooler (8.8 C versus 12.3 C). Instead of another global threshold, the counterfactual sharpened the existing physical interaction between temperature and forest moisture demand: cool forests tolerate slightly lower annual wetness, while warm forests require more to offset evaporative demand. A bounded 0.06 contrast improved native-first macro-F1 from 0.5286 to 0.5336 Fast, 0.5735 to 0.5846 Standard, and 0.5864 to 0.5964 Ultra.

Production reproduced those predictions exactly. The accepted threshold spans about 0.44 in cold non-tundra climates, 0.48 at 8 C, 0.57 at 14 C, and 0.66 at 20 C and above. It adds only constant arithmetic inside existing classification calls, changes no hydration field, allocates nothing, and keeps final climate-to-biome consistency at 1.0. All hydration and circulation metrics remain unchanged.

### Native biome-confusion localization

The resumed diagnostic now accumulates native reference/generated confusion counts and branch means for temperature, generated/reference wetness, precipitation, moisture, river/lake support, forest-threshold margin, circulation, seasonal drying, and latitude. It retains only fixed-size `9 x 9` count and signal-total tables; it does not retain native samples or allocate resolution-sized diagnostic layers.

The dominant evidence-backed errors are upstream hydration placement rather than another classifier threshold. At Standard, reference grassland generated as forest is about `+0.38` wetter than its reference proxy; reference forest generated as grassland is about `-0.22` drier. Reference desert generated as grassland or forest remains about `+0.31` to `+0.62` too wet. This explains why further final-threshold tuning trades class recall instead of correcting the climate field.

Wetland is the largest native non-Köppen branch. Native wetland share is `17.7% / 7.3% / 5.2%` Fast/Standard/Ultra, while fixed-grid modal wetland cells are `316 / 6 / 1`. The generated cells have strong river and/or lake support, and published global wetland totals vary widely by definition. Because the maintained Earth bundle has no observed wetland layer, this is recorded as resolution/presentation evidence rather than treated as a scored error or used to tune production.

Three evaluator-only candidates were screened in native production order:

- dry-season pressure applied only to forest moisture demand improved Fast from `0.5336` to as high as `0.5431`, but reduced Standard to `0.5790-0.5820`; rejected without production or hydration changes;
- final-wind rain-shadow drying changed macro-F1 to `0.5340 / 0.5766 / 0.5995`; rejected because Standard regressed materially;
- final-wind coastal drying changed macro-F1 to `0.5377 / 0.5850 / 0.5982`; directionally positive at every tier, but the `+0.0040 / +0.0004 / +0.0018` gains are too small to justify a production overlay or moving authoritative circulation earlier.

No production generator behavior or accepted baseline value changed in this diagnostic increment. The result narrows the next material climate task to upstream wetness placement or a deliberately selected observed-wetland reference slice; another final biome threshold is not supported.

### Production-order pressure-wind diagnostic

The authoritative pressure model is still built after topology climate, hydrology, biome classification, cohesion, and raster projection in normal production. An opt-in validation seam now tests the cheapest credible ordering correction without changing that default: it computes topology temperature, builds the existing `128 x 64` pressure model directly from authoritative topology, blends its winds into the single topology moisture solve, and reuses that exact model during final basin circulation. It allocates no topology-sized circulation field and adds no extra full-resolution raster projection.

Fast Earth rejects the correction before Standard or Ultra execution. A full pressure-wind replacement improves Amazon/Sahara contrast and orographic alignment but reduces wetness rank correlation from `0.5998` to `0.5024` and biome macro-F1 from `0.5336` to `0.5173`. Bounded blends of `0.15 / 0.30 / 0.50` produce macro-F1 `0.5289 / 0.5368 / 0.5205`; the only positive result, `+0.0032` at `0.30`, also reduces wetness rank correlation to `0.5933` and fails the component gate. The candidate therefore did not advance to the expensive tiers and production behavior remains unchanged.

This is useful negative evidence: the fixed pressure field is an appropriate large-scale circulation model but is too coarse to replace local terrain-deflected topology winds directly. Future upstream work should separate large-scale moisture-source routing from local orographic flow rather than linearly substituting one wind vector for the other. The diagnostic can be rerun manually with `--pressure-wind-corrector --pressure-wind-blend=<0..1>`; it is not part of routine CI.

### Observed GLWD wetland baseline

The manual evaluator now optionally loads a locally prepared GLWD v2 reference. It compares World Forge's combined lake/river/wetland biome semantics with GLWD inland aquatic and wetland classes 1-32, excludes rice-dominant class 33, project ocean, Antarctica, and nodata, and retains fractional percent coverage rather than forcing a source-wide binary label. The preparation script produces two compact `uint8` layers from the source GeoTIFFs and records hashes and provenance; neither the ~925 MB archive nor its derived layers enter routine CI.

The first native results show that prevalence and placement are separate defects. Fast generates about `26.5%` wetland on comparable land and has `15.16` percentage points prevalence error. Standard generates `11.46%` against `11.10%` observed fractional coverage (`0.36` point error). Ultra generates `8.84%` against `11.08%` (`2.24` point error). High-coverage recall is `46.71% / 22.16% / 17.77%` Fast/Standard/Ultra, while observed-fraction separation is only `5.00 / 6.87 / 9.01` percentage points. This proves that Standard and Ultra have roughly plausible total budgets but weak placement, while Fast also has a severe resolution-scaling problem.

The branch profile explains the weakness. At Standard, high-coverage misses have mean local relief `0.0095` versus `0.0266` on ordinary low-coverage land, but mean generated wetness is nearly identical (`0.519` versus `0.508`). Existing generated wetlands are dominated by generated lake support (`~79%` lake share), including both reference hits and false placements. A budget-preserving evaluator screen that blended flat saturated terrain with river/lake support raised Standard high-coverage recall to `30.0%` and fraction separation to `11.0` points.

The corresponding fixed-threshold end-to-end classifier was rejected. It improved Fast macro-F1 from `0.5336` to `0.5443`, corrected Fast wetland prevalence error to `1.25` points, and raised separation to `9.58` points. At Standard it raised wetland recall from `22.16%` to `27.84%` and separation from `6.87` to `11.29` points, but reduced Köppen macro-F1 from `0.5846` to `0.5673`. It therefore failed the cross-tier multi-objective gate and did not advance to Ultra. All production wetland behavior was removed; the GLWD ingestion and observational diagnostics remain.

### Resolution-normalized river intensity

The next hydrology audit isolated the Fast wetland excess to river intensity rather than lake count. Fast and Standard lake shares are similar (about `8.7%` and `9.3%`), but the old global-maximum normalization made the wetland river cutoff equivalent to only about `2.05` accumulation units at Fast versus `7.22` at Standard. As topology resolution increased, maximum accumulation grew much faster than local drainage, so the same physical-looking channel received a different normalized intensity.

Production now applies a bounded cube-root topology correction to the delivered river-intensity field, anchored at topology resolution `256`. This is deliberately downstream of the raw drainage semantics: source qualification, route tracing, and named-river selection continue to use unscaled accumulation. The correction is folded into the existing hydrology loop, adds no traversal or resolution-sized allocation, and can be disabled in the manual Earth runner with `--legacy-river-intensity` for comparison.

Fast Earth wetland prevalence error falls from `15.16` to `6.18` percentage points, GLWD fraction separation rises from `5.00` to `6.35` points, and Köppen macro-F1 rises from `0.5336` to `0.5607`. High-coverage recall falls from `46.71%` to `38.06%`; this is an explicit placement tradeoff, not a claim that wetland localization is solved. Standard is unchanged by construction: `0.36` point prevalence error, `22.16%` recall, `6.87` point separation, and `0.5846` macro-F1. Ultra improves slightly to `2.12` points prevalence error, `18.03%` recall, and `9.03` points separation while retaining `0.5964` macro-F1.

An 80-case short preset matrix provides the generic-world guard. The correction removes the prior aggregate `Earthlike desert/wetland overlap is high` finding and adds no finding; the two remaining findings are unchanged plate-advection coverage/continuity issues. Earthlike median wetland share falls from `19%` to `12%` and desert/wetland overlap from `5%` to `3%`. Named-river source counts, accepted counts, paths, capacity use, and distribution are preserved across every preset because network construction remains on raw drainage. The matrix's case-level failures predate this slice and are driven by the recorded plate diagnostic gaps.

### Lowland floodplain connectivity

The next diagnostic decomposed the Standard GLWD miss by geomorphic and drainage context. High-coverage misses average only `0.0224` normalized altitude above sea level versus `0.0811` on ordinary low-coverage land, local relief `0.0095` versus `0.0266`, and log accumulation `1.232` versus `0.904`. Their mean generated wetness is nearly unchanged (`0.519` versus `0.508`). This establishes that the missing signal is lowland drainage connectivity, not another global moisture threshold. The evaluator now records mean altitude and lowland-floodplain support for each observed/generated wetland confusion branch.

Simple flat/river threshold replacement was rejected first: it changed `7-10%` of comparable Standard land but improved high-coverage recall by only about `1.5` points with no material separation gain. The accepted production-order model instead retains the legacy strong-river branch, requires coarse sink-lakes to carry scale-adjusted moisture support, and adds wetlands only where moderate drainage, sufficient wetness, low altitude, and low local relief coincide. The lake support floor is `0.50 / 0.35 / 0.00` at Fast/Standard/Ultra topology resolution; coarse cells need stronger evidence because each depression represents a broader area. The final circulation pass carries the topology-scale relief decision into the delivered raster rather than silently replacing it with the old classifier.

Against GLWD, Fast prevalence error is effectively stable (`6.18` to `6.13` points), recall changes from `38.06%` to `37.72%`, and separation improves from `6.35` to `7.34` points. Standard prevalence error improves from `0.36` to `0.15` points, recall from `22.16%` to `24.34%`, and separation from `6.87` to `8.78` points. Ultra prevalence error improves from `2.12` to `1.62` points, recall from `18.03%` to `19.85%`, and separation from `9.03` to `9.76` points.

The tradeoff is visible and bounded. Köppen-derived macro-F1 changes from `0.5607 / 0.5846 / 0.5964` to `0.5557 / 0.5740 / 0.5955`; the derived Köppen mapping has no wetland reference class, so assigning observed wetland evidence necessarily takes some cells from its grassland/forest categories. The Standard reduction (`0.0106`) remains within the maintained `0.02` regression tolerance and is substantially smaller than the rejected flat-saturation classifier's `0.0173` loss. Final climate/classification consistency remains `1.0` after teaching the validator about the topology-supported floodplain decision.

The final 80-case preset matrix adds no aggregate finding and leaves named-river counts unchanged for every preset. Median wetland share moves Earthlike `12% -> 13%`, Habitable `11% -> 12%`, Waterworld `12% -> 15%`, Archipelago remains `12%`, Desert `3% -> 2%`, Pangea remains about `9%`, and Random `9% -> 8%`. Unsupported-wetland share remains zero and desert/wetland overlap is unchanged. Expensive Earth and preset evidence remains manual and outside routine CI. The legacy comparator is available with `--legacy-wetland-hydrology`.

### Wetland hydrology and regional attribution

The next diagnostic separates generated wetland cells into mutually exclusive production-order branches: supported standing water, lowland riverine floodplain, legacy strong-river wetland, and cohesion/residual classification. It also records high-coverage GLWD recovery across six approximate evaluator-only geographic windows. The result changes the next implementation decision: a flat, saturated, non-river predicate finds real misses, but it is far too nonspecific to become production behavior.

| Tier | Standing-water cells / high-coverage hits / mean GLWD % | Floodplain cells / hits / mean GLWD % | Strong-river cells / hits / mean GLWD % | Saturated non-river candidate cells / high-coverage rate / mean GLWD % | Share of remaining high-coverage misses found |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fast | 362 / 30 / 15.92 | 299 / 47 / 24.89 | 452 / 32 / 14.06 | 603 / 4.98% / 12.58 | 16.67% |
| Standard | 5,935 / 686 / 17.53 | 3,849 / 725 / 25.11 | 1,512 / 60 / 8.72 | 17,575 / 5.06% / 11.00 | 19.40% |
| Ultra | 145,961 / 21,315 / 19.29 | 9,336 / 2,524 / 31.46 | 1,256 / 35 / 7.38 | 472,197 / 5.79% / 10.07 | 28.35% |

The audit table is more useful than a chart here because the decision depends on exact branch denominators as well as recovery. Riverine floodplains have the strongest observed fractional association at every tier. Standing-water support recovers most Ultra high-coverage cells but is spatially broad: its generated cells average only `19.29%` GLWD coverage. The legacy strong-river branch is weaker still. A direct saturated non-river expansion would add `472,197` Ultra topology cells while only `5.79%` meet the high-coverage reference threshold, so it would destroy the existing prevalence budget despite recovering `28.35%` of current misses.

Approximate regional windows expose where aggregate recall is hiding weak behavior. Standard recall is `23.70%` Amazon lowlands, `15.97%` Congo lowlands, `28.47%` Hudson Bay lowlands, `9.44%` West Siberian lowlands, `0%` Sudd, and `3.57%` Ganges-Brahmaputra. Ultra recall is `17.70% / 23.67% / 16.04% / 13.27% / 8.59% / 6.95%` in the same order. These windows are attribution aids, not production masks or acceptance gates; their rectangles include non-wetland terrain and do not assert exact ecosystem boundaries.

This diagnostic is fixed-size apart from the existing topology traversal: four branch accumulators and six regional accumulators are added to report details, with no new resolution-sized layer. GLWD remains independent evaluation evidence and the coordinates exist only in the manual Earth evaluator. Branch precedence mirrors production behavior, while the saturated non-river counterfactual requires wetness above `0.66`, low relief, no generated lake, and river intensity no greater than the floodplain minimum.

The next material model should therefore add a generic persistent drainage or water-table proxy—something that distinguishes accumulated saturation from merely humid, flat ground—and separately revisit whether every generated sink-lake should imply a wetland-sized footprint. Any candidate must first run as an evaluator/adapter counterfactual, improve the weak regional windows and observed fraction separation, retain the global prevalence budget and Köppen tolerances, and remain linear-time. No production generator behavior changes in this attribution checkpoint.

### Water-table proxy screen

The first evaluator-only proxy tests whether bounded neighborhood hydrology can stand in for persistent catchment state. A drainage-margin branch selects flat, saturated lowlands within two topology steps of generated river or lake support. A separate cold-peatland branch selects flat, saturated, low-elevation land from `-5 C` to `12 C` without requiring strong local river intensity. Their union remains a fixed-radius, linear-time traversal and adds no persisted layer.

| Tier | Drainage-margin cells / high-coverage rate / mean GLWD % | Cold-peatland cells / high-coverage rate / mean GLWD % | Union cells / high-coverage rate / mean GLWD % |
| --- | ---: | ---: | ---: |
| Fast | 669 / 6.13% / 14.19 | 167 / 14.37% / 21.44 | 671 / 6.11% / 14.18 |
| Standard | 15,717 / 7.39% / 13.99 | 5,460 / 12.36% / 21.07 | 16,134 / 7.54% / 14.27 |
| Ultra | 273,979 / 8.99% / 13.93 | 152,836 / 12.25% / 19.34 | 314,851 / 9.53% / 14.83 |

Both branches enrich observed wetland coverage relative to the naive saturated non-river pool, so drainage persistence and cold flatland are useful signals. Neither is selective enough to classify wetlands: the Ultra union would add `314,851` cells and fewer than one in ten meet the high-coverage threshold. The candidate is rejected without a production run.

The important architectural finding is that the hydrology solver already computes raw catchment accumulation and downstream receivers, then discards them after deriving the normalized river layer. The next diagnostic should expose those transient solver fields through an optional manual-validation observer, with zero allocation or callback work in normal production. That will allow a genuine topographic-wetness/catchment-retention screen rather than broadening river/lake influence. The observer must not persist reference data or hydrology diagnostics in saved projects.

### Transient catchment-retention diagnostic

The production present-day reconciliation seam now accepts an optional hydrology observer. It receives the solver-owned raw accumulation and downstream arrays only during the hydrology callback. Normal generation supplies no observer and performs no new allocation, callback, or persistence. The manual Earth adapter copies the two arrays into its transient output so metrics can compare catchment state with GLWD after generation; these fields never enter a `WorldProject` or saved-world contract.

Raw topographic wetness is defined for screening as `log1p(accumulation) - log(local relief + 0.002)`. At Standard, unrecovered high-coverage GLWD cells average `6.14` versus `4.99` on ordinary low-coverage land. The same separation persists at Fast (`4.86` versus `3.86`) and Ultra (`6.77` versus `5.77`), proving that catchment accumulation adds information beyond the normalized river layer. Absolute values shift with topology resolution, so fixed TWI cutoffs are rejected.

The scale-safe screen ranks physically eligible lowland cells within each topology tier and inspects fixed percentile tails:

| Tier | Top 10% cells / high-coverage rate / mean GLWD % | Top 5% cells / high-coverage rate / mean GLWD % | Top 1% cells / high-coverage rate / mean GLWD % |
| --- | ---: | ---: | ---: |
| Fast | 144 / 5.56% / 14.26 | 72 / 5.56% / 14.68 | 14 / 28.57% / 33.29 |
| Standard | 2,291 / 18.51% / 22.54 | 1,182 / 18.44% / 22.50 | 243 / 17.70% / 22.54 |
| Ultra | 43,965 / 18.77% / 22.69 | 23,320 / 19.78% / 23.62 | 5,083 / 19.58% / 23.55 |

Standard and Ultra are materially and consistently enriched; Fast tails are too small and noisy to support the same selection behavior. A budget-matched counterfactual then replaces the legacy strong-river branch with the highest-ranked catchment candidates. Candidate mean GLWD coverage improves from `14.06% -> 15.30%`, `8.72% -> 22.87%`, and `7.38% -> 22.44%` Fast/Standard/Ultra, but high-coverage recall changes by `-0.69 / +4.36 / +0.18` points. The replacement is rejected because it regresses Fast and barely moves Ultra.

The next evaluator candidate should rank the complete generated wetland budget jointly, preserving explicit standing-water and floodplain semantics while using catchment retention to compete for the remaining budget. It must use a bounded histogram/percentile calculation rather than a fixed TWI constant, because the absolute score is resolution-dependent. No production wetland behavior changes in this checkpoint.

## Accepted component baselines

| Metric | Fast 256 x 128 | Standard 1024 x 512 | Ultra 4096 x 2048 |
| --- | ---: | ---: | ---: |
| Zonal wind-band direction | 0.9163 | 0.9109 | 0.9094 |
| Tropical convergence direction | 0.9987 | 1.0000 | 1.0000 |
| Current confinement to ocean | 1.0000 | 1.0000 | 1.0000 |
| Gyre rotation agreement | 0.9663 | 0.9620 | 0.9639 |
| Western-boundary speed ratio | 1.4063 | 1.3904 | 1.3765 |
| Equatorial-current direction agreement | 0.7989 | 0.7692 | 0.7806 |
| Southern circumpolar continuity | 0.8930 | 0.9118 | 0.9122 |
| Equatorward-current dry-coast separation | 0.1533 | 0.2338 | 0.2044 |
| Current-plus-subsidence dry-coast separation | 0.1785 | 0.2539 | 0.2235 |
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
| Köppen biome macro-F1 | 0.5557 | 0.5740 | 0.5955 |
| Final biome consistency | 1.0000 | 1.0000 | 1.0000 |
| Core downstream time | 168.0 ms | 998.0 ms | 15,471.6 ms |

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

The resumed native-localization increment confirms that remaining grassland/forest and desert errors are dominated by upstream wetness placement. Seasonal forest stress and final-wind shadow fail the cross-tier gate; final-wind coastal exposure is consistently positive but immaterial. Do not ship any of those overlays. The next material slice should either improve upstream authoritative circulation/moisture ordering from generic evidence or deliberately add an observed wetland reference layer before changing wetland behavior. Keep Earth and expensive performance diagnostics outside routine push CI.

The first direct pressure-wind ordering correction is now also rejected at Fast. Preserve its opt-in production-order seam for future diagnostics, but do not promote a pressure-wind blend. The next evidence target is an observed-wetland reference slice or a moisture-source routing model that retains local terrain winds.

The observed-wetland slice now includes both resolution-normalized river intensity and an accepted lowland-floodplain connectivity model. Cross-resolution budgets and observed-fraction separation improve while named rivers remain stable, but absolute high-coverage recall remains weak. The next material wetland task should distinguish true standing-water lakes, riverine floodplains, and saturated non-river wetlands in the generator's semantic layers, or add regional attribution that can identify which physical branch is still missing. Do not add another undifferentiated final wetland threshold.
