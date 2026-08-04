# Current Handoff: Sol Reference System

Updated: 2026-08-04

Status: Earth Tier 3, Jupiter Tier 1, one-system package loading, authoritative body naming, and body-specific entry through Parchment passed local user QA. Continue from the reference-system and System-view handoffs below.

## Read first

1. `refs/handoffs/reference-system-etl-and-multi-body-navigation.md`
2. `refs/handoffs/system-view-body-catalog-alignment.md`
3. `refs/planning/body-detail-tiers-and-payload-strategy.md`
4. `refs/planning/reference-system-etl-and-multi-body-navigation.md`
5. World Forge issue #124
6. Parchment Worlds issue #22

## Runtime QA checkpoint

```text
5cdce0dd1efb68c18f286b2165482d849971d64d
```

User-confirmed:

- Earth displays correctly;
- Jupiter displays through the same World Forge system;
- Jupiter banding is visually successful;
- canonical body names display;
- Parchment Earth and Jupiter assets act as entry nodes into one `.wforge`, not separate systems.

## Immediate work

1. Make Jupiter and all atmospheric giants smooth rather than geographically displaced.
2. Indent moons under their parent bodies in the System selector.
3. Measure Earth-plus-Jupiter package size and browser memory.
4. Add lazy per-body package loading.
5. Add Mars and Venus near normal map resolution where source and performance permit.
6. Add Luna and the generic compact solid-body renderer.
7. Continue through the remaining giants, moons, irregular bodies, and belts.
8. Revisit optional higher-resolution Earth only after broader system coverage.

## Guardrails

- One system is one project.
- Parchment body assets are body nodes, not independent systems.
- Atmospheric bodies must not use terrain displacement.
- Unsupported views must never silently switch to Earth.
- Keep refs and issue threads current with every accepted increment.
