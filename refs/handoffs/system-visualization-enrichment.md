# System Visualization and Enrichment Handoff

Updated: 2026-07-31

Status: Body lifecycle, sequential queue, and first airless-moon proof validated

Planning source: `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`

Tracking issue: #35

## Delivered foundation

- Versioned project-enrichment workflow contract.
- Inspectable `project.system-orbital-context@1.0.0` graph.
- Deterministic orbital presentation payload and artifact signature.
- Lazy first-Globe or first-System execution outside ordinary generation.
- Visible running, completed, stale, cancelled, and failed UI state.
- Optional artifacts attached to `WorldProject.enrichmentArtifacts` and carried by normal project save and export serialization.
- Graph-node editor selection and completed-node timing for enrichment workflows.

## Visualizer Cycle 1 living globe

- Shared simulation clock with play, pause, speed, reset, day-of-year, and time-of-day controls.
- Deterministic procedural star background and generated star/light coupling.
- Clock-derived physical planetary spin and generated axial tilt.
- Deterministic moon traversal and nearby visible-body motion.
- Camera yaw and pitch orbit around the fixed physical system.
- Pointer hold pauses the shared clock; release restores the prior play state.
- Bounded soft-shadow proof for moons and the primary globe.
- Wireframe placeholder treatment and deliberately compressed illustrative local-system scale.

## Visualizer Cycle 2 and 2.2 clouds and weather

- Added inspectable `project.atmospheric-weather-presentation@1.1.0` with six instrumented nodes.
- Existing moisture, precipitation, wind, water, temperature, elevation, and terrain data are consumed without rerunning climate generation.
- The artifact remains deterministic and declares `weatherAuthority: illustrative`.
- Generated `windX` and `windY` are persisted as a compact deterministic local-flow field.
- Cloud structure uses globe-space tangent sampling, wind-oriented streamers, broken cells, soft edge breakup, dominant clear sky, intrinsic seam continuity, and shared-clock local-flow shader advection.
- Weather-system puffs remain close to the cloud deck and retain the accepted larger coherent presentation.
- Cloud and weather alpha shells remain outside the current shadow-caster path.
- Renderer diagnostics identify `wind-oriented-spherical-v4`, `thin-streamers-clear-sky`, `spherical-continuous`, and `local-flow-shader`.

## Visualizer Cycle 3 bounded System Explore

- Explore now provides `Map | Globe | System`.
- `SystemViewer` is a dedicated sibling of `GlobeViewer`; System responsibilities were not added to the globe component.
- The first System slice reuses the existing deterministic orbital-context artifact and shared simulation clock. It does not add ordinary-generation work.
- The viewer includes:
  - generated star;
  - generated primary world;
  - generated moon scaffolds;
  - planets, dwarfs, belts, and other existing system bodies;
  - body selection by pointer or selector;
  - focus selected body;
  - return to primary;
  - optional orbit paths;
  - optional labels;
  - compressed overview mode;
  - logarithmic relative-distance mode;
  - body inspector with scaffold values and generation status.
- Generated bodies use solid presentation styling. Placeholder bodies use explicit wireframe styling.
- Physical orbital values remain distinct from exaggerated presentation values. The inspector shows both physical orbit and display radius rather than presenting display scale as simulated truth.
- Moon positions and moon orbit paths remain parent-relative while the viewer can focus any catalog body, including the star.
- Camera drag pauses and resumes the shared clock using the same interaction boundary as Globe view.
- System zoom is independently persisted from Map and Globe zoom.
- Focused deterministic contracts cover catalog completeness, parent-relative moon placement, orbital ordering in both display modes, and physical-versus-display separation.

## Fleshing Cycle 1 and first airless-moon proof

