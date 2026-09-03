---
type: "Research Reference"
title: "Procedural Generation Review: genworldvoronoi"
tags:
- world-forge
- research
---
# Procedural Generation Review: genworldvoronoi

Updated: 2026-07-29

Source examined:

`Flokey82/genworldvoronoi`

Source commit reviewed: `19570f4cfe3f02784168e20b283f568ad5fc8a68`

License: Apache-2.0

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

This is a technique review, not a proposal to transplant the repository architecture or copy code wholesale.

## Initial verdict

This repository is a useful secondary source, but it is not as strong a direct answer to World Forge's deep-time performance problem as World Orogen.

Its strongest contributions are:

1. a graph-first per-region world model;
2. explicit separation of geography, biology, and civilization;
3. reusable downhill, distance, flux, and fitness fields;
4. a cheap basin-constrained ocean-gyre construction;
5. a hydrology-coupled erosion concept in which flux controls valley width and slope controls cross-section shape;
6. simple chunk parallelism for independent per-cell passes;
7. an early, incomplete concept for coarse meshes and tile caching.

Its tectonic model is comparatively weak, full-resolution, and explicitly resolution-sensitive. It does not include a real deep-time or glacial-history model. It also contains many allocation-heavy and repeated whole-world operations that World Forge should avoid.

## Product and architecture summary

The repository builds a Voronoi-like planetary graph on a Fibonacci sphere and stores most generated facts as arrays indexed by region.

The top-level world is composed from three layers:

- `Geo`: geology, elevation, climate, hydrology, resources, and regional properties;
- `Bio`: growth periods and species distribution;
- `Civ`: cities, cultures, tribes, trade, and political simulation.

Generation is staged in a fixed sequence:

1. plates;
2. elevation;
3. winds;
4. rainfall;
5. hydrology and erosion;
6. waterbodies and waterfalls;
7. resources;
8. triangle/render-derived values;
9. landmasses and biome regions;
10. ocean currents;
11. transported air and water temperatures;
12. insolation;
13. biology;
14. civilization.

The geography generator records elapsed time for its major phases, but it does not expose detailed substage counters or allocation metrics.

## Strongest techniques for World Forge

### 1. Graph-first derived fields

The repository treats the planetary graph as a reusable substrate and derives many fields from it:

- cached region neighbors;
- downhill neighbor;
- ordered downstream flow;
- water flux;
- landmass and biome-component membership;
- distance to mountains, coasts, rivers, volcanoes, and faults;
- slope and steepness;
- fitness fields for water access, arable land, survivability, cities, and resources.

World Forge opportunity:

- Treat downhill order, basin assignment, coast distance, continentality, slope, local width, and other graph transforms as reusable node outputs rather than helper functions that are silently recomputed.
- Cache each derived field against the topology identity and the authoritative inputs that invalidate it.
- Allow downstream systems such as resources, ecology, civilization, and drilldown inspection to consume those shared fields.

This is directly relevant to `ecology.hydrology-biomes` and to repeated reconciliation work inside `world.deep-time-aging`.

### 2. Stable geographic anchors across resolution

The repository sometimes picks random seed locations in latitude/longitude space and resolves them to the nearest mesh region through a spatial index. The stated intent is that the same seed retain broadly similar seed locations when mesh resolution changes.

World Forge already has stronger world-relative topology identities, but the principle is worth retaining:

- stochastic events should be anchored in continuous world space or stable structural cells;
- final topology cells should be resolved from those anchors;
- changing output resolution should not completely reshuffle plate seeds, impacts, volcanism, or other major causes.

The repository does not complete this idea. Its active full-resolution random plate flood remains resolution-dependent. Use the anchor principle, not the active plate-growth implementation.

### 3. Hydrology-coupled erosion

The active hydrology loop performs:

1. sink filling;
2. rainfall refresh;
3. downhill assignment;
4. flux accumulation;
5. a bounded erosion pass;
6. final sink and flow reconciliation.

The useful concept is causal coupling: drainage and erosion respond to one another rather than being unrelated decorative layers.

World Forge opportunity:

- Build a drainage order once from a corrected surface.
- Accumulate flow in one downhill sweep.
- Apply bounded erosion response.
- Rebuild routing only when the elevation delta exceeds a meaningful threshold or creates invalid drainage.
- Reuse the same downhill order for rivers, sediment routing, wetland candidates, and possibly glacial flow where appropriate.

