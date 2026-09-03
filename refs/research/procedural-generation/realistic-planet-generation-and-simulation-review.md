---
type: "Research Reference"
title: "Procedural Generation Review: realistic-planet-generation-and-simulation"
tags:
- world-forge
- research
---
# Procedural Generation Review: realistic-planet-generation-and-simulation

Updated: 2026-07-29

Source examined:

`FreezeDriedMangos/realistic-planet-generation-and-simulation`

Source branch reviewed: `main`

Latest source commit observed: `b78054d31e111244ca3e31db49b6e4e63e1bc53d`

Primary source files reviewed:

- `src/A_Worldgen.js`
- `src/Generate_Terrain.js`
- `src/Generate_Weather.js`
- `src/Utils.js`
- `README.md`

License status: the README gives informal permission to use the code, but no formal repository license file was found during this review. Treat direct copying as requiring clarification or an explicit licensing decision.

## Review goal

Mine techniques that may improve World Forge generation performance without degrading quality, with special attention to:

- `world.deep-time-aging`;
- `climate.glaciation`;
- `climate`;
- `terrain.crust-fields`;
- `ecology.hydrology-biomes`;
- long, thin land ribbons;
- deterministic CPU-first execution suitable for concurrent VPS jobs;
- avoiding unnecessary saved-format changes.

This is a technique review, not a proposal to transplant the repository architecture or code.

## Initial verdict

This repository is more ambitious than the preceding lightweight map generators. It attempts plate-derived terrain, weather, ocean temperatures, humidity, clouds, rivers, lakes, groundwater-like storage, day/night effects, seasons, mountain shadows, and synthetic ocean currents.

Its strongest genuinely new ideas for World Forge are:

1. multi-era tectonic superposition through two terrain-generation passes;
2. geologic age as a control field for smoothing and terrain response;
3. hierarchical large plates plus sparse microplate overlays;
4. typed tectonic cause fields such as mountain, subduction, rift, and volcanism events;
5. continental shelves derived from proximity to continental terrain on the same plate;
6. dynamic edge-based water storage and river-flow relaxation;
7. a complete demonstration of how full iterative weather can be separated from static terrain generation.

Its largest performance lesson is negative. The code uses many all-to-all event reductions, per-cell breadth-first searches, repeated full-array remapping, object-heavy graph access, and fresh dynamic arrays. Several stages that are acceptable around 5,500 regions become unusable at World Forge scale.

The architecture is conceptually useful. The implementation is not a performance model.

## Lineage warning

The repository explicitly draws terrain inspiration from Red Blob's 1843 planetary experiment and weather inspiration from `weigert/proceduralweather`.

Do not treat its basic random plate growth and plate-vector collision model as independent confirmation of Red Blob's tectonic method.

The source appears more original in:

- two-pass tectonic layering;
- geologic-age smoothing;
- microplate overlays;
- continental-shelf shaping;
- ocean-gyre implementation;
- dynamic edge water and lake storage.

## Product and pipeline summary

The default terrain configuration uses approximately 5,545 Voronoi regions, 37 plates, and optional preparation of region-edge-triangle relationships. The source warns that preparing edges and triangles roughly doubles world-generation time.

The terrain pipeline is:

1. Generate jittered Fibonacci-sphere sites.
2. Project them stereographically.
3. Build a spherical Voronoi graph.
4. Optionally derive region-edge-triangle cross-reference structures.
5. Create tectonic plates.
6. Assign plate movement vectors.
7. Classify boundary interactions into terrain events.
8. Propagate event influence into plate interiors.
9. Assign geologic age from boundary events.
10. Build continental shelves.
11. Smooth terrain according to geologic age.
12. Add noise.
13. Rebuild continental shelves.
14. Add hotspot, tectonic-volcano, and caldera response.
15. Optionally smooth the entire old terrain layer, reseed plates, and add a weaker second tectonic pass.

The weather loop updates:

1. nightness and mountain shadows;
2. ocean temperature;
3. wind, every twentieth step;
4. surface temperature;
5. air temperature;
6. humidity;
7. clouds and rainfall;
8. stored rain, lakes, river flow, and regional wetness.

