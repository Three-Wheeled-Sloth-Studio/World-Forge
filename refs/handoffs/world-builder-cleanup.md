# World Builder Cleanup Handoff

Updated: 2026-07-30

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

Parent PI: issue `#13` — **Clean up world builder workflow and controls**

Completed work package: issue `#24` — **World builder workspace mode shell**

Status: **WP2 accepted; continue with mode ownership and Build/right-panel recomposition**

## Accepted baseline

Functional code baseline before this documentation-only handoff:

- commit `7a6c23bc8eec132816887b5e26ceccf84e17ae20`
- visible World Forge version `0.3.28`
- `npm run verify` passed locally
- 231 tests passed
- TypeScript build passed
- production build passed
- focused browser QA passed

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

Hosted/embedded QA remains part of WP6 unless separately confirmed against the deployed shell.

## Important current limitation: workspace mode ownership

`WorkspaceMode` currently lives inside `WorldWorkspace`.

That was sufficient for the first center-workspace slice, but it means `App`, `GeneratorPanel`, and `RightPanel` do not know whether the user is in Build, Explore, or Export.

Do not build additional parallel mode state in the side panels.

The first task for the next worker is to lift workspace mode ownership into `App` in `apps/desktop/src/main.tsx`, then pass the controlled mode and change handler into `WorldWorkspace` and the side-panel composition.

Preserve the current behavior:

- initial mode is Build when no project is loaded
- initial mode is Explore when a project is already available
- successful generation or world load moves to Explore
- switching modes does not regenerate, clear, or remount the map
- do not add a persistence-schema field for workspace mode during this PI

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

### Step 1: lift and control workspace mode

Move the mode state from `WorldWorkspace` into `App`.

`WorldWorkspace` should receive:

- current `workspaceMode`
- `onWorkspaceModeChange`

Keep its presentation toolbar mode-specific, but make the surrounding application able to route left and right content from the same source of truth.

Add focused tests around transition rules where practical. Avoid a new persistence field.

### Step 2: recompose the Build panel

Current component:

- `apps/desktop/src/generator/GeneratorPanel.tsx`

Create a compact quick-build area containing:

- World type
- World seed
- Star type
- Star seed
- generation quality/source size
- Randomize All
- Generate when no current world exists
- Regenerate when replacing the active world

Keep the current world visible until replacement generation succeeds.

Move advanced controls into clear groups using existing configuration state:

- **World shape**: ocean target, tolerance, continent count, continent size/cohesion, islands
- **Climate**: temperature, aridity, axial tilt, eccentricity
- **Geology and history**: plate count, impacts, age
- **Hydrology**: river density
- **System**: planet size and moons
- **Display/output**: only controls that truly belong there

Correct terminology before moving controls:

- `continentCount` → **Continent count**
- `continentScale` → **Continent size**, **Continent cohesion**, or similarly accurate wording based on actual generator effect
- never label `continentCount` as `Regions`
- never label `continentScale` as `Continents`

Current incorrect labels still exist in `apps/desktop/src/main.tsx` in `rangeLabels`.

Move these out of Build:

- profile/account pill → shell/account settings
- PNG export resolution → Export
- preview-only resolution → Explore/display preferences unless investigation proves it changes authoritative generation

Open questions from WP1 that must be answered from code behavior, not guessed:

- Does generation `Map Size` change authoritative projected output, topology fidelity, or both?
- Does Preview resolution affect only canvas rendering?
- Which advanced values are true generation inputs versus display/export preferences?

### Step 3: make the right panel contextual

Current component:

- `apps/desktop/src/panels/RightPanel.tsx`

Current problem:

- geographic hierarchy
- point inspector
- world summary
- hex/VTT export
- diagnostics

can stack or compete in one panel.

Target routing from the single App-owned workspace mode:

**Build**

- selected preset implications
- generation status/progress
- concise current-world replacement warning or summary

**Explore**

- world summary when nothing is selected
- point, hex, region, or drilldown inspector when selected
- one clear-selection path
- do not stack unrelated inspectors above the world summary

**Export**

- common formats and output resolution
- hex/VTT options
- export progress and completed-file feedback

Developer diagnostics remain developer-only. My Worlds and file-open behavior remain global project/library actions, not a fourth workspace mode.

### Step 4: finish Explore-toolbar disclosure

WP2 removed debug subjects and exports, but the toolbar is not fully simplified yet.

Keep immediately visible:

- map/globe
- presentation
- primary map subject
- zoom/fit
- inspector
- drilldown when available

Move secondary controls behind **Layers** or **More**:

- rivers
- plate boundaries
- hex overlays
- coastline treatment
- globe shells
- less common user-facing overlays

Do not reintroduce developer diagnostics into this menu wearing a fake mustache.

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

Not complete.

- lift mode ownership
- quick-build controls
- grouped advanced settings
- accurate terminology
- Generate versus Regenerate behavior
- progress/error feedback near the action

### WP4: Explore controls

Partially complete.

Completed:

- ordinary debug map subjects removed
- globe debug composites removed
- exports removed from Explore

Remaining:

- Layers/More disclosure
- explicit Fit action instead of right-click-only zoom discovery
- final user-facing versus developer layer disposition

### WP5: contextual right panel and Export mode

Not complete.

- mode-aware panel routing
- one relevant Explore context at a time
- complete export formats/options/progress surface
- move hex/VTT configuration fully into Export

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