This could reduce repeated hydrology rebuilding inside deep-time aging while preserving causal terrain-water relationships.

### 4. Flux-controlled valley width and slope-controlled valley shape

The alternative erosion model contains a useful visual idea:

- water flux controls the maximum lateral erosion distance;
- steep terrain produces a more V-shaped cross-section;
- flatter terrain produces a broader U-shaped cross-section;
- erosion is distributed around the current river segment rather than only lowering the center cell.

World Forge opportunity:

- Use the concept as a bounded river-corridor response at local or detail scale.
- Precompute river-segment distance or rasterize a corridor mask instead of recursively exploring neighbors for every river cell.
- Express corridor width in physical units and convert to topology radius at runtime.
- Keep glacial valley widening distinct from low-gradient fluvial widening even if they share a corridor engine.

This is a quality idea, not a performance implementation to copy.

### 5. Basin-constrained synthetic ocean gyres

The active current generator is notable. It:

1. seeds current bands at selected latitudes;
2. runs a flood-fill Voronoi assignment through ocean cells only;
3. groups connected seeds into basin-scale current domains;
4. measures each ocean cell's graph distance from the domain edge;
5. derives an inward direction;
6. rotates that direction to create clockwise or counterclockwise circulation;
7. smooths the resulting current field.

This is much cheaper than a fluid simulation and naturally respects continental barriers.

World Forge opportunity:

- Use ocean-basin membership from the authoritative water graph.
- Seed gyre centers or latitude bands using rotation, prevailing wind, and basin geometry.
- Compute a basin-edge distance or potential field.
- Build a tangential current component from the potential gradient.
- Add wind forcing, western-boundary intensification, equatorial flow, and polar/circumpolar exceptions as bounded corrections.

This may improve `climate` performance and quality if the current implementation is spending heavily on repeated current propagation.

The source implementation is heuristic and contains inefficient group merging. The technique should be rebuilt against World Forge's topology rather than copied.

### 6. Direction-ordered transport

The rainfall and temperature systems attempt to sort cells in a direction related to wind or current flow, then propagate moisture or heat in that order.

The source ordering formula is too crude and has a documented antimeridian problem. The useful concept is stronger than the implementation:

- resolve each cell's primary downstream atmospheric or ocean neighbor;
- condense cycles into strongly connected components;
- create a stable component order;
- perform one or a few directed transport sweeps;
- use local diffusion only to smooth the result, not as the primary transport mechanism.

This could replace some repeated all-cell climate iterations with bounded graph passes.

### 7. Layer separation for later simulation

The `Geo -> Bio -> Civ` composition is useful for World Forge's longer roadmap.

Benefits:

- later simulations consume stable environmental facts;
- biology does not need to know how tectonics was generated;
- civilization fitness functions can combine shared environment fields;
- the world can advance through ticks without rebuilding immutable geological foundations.

World Forge opportunity:

- Preserve explicit boundaries between natural-system facts, ecological response, and civilization simulation.
- Publish compact derived fields for downstream use rather than granting every system permission to call expensive geography helpers repeatedly.

This is not an immediate performance prototype, but it supports the intended civilization loop cleanly.

### 8. Parallelize only independent cell work

The repository uses chunked goroutines for operations such as:

- downhill-neighbor selection;
- slope and steepness;
- wind vectors;
- insolation;
- fitness scoring;
- biological growth-period calculations.

The useful rule is that independent map operations parallelize cleanly, while flood fills, flow accumulation, and ordered transport require more deliberate scheduling.

World Forge VPS opportunity:

- Give each generation job a bounded CPU budget.
- Use a shared worker pool rather than hardcoding a worker count per job.
- Parallelize large independent scans above a measured threshold.
- Prefer fewer concurrent workers per job when several worlds are queued.
- Keep deterministic reduction and merge order explicit.

The source hardcodes eight workers, which is not suitable for a shared hosted service.

## Performance findings

### Full-resolution structural work

The default configuration uses approximately 400,000 regions, and plate growth, collision classification, elevation distance fields, climate, hydrology, and most derived fields operate on the full mesh.

Unlike World Orogen, there is no working coarse structural simulation and fine projection pipeline. A commented coarse-mesh and tile-cache experiment exists, but it is not part of generation.

Conclusion:

- do not use this repository as evidence that full-resolution graph simulation is VPS-friendly;
- World Orogen remains the stronger source for the coarse-structure prototype;
- the unfinished LOD concept is worth noting only as corroboration that multiresolution pressure was felt by another project.

### Repeated whole-world calculations

The code repeatedly recomputes or reallocates:

- min/max values;
- downhill mappings;
- slope and steepness;
- temperature functions;
- distance fields;
- sorted region-index arrays;
- rainfall and flux arrays;
- connected-component queues;
- maps used as visited sets;
- neighborhood slices.

Several downstream fitness and property builders independently request the same expensive fields.

World Forge implication:

- derived-field cache identity and invalidation may produce meaningful gains even before an algorithm is replaced;
- instrumentation should count repeated construction of the same field, not merely time top-level phases.

### Allocation-heavy graph traversal

Examples include:

- linked-list queues for flood fill;
- Go maps for boolean masks and visited sets;
- recursive neighborhood traversal that allocates a fresh visited map per river cell;
- slice-of-slices neighbor caching;
- repeated temporary full-length arrays.

These patterns are workable for experimentation but poor models for a concurrent VPS service.

World Forge should favor:

- flat typed arrays;
- integer generation stamps instead of clearing visited maps;
- reusable ring buffers or flat queues;
- compact fixed-degree adjacency;
- shared scratch arenas scoped to one job;
- active-cell lists where possible.

### Sorting

Flux accumulation sorts all regions by elevation. Climate transport also constructs global sort orders. Erosion and other helpers may request those products repeatedly.

World Forge opportunity:

- cache elevation order while the surface is unchanged;
- invalidate only when erosion meaningfully changes ordering;
- consider bucketed or radix-style ordering if values are quantized;
- use a drainage DAG order directly where possible instead of a fresh general sort.

## Tectonics assessment

The active plate generator:

- selects random plate seeds;
- performs randomized full-resolution flood growth;
- assigns one movement vector per plate;
- checks relative movement at neighboring plate boundaries;
- labels collision outcomes as mountains, coasts, or ocean features;
- propagates compression across the graph;
- combines three distance fields and noise into elevation.

Problems for World Forge use:

- the growth is explicitly marked resolution-dependent;
- there is no compactness constraint or size governor;
- plate vectors are simple tangent-like directions rather than a robust rotational model;
- collision thresholds depend on an arbitrary tiny timestep and mesh spacing;
- subduction treatment is limited;
- there is no plate-history evolution;
- the source comments acknowledge several physically incorrect but visually pleasing branches.

Conclusion:

Do not prototype World Forge tectonics from this model. World Orogen offers a stronger static interaction approximation, while World Forge's current deep-time system remains richer in intended historical causality.

## Glaciation assessment

There is no dedicated glacial simulation.

The erosion code widens its neighborhood behavior when average temperature falls below freezing, but it does not model:

- ice accumulation;
- ice routing;
- persistent ice;
- glacial advance and retreat;
- moraine deposition;
- fjord or lake-basin formation as explicit glacial processes.

Conclusion:

This repository adds little to the `climate.glaciation` shortlist. World Orogen remains the stronger source for a sparse active-cell glacial response prototype.

## Long, thin land ribbons

The repository does not include a ribbon detector or a narrow-neck continent rule.

Its active plate growth has no compactness penalty. Landmasses are identified strictly as connected cells above sea level. A one-cell bridge therefore merges two large bodies without further interpretation.

This provides no direct solution and reinforces the current World Forge diagnosis:

- ribbon prevention belongs upstream in crust or land growth;
- continent interpretation needs an explicit local-width or bottleneck model;
- connected-component membership alone is insufficient.

The repository's distance-field and graph primitives could be used to implement such a diagnostic, but the diagnostic itself is absent.

## Hydrology and biome assessment

This is the repository's strongest natural-systems area.

Useful ideas:

- priority-like drainage ordering from ocean upward;
- one-pass downhill flux accumulation;
- explicit lake and drainage representation;
- identification of connected biome regions rather than only per-cell biome labels;
- waterfall and river-property derivation from shared slope and flux fields;
- downstream fitness functions built from climate, terrain, water, and distance fields.

World Forge opportunities:

- make basin, drainage order, flow accumulation, and connected biome patches first-class outputs;
- reuse those outputs in resources, species, civilization, local inspection, and naming;
- avoid recalculating proximity and suitability fields independently in each downstream system.