Ocean currents are generated once before weather updates.

## Strongest techniques for World Forge

### 1. Multi-era tectonic superposition

The optional two-pass mode performs a first terrain-generation pass, smooths that result as old terrain, creates a new plate partition, and applies a weaker second set of tectonic events.

This is a useful approximation of geological history:

- broad old structure survives as a smoothed foundation;
- newer mountain belts, rifts, and boundary effects are layered on top;
- visible terrain contains multiple apparent ages without simulating continuous plate motion through every intermediate state.

World Forge opportunity:

- Replace literal fine-resolution epoch stepping with a small number of explicit tectonic eras.
- Run each era on the bounded structural topology proposed in the World Orogen review.
- Store accumulated cause fields such as uplift, subsidence, rifting, volcanism, crust age, deformation age, and erosion exposure.
- Project those fields to the final topology.
- Apply age-appropriate bounded surface response.

Candidate era model:

1. ancient assembly and breakup;
2. mature continental reorganization;
3. recent active boundaries and hotspots.

Each era could use different spatial scale, event density, persistence, and smoothing strength.

This has a credible path to improving both quality and runtime. Three coarse bounded passes may be cheaper and more expressive than hundreds of full-resolution aging iterations.

### 2. Geologic age as a response-control field

The repository assigns an age to plate-boundary relationships, propagates the nearest boundary age to regions, and uses age to determine how strongly elevation is smoothed.

The physical model is crude, but the architecture is powerful:

- age is stored separately from elevation;
- terrain response depends on age;
- old terrain becomes smoother without erasing the cause history;
- recent structure remains sharper.

World Forge opportunity:

- Maintain several age fields rather than one generic number:
  - crust formation age;
  - last major deformation age;
  - last volcanic activity age;
  - glacial exposure age;
  - fluvial erosion exposure;
  - sediment-surface age.
- Apply process-specific response kernels from those fields.
- Use age to determine active-set eligibility and response strength.
- Avoid repeating simulation steps merely to make old terrain look old.

The source propagates age through a global nearest-event search. World Forge should use multi-source graph propagation, distance transforms, or the structural mesh projection pipeline.

### 3. Cause fields rather than direct terrain painting

The elevation model collects typed boundary events:

- mountain collision;
- subduction;
- anti-subduction or overriding-plate uplift;
- rifting;
- adjacency to continental or oceanic terrain;
- hotspot volcanism;
- tectonic volcanism;
- caldera collapse.

Each event contributes a distance-decaying influence to the plate interior.

This matches the `historical causes -> bounded visible response` architecture emerging from the previous reviews.

World Forge opportunity:

- Represent tectonic events as sparse sources with type, strength, age, orientation, and affected crust domain.
- Propagate them with multi-source distance transforms, anisotropic graph diffusion, or precomputed response kernels.
- Accumulate cause fields before producing elevation.
- Let later erosion, hydrology, resources, and civilization systems inspect those causes.

Do not evaluate every event against every cell. Use bounded influence radii, sparse active lists, or graph propagation.

### 4. Hierarchical macroplates and microplate overlays

The alternative plate mode creates broad plates from geodesic nearest-seed ownership, then overlays smaller microplates with bounded geographic radii.

Useful conceptual shape:

- large plates establish global structure;
- sparse microplates add local boundary complexity;
- not every detail requires another global plate;
- microplate influence can be geographically bounded.

World Forge opportunity:

- Use a two-level plate hierarchy on the coarse structural topology.
- Generate major plates with compactness, size, and ocean/continent budgets.
- Add microplates only near active margins, triple junctions, island arcs, or selected intraplate zones.
- Bound their support in physical distance.
- Keep microplate effects sparse and local.

This may improve tectonic detail without increasing the full structural plate count or running fine plate simulation everywhere.

### 5. Continental shelves as a derived crust-distance field

The repository raises shallow ocean terrain according to its proximity to land on the same plate, producing more pronounced shelves.

World Forge opportunity:

- Derive shelf width and depth from continental-crust extent, passive versus active margin status, sediment supply, tectonic age, and coast distance.
- Use one coast-distance or continental-crust-distance field rather than summing influence from every land cell.
- Keep shelf generation separate from sea-level classification so water depth remains authoritative.

