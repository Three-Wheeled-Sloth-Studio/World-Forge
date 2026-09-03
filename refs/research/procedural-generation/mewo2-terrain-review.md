---
type: "Research Reference"
title: "Procedural Generation Review: mewo2/terrain"
tags:
- world-forge
- research
---
# Procedural Generation Review: mewo2/terrain

Updated: 2026-07-29

Source examined:

`mewo2/terrain`

Source branch reviewed: `master`

Source commit reviewed: `a2511d6b673ae92f5983f3343365ba9326c03b63`

Primary code file reviewed: `terrain.js` at blob `4c4a21a0a54fbd05cfb87c4d6f85769d4d09001e`

License: MIT

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

This is a technique review, not a proposal to copy a 2016 planar fantasy-map generator into World Forge.

## Initial verdict

This repository is important as an ancestor of lightweight procedural erosion and river-generation techniques used by later projects, including ideas that appear in Red Blob's mapgen work and `genworldvoronoi`.

Its strongest contribution is a compact, visually effective erosion response:

- water flux supplies a river-erosion term;
- slope supplies both river energy and a creep term;
- repeated bounded passes carve drainage structure into a synthetic heightfield.

Its strongest warning is the surrounding computational shape:

- repeated full-world sink filling;
- repeated full sorting by elevation;
- full slope reconstruction on every erosion iteration;
- dynamic arrays and neighborhood allocations throughout hot loops;
- no seeded deterministic random source;
- no active-cell restriction;
- no caching or explicit invalidation model.

The erosion concept is worth prototyping. The implementation is not a performance model for World Forge.

## Lineage warning

This source is upstream of techniques already encountered in later repositories.

`genworldvoronoi` explicitly credits mewo2's erosion approach for slope and erosion work. Red Blob's mapgen lineage develops the graph-river side into a stronger priority-ordered drainage model.

The repeated appearance of the same formulas across these repositories should not be treated as independent validation. The useful historical sequence is:

1. mewo2 demonstrates lightweight flux-and-slope erosion on a Voronoi graph;
2. later Red Blob work improves drainage construction and graph-domain organization;
3. `genworldvoronoi` combines those families with a larger geography, biology, and civilization model.

## Product and pipeline summary

The repository generates a planar fantasy map on an irregular Voronoi graph.

The default terrain recipe is:

1. generate random points;
2. apply one Lloyd-style centroid relaxation;
3. build a Voronoi mesh and adjacency graph;
4. combine a directional slope, a negative radial cone, and 50 Gaussian mountain kernels;
5. smooth the heightfield ten times;
6. normalize and apply a square-root transform to make terrain peakier;
7. fill sinks;
8. run five erosion iterations, filling sinks after each;
9. set sea level from a random elevation quantile;
10. fill sinks again;
11. run three coastline-cleanup iterations;
12. derive rivers, cities, territories, borders, contours, labels, and slope marks.

The default recipe therefore runs the sink-filling algorithm seven times:

- once before erosion;
- once after each of five erosion passes;
- once after sea-level adjustment.

There is no tectonic model, climate circulation, glaciation, sediment transport, or deep-time history.

## Strongest techniques for World Forge

### 1. Bounded stream-power and creep response

The erosion-rate proxy is:

- river term: `sqrt(flow) * slope`;
- creep term: `slope^2`;
- combined response: a heavily weighted river term plus creep;
- response is capped, normalized, and subtracted from elevation.

This is not a physical erosion model, but it encodes useful causal relationships:

- more accumulated water increases incision;
- steeper terrain increases erosive power;
- steep terrain also relaxes through a non-river creep process;
- a small number of passes can turn a generic heightfield into visibly drainage-shaped terrain.

World Forge opportunity:

- Use the formula family as a bounded final terrain-response kernel after historical causes have been accumulated.
- Drive flow from World Forge's authoritative rainfall, runoff, and drainage graph.
- Separate fluvial incision, hillslope creep, sediment capacity, and deposition coefficients.
- Apply the response only to active cells with meaningful flow, slope, or instability.
- Rebuild drainage only when the elevation delta materially changes receivers, spill elevations, or basin status.
- Keep process output in physical or normalized world units rather than normalizing every pass by the single largest erosion value.

