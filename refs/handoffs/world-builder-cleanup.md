# World Builder Cleanup Handoff

Updated: 2026-07-30

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Parent PI: issue `#13` — **Clean up world builder workflow and controls**

Completed work package: issue `#24` — **World builder workspace mode shell**

Status: **Combined-test QA polish accepted; resume combined user testing and PI-close provenance**

## Accepted baseline

Functional code baseline before this documentation-only handoff:

- commit `c790b6d9d0e9a310e260d74a5ac3dbd5bfb1748c`
- visible World Forge version `0.3.33`
- `npm run verify` passed in GitHub Actions
- 243 tests passed
- TypeScript build passed
- production build passed
- focused headless browser QA passed at 1920 x 1080 and 1440 x 900

Do not branch away from stale work. Start from current `dev` and work directly on `dev` in small, reviewable commits, per root `AGENTS.md`.

## Product outcome

A user can build, explore, and export a world through a coherent workflow without sorting through component-owned panels, duplicated controls, or developer diagnostics mixed into normal use.

This is an information-architecture and interaction cleanup. It is not a generator rewrite or visual reskin.

## Work completed

### Generation workflow promotion

The generation choices are now:

- `core.performance-foundation` — **World Generation (Detailed)**, production default
- `core.live-world` — **World Generation (Legacy)**, selectable rollback/comparison path
- `core.world-generation-experimental` — **World Generation (Experimental)**, behavior-identical copy of Detailed reserved for further optimization

The runtime graph was corrected so Experimental uses the same optimized deep-time implementation as Detailed. Unknown workflow IDs resolve to Detailed.

Several old tests had silently depended on Legacy being the default. Those fixtures were corrected to test their actual contracts rather than requiring one fixed seed to preserve Legacy-specific biome or landmass outcomes.

### App-owned workspace mode

Implemented in `0.3.29`:

- `App` owns the single Build / Explore / Export state.
- `WorldWorkspace` is controlled through `workspaceMode` and `onWorkspaceModeChange` props.
- successful generation, saved-world load, and `.wforge` open explicitly move to Explore.
- clearing the current project returns to Build.
- `GeneratorPanel` and `RightPanel` receive the same mode state, ready for contextual recomposition.
- workspace mode remains session-only and is not added to persistence or saved-world schemas.

### Build panel recomposition

Implemented in `0.3.30`:

- Quick Build keeps world type, world seed, star type, star seed, generation quality, Randomize All, and the primary generation action together.
- the primary action reads **Generate** without a current world and **Regenerate** when replacing one.
- regeneration preserves the current world until the replacement completes successfully.
- generation stage and overall progress appear beside the Build action.
- Generation Quality updates both projected map resolution and source topology resolution through the existing quality mapping.
- advanced generation controls are grouped into World shape, Climate, Geology and history, Hydrology, and System.
- every supported generation range is exposed with bounded minimum and maximum inputs.
- `continentCount` is labeled **Continent count**.
- `continentScale` is labeled **Continent size and cohesion**, matching its effect on landmass radius and major rift suppression.
- account controls remain in the shell.
- preview resolution moved to Explore.
- PNG resolution moved to Export.
- no generator algorithm, replay, persistence, or saved-world schema changes were made.

### Contextual right panel

Implemented in `0.3.31`:

- Build shows preset implications, generation quality, progress, and current-world replacement guidance.
- Explore resolves one context at a time: point inspector, geographic drilldown, hex selection, or world summary.
- point inspection takes priority over drilldown, and active drilldown takes priority over stale hex selection.
- geographic drilldown remains mounted across workspace-mode changes while its toolbar, overlay, and inspector are only active in Explore.
- Export contains PNG resolution, PNG/SVG/JSON/`.wforge`, hex tile, and VTT controls with visible task feedback.
- diagnostics are only shown when the Dev workspace is active.
- `.wforge` opening moved to My Worlds as a global project/library action.
- no generator algorithm, persistence, replay, or saved-world schema changes were made.

### Explore toolbar disclosure

Implemented in `0.3.32`:

- map/globe, presentation, map subject, point inspector, zoom, Fit, and geographic drilldown remain immediately available.
- rivers, plate boundaries, hex overlays, coastline treatment, globe ocean/atmosphere shells, and preview detail are grouped under Layers.
- the zoom percentage opens common levels on normal click and still supports right-click placement.
- Fit resets the active map or globe zoom to the existing fitted 100% state.
- no map state, generator behavior, persistence, replay, or saved-world schema changes were made.

### Combined-test QA polish

Implemented in `0.3.33`:

- Layers and zoom use one shared transient-popover contract.
- outside pointer interaction closes the active transient surface without swallowing the destination click.
- Escape closes the active surface and restores focus to its trigger.
- opening Layers or zoom closes the competing surface.
- leaving Explore closes both transient surfaces.
- expanded right-panel content clears the boundary toggle instead of rendering underneath it.
- the standalone shell account control renders the stored Google avatar and falls back to the generic account icon if the image is unavailable.
- no generator, map-state, persistence, replay, or saved-world schema changes were made.

### WP1: control inventory

Completed artifact:

- `refs/testing/world-builder-control-inventory.md`

It maps existing controls to Build, Explore, Export, Developer, global project/library actions, or removal as duplicates.

### WP2: workspace mode shell

Implemented in `0.3.28`:

- explicit **Build / Explore / Export** selector
- map remains mounted across mode changes
- zoom, pan, map/globe view, overlays, and inspection state survive mode changes
- no-world initial state opens in Build
- completed generation or newly loaded world moves to Explore
- Explore contains presentation and inspection controls
- Export contains common PNG, SVG, JSON, `.wforge`, and Open actions
- ordinary Explore no longer exposes `Debug:` map subjects
- ordinary Explore no longer exposes globe debug composites
- export actions are no longer mixed into the Explore toolbar
- no generator algorithm, replay, persistence, or saved-world schema changes

Primary implementation files:

- `apps/desktop/src/workspace/WorldWorkspace.tsx`
- `apps/desktop/src/workspace/workspaceModes.ts`
- `apps/desktop/src/workspace/workspaceModes.test.ts`
- `apps/desktop/src/workspace/workspaceToolbar.css`
- `apps/desktop/src/main.tsx`

### Accepted manual QA

The following passed:

- Build is initially selected with no world loaded.
- Generation completes and transitions to Explore.
- Build, Explore, and Export switches do not reset the current map.
- Zoom, pan, selection, view, and overlays survive mode changes.
- Explore contains no export buttons, `Debug:` map options, or globe debug selector.
- Export exposes common output actions and keeps the map visible.
- PNG and `.wforge` paths remain usable.
- Generation controls and workflow selection remain usable in Build.
- Detailed is the normal generation default; Legacy and Experimental remain selectable.
- Left and right collapse controls continue to work.
- Layout passed at 1920 × 1080 and 1440 × 900 without page-level scrolling or material map loss.
- Developer graph workspace still opens.
- Build, Explore, Export, and Dev select distinct right-panel contexts.
- normal workspace modes expose no diagnostics tab or stacked inspector tabs.
- Export exposes common files, PNG resolution, tile controls, and VTT controls in one surface.
- My Worlds exposes `.wforge` opening as a library action.

Hosted/embedded QA remains part of WP6 unless separately confirmed against the deployed shell.

## Workspace mode ownership

`WorkspaceMode` now lives in `App` in `apps/desktop/src/main.tsx`.

`WorldWorkspace`, `GeneratorPanel`, and `RightPanel` receive the same controlled mode. Do not add parallel side-panel state as Build and Export composition proceeds.

Preserved behavior:

- initial mode is Build when no project is loaded
- an available or newly loaded project moves to Explore
- successful generation moves to Explore
- clearing the project returns to Build
- switching modes does not regenerate, clear, or remount the map
- workspace mode is not stored in persistence or saved-world schemas

## Dev graph workflow-selector observation

Manual QA noted that changing the workflow selector at the top of the Dev tab does not visibly change the graph.

The selector is wired:

- `useDevGraphWorkspace` derives `workflow` from `toolbar.workflowId`
- changing the selector recomputes the workflow node definitions
- running the graph sends the selected `workflowId`

The graph *shape* is intentionally the same for all current workflows. The meaningful differences are implementation IDs and runtime feature behavior, primarily at `world.deep-time-aging`.

The UI makes this hard to see:

- graph cards display `stageId`, not `implementationId`
- `implementationId` is visible only after selecting a node and reading the inspector
- most nodes are identical across workflows
- `defaultGraphToolbar` still defaults to `core.live-world`, even though the application default is Detailed

Treat this as a developer-UX follow-up, not proof that selection is broken.

Recommended bounded correction:

1. Change `defaultGraphToolbar.workflowId` to `core.performance-foundation` so the Dev tab opens on Detailed.
2. Show the active workflow label/version prominently in the graph summary.
3. Mark nodes whose implementation differs between the selected workflow and Detailed or Legacy.
4. At minimum, show the implementation ID on the node card or add a visible “implementation changed” badge.
5. Add a focused test proving the selector changes the `world.deep-time-aging` implementation ID for Legacy versus Detailed and that Experimental matches Detailed.

Do not invent different graph topology merely to make the selector look active.

Relevant files:

- `apps/desktop/src/dev/useDevGraphWorkspace.ts`
- `apps/desktop/src/dev/GraphWorkspace.tsx`
- `packages/generation-runtime/src/graph/generationWorkflows.ts`
- `packages/generation-runtime/src/graph/generationWorkflows.test.ts`