This is a quality improvement with potential downstream value for resources, fisheries, currents, settlement, and coastal drilldown.

### 6. Hotspot chains as age-ordered events

The source creates several volcanic events along a plate direction. Older events become wider and weaker, approximating a hotspot island or seamount chain.

World Forge opportunity:

- Anchor hotspots in mantle or world space.
- Move the plate over the hotspot across tectonic eras.
- Emit dated volcanic events.
- Apply subsidence, erosion, reef or atoll response, and eventual drowning according to age.

This is not a performance improvement, but it is a cheap way to produce causally coherent archipelagos and may help distinguish valid narrow island chains from accidental land ribbons.

### 7. Dynamic edge storage for rivers and lakes

The weather system stores rainfall on triangle nodes and transfers water across edges according to relative elevation, desired flow, and a maximum per-step change. Excess stored water contributes to lake values, while adjacent river and lake storage contribute to regional wetness.

Useful concepts:

- water storage is distinct from instantaneous runoff;
- lakes can emerge from accumulated storage;
- flow responds gradually rather than jumping immediately to a static solution;
- regional ecological wetness can consume rainfall, lake, and river facts.

World Forge opportunity:

- Keep the canonical static drainage graph for generation.
- Add optional reservoir and groundwater storage on basins or local drainage nodes.
- Use bounded dynamic relaxation only for authored simulation, seasonal evolution, or local detail.
- Do not require long transient convergence merely to generate a baseline world.

The source implementation is order-dependent and not mass-conservation-audited. Borrow the storage model, not the exact edge loop.

### 8. Static generation and dynamic weather are separate modes

Terrain generation is one operation. Weather advances through explicit simulation steps afterward.

This separation is important for World Forge's hosted architecture:

- baseline world generation can produce stable climate normals;
- dynamic weather can be optional, lower priority, or a later simulation feature;
- exports and worldbuilding should not require indefinite weather stepping;
- expensive transient state need not become part of the base saved contract.

## Performance assessment

### 1. Edge and triangle preparation contains a severe nested-search cost

For every Voronoi edge, the source scans all cells to identify its left and right regions and scans all vertices to identify its endpoint triangles.

Approximate computational shape:

`O(E * (R + T))`

The source itself warns that this option roughly doubles world-generation time around 5,545 regions.

At World Forge scale, this approach is unacceptable.

World Forge should derive region-edge-triangle relationships directly while topology is constructed, using half-edge identities or indexed incidence arrays. No geometric endpoint search should be required afterward.

### 2. Boundary event influence is evaluated all-to-all within each plate

For each plate, every region reduces over every mountain, subduction, rift, neighboring-land, and neighboring-ocean event on that plate.

The same pattern is repeated for volcanic events.

This is the central terrain-performance problem in the repository.

World Forge should use:

- multi-source graph distance fields by event type;
- bounded-radius propagation;
- anisotropic kernels aligned to boundary orientation;
- sparse event rasters on the structural mesh;
- convolution-like response where topology permits;
- shared propagation passes for compatible event classes.

### 3. Geologic-age assignment performs a global nearest-event reduction

Every region scans the full list of boundary-age origins to find the nearest one.

This becomes approximately `O(R * B)` for `B` boundary origins and is potentially one of the most expensive terrain stages.

Replace with one multi-source nearest-owner propagation that returns both distance and source identity.

### 4. Continental shelves are calculated by land-cell-to-water-cell summation

For each plate, every underwater region sums influence from every land region on that plate. The shelf block appears twice in the terrain pipeline.

This is unnecessary all-to-all work.

Replace with:

- one continental-crust or coastline distance transform;
- a margin-type field;
- one local shelf profile pass.

### 5. Current generation uses breadth-first search from every eligible cell

The `bfsMetaVoronoi` helper runs a fresh BFS from each region until it finds a seed. Each BFS allocates a frontier and visited object and removes entries from the front of a JavaScript array.

Worst-case shape approaches `O(V * (V + E))`.

Afterward, touching groups are merged by remapping the entire group array for each detected merge. Each gyre also rebuilds its member list by scanning the whole world, then performs another frontier expansion from its boundary.

