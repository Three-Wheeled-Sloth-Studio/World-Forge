# Generation Optimization Strategy and Research Index

Updated: 2026-07-29

Status: durable umbrella reference for procedural-generation performance, quality, architecture, and research provenance

## Purpose

This document is the top-level reference for the broader World Forge generation-optimization strategy.

It answers five questions:

1. What are we optimizing for?
2. What architecture are we moving toward?
3. Which techniques are immediate production candidates versus later desktop or research work?
4. How do we evaluate performance without quietly degrading world quality?
5. Where did the recommendations come from?

This is not a replacement for the individual source reviews, the detailed technique catalog, or the implementation PI. It is the map that ties them together.

## Related durable artifacts

- `refs/planning/pi-generation-performance-foundation.md`
  - Targeted first implementation PI.
  - Defines work packages, acceptance criteria, metrics, and sequencing.
- `refs/research/procedural-generation/research-framework-and-technique-catalog.md`
  - Governs how sources are reviewed.
  - Preserves the initial technique catalog and ribbon-land definition.
- `refs/research/procedural-generation/technique-catalog-additions-2026-07-29.md`
  - Preserves techniques found after the initial catalog was created.
- `refs/research/procedural-generation/high-fidelity-desktop-world-track.md`
  - Preserves expensive, longer-horizon, desktop, GPU, and research-laboratory approaches.
- Individual source reviews under `refs/research/procedural-generation/`
  - Preserve detailed findings, implementation hazards, source commits, licenses, and insertion points.

## Executive strategy

The production optimization strategy is:

> Move expensive geological history onto a bounded structural representation, preserve its causes and ages, project those facts deterministically to the final topology, and apply only the bounded surface response needed to produce a convincing present-day world.

The broader product strategy is:

> Support more than one generation provider behind a shared semantic contract so the VPS service can remain bounded and CPU-safe while desktop and research modes can spend more time, memory, and optional GPU compute on higher-fidelity worlds.

The immediate goal is not to make every subsystem maximally realistic. It is to remove repeated work, make stage dependencies explicit, and preserve enough causal structure that later hydrology, climate, resources, ecology, and civilizations have useful facts to consume.

## Product execution tracks

### 1. Hosted bounded provider

Primary constraints:

- CPU-authoritative Linux VPS execution
- Multiple queued worlds running concurrently
- Predictable runtime and memory
- Deterministic versioned output
- No dependence on a specific GPU or driver
- Strong bias against saved-format breakage
- Graceful degradation and explicit fidelity budgets

Primary techniques:

- Coarse structural topology
- A few tectonic eras
- Sparse cause propagation
- Age-modulated bounded terrain response
- Reusable drainage and derived graph products
- Active sets
- Shared worker scheduling
- Explicit quality gates

### 2. Enhanced desktop provider

Permitted advantages:

- More structural cells
- More eras
- Larger memory budgets
- Native worker threads
- Checkpoint and resume
- Richer local refinement
- More detailed glaciation, erosion, and climate response

### 3. High-fidelity desktop provider

Potential techniques:

- Moving-material or clustered-convection tectonics
- Optional GPU compute
- Detailed plate lifecycle
- Longer geological histories
- Rich sediment and glacial systems
- Transient atmosphere and ocean experiments
- Interactive geological playback and authoring

### 4. Research and calibration provider

Purpose:

- Run expensive reference simulations
- Calibrate cheaper production approximations
- Test fracture, subduction, mass-balance, and mantle-coupling ideas
- Produce benchmark histories and expected relationships
- Preserve experimental provenance without promising production latency

## Current bottleneck context

The targeted PI was created in response to an observed profile in which:

- `deep-time-aging` was approximately 144.9 seconds
- `topology.climate-glaciation-node` was approximately 25.5 seconds
- `topology.climate` was approximately 15.4 seconds
- `topology.terrain.crust-fields` was approximately 10.6 seconds
- `topology.hydrology-biomes-node` was approximately 8.2 seconds

`deep-time-aging` represented roughly 71 percent of the listed subtotal.

That is why the first implementation PI concentrates on structural geology, tectonic history, surface response, derived-field reuse, and quality instrumentation before attempting a broad rewrite of climate or ecology.

## Core architectural direction

### Separate structural causes from final visible terrain

The system should distinguish:

- plate and crust ownership
- crust thickness, density, age, buoyancy, and composition
- tectonic boundary pressure, shear, and orientation
- uplift, subsidence, rifting, subduction, volcanism, and strain
- erosion susceptibility and process ages
- final elevation and bathymetry
- derived render and drilldown fields

This prevents elevation from becoming an overloaded variable that silently stands in for every geological fact.

### Use a bounded structural topology

Plate growth, crust history, boundary processing, and multi-era cause accumulation should run on a structural topology whose cost is substantially independent of the final display or export resolution.