The formula is a good candidate for the `accumulated causes -> bounded visible response` architecture identified in the World Orogen review.

### 2. Hydrology and terrain response remain causally coupled

The repository repeatedly performs:

1. drainage correction;
2. downhill selection;
3. flow accumulation;
4. slope calculation;
5. erosion;
6. drainage correction again.

The implementation is expensive, but the causal loop is sound. Terrain should affect water routing, and water routing should affect terrain.

World Forge opportunity:

- Replace repeated relaxation-based sink filling with a canonical depression-aware drainage product.
- Reuse the resulting receiver and order arrays for runoff, erosion, sediment, wetlands, and river extraction.
- Apply bounded erosion.
- Reconcile only the regions whose receivers or basin state may have changed.
- Stop iterating when routing and terrain deltas fall below explicit quality thresholds.

This combines the useful response formula from this source with the stronger priority-ordered drainage architecture from Red Blob.

### 3. Explicit coastline morphology pass

The `cleanCoast` function performs a simple graph-morphology cleanup after sea level is selected.

For land cells with three neighbors:

- if no more than one neighbor is land, the cell is submerged.

For water cells with three neighbors:

- if no more than one neighbor is water, the cell is raised into land.

This removes:

- isolated single-cell islands;
- one-cell land tips;
- isolated water pinholes;
- one-cell water tips.

World Forge opportunity:

- Keep coast-quality repair as an explicit, testable stage rather than an accidental side effect of smoothing.
- Generalize it from neighbor counts to physical local width and connected-core support.
- Protect tectonically supported island arcs, narrow peninsulas, rifts, straits, and authored features.
- Apply repairs at the crust mask or terrain-cause layer when possible, then regenerate the local coast consistently.

Important limitation:

The source cleanup does not solve long thin ribbons. An interior cell in a one-cell-wide chain usually has two land neighbors and survives. The algorithm mainly prunes endpoints and isolated defects.

### 4. Quantile-based sea-level calibration

Sea level is chosen by subtracting a requested elevation quantile from the whole heightfield. This directly controls the approximate land fraction.

World Forge opportunity:

- Use quantile selection as a calibration or preset-fitting tool when a user requests a target land fraction.
- Preserve physically derived sea-level and water-volume modes when those are authoritative.
- Record the requested and achieved land fraction as a quality metric.

This is useful as a bounded author-control mechanism, not as evidence that sea level should always be a percentile operation.

### 5. Composable scalar-field construction

The terrain generator builds height from small field operators:

- directional slope;
- radial cone;
- Gaussian mountain kernels;
- addition;
- smoothing;
- normalization;
- nonlinear transforms;
- erosion response.

World Forge opportunity:

- Maintain a compact internal field algebra for experimental terrain causes and response layers.
- Make each operator deterministic and topology-aware.
- Use preallocated destination buffers instead of allocating a new dynamic array for every composition.
- Keep structural causes distinct from decorative or scale-specific detail.

This can make prototype work easier without changing saved formats.

### 6. Presentation smoothing stays separate from world facts

River, coast, and border paths are merged from graph segments and relaxed for display.

World Forge opportunity:

- Smooth rendered paths without modifying authoritative drainage, coastline, or border membership.
- Use separate simplification tolerances by zoom level and export resolution.
- Preserve exact topology for inspection, simulation, and deterministic regeneration.

This is relevant to deeper drilldown clarity but not to simulation performance.

## Performance assessment

### Sink filling is the largest algorithmic warning

The source sink filler initializes edge-adjacent cells to their original elevation, all interior cells to a large sentinel, then repeatedly scans every cell and neighbor until no value changes.

Computational behavior:

- each sweep is approximately `O(V + E)`;
- the number of sweeps can scale with graph diameter and depression geometry;
- there is no active frontier;
- every default world runs seven complete sink fills;
- each fill allocates a new full-sized height array;
- each neighbor request allocates another temporary array.

This is precisely the kind of harmless-looking repeated pass that can dominate a planetary pipeline.

World Forge should use:

- priority flood or a depression hierarchy;
- explicit lake, fill, breach, and endorheic policies;
- reusable queue and scratch buffers;
- incremental repair where practical;
- instrumentation for queue operations, changed cells, depression count, and spill updates.

### Erosion repeatedly sorts the world

`getFlux`:

1. constructs a full index array;
2. sorts every cell by elevation;
3. accumulates equal initial runoff downhill in descending elevation order.

The default five erosion iterations therefore perform five full elevation sorts, in addition to the seven sink fills and five slope reconstructions.

World Forge should instead:

- reuse the canonical drainage order;
- accumulate actual runoff rather than equal runoff per cell;
- invalidate the order only when routing changes materially;
- fuse additive downstream fields when useful;
- consider bucketed ordering if a response stage truly needs elevation order instead of drainage order.

### Full slope reconstruction on every pass

The source calculates a local triangular plane slope for every cell during every erosion iteration.

World Forge opportunity:

- recompute slope only for changed cells plus a bounded neighbor halo;
- maintain a full rebuild path for validation and large terrain changes;
- distinguish drainage-gradient slope from multi-neighbor terrain slope;
- cache both when consumed by multiple downstream systems.

### Allocation-heavy hot loops

Examples include:

- JavaScript arrays for all numeric fields;
- fresh zero arrays for nearly every transform;
- copied neighbor arrays on every adjacency request;
- `map` and nested `map` calls inside full scans;
- a full copied-and-sorted elevation array for quantiles;
- dynamic arrays and object-keyed maps for mesh construction and paths.

World Forge should continue favoring:

- flat typed arrays;
- compact adjacency offsets and neighbor arrays;
- reusable destination and scratch buffers;
- generation-stamped visitation arrays;
- flat queues;
- explicit buffer ownership and lifetime;
- allocation and peak-memory metrics in benchmarks.

### Other full-world costs

The default recipe also includes:

- 50 mountain kernels evaluated against every vertex;
- ten full smoothing passes;
- six full coastline morphology scans, because each of three iterations scans land and water separately;
- one full quantile copy and sort;
- repeated flux calculation for rivers, city placement, and territory growth.

These are acceptable at approximately 16,384 points for a one-shot planar map. They are poor defaults for a high-resolution planet or concurrent VPS queue.

### No deterministic seed contract

The generator uses `Math.random()` throughout and does not expose a stable algorithm seed.

World Forge should retain deterministic, versioned algorithms and avoid copying any random-call-order dependency from this implementation.

## Terrain-quality assessment

### Initial terrain is synthetic, not geological

The base heightfield combines:

- a linear tilt;
- a radial cone;
- scattered Gaussian mountains;
- repeated smoothing.

This is useful for attractive fantasy maps, but it does not encode crust, plate boundaries, mountain belts, rifts, basin formation, or geological age.

Conclusion:

- do not use this source for crust construction or tectonic history;
- use it only for bounded surface-response and presentation ideas.

### Global normalization creates unstable coupling

Each erosion pass divides by the maximum erosion rate in the whole map before subtracting terrain.

Consequences:

- one extreme river or slope controls the response scale everywhere;
- resolution changes can alter the maximum and therefore change global erosion behavior;
- adding or removing a distant extreme feature can change erosion in unrelated regions;
- the erosion amount lacks a stable physical interpretation.

World Forge should prefer:

- physical coefficients;
- robust percentile clipping;
- locally normalized process capacity;
- explicit maximum elevation change per response pass;
- quality thresholds based on physical distance and relief.

### Drainage policy removes inland basins

The source fills sinks to ensure flow. That is acceptable for its fantasy-map goals but incompatible with World Forge's need to support lakes, closed basins, salt flats, inland seas, and preset-dependent hydrology.

