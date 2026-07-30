# High-Resolution Map-Line Follow-up

Date: 2026-07-29

Version: `0.3.25`

Case: star seed `1001001`, world seed `5336649`, Earthlike

Output resolution: `2048 x 1024`

Topology resolution: `512`

## Root Cause

The initial `0.3.24` investigation reproduced the requested output at
`512 x 256`, but its diagnostic harness fixed source topology at resolution
`64`. The desktop High preset instead generates authoritative terrain at
topology resolution `512`. Fixed-count topology smoothing therefore covered
one eighth of the intended physical width at High resolution.

The exact High reproduction exposed two additional authoritative-data causes:

1. Each disconnected continental fragment previously received a separate
   spherical transform even when the fragments belonged to the same plate.
   Their independent transforms could open narrow artificial gaps.
2. Vacated source cells were converted directly to young ocean crust.
   Narrow source silhouettes could survive later aging and climate stages as
   long streaks, even when the opening was too narrow to represent a meaningful
   rift.

## Correction

- Tectonic and fragment-history responses are reduced to a fixed reference
  topology, broadened there, and expanded back to the authoritative topology.
  Their physical width is no longer tied to source cell count.
- All fragments belonging to one plate use one rigid spherical rotation.
- A bounded reference-scale repair propagates retained terrain into narrow
  vacated corridors only. Broad masked basins retain their water elevation.
- Fragment-history response is localized with coherent spherical variation so
  recorded event paths do not become uniformly strong global bands.
- The investigation harness now accepts independent star/world seeds, output
  resolution, topology resolution, and output directory arguments, and records
  those actual values in its report.

## Evidence

The exact desktop-path evidence is retained in:

- [Before biome projection](map-lines-polar-ice-high-repro/1001001-5336649-earthlike/biomes.png)
- [After biome projection](map-lines-polar-ice-high-final/1001001-5336649-earthlike/biomes.png)
- [Before final elevation](map-lines-polar-ice-high-repro/1001001-5336649-earthlike/elevation.png)
- [After final elevation](map-lines-polar-ice-high-final/1001001-5336649-earthlike/elevation.png)
- [After fragment placement](map-lines-polar-ice-high-final/1001001-5336649-earthlike/stage-post-fragment-placement.png)
- [Exact run report](map-lines-polar-ice-high-final/baseline-report.json)

The after projection removes the long narrow land cuts visible in the before
projection. Broad ocean basins and rifts remain open. The exact run completed
in `130.7 s`, reported zero invalid river topology jumps, and retained
climate-driven ice in both polar bands.

## Regression Coverage

- Deformation width remains stable between topology resolutions `64` and `256`.
- Local event response does not become a global deformation field.
- Narrow masked cuts close while broad masked basins remain open.
- Disconnected fragments on one plate preserve their angular separation under
  one rigid transform.
- Narrow vacated cuts close, broad opened basins remain, and one-sided coastal
  openings are preserved.

## Performance

The final one-run comparison is recorded in
[generation-workflow-comparison-2026-07-30T01-15-58-298Z.md](generation-workflow-comparison-2026-07-30T01-15-58-298Z.md).
At `512 x 256`, `core.performance-foundation` remained 25.8% to 37.8%
faster overall and 40.0% to 45.1% faster in deep time than
`core.live-world` across the requested Earthlike and Archipelago cases.

## Remaining Limit

Several broad, straight-edged structures remain visible in the
post-fragment-placement elevation field. They are plate/fragment geometry,
not the narrow resolution-dependent streak class corrected here. Replacing
those large forms requires a directional stress and rift-shape model rather
than a wider cleanup filter.

The High-path performance profile and bounded repair optimization are recorded
in [High-Resolution Performance Recovery](high-resolution-performance-recovery-v0.3.26.md).

Run the exact reproduction with:

```text
npm run investigate:map-lines-polar-ice -- --case=1001001:5336649:Earthlike --resolution=2048x1024 --topology=512 --output=map-lines-polar-ice-high-final
```