The final topology then receives deterministic projected facts.

Benefits:

- Better scaling with output resolution
- Stable structural identities across detail levels
- Lower deep-time cost
- Easier reuse by desktop and hosted providers
- Clearer invalidation and cache boundaries

### Use a few meaningful eras

The production solver should not run hundreds or thousands of nearly identical fine-resolution aging steps merely to imply geological time.

A first bounded model can use eras such as:

1. Ancient crust formation and assembly
2. Mature deformation, erosion exposure, and reorganization
3. Recent rifting, convergence, uplift, and volcanism

Each era accumulates causes and process ages. Surface response is applied afterward according to those facts.

### Treat derived graph products as reusable outputs

Examples:

- downhill receiver
- drainage order
- basin and spill relationships
- runoff accumulation
- elevation ordering
- slope and steepness
- coast distance
- connected land, water, or biome components
- active erosion cells

These should have explicit identities, dependencies, and invalidation rules rather than being rebuilt inside whichever helper happens to need them.

### Use active sets and sparse propagation

Processes that affect only part of the world should not scan the entire world repeatedly.

Likely sparse domains include:

- active tectonic boundaries
- erosion-prone terrain
- meaningful river corridors
- glaciers and accumulation zones
- coastlines and shelves
- hotspots and volcanic chains
- local repair after author edits

### Keep simulation facts separate from presentation

Examples:

- Biome facts are not RGBA material weights.
- Rainfall facts are not rain particles.
- Terrain elevation is not a stored normal map.
- A smoothed display coastline is not an edited authoritative coastline.
- Triplanar mapping does not change geological structure.

Presentation caches should be replaceable and should not dictate the saved-world schema.

## Optimization method

### 1. Measure the actual work

Every major performance change begins with:

- fixed seeds
- exact commit and algorithm identity
- stage and substage timings
- work counters
- memory observations
- deterministic signatures
- quality metrics

Do not infer performance from one visually attractive run.

### 2. Fix repeated work before replacing every algorithm

The research repeatedly exposed costly patterns such as:

- repeated whole-world sink filling
- repeated full-world sorting
- rebuilding downhill and slope fields in multiple stages
- all-to-all event propagation
- BFS from every cell
- reconstructing topology incidence through geometric searches
- allocating fresh arrays, maps, queues, and visited sets inside hot loops

The first question is often not “what more advanced solver should replace this?” It is “why are we doing the same expensive graph transform seven times?”

### 3. Bound every expensive process

Preferred stop conditions include:

- response falls below a physical threshold
- active set becomes empty
- routing changes below a selected fraction
- terrain residual falls below tolerance
- compute budget is reached
- target quality is achieved

Blind fixed iteration counts should be advanced controls or implementation caps, not the only stopping logic.

### 4. Preserve legacy and experimental paths during evaluation

A versioned provider boundary allows:

- exact A/B comparison
- staged migration
- rollback
- desktop-specific providers later
- no need to rewrite the UI or exporters for each solver

### 5. Evaluate quality as data and as visible output

Required categories include:

- land fraction
- connected land components
- coastline behavior
- mountain-core retention
- riverhead distribution
- drainage validity
- basin retention
- biome area and fragmentation
- tectonic-relief alignment
- island and archipelago diversity
- long-persistent-ribbon diagnostics
- deterministic reproduction

Visual QA remains necessary, but numerical diagnostics prevent one attractive screenshot from hiding a systematic regression.

## Land-ribbon strategy

Narrow land is not inherently defective.

Desirable examples include:

- peninsulas and capes
- barrier islands
- fjord and ria coasts
- archipelagos
- island arcs
- hotspot chains
- rift shoulders
- narrow tectonic uplifts

The target defect is a continuously connected land corridor that remains narrow over an implausibly large physical distance without convincing structural support.

Diagnostics should consider:

- geodesic length
- median and percentile width
- length-to-width ratio
- persistence of narrow width
- connections between substantial cores
- relief coherence
- crust and deformation age
- plate-boundary, hotspot, rift, arc, or mountain support
- whether final sea-level classification created the connection
- whether the feature is authored, named, or scenario-protected

Preferred outcomes include retaining, fragmenting into islands, locally submerging, locally widening, splitting only macro-continent membership, or flagging for review.

The preferred intervention point is structural growth or elevation response, not blunt final-map cleanup.

## Synthesized technique priorities

### Immediate production foundation

1. Fixed-seed benchmark and provenance harness
2. Deep-time substage and work-shape instrumentation
3. Structural provider boundary
4. Coarse structural topology with deterministic projection
5. Compact cost-driven plate and continental-crust growth
6. Continuous crust thickness, density, thermal age, and buoyancy
7. A few tectonic eras with typed cause fields
8. Age-modulated bounded terrain response
9. Derived-field caching and invalidation
10. Canonical depression-aware drainage and reverse-order accumulation
11. Active-set incision, creep, and deposition
12. Long-persistent-ribbon diagnostics
13. Bounded worker and memory scheduling
14. Pre/post stage quality gates

