# Current Handoff: Sol Reference System

Updated: 2026-08-04

Status: Earth Tier 3, Jupiter Tier 1, one-system package loading, authoritative body naming, and body-specific entry through Parchment passed local user QA. The next World Forge increment routes imported atmospheric bodies through smooth oblate Globe geometry and presents moons hierarchically in the native System selector. Browser QA for that increment remains required before it replaces the accepted runtime checkpoint below.

## Read first

1. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
2. `refs/handoffs/system-view-body-catalog-alignment.md`
3. `refs/testing/sol-atmospheric-geometry-and-selector-qa.md`
4. `refs/planning/body-detail-tiers-and-payload-strategy.md`
5. `refs/planning/reference-system-etl-and-multi-body-navigation.md`
6. World Forge issue #124
7. Parchment Worlds issue #22

## Accepted runtime QA checkpoint

```text
5cdce0dd1efb68c18f286b2165482d849971d64d
```

User-confirmed at that checkpoint:

- Earth displays correctly;
- Jupiter displays through the same World Forge system;
- Jupiter banding is visually successful;
- canonical body names display;
- Parchment Earth and Jupiter assets act as entry nodes into one `.wforge`, not separate systems.

## Current implementation increment

- Preserve the accepted geographic Globe renderer unchanged behind a routing wrapper.
- Route `atmospheric-presentation` bodies through shared smooth sphere or oblate-spheroid geometry.
- Preserve hydrated RGB565 banding and separate ring geometry.
- Preserve Earth geographic relief by keeping the accepted geographic renderer byte-for-byte unchanged.
- Preserve stable System option values while indenting moons from catalog parent relationships.
- Add focused regressions for atmospheric radius uniformity, oblateness, imported texture hydration, ring separation, selector depth, peer belts, and stable IDs.

## Next work after browser acceptance

1. Measure Earth-plus-Jupiter `.wforge` and enriched `.pworld` size, load time, and browser memory.
2. Add lazy per-body package loading before broad reference-body expansion.
3. Add Mars and Venus near normal map resolution where source and performance permit.
4. Add Luna and the generic compact solid-body renderer.
5. Continue through the remaining giants, moons, irregular bodies, and belts.
6. Revisit optional higher-resolution Earth only after broader system coverage.

## Guardrails

- One system is one project.
- Parchment body assets are body nodes, not independent systems.
- Atmospheric bodies must not use terrain displacement.
- Unsupported views must never silently switch to Earth.
- Keep refs and issue threads current with every accepted increment.
