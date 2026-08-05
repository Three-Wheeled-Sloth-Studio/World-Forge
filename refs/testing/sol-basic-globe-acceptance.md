# Sol Basic Globe Acceptance

Updated: 2026-08-05

## Scope

This closeout increment supplies a bounded Globe presentation for every canonical stellar or solid/fluid body currently included in the Sol starter fixture while preserving richer accepted body paths.

### Retained richer paths

- Earth: imported geographic Globe, Map, and Explorer baseline.
- Jupiter: imported atmospheric RGB565 presentation.
- Mars: imported Viking/MOLA Tier 2 raster Globe and Map.

### New or newly enabled basic paths

- Sol: emissive stellar presentation with halo.
- Mercury: basic airless rocky presentation.
- Venus: basic opaque cloud-top presentation.
- Saturn: derived atmospheric profile with rings.
- Uranus: derived atmospheric profile with rings.
- Neptune: derived atmospheric profile with rings.
- Luna.
- Phobos and Deimos using bounded triaxial approximations.
- Io, Europa, Ganymede, and Callisto.
- Enceladus and Titan.
- Titania and Oberon.
- Triton.

### Explicitly unchanged placeholders

- Main Asteroid Belt.
- Kuiper Belt.

Belts remain population records in System and do not advertise a Globe target.

## Architecture

The implementation adds a generic `basic-presentation` body-detail contract. The package carries:

- sphere, oblate-spheroid, or triaxial-ellipsoid shape;
- presentation palette;
- roughness and metalness;
- optional emissive color and intensity;
- optional halo;
- optional rings;
- an explicit approximation/source note.

The Globe renderer consumes that contract without body-name conditionals. Body-specific colors and presentation properties live in the deterministic Sol source fixture rather than in the viewer.

Atmospheric profiles may render from their deterministic palette when no source texture is present. A hydrated source texture still takes precedence, preserving Jupiter's richer accepted path.

## Automated evidence

Validated code head:

```text
b9997fdd7a124f16d44b10e4b6bcac5ca5a4fa94
```

Workflow:

```text
Validate World Forge
run 31035846677
```

Passed:

- complete unit and integration test suite;
- production TypeScript type-check and frontend build;
- production page-harness self-test;
- production attribution-rerank self-test;
- production page browser smoke;
- production attribution-rerank browser smoke.

Automated coverage includes:

- basic body-detail validation and capabilities;
- sphere, oblate, and triaxial shape scaling;
- emissive, halo, and ring construction;
- Sol target routing without fabricating an orbital planet record;
- basic moon target routing without generated replay artifacts;
- texture-free derived atmospheric target routing;
- complete fixture Globe capability for every non-belt body;
- belt placeholder behavior.

## Local refresh

Use the repository-root launcher:

```text
refresh_sol_starter.bat
```

It rebuilds the enriched Sol `.wforge` from the prepared Earth, Jupiter, and Mars inputs and regenerates Parchment Worlds' bundled `sol-system.pworld` through the normal package path.

## Browser acceptance checklist

From Parchment Worlds, refresh the page and import a new copy through **Use Sol starter**.

In World Forge:

1. Open System.
2. Select each body listed under the new/basic scope.
3. Use **Zoom to globe**.
4. Confirm the selected body remains active and the Globe does not silently return to Earth.
5. Confirm drag, zoom, rotation, and Return to primary work.

Presentation checks:

- Sol is visibly emissive rather than lit like a planet.
- Mercury is a neutral airless rocky body.
- Venus presents an opaque warm cloud deck, not radar terrain.
- Saturn's ring plane is visible and separate from the body.
- Uranus and Neptune remain visually distinct.
- Titan has a warm hazy presentation.
- Enceladus is bright and icy.
- Phobos and Deimos are visibly non-spherical approximations.
- No basic body gains Map or Explorer capability.
- Main Asteroid Belt and Kuiper Belt remain System placeholders without Globe actions.

## Acceptance boundary

This increment is intentionally a complete-navigation baseline, not final source-backed art for every body. Future source-backed textures or meshes may replace basic profiles without changing body identity or Globe routing.
