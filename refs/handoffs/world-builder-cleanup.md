# World Builder Cleanup Handoff

Updated: 2026-07-28

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Status: **active next increment**

## Product outcome

A user can create, regenerate, inspect, and export a world without having to understand the application’s internal component layout or sort through developer diagnostics mixed into ordinary controls.

The cleanup should make the existing World Forge capabilities feel like one coherent world-building workflow. It is not a visual reskin and it must not change generator behavior.

## Why this is next

The current application has accumulated functional controls faster than its information architecture has matured.

Observed problems include:

- The map toolbar combines view selection, layer toggles, diagnostics, globe shells, render mode, map mode, coastline styling, globe debug modes, zoom, drilldown, and exports.
- Debug map modes are exposed beside ordinary user-facing map views.
- Generator controls, world-library controls, map controls, diagnostics, and export controls are divided according to component ownership rather than user tasks.
- The left and right panels consume significant horizontal space while several controls duplicate information already visible elsewhere.
- Generated-world inspection and generation settings compete for attention.
- Advanced settings are partly hidden but the underlying configuration vocabulary is not consistently user-facing.
- Terminology has drifted. In `apps/desktop/src/main.tsx`, `continentCount` is labeled `Regions` while `continentScale` is labeled `Continents`, which obscures what the controls actually mean.
- Runtime/source version provenance is inconsistent during QA. The browser reported `0.3.32` while the World Forge source constant on `dev` reported `0.3.23`.

## Principles

1. Organize controls around user intent, not source-code ownership.
2. Keep the map as the dominant workspace.
3. Show common controls immediately and move diagnostics or specialist controls behind deliberate disclosure.
4. Make generation easy to perform and easy to repeat without silently losing the current world.
5. Preserve advanced control for users who need it without making every user confront it.
6. Do not introduce empty navigation modes for features that do not yet exist.
7. Do not change generation algorithms, schemas, seeds, or deterministic behavior as part of UI cleanup.
8. Prefer a small number of stable interaction patterns over more icon buttons.
9. Preserve hosted and standalone operation.
10. Keep the single-developer direct-to-`dev` workflow in root `AGENTS.md`.

## Proposed information architecture

Use three real user tasks for the first increment:

### Build

Owns inputs that affect world generation:

- star preset and seed;
- world preset and seed;
- map/source quality;
- core world-shape controls;
- Generate and Regenerate actions;
- advanced physical and climate controls;
- generation progress and failure state.

### Explore

Owns ways to look at and inspect the generated world:

- map versus globe;
- normal presentation selection;
- user-facing layers;
- zoom and fit;
- geographic drilldown;
- point and hex inspection;
- contextual legend.

### Export

Owns output rather than map presentation:

- PNG and package save;
- JSON and VTT exports;
- SVG or layered export when useful;
- output resolution and export-specific options;
- export progress and completed-file feedback.

Developer diagnostics should remain available only when developer mode is active. They should not be a fourth ordinary user task.

`Edit` should not be introduced as a primary mode until actual editing and undo/versioning behavior exists.

## First implementation slice

### 1. Establish an explicit workspace mode

Add a compact Build / Explore / Export mode selector in the application workspace.

Requirements:

- The current mode is obvious.
- Switching mode does not regenerate or discard the current world.
- The map remains mounted and retains zoom, pan, view, and selected inspection state.
- Existing left and right collapse behavior remains available.
- Hosted shell controls are not duplicated.

### 2. Clean the Build panel

Create a compact quick-build section:

- World type.
- World seed.
- Star type.
- Star seed.
- Generation quality or map size.
- Randomize.
- Generate or Regenerate.

Move specialist settings into clearly named groups:

- World shape: ocean target and tolerance, continent count, continent scale, islands.
- Climate: temperature, aridity, axial tilt, eccentricity.
- Geology and history: plates, impacts, age.
- Hydrology: rivers.
- System: size and moons.
- Output and preview quality.

