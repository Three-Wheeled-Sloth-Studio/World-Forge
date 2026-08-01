# PI: System Visualization and Progressive Body Enrichment

Updated: 2026-07-31

Status: active; geographic drilldown remains pinned

## Product outcome

World Forge can present a generated world as part of a living, inspectable planetary system, show time-driven celestial, seasonal, cloud, and weather variation, and progressively replace coarse placeholder bodies with generated bodies without adding work to ordinary primary-world generation.

The system visualizer becomes both a presentation surface and the launch point for optional post-generation enrichment workflows.

## Accepted architecture

- Body-specific generation uses capability-resolved workflow graphs assembled from reusable nodes. Structurally inapplicable nodes are absent from the resolved graph; conditions discovered during execution produce explicit skipped-node records rather than silent early returns.

### Ordinary generation remains bounded

The existing world-generation button continues to produce the primary `WorldProject` and its coarse solar-system scaffold. Orbital presentation, weather presentation, seasonal surface modeling, and secondary-body generation are not added to the ordinary generation graph or its runtime.

Optional work runs only:

- after explicit user request;
- when the user first opens a view that requires a missing artifact;
- when the user selects a placeholder body for generation;
- or when the user starts a batch-generation action.

First-use work must be visible, cancellable, instrumented, and cached. Entering a visualizer must not silently commission a long-running workflow.

### Project enrichment is a first-class workflow category

World Forge supports two workflow categories:

```text
World generation workflow
  configuration -> complete WorldProject

Project enrichment workflow
  existing WorldProject -> versioned optional artifact
```

Every enrichment workflow must:

- exist as a versioned graph;
- be inspectable in the graph-node editor;
- declare named node inputs and outputs;
- emit node lifecycle, progress, elapsed time, and validation telemetry;
- record workflow ID, workflow version, graph signature, source project identity, source world signature, seed, app version, source commit, start and completion time, and artifact role;
- be deterministic for the same source project, workflow version, graph contract, seed, and epoch;
- define cache identity and invalidation rules;
- support cancellation and failure state;
- persist completed artifacts with the saved world or its durable sidecar storage;
- avoid mutating authoritative primary-world facts unless the workflow explicitly produces a replacement authoritative artifact.

### Artifact authority is explicit

Initial orbital, weather, and seasonal visualizer artifacts are scientifically informed presentation products. They do not silently become authoritative world history.

Each artifact records one of:

- `authoritative`
- `derived`
- `presentation`

The first weather implementation is `presentation` and must identify its weather state as illustrative.

### One shared simulation clock

Globe, system, seasonal, cloud, and weather presentation use one deterministic simulation clock. The clock controls:

- planetary rotation;
- orbital position;
- star direction and lighting;
- moon and visible-body positions;
- day of year and seasonal position;
- cloud and weather advection.

Manual camera or globe inspection does not change simulation time.

## Delivery sequence

### Cycle 0: enrichment workflow foundation

Deliver:

- enrichment workflow contracts and registry;
- graph-node editor support for enrichment graphs;
- node-level instrumentation and validation;
- optional persisted project artifact records;
- visible explicit and first-use launch behavior;
- cancellation, failure, cache, and invalidation contracts;
- first `system-orbital-context` workflow.

The first workflow derives deterministic orbital presentation data from the existing system scaffold. It must not run during ordinary world generation.

### Visualizer Cycle 1: orbital context and living globe

Implementation status (2026-07-31): the first living-globe slice is implemented for validation, including the shared clock, starfield, star/light coupling, axial tilt, moon and visible-body motion, illuminated phases, compact time controls, and explicit placeholder styling. Full System view remains a later cycle.

Upgrade Globe view to consume the orbital-context artifact and show:

- procedural star background;
- visible system star;
- star position and directional light driven by the shared clock;
- actual planetary axial tilt;
- moons traversing deterministic orbits;
- nearby visible system bodies moving in the background;
- illuminated phases;
- play, pause, speed, reset, time-of-day, and day-of-year controls;
- clear placeholder treatment for unresolved bodies.

### Visualizer Cycle 2: procedural clouds and weather

Add `atmospheric-weather-presentation` as a lazy enrichment workflow.

Initial graph shape:

```text
Resolve atmospheric capability
  -> derive cloud-source potential
  -> seed pressure and weather cells
  -> generate cloud-density field
  -> generate storm and frontal features
  -> build advection field
  -> produce render textures
  -> validate and persist
```