## Quality and tuning assessment

The repository contains many visually motivated heuristics but no automated terrain-quality scorecard or benchmark suite comparable to World Orogen's tuning tools.

Most quality evaluation appears manual. Test coverage is sparse and centered on selected utility calculations rather than generation regression.

World Forge should not borrow this aspect. Fixed-seed quality gates remain required.

## File-format impact

The repository's README proposes separating generation into geology/climate, biology/species, and civilization layers and eventually using a binary import/export format. That plan is not evidence that World Forge should change formats.

All recommended techniques from this review can be implemented behind existing World Forge contracts:

- cached derived fields;
- directed transport orders;
- gyre potential fields;
- river-corridor erosion;
- bounded worker scheduling;
- layer separation.

Persisted-format changes would only become relevant if a derived field later needs to become authoritative and durable for a demonstrated product requirement.

## License boundary

The repository uses Apache-2.0, which is materially more permissive than the GPL-3.0 World Orogen source.

Even so, the current research goal remains technique extraction. Any direct adaptation should preserve required notices and receive a quick dependency and attribution review.

## Recommended prototype order from this repository

### Prototype D: Derived-field cache audit

Before replacing algorithms, instrument and cache:

- downhill mapping;
- drainage order;
- flow accumulation;
- slope and steepness;
- coast and water distance;
- connected water and biome components;
- temperature baseline and other repeatedly requested normalized fields.

Measure:

- build count per field;
- cache hit rate;
- time saved in deep-time reconciliation, hydrology, biomes, validation, and drilldown;
- memory cost and eviction behavior.

This can be implemented without changing output quality.

### Prototype E: Basin-gyre current field

Build a cheap ocean current candidate from authoritative ocean basins, distance-to-boundary potential, rotation direction, and prevailing wind.

Compare against the current World Forge current model using:

- `climate` runtime;
- coastal temperature transport;
- western and eastern boundary behavior;
- equatorial and circumpolar exceptions;
- rain-shadow and biome downstream effects;
- deterministic basin-current signatures.

### Prototype F: River-corridor terrain response

At a bounded final response stage or local/detail refinement:

- use flow to set corridor width;
- use slope and process type to set cross-section shape;
- carve against a precomputed corridor-distance field;
- rebuild drainage only after significant changes.

Measure:

- hydrology runtime;
- river-valley continuity;
- sink creation;
- coastline changes;
- local/detail visual quality.

This is lower priority than coarse structural simulation and sparse glaciation because it is more likely to improve visible quality than the dominant runtime.

## Instrumentation hypotheses produced by this review

Add counters for:

- repeated construction of downhill, slope, steepness, coast distance, basin, and sorted-order fields;
- full-array allocations and clones per stage;
- time and allocation cost of general sorting;
- distance-field builds by caller and input signature;
- cells visited versus total cells for graph traversals;
- worker count, worker utilization, and merge time;
- memory retained by adjacency and cached derived fields;
- hydrology routing rebuilds after negligible terrain changes;
- climate transport iterations versus directed-sweep progress;
- cache hit rate across repeated generation, reconfiguration, and export actions.

## Comparative position after two repositories

World Orogen remains the stronger source for:

- coarse structural simulation;
- deterministic projection to high resolution;
- bounded erosion response;
- sparse glacial flow;
- compactness-constrained plate and continent growth;
- automated quality tuning.

genworldvoronoi contributes more strongly to:

- reusable graph-derived fields;
- hydrology and flow-order reuse;
- cheap basin-aware gyres;
- directional transport ordering;
- river-corridor shape heuristics;
- natural-system outputs designed for later biology and civilization layers.

## Bottom line

The most valuable lesson here is not its tectonic generator. It is that a graph world becomes much more powerful when expensive derived fields are treated as shared products rather than repeatedly recomputed helper results.

The strongest additions to the World Forge shortlist are:

1. a derived-field cache and invalidation audit;
2. basin-constrained synthetic gyres;
3. directed atmospheric and ocean transport sweeps;
4. flow-width plus slope-shape river corridors;
5. strict per-job CPU budgeting for parallel cell passes;
6. clean environmental outputs for later ecology and civilization simulation.

Do not borrow its full-resolution plate growth, connected-component continent interpretation, temperature-triggered pseudo-glaciation, or allocation-heavy erosion traversal.