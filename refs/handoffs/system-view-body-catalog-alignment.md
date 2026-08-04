# System view body-catalog alignment handoff

Updated: 2026-08-04
Status: Authoritative naming, shared-system body selection, and visible giant presentation passed user browser QA on `dev`; atmospheric geometry polish and hierarchical moon options remain open
Tracking:

- World Forge #124
- Parchment Worlds #22

## Product contract

A Parchment Sol project contains one nested World Forge `.wforge` system package.

Parchment astronomy assets are body-node entry points into that one package. Each asset maps to a stable World Forge `bodyId` and changes the requested `activeBodyId`; it does not create, duplicate, or save a separate World Forge system.

Opening Earth and opening Jupiter must therefore show the same body inventory and orbital relationships. The selected and focused body changes; the system identity does not.

## Accepted QA state

User browser QA confirmed:

- Earth opens and displays correctly through the Parchment-to-World-Forge package path;
- Jupiter opens and displays through the same system package;
- authoritative body names replaced generic labels such as `Rocky 1` and `Gas Giant 6`;
- Earth is no longer mislabeled as `Sol System`;
- opening the Earth asset selects Earth;
- opening the Jupiter asset selects Jupiter;
- Jupiter's atmospheric banding is recognizable and visually successful.

Current World Forge implementation head at the QA checkpoint:

```text
5cdce0dd1efb68c18f286b2165482d849971d64d
```

The final test-only TypeScript fix at that head narrowed `THREE.Texture.image` before checking prepared texture dimensions. No production rendering behavior changed in that commit.

## Implemented behavior

### Authoritative names

`apps/desktop/src/system/systemPresentation.ts` prefers the body-catalog record name for every system body.

- Sol is labeled `Sol`.
- The primary body falls back to `primaryWorld.name`, not `project.projectName`.
- Planets and moons use their canonical catalog names.

### Requested active body

`apps/desktop/src/system/SystemViewer.tsx` initializes selection and focus from `sessionActiveWorldBodyId(project)`.

The Parchment package bridge stores the requested body in the active-body session. Selecting another System body updates that same session. Opening Globe and returning to the primary also update the same body session.

### Reference atmospheric System bodies

`apps/desktop/src/system/referenceSystemBodyPresentation.ts` renders `atmospheric-presentation` detail directly:

- visible atmospheric presentation sphere;
- oblate-spheroid scaling;
- declared ring geometry;
- hydrated RGB565 source texture when present;
- derived palette fallback for System presentation when a source texture is absent.

Derived presentation is allowed in System view but does not falsely unlock Globe.

### Globe capability

`apps/desktop/src/globe/globeBodyTarget.ts` resolves Globe capability through the same body-detail contract used by the renderer:

- primary geographic body;
- canonical secondary surface;
- imported atmospheric presentation with declared capability, referenced asset, and hydrated bytes;
- generated secondary-body artifact.

## Immediate QA corrections

### Atmospheric bodies must be smooth

Jupiter currently appears lumpy in Globe despite successful banding.

Accepted correction:

- gas and ice giants use a smooth sphere or oblate-spheroid geometry;
- atmospheric appearance textures must not inherit geographic elevation displacement;
- no terrain-like bumps, mountain relief, or Earth-style topographic exaggeration;
- retain the successful imported banding and recognizable atmospheric features;
- preserve oblate shape using equatorial and polar radii;
- rings remain separate geometry.

The likely defect is reuse of the legacy geographic Globe mesh or displacement path for an atmospheric target. The fix should route atmospheric targets through dedicated smooth geometry rather than merely reducing displacement strength.

Acceptance:

1. Jupiter remains recognizably banded.
2. Limb and silhouette are smooth.
3. Oblateness remains visible at appropriate inspection scale.
4. No geographic terrain displacement is applied.
5. Earth geographic relief remains unchanged.

### Indent moons under parent bodies

The System body selector currently presents a flat list.

Accepted hierarchy:

```text
Sol
Mercury
Venus
Earth
  Luna
Mars
  Phobos
  Deimos
Main Asteroid Belt
Jupiter
  Io
  Europa
  Ganymede
  Callisto
Saturn
  Enceladus
  Titan
Uranus
  Titania
  Oberon
Neptune
  Triton
Kuiper Belt
```

Requirements:

- preserve stable flat body IDs as option values;
- order moons immediately after their parent body;
- visually indent moon labels;
- do not imply moons are independent systems;
- keep keyboard navigation and native select accessibility;
- use catalog parent relationships rather than hard-coded Sol names;
- belts remain peer system entries, not children of the nearest planet.

A native select may use a visible indentation prefix or a future accessible custom selector. Parent-child ordering must be derived from the body catalog either way.

## Tests already added

- authoritative primary, planet, and moon names;
- primary and imported canonical Globe availability;
- imported atmospheric Globe availability with and without hydrated bytes;
- generated-body Globe availability;
- derived oblate atmospheric System presentation;
- ring presentation;
- hydrated RGB565 System texture.

## Tests still required

- atmospheric Globe geometry does not use elevation displacement;
- oblate atmospheric geometry uses the declared polar/equatorial ratio;
- Earth still uses geographic geometry;
- selector orders moons directly after their parent;
- selector adds accessible visual indentation without changing body IDs;
- opening Earth and Jupiter through separate Parchment assets produces one World Forge project ID and one catalog.

## Remaining System-view work

1. Replace lumpy atmospheric Globe geometry with dedicated smooth oblate geometry.
2. Indent and parent-order moons in the body selector.
3. Complete direct System-selection propagation into Map, Globe, and Explorer under #124.
4. Add body-family-specific inspector labels instead of terrestrial terminology where inappropriate.
5. Add population rendering for belts.
6. Add irregular-body mesh presentation for Phobos and Deimos.
7. Continue full-system browser QA as new source-backed bodies are added.

## Guardrails

- Do not duplicate the `.wforge` per Parchment body asset.
- Do not use the project name as the primary-body name.
- Do not fall back to generic orbital-order labels when an authoritative body catalog record exists.
- Do not require generated-body artifacts for imported reference bodies.
- Do not unlock Globe from a derived System-only atmospheric profile.
- Do not apply terrestrial displacement geometry to gas or ice giants.
- Do not flatten away parent-child relationships in body selection UI.
