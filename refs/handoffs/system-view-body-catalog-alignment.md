# System view body-catalog alignment handoff

Updated: 2026-08-04
Status: Implemented on `dev`; exact-head verification and browser QA pending
Tracking:

- World Forge #124
- Parchment Worlds #22

## Product contract

A Parchment Sol project contains one nested World Forge `.wforge` system package. Parchment astronomy assets are body-node entry points into that one package. Each asset maps to a stable World Forge `bodyId` and changes the requested `activeBodyId`; it does not create or store a separate World Forge system.

## QA defects corrected

The earlier System view:

- reset selection and focus to the primary body even when Parchment requested Jupiter;
- labeled the primary body with `project.projectName`, causing Earth to display as `Sol System`;
- labeled non-primary planets from generic scaffold types such as `Rocky 1` and `Gas Giant 6`;
- rendered generated-body artifacts or wireframe placeholders but ignored compact reference-body detail;
- enabled Globe only for the primary or a generated secondary-body artifact.

## Implemented changes

### Authoritative names

`apps/desktop/src/system/systemPresentation.ts` now prefers the body catalog record name for every system body. The primary falls back to `primaryWorld.name`, not the project name. Sol is labeled `Sol`.

### Requested active body

`apps/desktop/src/system/SystemViewer.tsx` initializes selection and focus from `sessionActiveWorldBodyId(project)`. The package bridge already stores the Parchment-requested body in both the durable body catalog and session state.

Selecting a System body updates the shared session. Opening Globe and returning to the primary update that same body session.

### Reference atmospheric System bodies

`apps/desktop/src/system/referenceSystemBodyPresentation.ts` renders `atmospheric-presentation` detail directly:

- a visible derived presentation sphere from the declared palette;
- oblate-spheroid scaling;
- declared ring geometry;
- a hydrated RGB565 source texture when present.

Derived presentation is allowed in System view but does not falsely unlock Globe.

### Globe capability

`apps/desktop/src/globe/globeBodyTarget.ts` now exposes `canOpenGlobeBodyTarget()` using the same resolution rules as Globe:

- primary geographic body;
- canonical secondary surface;
- imported atmospheric presentation with declared capability, referenced asset, and hydrated bytes;
- generated secondary-body artifact.

Jupiter therefore remains System-visible from its derived profile before source preparation, while Globe remains disabled until its source-backed payload is included.

## Tests added or expanded

- authoritative primary, planet, and moon names;
- primary and imported canonical Globe availability;
- imported atmospheric Globe availability with and without hydrated bytes;
- generated-body Globe availability;
- derived oblate atmospheric System presentation;
- ring presentation;
- hydrated RGB565 System texture.

## Current head

```text
2282bedbed66bf56dec693e385cd701f8dbbc56f
```

## Verification

Run from World Forge:

```powershell
git pull --ff-only origin dev
npm run verify
```

Browser QA through Parchment:

1. Open Earth → World Forge → System.
2. Confirm the dropdown shows `Sol`, `Mercury`, `Venus`, `Earth`, `Luna`, `Mars`, `Phobos`, `Deimos`, `Main Asteroid Belt`, `Jupiter`, and the remaining authoritative names.
3. Confirm Earth is selected and focused.
4. Return to Parchment and open Jupiter → World Forge → System.
5. Confirm the same system opens with Jupiter selected and focused.
6. Confirm Jupiter, Saturn, Uranus, and Neptune are visible in System view; Saturn should show rings.
7. Without a prepared Jupiter bundle, confirm Jupiter Globe remains unavailable with an honest capability message.
8. After `reference:prepare-jupiter` and rebuilding the Sol package, confirm Jupiter Globe becomes available and uses the imported appearance.
9. Save while Jupiter is active, reopen, and confirm Earth remains the durable primary while Jupiter remains the active body.

## Guardrails

- Do not duplicate the `.wforge` per Parchment body asset.
- Do not use the project name as the primary-body name.
- Do not fall back to generic orbital-order labels when an authoritative body catalog record exists.
- Do not require generated-body artifacts for imported reference bodies.
- Do not unlock Globe from a derived System-only atmospheric profile.
- Do not claim this increment validated until exact-head verification and browser QA pass.