### Coast cleanup is useful but resolution-sensitive

The neighbor-count cleanup operates in cells rather than physical width. Its effect changes with topology resolution.

A World Forge version must use:

- physical feature width;
- component area;
- neck width;
- tectonic support;
- relief coherence;
- protected authored and named features.

## Long, thin land ribbons

The source provides a partial morphology idea but no complete ribbon solution.

What it catches:

- isolated cells;
- one-cell protruding tips;
- one-cell water or land defects.

What it misses:

- long one-cell chains whose interior cells have two same-type neighbors;
- two- or three-cell-wide ribbons;
- thin isthmuses connecting two large masses;
- tectonically unjustified linear peninsulas;
- narrow features that remain connected after endpoint pruning.

Useful World Forge extension:

1. calculate distance from land to water to estimate local half-width;
2. identify substantial interior cores above a physical width threshold;
3. detect skeleton paths and narrow necks between cores;
4. score the narrow feature using tectonic, volcanic, ridge, and relief support;
5. repair unsupported ribbons by submerging, widening, or breaking them into islands at the structural layer;
6. preserve supported arcs, rifts, straits, and authored features.

This source supports the existence of a separate morphology stage, but World Forge needs a much richer, physically scaled implementation.

## Tectonics assessment

There is no tectonic simulation.

The Gaussian mountain kernels and broad slope field are direct authored-style terrain primitives. They should not be used as substitutes for plate interactions, crust history, or orogeny.

## Climate and glaciation assessment

There is no climate model and no glacial model.

Temperature, rainfall, atmospheric transport, ocean currents, ice accumulation, glacial routing, and glacial erosion are outside the repository's scope.

This source adds nothing to the glaciation prototype beyond the general idea that a process-specific response can be applied after flow is known.

## Hydrology and downstream simulation assessment

The source demonstrates that the same graph-derived facts can support:

- rivers;
- city suitability;
- territory expansion;
- political borders;
- coastline contours;
- display paths.

This reinforces the derived-field product model:

- build flow and terrain-cost fields once;
- publish them to downstream ecology and civilization systems;
- do not let each consumer silently rebuild hydrology.

The territory model also demonstrates cost-weighted graph growth using slope, water, and river influence. That is potentially useful later for cultural and political geography, but it is not a near-term generation-performance prototype.

## Automated quality and testing assessment

The repository contains no benchmark suite, fixed-seed regression suite, or automated terrain-quality scorecard.

The lack of a seeded RNG also prevents deterministic visual regression without external control.

World Forge should not copy this aspect. Every performance prototype should be evaluated against fixed seeds, versioned algorithms, numeric quality gates, and representative visual review.

## File-format impact

All recommended techniques can be implemented internally behind existing World Forge outputs:

- bounded stream-power and creep response;
- cached drainage products;
- physical-width morphology;
- quantile calibration;
- typed field algebra;
- display-only path smoothing.

No persisted-format change is inherently required.

A new persisted field should only be considered if a derived product becomes an authoritative fact needed across save/load boundaries, and only after the compatibility cost is justified.

## License boundary

The source uses the MIT license.

Direct adaptation is legally simpler than the GPL-licensed World Orogen source, provided the copyright and permission notice are preserved where required.

The current research goal remains technique extraction and clean implementation against World Forge's architecture.

## Recommended prototype order from this repository

### Prototype G: Active-set bounded fluvial response

Use World Forge's canonical drainage graph and actual runoff field to test a bounded response with:

- stream-power-like incision;
- hillslope creep;
- optional sediment capacity and deposition;
- active-cell restriction;
- robust clipping instead of global maximum normalization;
- drainage rebuild only after meaningful terrain change.

Measure:

- `world.deep-time-aging` time;
- hydrology reconciliation count;
- active cells versus total cells;
- drainage receiver changes per pass;
- elevation delta distribution;
- river-valley coherence;
- sink, lake, and basin preservation;
- coastline and biome downstream changes.

### Prototype H: Physical-width coastline morphology

