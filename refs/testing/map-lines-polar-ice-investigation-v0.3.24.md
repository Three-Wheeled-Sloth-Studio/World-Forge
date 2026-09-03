---
type: "Testing Reference"
title: "Map Line Artifacts and Polar Ice Investigation"
tags:
- world-forge
- testing
---
# Map Line Artifacts and Polar Ice Investigation

Date: 2026-07-29

Branch: `agent/investigate-map-lines-polar-ice`

Workflow: `core.performance-foundation`

Resolution: `512 x 256`

## Outcome

The line artifacts and polar ice defects were independent authoritative-data
problems. Neither originated in the final renderer.

- Long plate-shaped terrain scars first appeared in the initial tectonic
  elevation layer. Plate IDs were used as phase offsets for elevation noise,
  and construction-time plate allocation boundaries received direct relief.
  Fragment history later added a second set of one- and two-cell-wide event
  ridges.
- Polar ice inherited stale deep-time ice. Climate refresh subtracted five
  degrees from cells that were already frozen, then cleared only selected warm
  land ice and all water ice. It did not rebuild permanent ice from the final
  climate.
- Post-generation system/orbit reconciliation then changed raster climate and
  ice without changing topology layers, creating two different canonical
  answers for the same world.
- River topology paths were valid in all five reproduction cases. Renderer
  hardening now rejects non-neighbor topology jumps and splits valid
  antimeridian paths before producing SVG polylines.

## Corrections

1. Initial elevation noise now uses a continent-scale phase rather than plate
   IDs, and construction plate allocation boundaries no longer write relief.
   Geological deformation remains the responsibility of recorded deep-time
   events.
2. Fragment-history deformation is spread through a seven-pass topology
   smoothing field instead of being written as graph-width ridges and trenches.
3. Permanent ice is rebuilt from final temperature, latitude, elevation,
   wetness, surface type, axial tilt, eccentricity, and coherent spherical
   variation. The classifier supports both sea ice and alpine land ice.
4. Stellar/orbit forcing now updates authoritative topology layers first and
   reprojects the affected climate, biome, and ice layers.
5. River paths are projected only through directed topology neighbors. Invalid
   jumps truncate the projected path; valid antimeridian crossings are split
   into independent renderer segments.

## Reproduction Matrix

The before and after directories contain the final elevation, water,
temperature, ice, biome, and river layers plus diagnostic stage snapshots.
These authoritative layer captures are more useful than final-composite
screenshots because they identify the stage that owns each defect.

| Case | Elevation before | Elevation after | Ice before | Ice after |
| --- | --- | --- | --- | --- |
| 1001001 Earthlike | [before](map-lines-polar-ice-before/1001001-earthlike/elevation.png) | [after](map-lines-polar-ice/1001001-earthlike/elevation.png) | [before](map-lines-polar-ice-before/1001001-earthlike/ice.png) | [after](map-lines-polar-ice/1001001-earthlike/ice.png) |
| 1001001 Archipelago | [before](map-lines-polar-ice-before/1001001-archipelago/elevation.png) | [after](map-lines-polar-ice/1001001-archipelago/elevation.png) | [before](map-lines-polar-ice-before/1001001-archipelago/ice.png) | [after](map-lines-polar-ice/1001001-archipelago/ice.png) |
| 1001001 Random World | [before](map-lines-polar-ice-before/1001001-random-world/elevation.png) | [after](map-lines-polar-ice/1001001-random-world/elevation.png) | [before](map-lines-polar-ice-before/1001001-random-world/ice.png) | [after](map-lines-polar-ice/1001001-random-world/ice.png) |
| 5336649 Earthlike | [before](map-lines-polar-ice-before/5336649-earthlike/elevation.png) | [after](map-lines-polar-ice/5336649-earthlike/elevation.png) | [before](map-lines-polar-ice-before/5336649-earthlike/ice.png) | [after](map-lines-polar-ice/5336649-earthlike/ice.png) |
| 5336649 Archipelago | [before](map-lines-polar-ice-before/5336649-archipelago/elevation.png) | [after](map-lines-polar-ice/5336649-archipelago/elevation.png) | [before](map-lines-polar-ice-before/5336649-archipelago/ice.png) | [after](map-lines-polar-ice/5336649-archipelago/ice.png) |

## Invariant Results

| Case | Invalid river topology jumps | Long projected neighbor spans | North polar ice | South polar ice | Topology/raster ice mismatch |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1001001 Earthlike | 0 | 0 | 44.5% | 41.4% | 0% |
| 1001001 Archipelago | 0 | 35 | 51.2% | 65.0% | 0% |
| 1001001 Random World | 0 | 8 | 100.0% | 100.0% | 0% |
| 5336649 Earthlike | 0 | 16 | 31.5% | 36.9% | 0% |
| 5336649 Archipelago | 0 | 37 | 37.2% | 31.8% | 0% |

Long projected neighbor spans are valid adjacent topology cells enlarged by
the equirectangular projection near the poles. They are not path jumps.

The deterministic `1001001` Random World selected an average temperature of
`-6.3 C`; complete polar freezing in that case is expected. The four warm
Earthlike/Archipelago worlds now produce coherent but irregular caps in both
hemispheres.

## Regression Coverage

- Plate allocation does not alter elevation when otherwise identical plates
  are divided under different IDs.
- River projection preserves face seams and antimeridian neighbors, rejects
  non-neighbor jumps, and preserves terminal/repeated cells.
- Renderer antimeridian paths become separate polylines.
- Permanent ice responds monotonically to warm and cold climates, permits sea
  ice, and supports wet high-elevation equatorial glaciers.
- Final Earthlike climate remains colder at the poles than the equator and has
  greater polar than mid-latitude ice.
- System/orbit reconciliation preserves exact topology-to-raster temperature,
  biome, and ice parity.
- Same-seed generation remains deterministic through existing repository
  tests.

Run the diagnostic matrix with:

```text
npm run investigate:map-lines-polar-ice
```

## Performance

The requested one-run workflow comparison is recorded in
`generation-workflow-comparison-2026-07-30T00-06-48-420Z.md`.
`core.performance-foundation` remained 28.6% to 40.6% faster overall and 42.1%
to 46.0% faster in deep time than `core.live-world` across the four requested
Earthlike/Archipelago seed pairs. The new work is bounded topology/raster
passes; no new resolution-squared nested traversal was introduced.

## Remaining Limits

- Permanent ice is a final climatological classification, not a seasonal ice
  simulation.
- Equirectangular polar rows visually exaggerate cap width; globe rendering is
  the authoritative shape check.
- Geological event deformation is now broad enough to avoid graph-width scars,
  but it is still a scalar response rather than a directional stress model.
- River renderer hardening is defensive. Future malformed topology paths should
  also fail validation at the producing node rather than relying on truncation.