- Added saved `body-generation-lifecycle-v1` state with stable seeds, eligibility, profile, workflow identity, requested fidelity, queue order, active body, artifact references, stale reasons, and failure reasons.
- Queue execution is sequential by default and supports selected generation, unresolved-moon batch queueing, start, pause-after-active, cancel, remove, retry, regenerate, completion, and stale reconciliation.
- Added inspectable `project.generate-airless-rocky-body@1.0.0` with seven measured nodes.
- The resolved graph intentionally contains no climate, hydrology, ecology, or civilization nodes.
- The first generated body artifact stores deterministic globe-space crater relief, albedo, and illustrative thermal fields at preview or standard fidelity.
- Completed artifacts persist through ordinary project save and export paths and reconcile on reopen.
- System view replaces the selected moon wireframe with a low-resolution displaced and textured generated-body representation.

## Current boundaries

- Airless rocky moons are the only supported secondary-body generation profile.
- No terrestrial-active, gas-giant, ice-giant, dwarf, belt, ecology, or civilization body generation yet.
- No N-body simulation or authoritative ephemeris.
- No attempt to render physical body size and orbital distance at the same literal scale.
- No precipitation, lightning, or authoritative weather forecast/history simulation.
- No soft transmittance-based cloud shadows.
- No seasonal surface response yet.
- Clock-panel mobility/collapse remains a backlog item.
- System camera panning remains a backlog item.
- General low-resolution generated-body presentation beyond the airless-moon proof remains a backlog item.
- The primary generation graph, deterministic world signature, and replay contract remain unchanged.
- Geographic drilldown issue #10 remains pinned and outside this PI slice.

## Next increment

Stop at the accepted proof boundary before expanding body profiles.

The next planned slice is capability-resolved partner workflow infrastructure, followed by the first barren and geologically active terrestrial body. System panning and broader low-resolution body presentation remain explicit viewer follow-ups and should not be bundled into that workflow architecture slice.

## 2026-08-01 - Globe body integration follow-up

- Generated airless moon artifacts now replace placeholder moon visuals in primary-world Globe view.
- System inspector adds `Zoom to globe` for the primary world and generated moons.
- Globe view accepts an explicit body target, renders generated airless moons as the central globe, and provides a return-to-primary action.
- Star presentation in System view now maintains a bounded apparent angular size while orbiting the camera, preventing near-camera tilt blowups.
- Other secondary body profiles remain deferred until this viewer integration is accepted.

## 2026-08-01 - Experimental hybrid workflow foundation

- Detailed and Experimental were compared across three seeds and three world scenarios at 256 x 128.
- All nine rendered-output signatures and normalized authoritative signatures matched.
- Experimental completed 17.2% to 37.9% faster overall and 27.2% to 41.7% faster in deep-time processing.
- Detailed remains frozen as the production/control workflow.
- Experimental now resolves graph structure from explicit body capabilities.
- Structurally inapplicable nodes are omitted before execution.
- Runtime-only conditions now produce first-class `skipped` node results, events, reasons, fallback outputs, and Dev graph presentation.
- The existing primary-world Experimental graph resolves to the same full node set and preserves authoritative output.
- Next implementation target is `stellar-surface-presentation`, followed by the first barren and geologically active terrestrial profile.


## 2026-08-01 - Experimental stellar surface presentation

- Confirmed the System UI has no executable secondary-body generation path for planets, gas giants, ice giants, dwarfs, belts, or the star. Only eligible placeholder moons can enter the body queue, and ineligible records are rejected again at the lifecycle boundary.
- Removed the generic selected-body generation action from ineligible body panels instead of relying on a disabled button alone.
- Added inspectable `project.stellar-surface-presentation@1.0.0` as an Experimental-only, explicit post-generation workflow.
- The workflow generates deterministic photosphere granulation, activity class, rotation and differential rotation, magnetic-cycle phase, flare cadence, starspots, faculae, and coronal streamers.
- The saved artifact is presentation-only and records the current orbital artifact signature and Experimental world-workflow identity for invalidation.
- System view now replaces the flat star material with the generated photosphere texture and activity-scaled corona after explicit user launch.
- Detailed and ordinary primary-world generation remain unchanged.