The gyre idea is valuable. This implementation is not.

World Forge should use:

1. one multi-source ocean-only BFS or Dijkstra assignment;
2. union-find or connected-component labels for compatible seed groups;
3. one boundary-distance transform per final basin or a multi-label distance pass;
4. flat queues and typed arrays.

### 6. Weather performs repeated full-world scans and fresh allocations

Every weather step updates multiple full arrays. Temperature, humidity, cloud, water-temperature, and surface-temperature stages create fresh arrays or per-cell lists. Neighbor arrays are repeatedly retrieved from object-backed Voronoi cells.

This can be acceptable for a small interactive simulation, but it is not appropriate as the default hosted generation path.

World Forge should:

- derive climate normals through bounded graph solves or accelerated convergence;
- reserve iterative transient weather for optional simulation;
- update low-frequency fields on separate cadences;
- preallocate current and next buffers;
- use structure-of-arrays numeric storage;
- fuse compatible scans;
- stop based on explicit residual thresholds.

### 7. Mountain-shadow calculation can become path-walk heavy

The shadow routine walks a sequence of regions toward the sun and tests possible blockers. Running this across all cells and many weather steps can become expensive.

For baseline climate, use cheaper horizon, relief, or insolation approximations. Reserve detailed shadow casting for local rendering, authored analysis, or cached seasonal samples.

### 8. Two-pass tectonics doubles an already expensive implementation

The source's two-pass mode is valuable conceptually but literally repeats plate creation and event propagation.

World Forge should not implement the idea by doubling the current full-resolution deep-time pipeline.

The useful form is:

- a few bounded coarse-era passes;
- shared topology and propagation buffers;
- sparse event fields;
- one projection to the final topology;
- one or a few bounded surface-response passes.

### 9. Dynamic arrays and object graphs dominate storage

The source uses JavaScript arrays for scalar fields, arrays of arrays for plate membership and transported values, object-backed visited sets, and repeated callback-heavy `map`, `reduce`, and `filter` operations.

World Forge should continue using:

- typed arrays;
- compact adjacency offsets plus flat neighbor arrays;
- flat incidence tables;
- reusable ring queues;
- generation-stamped visitation arrays;
- explicit scratch-buffer ownership;
- bounded per-job memory arenas.

## Tectonics assessment

The terrain generator is more expressive than the original Red Blob experiment, but it is still a static event-field approximation rather than plate-history simulation.

Strengths:

- separate event categories;
- major and microplate concepts;
- geologic-age field;
- multiple apparent tectonic eras;
- hotspot chains;
- continental shelves;
- deterministic RNG streams for major world facts.

Weaknesses:

- plate motion is stored as latitude/longitude deltas rather than Euler-pole rotation;
- the same direction representation distorts near poles;
- boundary compression is measured through one artificial motion step;
- crust density, age, and buoyancy are not modeled robustly;
- transform boundaries are not represented explicitly;
- event influence is isotropic despite oriented boundaries;
- geologic age is randomly assigned per plate relationship rather than derived from chronology;
- the code appears to compare plate-region arrays directly when deciding which oceanic plate subducts, rather than comparing their sizes;
- terrain and crust classification are conflated through elevation sign in several decisions.

Conclusion:

- Do not replace World Forge tectonics with this model.
- Borrow the multi-era event-field architecture.
- Implement it on the coarse structural topology with stronger plate kinematics and crust facts.

## Climate assessment

The dynamic weather system is ambitious and visually useful, but it is heuristic.

Useful ideas:

- separate air, surface, and ocean temperature;
- update wind at a lower cadence than temperature and humidity;
- advect heat and moisture using directional neighbors;
- allow terrain to block wind and diffusion;
- retain running rainfall and cloud-cover averages;
- separate transient weather from climate presentation;
- couple ocean currents to water-temperature transport.

Concerns:

- explicit iterative updates may require many steps to reach stable climate normals;
- update ordering can influence results;
- several arrays are overwritten and diffused in-place or partially from newly calculated values;
- advection chooses one neighboring cell rather than conserving a flux over edges;
- some temporary values and visual code use unseeded `Math.random()`;
- cloud logic is threshold-driven;
- no convergence metric or energy/moisture conservation audit is present.