Implement diagnostic-only metrics first:

- land local width;
- water local width;
- connected interior cores;
- narrow-neck paths;
- unsupported ribbon length;
- protected tectonic or authored features.

Then test bounded structural repairs on fixed seeds.

Measure:

- ribbon incidence;
- island and peninsula retention;
- requested versus achieved continent behavior;
- coastline complexity;
- land fraction;
- hydrology changes;
- repair count and affected area.

### Prototype I: Incremental slope and routing repair

After a bounded terrain response:

- collect changed cells above a threshold;
- expand a bounded topology halo;
- recompute local slope;
- validate receivers and spill relationships;
- fall back to a full drainage rebuild when the affected component exceeds a threshold.

Measure:

- local repair success rate;
- full rebuild rate;
- correctness against a full recomputation;
- time saved;
- memory and queue behavior.

## Instrumentation hypotheses produced by this review

Deep-time and hydrology instrumentation should include:

- sink-fill or depression-resolution invocation count;
- queue operations or full sweeps per invocation;
- changed cells per drainage-repair pass;
- full elevation sort count and duration;
- slope full rebuild count and duration;
- active response cells versus total cells;
- drainage receiver changes after erosion;
- elevation-delta percentiles and maximum;
- erosion-rate percentiles before clipping;
- full-array allocations and clones;
- neighbor-list allocations;
- repeated flow construction by downstream caller;
- endorheic basin count before and after response;
- ribbon and local-width metrics before and after coast repair.

These measurements directly test whether a bounded mewo2-style response can replace repeated fine-resolution aging work without hiding quality loss.

## Comparative position after four repositories

World Orogen remains the strongest source for:

- coarse structural simulation;
- deterministic fine projection;
- accumulated-cause plus bounded-response architecture;
- sparse glacial routing;
- compactness-controlled plate and continent growth;
- automated quality tuning.

`genworldvoronoi` contributes most strongly to:

- shared graph-derived fields;
- basin-constrained gyres;
- directed climate transport;
- later geography, biology, and civilization boundaries;
- CPU scheduling lessons.

Red Blob 1843 contributes most strongly to:

- canonical priority-ordered drainage;
- reverse-order accumulation;
- region, edge, and triangle domain separation;
- topology-aware valley and ridge rendering;
- typed-array and invalidation discipline.

mewo2/terrain contributes most strongly to:

- lightweight stream-power and creep response;
- explicit post-sea-level morphology;
- quantile land-fraction calibration;
- composable terrain fields;
- a clear warning about repeated sink fills, sorts, and allocations.

## Updated shortlist

1. Coarse structural simulation with deterministic fine projection.
2. Accumulated historical causes plus bounded visible response.
3. Sparse climate-informed glacial routing and erosion.
4. Derived-field cache and invalidation audit.
5. Canonical depression-aware drainage product.
6. Reverse-order downstream accumulation.
7. Active-set stream-power and creep response.
8. Compactness and physical minimum-width constraints during crust and land growth.
9. Basin-constrained synthetic gyres.
10. Directed atmospheric and ocean transport sweeps.
11. Incremental slope and routing repair.
12. Topology-aware terrain rendering and display-path smoothing.

## Bottom line

The repository's erosion kernel is worth testing because it is cheap, causal, and visually effective:

`flow + slope -> bounded incision and creep`

The surrounding pipeline is not suitable for World Forge at planetary scale. Its default five-pass erosion recipe performs seven global sink fills, five elevation sorts, five full slope builds, and many full-array allocations.

The correct World Forge adaptation is:

1. build and cache a canonical depression-aware drainage graph;
2. accumulate real runoff once;
3. apply an active-set bounded erosion response;
4. repair slope and routing incrementally;
5. preserve lakes and endorheic basins through explicit policy;
6. evaluate quality and runtime on fixed seeds.

Do not copy the iterative sink filler, global maximum normalization, equal-runoff assumption, dynamic-array hot loops, or neighbor-count coastline cleanup as-is.