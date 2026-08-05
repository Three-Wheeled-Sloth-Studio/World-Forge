# Sol Basic Globe QA Record

Updated: 2026-08-05

Status: **Deferred; not accepted.**

## Scope attempted

This increment attempted to supply a bounded Globe presentation for every canonical stellar or solid/fluid body currently included in the Sol starter fixture while preserving richer accepted body paths.

### Retained richer paths

- Earth: imported geographic Globe, Map, and Explorer baseline.
- Jupiter: imported atmospheric RGB565 presentation.
- Mars: imported Viking/MOLA Tier 2 raster Globe and Map.

These three paths remain user-accepted.

### Attempted basic paths

- Sol.
- Mercury and Venus.
- Saturn, Uranus, and Neptune.
- Luna.
- Phobos and Deimos.
- Io, Europa, Ganymede, and Callisto.
- Enceladus and Titan.
- Titania and Oberon.
- Triton.

### Explicit placeholders

- Main Asteroid Belt.
- Kuiper Belt.

Belts may remain population records in System without Globe targets.

## Architecture delivered

The implementation added a generic `basic-presentation` body-detail contract carrying:

- sphere, oblate-spheroid, or triaxial-ellipsoid shape;
- presentation palette;
- roughness and metalness;
- optional emissive color and intensity;
- optional halo;
- optional rings;
- an explicit approximation/source note.

The Globe renderer consumes that contract without body-name conditionals. Atmospheric profiles may render from a deterministic palette when no source texture is present; hydrated source textures still take precedence.

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

Automated success did not establish visual quality or prove that every moon Globe action worked in the real published starter.

## Published package evidence

The repository-root `refresh_sol_starter.bat` completed successfully through the normal World Forge and Parchment paths.

```text
Bodies: 23
Earth map: 512 x 256
Jupiter appearance: 768 x 384 RGB565
Mars prepared surface: 512 x 256, 2 assets
Prepared body bundles: 1

World Forge package bytes: 2,763,277
World Forge SHA-256: 99852f4549b778d097f94511562381f572394803b297011ac9c183404b4defbd
```

The latest `.pworld` byte size and full digest were not captured.

## User QA result

The attempted basic Globe baseline did **not** pass.

Observed:

- Sol has no useful definition and appears as a flat yellow orb.
- Luna, Phobos, Deimos, Io, and the remaining moons have no working Globe path in the published starter.
- Mercury, Venus, Saturn, and Uranus lack sufficient definition.
- Testing was stopped after the broad moon failure and weak planet presentation quality were established.
- Earth, Mars, and Jupiter still look good.

## Disposition

- Pin these findings and return later.
- Do not describe the complete-Sol Globe increment as accepted or closed.
- Preserve the generic contract and normal package pipeline as groundwork.
- Repair moon Globe routing before the next user acceptance pass.
- Replace flat/basic materials with materially richer source-backed or deterministic generated presentations.
- Preserve Earth, Jupiter, and Mars without regression.
- Keep asteroid and Kuiper belts as placeholders unless separately scoped.

## Future acceptance criteria

A later pass should not be offered for acceptance until:

1. Every selected moon exposes a working Globe from the normal published starter.
2. Sol reads as a star rather than a flat yellow sphere.
3. Remaining planets show enough visible structure to be meaningfully distinguishable at Globe scale.
4. Drag, zoom, rotation, body continuity, and Return to primary work for each target.
5. Unsupported Map and Explorer actions do not silently switch to Earth.
6. The normal `.wforge` and `.pworld` paths pass with fresh package evidence.
7. Earth, Jupiter, and Mars remain unchanged and accepted.