World Forge opportunity:

- Use the system as evidence for useful state separation, not as a direct climate solver.
- Prefer directed transport sweeps, sparse linear solves, or bounded relaxation for baseline climate.
- Add optional transient weather later.

## Ocean-current assessment

The repository's current-generation concept matches the basin-gyre idea already identified in `genworldvoronoi`:

1. select ocean seeds in latitude bands;
2. assign ocean cells to reachable seeds;
3. merge touching compatible groups;
4. measure distance from each gyre edge;
5. derive the inward gradient;
6. rotate the gradient clockwise or counterclockwise.

The concept remains strong because it:

- respects land barriers;
- produces basin-scale circulation;
- is deterministic when seed assignment is deterministic;
- avoids fluid simulation.

This repository adds confidence in the technique but also demonstrates the need to rebuild it with proper multi-source graph algorithms.

## Glaciation assessment

There is no dedicated glacial accumulation, routing, erosion, or deposition system.

Cold climate and sea-ice coloring exist, but they do not address World Forge's slow glaciation phase.

World Orogen remains the strongest source reviewed so far for sparse active-cell glacial flow.

## Long, thin land ribbons

This repository provides one potentially useful prevention idea and one active anti-pattern.

Useful idea:

- geodesic nearest-seed major plates tend to be more compact than randomized frontier growth;
- microplate overlays can add local complexity without making every major plate boundary spindly.

Anti-pattern:

- the terrain-smoothing pass explicitly protects land cells when they have more water neighbors than land neighbors, keeping them above sea level to preserve interesting islands and peninsulas.

That rule can preserve exactly the narrow protrusions and ribbon fragments World Forge wants to suppress.

The source has no explicit local-width, skeleton, compactness, or narrow-neck diagnostic.

World Forge should instead:

- calculate physical local land width;
- identify substantial interior cores;
- measure neck length and persistence;
- protect only tectonically or volcanically supported narrow features;
- distinguish hotspot chains and island arcs from accidental continuous ribbons;
- repair the crust or elevation-cause field before final coastline classification.

The multi-era and hotspot fields could become positive evidence in that classifier.

## Determinism assessment

The repository uses separate seeded random streams for:

- jitter;
- plate membership;
- plate direction;
- plate type;
- geologic age;
- noise;
- volcanism;
- current tuning.

That separation is a good pattern. It prevents unrelated parameter changes from consuming one global random stream and reshuffling every downstream fact.

However:

- several visual and temporary operations still use `Math.random()`;
- the output contract is not formally versioned;
- algorithm behavior can depend on array iteration and update order.

World Forge should retain versioned deterministic streams by semantic subsystem.

## File-format impact

All useful techniques identified here can be prototyped behind current World Forge contracts:

- multi-era structural causes;
- age-modulated response;
- microplate overlays;
- shelf distance fields;
- hotspot event chains;
- reservoir or groundwater state;
- optional transient weather.

A saved-format change should occur only when one of these fields becomes an authoritative durable product requirement. Until then, keep them as internal generation products or derived caches.

## License boundary

The README says users may do whatever they want with the code, but the repository does not expose a formal license file through the reviewed branch.

Continue extracting techniques only. Do not directly copy implementation code without explicit license clarification.

## Recommended prototype order from this repository

### Prototype G: Multi-era structural cause fields

On a bounded structural topology:

1. generate an ancient tectonic event layer;
2. smooth or erode its response according to elapsed age;
3. generate one or two newer event layers at smaller scales;
4. combine the cause fields;
5. project once to the authoritative final topology;
6. apply bounded surface response.

Measure:

- `world.deep-time-aging` runtime;
- `terrain.crust-fields` runtime;
- mountain-belt age diversity;
- old versus young relief distribution;
- drainage and biome downstream effects;
- coastline and ribbon metrics;
- deterministic stability.

This is the highest-value idea unique to this repository.

### Prototype H: Age-modulated terrain response

Using existing World Forge age and exposure facts, apply age-sensitive:

- smoothing;
- hillslope creep;
- fluvial incision;
- glacial response;
- volcanic degradation;
- sediment accumulation.

