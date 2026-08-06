# Geographic drilldown QA checkpoint 0.3.65

Date: 2026-08-06
Tracking: issue #10
Source QA: browser screenshots from v0.3.64

## Reported regressions

- substantial land area rendered in blue tones that read as coastal water;
- world atlas region outlines had plausible shapes but were offset from the land beneath them;
- contextual tiles again formed visible water borders around selected parents;
- close-scale rivers could appear without a legible source or mouth;
- major channels outnumbered tributaries;
- major and tributary blues did not blend;
- broad channels consumed entire hexes too readily.

## 0.3.65 correction boundary

### Land and water palette

Land classification remains authoritative. Stale ice-cap biome labels are no longer allowed to render non-water tiles with water-blue fills. Natural-view open water remains clearly blue, with restrained coastal/sediment variation rather than blue-green land ambiguity.

### World atlas overlay alignment

Macro-area outlines are positioned and sized against the displayed base-canvas rectangle, not stretched across the workspace container. The overlay and rendered world therefore share the same visible canvas box.

### Context tiles

The tile renderer exposes the selected parent plus only a bounded contextual ring. Context is visually veiled and remains non-selectable. It must not recreate a broad rectangular water frame around the selected geography.

### Hydrology continuity

Canonical rivers retain route endpoint information so source and mouth presentation can be distinguished from clipped window boundaries. A river may enter or leave the current window, but an interior endpoint must not look like an arbitrary disconnected stroke.

Tributary generation is budgeted relative to major-channel length and refinement ratio. Minor channels should generally outnumber newly refined major trunks, while canonical major paths remain authoritative.

Major and tributary channels use one blue family. Hierarchy is primarily stroke width and opacity, avoiding hard color discontinuities at confluences.

### River width

Estimated physical river width remains separate from display width. Unless estimated bank-to-bank width meets or exceeds the active hex width, the atlas caps the displayed corridor at about 65 percent of the hex. Full water-tile treatment is reserved for channels that physically exceed the active hex scale or for explicit lake/coastal water.

## Remaining limits

- channel width is still a cartographic estimate rather than discharge-derived bank geometry;
- tributary order is bounded procedural refinement, not a complete drainage-basin simulation;
- local/detail terrain decomposition remains a separate unresolved fidelity increment;
- strategy-game semantic river-edge ownership remains deferred.

## Browser retest

1. Confirm no ordinary land biome reads as open/coastal water at world, region, and detail scales.
2. Confirm world macro outlines sit on the same coastlines and land shapes they describe.
3. Confirm only a narrow contextual halo appears around selected parents and context remains non-selectable.
4. Follow one canonical river from source toward mouth across hierarchy levels.
5. Confirm minor tributaries generally outnumber refined major trunks in a river-rich local/detail window.
6. Confirm tributary and trunk colors blend at confluences.
7. Confirm a 10-mile hex river remains partially land-visible unless its estimated physical width exceeds 10 miles.
