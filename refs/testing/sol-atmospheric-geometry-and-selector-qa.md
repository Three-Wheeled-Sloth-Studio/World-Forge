# Sol atmospheric geometry and selector QA

Updated: 2026-08-04
Status: Focused automated coverage added; browser acceptance pending

## Scope

This pass validates two regressions found after Earth and Jupiter first passed the shared-system Parchment flow:

1. imported atmospheric bodies must use smooth sphere or oblate-spheroid geometry instead of geographic terrain displacement;
2. moons must appear immediately below and visibly indented under their parent planets in the native System selector without changing stable body IDs.

## Automated checks

Run:

```powershell
npm test -- apps/desktop/src/presentation/atmosphericBodyPresentation.test.ts apps/desktop/src/system/systemSelectorHierarchy.test.ts apps/desktop/src/system/referenceSystemBodyPresentation.test.ts
npm run typecheck
npm run verify
```

Expected coverage:

- atmospheric geometry has a uniform base radius;
- Jupiter's polar scale equals its declared polar-to-equatorial radius ratio;
- rings are separate geometry;
- hydrated RGB565 presentation bytes remain a `DataTexture`;
- moon labels receive one native-selector indentation level;
- planets and belts remain peers;
- option values remain stable body IDs.

## Browser setup

Use the accepted enriched Sol starter package and normal Parchment embed flow. Do not substitute separate Earth and Jupiter projects.

Record:

- World Forge commit;
- Parchment Worlds commit;
- `.wforge` project ID;
- active body ID before and after each entry path;
- browser and graphics adapter;
- screenshots of Earth Globe, Jupiter Globe, and the open System selector.

## Earth regression

1. Open the Earth Parchment asset.
2. Enter Globe.
3. Rotate and zoom across recognizable coastlines and mountain regions.
4. Confirm geographic relief remains present and visually unchanged from the accepted checkpoint.
5. Confirm inspection controls still operate on Earth.

Pass criteria:

- Earth does not become a smooth atmospheric sphere;
- existing terrain relief, map texture, shells, and inspection remain available;
- project ID and primary body remain unchanged.

## Jupiter atmospheric geometry

1. Open the Jupiter Parchment asset.
2. Enter Globe.
3. Rotate through at least one full turn.
4. Inspect the equatorial limb, both poles, and the Great Red Spot region when visible.
5. Zoom from overview to the closest supported inspection distance.

Pass criteria:

- imported banding remains recognizable and correctly oriented;
- the silhouette is smooth at every angle;
- oblateness is visible and restrained;
- no mountains, pits, ocean-floor relief, or other geographic displacement appears;
- System time controls continue to drive rotation and lighting;
- Return to primary selects Earth in the same project.

Useful DOM evidence:

```text
data-globe-target-mode="atmospheric-presentation-body"
data-globe-surface-geometry="smooth-oblate-spheroid"
data-globe-surface-material="imported-atmospheric-rgb565"
data-system-star-light="coupled"
```

## System selector hierarchy

1. Open System.
2. Open the Body selector with mouse and keyboard.
3. Verify moons occur immediately after their parent planets.
4. Select Earth, Luna, Mars, Phobos, Deimos, Jupiter, and one Galilean moon.
5. Verify belts remain unindented peers.

Pass criteria:

- moon labels are visibly indented one level;
- parent and child ordering follows catalog relationships;
- keyboard navigation and selection remain native;
- option values remain stable body IDs;
- selecting an option updates the same active-body session;
- belts are not treated as children of neighboring planets.

Useful DOM evidence:

```text
select[data-hierarchy="catalog-parent-v1"]
option[data-body-depth="1"][data-parent-body-id]
```

## Save and bridge regression

1. Select Jupiter, save, and reopen the `.wforge`.
2. Return to Parchment.
3. Open Earth and Jupiter through their separate body-node assets.
4. Confirm both resolve the same nested package and catalog.

Pass criteria:

- one project ID;
- one body catalog;
- requested active body changes correctly;
- no silent fallback to Earth for Jupiter;
- no duplicate system is created.

## Failure handling

Do not accept the increment if:

- Jupiter loses imported banding;
- any atmospheric target reads Earth elevation or water layers;
- Earth loses geographic relief;
- moon IDs are rewritten or nested into a different value contract;
- native selector keyboard behavior regresses;
- Earth and Jupiter open as separate systems.
