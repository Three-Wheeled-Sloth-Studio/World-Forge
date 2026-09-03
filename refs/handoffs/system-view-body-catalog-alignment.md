---
type: "Handoff Record"
title: "System view body-catalog alignment handoff"
tags:
- world-forge
- handoffs
---
# System view body-catalog alignment handoff

Updated: 2026-08-04
Status: Authoritative naming, shared-system body selection, and visible giant presentation passed user browser QA. Smooth imported-atmosphere Globe routing and hierarchical native selector labels are implemented in the current dev increment and await focused browser acceptance.

Tracking:

- World Forge #124
- Parchment Worlds #22

## Product contract

A Parchment Sol project contains one nested World Forge `.wforge` system package.

Parchment astronomy assets are body-node entry points into that one package. Each asset maps to a stable World Forge `bodyId` and changes the requested `activeBodyId`; it does not create, duplicate, or save a separate World Forge system.

Opening Earth and opening Jupiter must therefore show the same body inventory and orbital relationships. The selected and focused body changes; the system identity does not.

## Accepted browser-QA checkpoint

```text
5cdce0dd1efb68c18f286b2165482d849971d64d
```

User browser QA confirmed at that checkpoint:

- Earth opens and displays correctly through the Parchment-to-World-Forge package path;
- Jupiter opens through the same system package;
- authoritative names replace generated orbital-order labels;
- Earth and Jupiter select their own stable body IDs;
- Jupiter's imported atmospheric banding is recognizable and visually successful.

The same pass found two presentation defects: Jupiter inherited geographic relief, and the native System selector visually flattened moons.

## Current implementation correction

### Atmospheric Globe route

`apps/desktop/src/globe/GlobeViewer.tsx` is now a capability router.

- The accepted geographic renderer is preserved unchanged in `GeographicGlobeViewer.tsx`.
- Imported `atmospheric-presentation` targets use `AtmosphericGlobeViewer.tsx`.
- Shared atmospheric geometry and RGB565 hydration live in `apps/desktop/src/presentation/atmosphericBodyPresentation.ts`.
- Sphere geometry remains radially uniform before oblate scaling.
- Oblateness uses the declared polar-to-equatorial radius ratio.
- Rings remain separate plane geometry.
- Imported banding remains the material source.
- Atmospheric bodies never read `PrimaryWorld` elevation or water arrays.
- Earth continues through the unchanged geographic renderer.

This route generalizes to future imported Saturn, Uranus, and Neptune presentation records without Sol-specific body-name checks.

### Hierarchical native selector

`apps/desktop/src/system/SystemViewer.tsx` now wraps the accepted base viewer and applies catalog-derived native option presentation.

- `buildSystemCatalog` remains the ordering authority and already places moons immediately after parents.
- `systemSelectorHierarchy.ts` derives one level of visual indentation only for moon records with a catalog parent.
- Option values remain the original stable body IDs.
- Belts and planets remain peer entries even when their orbital parent is the system star.
- The native select remains keyboard navigable and screen-reader discoverable.
- Option elements expose `data-body-depth` and `data-parent-body-id` for focused browser QA.

## Focused automated coverage

- atmospheric sphere vertices have uniform radius before scale;
- oblate polar scale matches the declared radius ratio;
- rings are separate geometry;
- hydrated RGB565 textures remain attached;
- moon option labels gain visible indentation;
- planet and belt labels remain peers;
- stable option IDs remain unchanged.

## Browser acceptance still required

1. Open the same enriched Sol package through the Earth Parchment asset.
2. Confirm Earth relief and interaction remain unchanged.
3. Open Jupiter through the Jupiter Parchment asset.
4. Confirm banding remains recognizable.
5. Confirm the limb is smooth with visible but restrained oblateness.
6. Confirm no terrain-like bumps appear at any zoom or rotation.
7. Confirm the System selector places each moon directly below and visibly inside its parent planet.
8. Confirm keyboard selection still works and selected IDs remain stable.
9. Save, reopen, and re-import through Parchment without changing project or catalog identity.

Detailed steps are in `refs/testing/sol-atmospheric-geometry-and-selector-qa.md`.

## Remaining System-view work

1. Complete direct System-selection propagation into Map, Globe, and Explorer under #124.
2. Add body-family-specific inspector labels instead of terrestrial terminology where inappropriate.
3. Add population rendering for belts.
4. Add irregular-body mesh presentation for Phobos and Deimos.
5. Continue full-system browser QA as source-backed bodies are added.

## Guardrails

- Do not duplicate the `.wforge` per Parchment body asset.
- Do not use the project name as the primary-body name.
- Do not fall back to generic orbital-order labels when an authoritative body record exists.
- Do not require generated-body artifacts for imported reference bodies.
- Do not unlock Globe from a derived System-only atmospheric profile.
- Do not apply terrestrial displacement geometry to gas or ice giants.
- Do not flatten away parent-child relationships in body selection UI.