## Next implementation slice

### Step 1: lift and control workspace mode - completed

Completed in `0.3.29`.

- `App` owns `workspaceMode`.
- `WorldWorkspace` receives the current mode and change handler.
- the generator and right panel receive the same mode state.
- focused transition tests cover Build without a project and Explore with an available project.
- no persistence field was added.

### Step 2: recompose the Build panel - completed

Completed in `0.3.30`.

- Quick Build contains the primary world, star, seed, quality, randomization, and generation controls.
- Generate and Regenerate are distinct and replacement is non-destructive until success.
- generation progress is shown near the primary action.
- advanced ranges are grouped by the systems they control.
- preview resolution is confirmed as a canvas-rendering preference and now lives in Explore.
- PNG export resolution now lives in Export.
- Generation Quality deliberately changes both authoritative projected output resolution and source topology fidelity.
- account access remains in the shell.
- terminology is corrected and backed by focused tests.

### Step 3: make the right panel contextual - completed

Completed in `0.3.31`.

- Build routes to preset implications, quality, progress, and replacement guidance.
- Explore routes to one active selection context or the world summary.
- point, geographic drilldown, and hex selections have clear dismissal paths.
- Export contains common files, PNG resolution, hex/VTT configuration, and task feedback.
- diagnostics route only from the Dev workspace.
- My Worlds owns `.wforge` opening as a global project/library action.
- geographic drilldown state remains mounted while changing workspace modes.

### Step 4: finish Explore-toolbar disclosure - completed

Completed in `0.3.32`.

- primary view, presentation, subject, inspection, zoom, Fit, and drilldown controls stay visible.
- secondary layers and display treatments route through one Layers disclosure.
- the zoom readout is discoverable by normal click instead of requiring right-click knowledge.
- developer-only diagnostics remain outside normal Explore.

### Step 5: close PI provenance and hosted QA

Use the combined user test to confirm the complete Build / Explore / Export workflow, then close WP6 by recording:

- exact accepted World Forge `dev` commit
- visible standalone and embedded World Forge version
- host Parchment Worlds version and source commit when embedded
- hosted and standalone layout at 1920 x 1080 and 1440 x 900
- no deterministic generation change from the UI-only cleanup

## Guardrails

- No generator algorithm changes.
- No replay or saved-format schema changes.
- No persistence schema change merely to remember workspace mode.
- No continent-decomposition tuning.
- No drilldown rendering or scale work.
- No new export formats in this PI.
- No empty Edit mode before editing plus undo/versioning exist.
- Preserve standalone and hosted operation.
- Preserve current map state across mode changes.
- Work directly on `dev` in small functional commits.
- Run `npm run verify` on every accepted increment.
- Require browser QA for UI-routing commits.

## Remaining work packages

### WP3: Build panel

Complete for this PI.

- quick-build controls
- grouped advanced generation ranges
- accurate continent terminology
- Generate versus Regenerate behavior
- replacement warning and generation progress near the action
- preview and PNG resolution removed from Build

### WP4: Explore controls

Complete for this PI.

- ordinary debug map subjects removed
- globe debug composites removed
- exports removed from Explore
- secondary layers and display treatments grouped under Layers
- explicit Fit action added
- zoom levels discoverable by normal click
- developer diagnostics kept out of normal Explore

### WP5: contextual right panel and Export mode

Complete for this PI.

- mode-aware Build, Explore, Export, and Dev routing
- one relevant Explore context at a time
- complete common-file, hex-tile, and VTT export surface
- visible export progress and completion/error feedback
- diagnostics restricted to Dev
- `.wforge` opening located with My Worlds

### WP6: provenance and QA

Partially complete from earlier work.

Still confirm at PI close:

- visible embedded World Forge version
- exact World Forge commit
- host Parchment Worlds version/commit when embedded
- hosted and standalone browser QA
- 1920 × 1080 and 1440 × 900 layout
- no deterministic-output change caused by UI cleanup
- exact accepted `dev` commit passes `npm run verify`

## PI definition of done

- Build, Explore, and Export are obvious and backed by real functionality.
- The map remains visible and stable while switching modes.
- Developer debug controls are absent from normal Explore.
- Export actions and options are not mixed with presentation controls.
- Generation controls use accurate terminology and coherent grouping.
- The right panel presents one relevant context at a time.
- Current world, selection, view, overlays, zoom, and pan survive mode changes.
- Hosted and standalone modes both pass browser QA.
- Visible World Forge version and source commit identify the code actually running.
- `npm run verify` passes on the exact accepted `dev` commit.
- No page-level vertical scrolling or material map-workspace loss is introduced.