Correct terminology before moving controls. `continentCount` must describe the requested continent count. `continentScale` must describe continent size/cohesion rather than being labeled as the count.

Do not rely on validation popups. Invalid or impossible combinations should be indicated inline, and any automatic normalization should be visible.

### 3. Simplify the Explore toolbar

Keep immediately visible:

- map/globe;
- primary presentation;
- primary layer or map subject;
- zoom or fit;
- inspector;
- drilldown when available.

Move to a Layers or More menu:

- rivers;
- plates;
- hex overlays;
- coastline treatment;
- globe shells;
- less common user-facing overlays.

Move all modes labeled `Debug:` and all globe debug composites into developer diagnostics.

Exports do not belong in the Explore toolbar.

### 4. Make the right panel contextual

In Build mode:

- show generation summary, selected preset implications, and generation status.

In Explore mode:

- show world summary when nothing is selected;
- show point, hex, region, or drilldown details when selected;
- do not stack unrelated inspectors above the world summary.

In Export mode:

- show export formats, options, progress, and recent completion state.

The panel must remain collapsible and should not introduce page-level scrolling when the map can instead own the available height.

### 5. Fix version provenance

The visible World Forge version must identify the embedded World Forge build, not merely the host shell release.

Development diagnostics should expose:

- visible World Forge version;
- exact World Forge commit;
- host Parchment Worlds version and commit when embedded;
- build timestamp or deployment identifier when available.

The displayed value must match the code actually running in the iframe or embedded module.

## Explicitly out of scope

- Generator algorithm changes.
- Continent decomposition fixes.
- Raster sharpness or deep drilldown scale fixes.
- Map editing, undo, or version history.
- New export formats beyond relocating existing controls.
- 3D material or terrain work.
- Persistence schema changes.
- Activation of `world-regions-v2`.

## Suggested work packages

### WP1: Control inventory and terminology

- Map every current control to Build, Explore, Export, Developer, or Remove/Duplicate.
- Identify duplicated state and controls.
- Correct misleading labels and help text.
- Record hosted versus standalone differences.

### WP2: Workspace mode shell

- Add the mode selector.
- Preserve map state across mode changes.
- Route panel content by mode.
- Retain keyboard and collapse behavior.

### WP3: Build panel

- Recompose quick-build controls.
- Add grouped advanced controls using existing configuration state.
- Clarify Generate versus Regenerate.
- Keep progress and error feedback close to the action.

### WP4: Explore controls

- Reduce the primary toolbar.
- Add Layers or More disclosure.
- Gate debug options behind developer mode.
- Remove exports from the map toolbar.

### WP5: Contextual right panel and Export mode

- Route inspectors contextually.
- Move export controls and status into Export mode.
- Keep world summary as the default Explore context.

### WP6: Provenance and QA

- Fix embedded World Forge build reporting.
- Add desktop viewport QA at 1920 x 1080 and 1440 x 900.
- Verify hosted and standalone behavior.
- Confirm no generation or deterministic-output changes.

## Definition of done for the cleanup increment

- Build, Explore, and Export are clear and backed by real functionality.
- The map remains visible and stable while switching modes.
- The default Explore toolbar no longer exposes developer debug views.
- Export actions are no longer mixed into map presentation controls.
- Generation controls use accurate terminology and coherent grouping.
- The right panel shows one relevant context rather than several stacked contexts.
- The current world, selection, view, and zoom survive mode changes.
- Hosted and standalone modes both work.
- The visible World Forge version and exact source commit are trustworthy.
- `npm run verify` passes on the exact accepted `dev` commit.
- Browser QA confirms no new page-level scroll or major loss of map area.

## First decision checkpoint

Before implementation gets deep, capture screenshots of the current Build, Explore, and Export-related controls and produce a one-page control disposition table:

`Current control | User job | Destination | Keep/change/remove | Notes`

Use that table to prevent useful capabilities from disappearing during cleanup and to keep developer diagnostics from sneaking back into the main toolbar wearing a fake mustache.
