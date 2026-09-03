---
type: "Research Reference"
title: "Procedural Generation Review: World Orogen"
tags:
- world-forge
- research
---
# Procedural Generation Review: World Orogen

Updated: 2026-07-28

Source examined:

`raguilar011095/planet_heightmap_generation`

Source product name: World Orogen

Source commit reviewed: `cc2662b4edd52231c4f65d8765f3ef12cd82d9b7`

License: GPL-3.0

## Review goal

Mine techniques that may improve World Forge generation performance without degrading terrain quality, with special attention to:

- `world.deep-time-aging`;
- `climate.glaciation`;
- tectonic and crust construction;
- long, thin land ribbons;
- deterministic CPU-first execution suitable for concurrent VPS jobs;
- avoiding unnecessary saved-format changes.

This is a technique review, not a proposal to copy source code.

## Product and simulation stance

World Orogen explicitly optimizes for fast, scientifically informed concept art rather than literal geophysical simulation. Its priority order is visual appeal, ease and speed, then scientific plausibility.

This makes it useful as a source of bounded approximations, multiresolution strategies, and quality-oriented heuristics. It is not evidence that World Forge should discard deeper simulation goals.

## Pipeline summary

World Orogen uses:

1. A Fibonacci/Voronoi sphere mesh.
2. Plate and continent construction on a fixed approximately 20,000-cell reference mesh.
3. Projection of coarse plate membership onto the selected high-resolution mesh.
4. Static plate-motion interaction classification for convergent, divergent, and transform boundaries.
5. Stress propagation and distance-field-based elevation construction.
6. Domain warping, smoothing, detail noise, glacial erosion, priority-flood drainage repair, hydraulic erosion, thermal erosion, ridge sharpening, and soil creep.
7. Optional or deferred climate calculation.
8. A retained worker state that allows terrain post-processing or climate to be recomputed without rebuilding plates and base elevation.

## Strongest techniques for World Forge

### 1. Fixed coarse structural mesh plus deterministic projection

World Orogen generates plate ownership and continent grouping on a fixed approximately 20,000-cell mesh. High-resolution worlds project those results onto their final mesh using noise-perturbed nearest-neighbor graph walks.

Useful properties:

- Plate and continent structure cost is largely independent of final output resolution.
- The same seed retains recognizable large-scale structure across detail levels.
- Fine boundary texture can be added during projection without resimulating plate construction.
- The projection uses warm-started adjacency walks rather than all-to-all nearest-neighbor search.

World Forge opportunity:

- Run plate movement, crust block ownership, continent phase membership, and most deep-time event accumulation on a bounded structural topology.
- Accumulate coarse fields such as uplift, subsidence, crust age, collision exposure, rift exposure, and erosion susceptibility.
- Project those fields onto the authoritative final topology.
- Run only resolution-dependent surface response at full resolution.

This is the highest-value performance idea in the repository. It could address both `terrain.crust-fields` and the dominant cost inside `world.deep-time-aging` without changing persisted output formats.

### 2. Bounded response simulation instead of literal time-step simulation

World Orogen does not model geological history epoch by epoch. It classifies the current tectonic interaction field, propagates stress, creates shaped terrain responses, and runs a bounded number of erosion passes.

World Forge should not simply replace deep time with this model. The useful idea is to separate:

- historical event accumulation;
- final visible terrain response.

Candidate World Forge shape:

1. Simulate or sample history on a coarse structural topology.
2. Accumulate event and exposure fields.
3. Collapse repeated fine-resolution aging work into a small number of response passes.
4. Reconcile water, climate, and hydrology once after meaningful terrain changes rather than after every small historical increment.

This should be tested against the current deep-time quality gates, not accepted solely because it is faster.

### 3. Compactness-constrained plate and continent growth

World Orogen discourages spindly plates through:

- round-robin frontier growth;
- per-plate growth rates;
- a governor for plates exceeding expected area;
- a distance-from-seed compactness penalty;
- majority-vote boundary smoothing;
- reconnection of fragmented plate pieces.

Its continent growth also:

- starts from far-separated plate seeds;
- uses per-continent area targets;
- scores compact plate additions more highly;
- prevents two growing continents from claiming a plate that touches both.

World Forge opportunity:

- Add a compactness or minimum-width penalty while continental crust or continent phases are being grown.
- Prevent accidental one-cell or narrow multi-cell bridges from being the cheapest connection between independently large land bodies.
- Repair ownership at the crust or phase-mask layer rather than blurring the final coastline.
- Preserve valid island arcs, narrow tectonic peninsulas, and rifts using tectonic support as a positive signal.

This is more promising for ribbon-land prevention than post-generation coastline smoothing.

### 4. Sparse glacial flow over an active-cell mask

World Orogen's glacial approximation:

- computes a glaciation eligibility index once from latitude and elevation;
- skips non-glaciated cells;
- builds a steepest-descent ice-flow graph;
- accumulates upstream ice flow;
- carves and widens high-flow paths;
- adds convergence over-deepening, moraine deposition, and coastal fjord carving;
- uses a bounded number of iterations.

World Forge opportunity:

- Retain World Forge's climate-informed glaciation pressure rather than adopting latitude/elevation eligibility wholesale.
- Build an explicit active-cell set for cells with meaningful ice pressure.
- Rebuild ice routing only when terrain change exceeds a threshold.
- Accumulate flow on the active graph and apply bounded response passes.
- Keep persistent ice, erosion exposure, and deglaciation fields separate.

This could materially reduce the 25-second `climate.glaciation` phase and the glacial work repeated during deep-time aging.

### 5. Deferred and dependency-scoped recomputation

World Orogen:

- skips climate automatically above a detail threshold;
- computes climate on demand when a climate-dependent view is requested;
- retains plate, mesh, base-elevation, and post-processing inputs in its worker;
- can reapply terrain sculpting without rebuilding the geological foundation.

World Forge opportunity:

- Use the existing generation graph as a real incremental dependency graph.
- Cache node outputs by seed, resolved inputs, algorithm version, fidelity, and topology identity.
- Changing display or export settings must not regenerate world facts.
- Changing climate controls should not rebuild tectonics.
- Changing erosion controls should reuse pre-aging terrain where the contract permits.
- A hosted job may return a terrain-ready result before climate and ecology finish, while the queued job continues to full completion.

Staged completion improves perceived latency. Dependency caching improves actual repeat-work cost.

### 6. Low-allocation CPU implementation patterns

Useful implementation patterns include:

- typed arrays for scalar fields and membership;
- compressed adjacency arrays using offsets and flat neighbor lists;
- preallocated scratch buffers;
- land-only active lists for erosion passes;
- fused scans where practical;
- avoiding object creation in inner loops;
- worker execution and transferable buffers;
- substage timing built into the worker pipeline;
- reducing expensive noise octaves at very high resolution.

For VPS use, worker threads and transfer semantics will differ from the browser, but bounded memory, reusable buffers, and flat arrays remain directly relevant.

## Glacial and erosion details

World Orogen combines hydraulic, thermal, and glacial erosion in one bounded loop and shares several buffers. This is attractive structurally, but the implementation should not be copied as a performance model without profiling.

Potential costs in the source approach:

- Land cells are sorted by elevation every active iteration.
- When glacial and hydraulic erosion both run, the list can be sorted twice in one iteration.
- Priority-flood processing runs before erosion and again during the loop.
- The canyon-carving phase traces drainage paths for filled cells, which may have poor worst-case behavior.

Techniques worth retaining:

- Shared buffers and active-cell lists.
- A single drainage order reused by multiple processes when terrain is unchanged.
- Bounded iteration counts.
- A priority-flood or equivalent drainage guarantee before stream-power erosion.
- Rebuilding drainage only after a meaningful surface change.

Techniques to avoid adopting blindly:

- Full sorting on every response pass.
- Repeated whole-world routing where only a sparse region changed.
- Visual clamps such as forcing eroded land to remain above sea level if they conflict with World Forge's authoritative water model.

## Tectonic interaction details

World Orogen derives plate velocity from Euler poles and classifies each boundary cell using relative movement:

- convergent;
- divergent;
- transform.

Density differences drive asymmetric subduction. Boundary stress propagates inward through continental plates using a decaying frontier, with directional alignment affecting propagation. A second broad super-plate layer supplies coherent large-scale orogenic belts while smaller plates contribute local modulation.

Useful concepts:

- Separate broad structural tectonic units from fine plate texture.
- Let broad units determine mountain-belt topology while fine plates modulate intensity.
- Propagate stress sparsely from active boundaries rather than repeatedly scanning every cell for every epoch.
- Store current interaction fields as accumulated causes for later surface response.

Concern:

The source system classifies a static tectonic state. It does not establish that a full deep-time plate-history simulation can be replaced without losing World Forge's intended historical outputs.

## Land-ribbon finding

World Orogen does not appear to include a dedicated ribbon-land detector. It reduces the chance of ribbons indirectly through plate compactness, area governors, continent separation rules, smoothing, and fragment reconnection.

World Forge should add an explicit diagnostic and quality gate.

Candidate ribbon metrics:

- area-to-perimeter compactness;
- graph distance from each land cell to water, summarized over connected land components;
- medial-axis or skeleton length relative to local half-width;
- share of a component below a minimum local width;
- narrow-neck persistence between two independently substantial cores;
- tectonic support from boundaries, ridges, volcanism, or island-arc context;
- relief coherence along the feature.

Repair should happen at the crust/continental mask or elevation-cause layer, not as arbitrary final-map morphology.

## Automated quality and tuning

World Orogen includes runtime terrain metrics and an automated climate tuning suite. Existing metrics cover features such as continent silhouette, coast complexity, elevation distribution, drainage, tectonic relationships, and erosion effects. Climate parameters can be tuned against an imported real-Earth Köppen map.

World Forge opportunity:

- Keep production metrics lightweight.
- Run richer quality scoring in diagnostic and benchmark workflows.
- Add ribbon-width and neck metrics.
- Compare fixed seeds across performance prototypes.
- Require no regression in preset, deterministic, hydrology, climate, coastline, and terrain-causality gates.

## License boundary

The source repository uses GPL-3.0. This review extracts ideas and computational patterns. Direct code copying or adaptation should receive an explicit license review and attribution plan before implementation.

## Recommended prototype order

### Prototype A: Structural-topology experiment

Run plate/crust construction and a simplified deep-time event accumulator on a fixed coarse topology, project the resulting fields to the existing authoritative topology, and compare against the current pipeline.

Measure:

- `terrain.crust-fields` time;
- `world.deep-time-aging` time;
- memory peak;
- continent and coastline metrics;
- crust-age and plate-boundary coherence;
- hydrology and biome downstream effects;
- ribbon-land frequency.

### Prototype B: Sparse glaciation response

Use current World Forge climate pressure to define active glacial cells. Build and reuse a downhill graph, accumulate ice flow, and apply a bounded erosion response.

Measure:

- `climate.glaciation` time;
- glacial work inside deep-time aging;
- persistent ice distribution;
- fjord, valley, and lake-basin indicators;
- hydrology changes;
- visual regression at polar and high-altitude regions.

### Prototype C: Continental compactness constraint

Add a diagnostic-only compactness and local-width report first. Then test a compactness penalty during continent/crust phase growth, with tectonic support protecting legitimate narrow features.

Measure:

- ribbon-land incidence;
- requested versus actual continent behavior;
- island and peninsula retention;
- coastline complexity;
- land coverage and sea-level stability.

## Instrumentation hypotheses produced by this review

When deep-time instrumentation is added, it should distinguish:

- work performed on all topology cells versus active cells;
- epochs and subpasses that materially change terrain;
- repeated sorting and drainage reconstruction;
- repeated climate, water, hydrology, biome, and projection reconciliation;
- allocations and full-array clones;
- coarse structural work versus resolution-dependent surface work;
- percentage of cells changed above meaningful thresholds per epoch;
- cacheable outputs and repeated identical computations.

These measurements are more useful than generic timers because they directly test the techniques identified here.

## Bottom line

World Orogen's most valuable contribution is not a specific erosion formula. It is the architectural choice to keep structural geology coarse, project it deterministically, and spend high-resolution work only on visible surface detail.

The best World Forge candidates are:

1. coarse structural simulation with fine projection;
2. accumulated-cause plus bounded-response deep-time processing;
3. sparse climate-informed glacial flow;
4. compactness-constrained crust and continent growth;
5. dependency-scoped recomputation and deferred completion;
6. explicit automated quality metrics, including a new ribbon-land metric.

Do not copy the full composite erosion loop or replace World Forge's history model without controlled prototype comparisons.