Compare a few bounded response passes against literal repeated aging iterations.

Measure:

- terrain-quality scorecard;
- age-relief correlation;
- runtime;
- changed-cell percentage;
- hydrology invalidation rate;
- visual distinction between old and young terrain.

### Prototype I: Hierarchical plate and microplate experiment

Build compact major plates, then add sparse microplates only where geological context supports them.

Measure:

- plate compactness;
- boundary length;
- microplate coverage;
- mountain and rift complexity;
- ribbon-land frequency;
- structural runtime and memory.

### Prototype J: Shelf profile from derived margin fields

Generate continental shelves from:

- continental crust extent;
- coast distance;
- passive or active margin type;
- tectonic age;
- sediment supply.

Measure:

- shelf width and depth distribution;
- coastal resource placement;
- ocean-current and climate effects;
- coastline stability;
- runtime.

### Prototype K: Optional basin storage model

Retain static drainage for baseline generation, then add basin-level storage and seasonal water balance.

Measure:

- lake and inland-sea stability;
- seasonal appearance and disappearance;
- mass conservation;
- convergence time;
- memory cost;
- suitability for later civilization simulation.

This is lower priority than the performance-focused prototypes.

## Instrumentation hypotheses produced by this review

Add measurements for:

- event count by type and era;
- event-to-cell evaluations avoided through propagation;
- age-propagation queue operations;
- percentage of cells active in each age-response process;
- old versus young terrain delta by response pass;
- region-edge-triangle incidence construction time;
- all-to-all shelf or event work;
- ocean current assignment queue operations and merge operations;
- weather residual by field per iteration;
- number of weather iterations required for stable climate normals;
- shadow path lengths and blocker tests;
- dynamic water mass balance;
- temporary array and object allocations;
- peak live bytes per generation job.

## Comparative position after five repositories

World Orogen remains strongest for:

- coarse structural simulation;
- deterministic projection to high resolution;
- compactness-controlled plates and continents;
- sparse glacial flow;
- automated terrain metrics.

Red Blob 1843 remains strongest for:

- canonical depression-resolving drainage order;
- reverse-order flow accumulation;
- clean region, edge, and triangle domains;
- topology-aware valley and ridge rendering.

mewo2/terrain remains strongest for:

- lightweight stream-power and creep response;
- explicit morphology cleanup as a separate stage;
- demonstration of repeated sink-fill and sort hazards.

genworldvoronoi remains strongest for:

- reusable graph-derived fields;
- later biology and civilization consumption;
- basin-aware gyre concepts;
- river-corridor shaping.

This repository contributes most strongly to:

- multi-era tectonic layering;
- age-modulated terrain response;
- hierarchical major plates and microplates;
- shelf and hotspot cause fields;
- optional dynamic water storage;
- separation of baseline world generation from ongoing weather simulation.

## Updated shortlist

1. Coarse structural simulation with deterministic fine projection.
2. Multi-era tectonic cause fields.
3. Age-modulated bounded terrain response.
4. Sparse climate-informed glacial routing.
5. Derived-field caching and invalidation.
6. Canonical depression-aware drainage.
7. Reverse-order downstream accumulation.
8. Active-set stream-power, creep, and sediment response.
9. Compact major plates with sparse context-sensitive microplates.
10. Physical local-width and narrow-neck controls.
11. Basin-constrained ocean gyres rebuilt with multi-source graph algorithms.
12. Directed atmospheric and ocean transport.
13. Incremental slope and drainage repair.
14. Continental-shelf profiles from margin fields.
15. Topology-aware terrain rendering.
16. Optional basin and groundwater storage for later simulation.

## Bottom line

The most valuable idea here is not its continuous weather simulation. It is the shortcut to apparent geological history:

`old coarse tectonic layer -> age-driven degradation -> weaker recent tectonic layer -> bounded final response`

That may let World Forge keep deep-time causality and visible age diversity while eliminating large amounts of literal repeated aging work.

The source also reinforces that any such design must use sparse propagation and shared graph products. Its all-to-all event influence, per-cell BFS current assignment, and nested topology reconstruction would be catastrophic at hosted planetary scale.