Inputs include existing water, temperature, moisture, precipitation, wind, elevation, latitude, seasonal position, and a stable weather seed and epoch.

First accepted presentation includes coherent cloud bands and systems, wet-zone and convergence support, orographic buildup, reduced arid-interior cloud cover, rotating and advecting cloud layers, occasional supported storm structures, day/night illumination, and optional surface shadowing.

Explore receives a `Clouds and weather` display toggle. The existing climate facts remain authoritative; the short-term visual weather state is illustrative.

### Visualizer Cycle 3: full system explorer

Add `Map | Globe | System` Explore views.

System view includes:

- star, planets, moons, dwarf bodies, and belts;
- body selection and camera focus;
- optional orbit paths and labels;
- shared time controls;
- compressed overview and relative-distance modes;
- visible placeholder versus generated state;
- contextual body inspector and return-to-primary action.

Physical values remain available even when display distances and radii are exaggerated for usability.

### Visualizer Cycle 4: seasonal surface and weather variation

Add `seasonal-surface-model` as an inspectable enrichment workflow.

The workflow derives compact spatial seasonal coefficients rather than storing complete duplicate maps for every season. First outputs cover temperature, insolation, snow, and sea-ice response. Moisture, vegetation, and richer weather response follow when supported by actual data.

Flat map receives annual-versus-seasonal controls and a day-of-year slider. Globe uses continuous time progression from the shared clock.

### Fleshing Cycle 1: body lifecycle and queue

Implementation status (2026-07-31): saved lifecycle records, sequential queue controls, cancellation, retry, regeneration, stale reconciliation, provenance, and body-specific artifact references are implemented and validated.

Bodies support explicit states:

- `placeholder`
- `ready`
- `queued`
- `generating`
- `generated`
- `stale`
- `failed`

Each body records a stable seed, body profile, workflow identity, graph version, requested fidelity, artifact references, provenance, and failure or stale reason.

System view provides selected-body generation, unresolved-body batch generation, retry, regenerate, cancel, and open actions. Batch work is sequential by default.

### Fleshing Cycle 2: body-aware workflow family

Do not add a pile of private early exits to the habitable Earthlike graph. Compose workflow graphs from reusable nodes and resolve structural graph shape from required body capabilities. Keep a node only when applicability depends on upstream generated results, and record an explicit skipped state and reason when that runtime condition is not met.

Initial workflow profiles:

1. stellar surface and activity presentation;
2. terrestrial habitable;
3. terrestrial barren and geologically active;
4. airless or inactive rocky body;
5. gas giant;
6. ice giant;
7. dwarf or minor body;
8. asteroid or debris belt.

Capability resolution includes solid surface, geological activity, substantial atmosphere, surface liquid, ecological potential, projected-surface requirement, and ring system.

Skipped work is absent from the resolved graph rather than represented by meaningless zero-duration nodes.

8. Generated stellar surface and activity presentation.
9. Barren active worlds, gas giants, ice giants, belts, and richer minor bodies.

## Stellar presentation proof

Before expanding the secondary-planet family, replace the uniform star placeholder with a deterministic `stellar-surface-presentation` artifact derived from the generated stellar model.

The bounded first graph should resolve the stellar visual regime, photosphere color and spectrum, limb darkening, granulation, starspot and facula activity, rotation, restrained corona/prominence parameters, and emitted-light presentation. It is a scientifically informed presentation model, not a magnetohydrodynamics simulation.

This workflow is the first non-terrestrial proof of capability-resolved composition. It should contain no planetary terrain, hydrology, climate, or ecology nodes.

## First secondary-body proof

Implementation status (2026-07-31): the bounded airless-moon workflow, generated artifact persistence, deterministic reproduction, sequential unresolved-moon queue, and low-resolution System-view material replacement are implemented and validated.

The first fully generated non-primary body is an airless moon:

1. Select a placeholder moon in System view.
2. Run `generate-airless-rocky-body`.
3. Show graph-node progress and timings.
4. Generate cratered terrain and thermal presentation.
5. Replace the placeholder material with generated output.
6. Persist artifact and provenance.
7. Reopen and reproduce deterministically.
8. Batch-generate remaining unresolved moons.

## Immediate implementation increment

The first functional increment is limited to:

1. Add versioned enrichment-workflow and artifact contracts.
2. Add an inspectable `system-orbital-context` graph.
3. Add an enrichment executor with node timing, progress, validation, failure, and deterministic provenance.
4. Run the workflow only on explicit request or first Globe entry when its artifact is missing.
5. Persist the completed optional orbital-context artifact through normal project save and export paths.
6. Surface pending, running, complete, and failed state without pretending the full living-globe visual cycle is already delivered.
7. Preserve ordinary generation output, runtime, replay signature, and current workflow behavior.

## Guardrails

- No enrichment work during ordinary primary-world generation.
- No hidden first-use pause.
- No uninspectable background pipeline.
- No visual-only data promoted to authoritative fact without an explicit contract change.
- No graph editor fork that creates a second incompatible workflow model.
- No N-body simulation requirement; deterministic two-body orbital presentation is sufficient.
- No literal astronomical scale requirement in the viewer.
- No body-generation spaghetti inside the Earthlike workflow.
- No generator, replay, or saved-world incompatibility without a separately documented migration.
- Geographic drilldown issue #10 remains pinned during these cycles.

## Validation direction

Every increment must run `npm run verify` and focused Chromium QA.

The Cycle 0 acceptance matrix includes:

- ordinary generation timing unchanged within expected run variance;
- enrichment absent after generation until requested;
- first Globe entry visibly launches or offers the missing workflow;
- deterministic orbital artifact equality for repeated source project and seed;
- graph-node order, timing, validation, and provenance visible in Dev;
- project save, load, `.wforge` export/import, and replay behavior preserve or safely ignore optional artifacts;
- stale source signatures invalidate the artifact;
- failed enrichment does not damage the source world;
- 1440x900 and 1920x1080 layouts remain usable.

## Definition of done

This PI is complete when:

- the living globe presents coherent celestial motion, axial tilt, clouds, weather, and seasonal variation;
- System view presents the full generated scaffold with optional orbital paths;
- every optional computation is a saved, inspectable, instrumented enrichment workflow;
- placeholder bodies are clearly identified and selectively or sequentially generatable;
- at least one airless moon can be generated, persisted, reopened, and reproduced;
- partner body workflows skip unnecessary geology, climate, hydrology, or ecology by graph construction;
- ordinary primary-world generation remains bounded and does not pay for unused visualizer enrichment.


### Fleshing Cycle 2.1: generated stellar surface and activity presentation

Implementation status (2026-08-01): the first stellar presentation slice is implemented behind Experimental and explicit user launch.

The inspectable `project.stellar-surface-presentation` workflow consumes the generated stellar scaffold and current orbital artifact, then derives deterministic photosphere granulation, rotation, differential rotation, activity class, magnetic-cycle phase, flare cadence, starspots, faculae, and a bounded corona. The artifact is illustrative presentation data and does not replace authoritative stellar facts.

The star remains outside the secondary-body generation queue. Planets, giants, dwarfs, belts, and the star have no generic body-generation action until their own supported workflow profile exists.


## Capability-resolved all-body generation slice (0.3.49)

- Every non-primary orbital body is now eligible for explicit generation.
- The queue resolves airless rocky, rocky, gas giant, ice giant, dwarf, and debris-belt profiles before execution.
- Structurally irrelevant nodes are absent from each graph rather than running and immediately exiting.
- Generated artifacts persist compact fields or procedural particle parameters; GPU textures and meshes are materialized only by active views.
- System View renders each generated profile and Globe View can open every generated non-primary body, including debris belts.
- The primary-world workflow remains unchanged.


## Body fidelity and satellite population slice (0.3.50)

- Generated solid and giant fields now blend across the wrapped longitude before packaging, and displaced solid meshes use radial normals to avoid a visible UV seam.
- Casual-inspection materials use deterministic solar-system-inspired palette families. Massive rocky worlds receive atmosphere-informed haze coloring; airless worlds remain mineral or regolith colored.
- Outer orbital positions have progressively higher giant probability without reserving a mandatory giant slot. Gas giants are favored in the nearer giant region and ice giants farther out.
- Non-primary gas giants, ice giants, and qualifying rocky worlds now receive bounded deterministic major-moon scaffolds. Those moons flow through the existing orbital context and common body-generation queue.
- Globe inspection lazily builds a cached 256x128 preview or 512x256 standard texture and separate solid-body bump map. System View retains the compact persisted field resolution.
- Secondary composition uses independent deterministic streams while consuming the legacy system RNG pattern, so it does not perturb primary-world terrain generation.