### Likely follow-up production work

- Sparse climate-informed glaciation
- Basin-constrained ocean gyres
- Directed atmospheric and ocean transport sweeps
- Shared shelf and coast-distance products
- More complete plate lifecycle at era boundaries
- Staged terrain-ready and ecology-ready job completion
- Advanced control-role metadata and feasibility preflight

### Desktop and local-detail work

- Deterministic local terrain synthesis from global structural facts
- Spherical indexing of faults, rivers, hotspots, craters, and landmarks
- Local high-resolution erosion
- Mipmap pyramids and anisotropic terrain filtering
- Height- and slope-aware material blending
- Selective triplanar mapping
- Stable local vegetation placement
- Interactive response curves and process-aware editing

### High-fidelity and research work

- Dynamic clustered-convection tectonics
- Moving crust material and local mass balance
- Mantle-potential-driven plate force and torque
- Many-era tectonic and surface coevolution
- Detailed sediment systems
- Ice thickness, flow, isostatic response, and repeated glacial cycles
- Transient atmosphere and ocean simulation
- Replayable plate lifecycle and geological history

## Important implementation patterns to avoid

- Full-resolution tectonics tied directly to final display resolution
- Hundreds of production aging steps without evidence they are needed
- Repeated whole-world sink filling and sorting
- One queue per boundary cell when multi-source propagation will work
- All-to-all influence evaluation
- BFS from every cell to rediscover the same nearest source
- Per-job worker pools that oversubscribe a shared VPS
- Object-heavy graphs and dynamic maps in hot loops when flat arrays will do
- GPU-only authoritative generation for the hosted service
- Generic smoothing presented as geological aging
- Reject-and-reroll loops with no feasibility preflight or compute limit
- Packed render textures becoming authoritative world schemas
- Deleting every narrow feature because one pathological ribbon existed
- Adding a quadtree, spatial index, or LOD system without a measured workload that needs it

## Research source index

### World Orogen

Source:

- `raguilar011095/planet_heightmap_generation`

Primary contributions:

- Fixed coarse structural mesh
- Deterministic projection to selected final mesh
- Historical cause accumulation
- Compactness-constrained structural growth
- Sparse glacial routing and response
- Typed arrays, flat adjacency, scratch reuse, active lists
- Automated quality metrics and tuning

Primary caution:

- Do not port expensive repeated erosion, flood, and path operations blindly.
- GPL-3.0 source requires license care; technique extraction was preferred.

Review:

- `world-orogen-review.md`

### genworldvoronoi

Source:

- `Flokey82/genworldvoronoi`

Primary contributions:

- Derived-field reuse as architecture
- Hydrology-coupled erosion ideas
- Basin-based synthetic gyres
- Direction-ordered transport concepts
- Geo to Bio to Civ separation
- Shared worker scheduling lessons

Primary caution:

- Full-resolution randomized plate growth
- Repeated field construction and allocation
- Weak ribbon handling
- Incomplete coarse-mesh ideas

Review:

- `genworldvoronoi-review.md`

### Red Blob 1843 planet generation

Source:

- `redblobgames/1843-planet-generation`

Primary contributions:

- Canonical drainage order from ocean upward
- Reverse-order flow accumulation
- Cell, edge, and triangle fact separation
- Topology-aware valley and ridge rendering
- Dependency-scoped regeneration
- Typed-array performance evidence

Primary caution:

- Tectonics were intentionally simple and later documented as buggy.
- Forced ocean drainage must be replaced with an explicit depression policy.

Review:

- `redblob-1843-planet-generation-review.md`

### mewo2 terrain

Source:

- `mewo2/terrain`

Primary contributions:

- Compact stream-power plus hillslope-creep erosion kernel
- Sea-level selection by land-fraction quantile
- Cheap coastline morphology
- Composable scalar-field authoring

Primary caution:

- Repeated whole-world sink fills, sorts, slope builds, and allocations
- Global maximum normalization
- Coastline cleanup does not solve long ribbons

Review:

- `mewo2-terrain-review.md`

### realistic-planet-generation-and-simulation

Source:

- `FreezeDriedMangos/realistic-planet-generation-and-simulation`

Primary contributions:

- Multi-era tectonic layering
- Geologic age as a terrain-response field
- Sparse tectonic event families
- Macroplates plus microplates
- Continental shelves
- Hotspot chains
- Dynamic water-storage ideas
- Basin-gyre climate architecture

Primary caution:

- Many all-to-all and BFS-from-every-cell operations
- Iterative visual weather rather than bounded climate normals
- Weak or counterproductive ribbon preservation

Review:

- `realistic-planet-generation-and-simulation-review.md`

### Zhou terrain, biome, and dynamic-weather thesis

Source:

- Yanyan Zhou, `Procedural Terrain Generation with Biome Ecosystem and Dynamic Weather`

Primary contributions:

- GPU material-weight maps as derived caches
- Height- and slope-aware blending
- Selective triplanar mapping
- Central-difference normals
- Mipmaps and anisotropic filtering
- Multiscale water presentation
- Stable vegetation placement
- User-editable response curves
- Scope-matched optimization warning

Primary caution:

- Finite heightmap editor, not a planetary physical model
- Visual weather is not climate
- Generic smoothing is not aging

Review:

- `zhou-procedural-terrain-biome-weather-review.md`

### Dwarf Fortress advanced world generation

Source:

- `dwarffortresswiki.org/index.php/DF2014:Advanced_world_generation`

Primary contributions:

- Separate generator controls, targets, validators, and presentation settings
- Pre- and post-stage validation
- Shareable generation manifests and separate seed streams
- Prerequisite graphs and feasibility preflight
- Explicit process and history budgets
- Area and connected-region validation
- World painting and downstream constraint lessons

Primary caution:

- Community-maintained parameter documentation, not source code
- Reject-and-reroll can become an unbounded hosted-service failure mode

Review:

- `dwarf-fortress-advanced-world-generation-review.md`

### World-Synth tectonic plates

Source:

- `kenny.wtf/posts/world-synth-tectonic-plates/`
- `kenjinp/world-synth`

Primary contributions:

- Multi-objective cost-driven plate growth
- Separate continental and oceanic crust growth
- Continuous boundary pressure and shear
- Ordered boundary chains
- Sparse threshold-terminated elevation response
- Global structural facts plus local terrain synthesis
- Spherical spatial indexing for local refinement

Primary caution:

- Current frontier implementation repeatedly rescans candidates
- Some boundary-chain construction depends on coordinate rounding and repeated searches
- No hydrology, climate, glaciation, or deep-time erosion

Review:

- `world-synth-tectonic-plates-review.md`

### Clustered convection / SimpleTectonics

Source:

- `nickmcd.me/2020/12/03/clustered-convection-for-simulating-plate-tectonics/`
- `weigert/SimpleTectonics`

Primary contributions:

- Dynamic multi-segment plates
- Continuous crust mass, thickness, density, and buoyancy
- Mantle-potential-driven force and torque
- Divergence as crust creation
- Density-based subduction and mass transfer
- Coupled mantle-crust feedback
- Plate lifecycle and fracture concepts
- Temporal persistence as evidence for landform legitimacy

Primary caution:

- GPU-heavy planar implementation
- Many explicit simulation steps
- Poor direct fit for the CPU-only hosted path
- Best preserved as a desktop, premium, or reference simulator

Review:

- `clustered-convection-plate-tectonics-review.md`

## Decision rules for adopting research ideas

A technique should move into implementation only when we can answer:

- Which measured problem does it address?
- Which product track needs it?
- What topology and data does it require?
- What is its computational shape?
- How does memory scale?
- Is it deterministic?
- What quality tradeoff does it introduce?
- What existing stage or provider does it replace?
- What quality metrics prove it did not make the world worse?
- What license and provenance obligations apply?
- Does it require a saved-format change, and is that change justified?

Statuses:

- Prototype now
- Prototype after prerequisite work
- Retain for later product increment
- Reference or calibration model
- Avoid the source implementation

## Relationship to the first-pass PI

The first-pass PI is the implementation subset of this strategy.

It intentionally focuses on:

- benchmark and provenance
- deep-time instrumentation
- provider boundaries
- coarse structural topology
- compact structural growth
- continuous crust facts
- a few tectonic eras
- bounded age-sensitive response
- required derived-field reuse
- quality gates and ribbon diagnostics

It intentionally defers:

- direct clustered convection
- authoritative GPU generation
- many-step tectonic playback
- transient atmosphere and ocean simulation
- high-fidelity sediment and glacial systems
- local space-to-ground generation
- large world-builder UI redesign

The PI should leave behind the contracts and measurements needed to pursue those later without another foundational rewrite.

## Maintenance rule

When new sources are reviewed:

1. Add the detailed findings to a dedicated source review.
2. Add novel techniques to the technique catalog or addendum.
3. Update this document only when the broader strategy, source index, priority order, or product-track split changes.
4. Update the implementation PI only when scope or acceptance decisions change.
5. Keep high-fidelity ideas in the desktop track even when they are inappropriate for the VPS path.

This keeps source detail, strategic synthesis, and implementation scope from collapsing into one giant document nobody can use.