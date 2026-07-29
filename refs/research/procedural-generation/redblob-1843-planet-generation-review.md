# Procedural Generation Review: Red Blob 1843 Planet Generation

Updated: 2026-07-29

Source examined:

`redblobgames/1843-planet-generation`

Source branch reviewed: `main`

Latest source commit observed: `7441e099a297333d7925554452005beeed285806`

Primary code file reviewed: `planet-generation.js` at blob `36d0779d90f7bdf8ceb3861c7352bf3b42494420`

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

This is a technique review, not a proposal to transplant the repository or treat a time-limited experiment as a finished planetary model.

## Initial verdict

This repository is foundational and useful, but its value is concentrated in graph topology, drainage, flow accumulation, and rendering rather than tectonics, erosion, climate, or glaciation.

The strongest transferable techniques are:

1. an ocean-upward priority traversal that constructs a globally draining downhill graph;
2. one reverse-order pass for water-flow accumulation;
3. a dual-mesh separation between region, triangle, and edge facts;
4. topology-aware valley-versus-ridge rendering;
5. preallocated typed arrays and reusable buffers;
6. dependency-scoped regeneration of mesh, world facts, and display geometry;
7. graph algorithms that operate identically on a sphere because they depend on adjacency rather than a rectangular grid.

The tectonic generator should not be used as a prototype. Its author describes the project as a one-week experiment, pursued the simplest possible approximations, and later documented that the plate-collision code is buggy and that the existing parameters were tuned around those bugs.

The repository contains no meaningful climate model, no dedicated glacial model, and no deep-time simulation.

## Lineage warning

This repository is a direct upstream source for significant portions of `Flokey82/genworldvoronoi`.

The later repository explicitly ports or adapts:

- the Fibonacci sphere and dual-mesh construction;
- randomized plate growth;
- plate-boundary elevation constraints;
- distance-field elevation interpolation;
- ocean-upward downflow ordering;
- reverse-order river-flow accumulation;
- ridge-versus-valley quad rendering concepts.

These are not two independent confirmations of the same tectonic model. The current review should be treated as the foundational source, while the `genworldvoronoi` review shows how the ideas were extended into climate, ecology, resources, and civilization systems.

## Product and pipeline summary

The project is a small browser experiment built around a Fibonacci-distributed point set on a sphere, stereographic projection, Delaunay triangulation, and a half-edge dual mesh.

The active world pipeline is:

1. generate and jitter sphere points;
2. triangulate them and construct a dual mesh;
3. assign regions to randomly grown plates;
4. assign one movement vector and ocean/land category per plate;
5. classify selected plate-boundary regions as mountain, coastline, or ocean constraints;
6. interpolate regional elevation from three graph-distance fields;
7. add a small amount of 3D simplex noise;
8. assign placeholder moisture by plate;
9. average region elevation and moisture onto triangles;
10. construct a global downflow graph from the ocean upward;
11. accumulate moisture-derived flow in reverse order;
12. render terrain, valleys, ridges, plate diagnostics, and rivers.

There is no iterative erosion stage. The terrain appears valley- and ridge-like primarily because the drainage graph and renderer cooperate.

## Strongest techniques for World Forge

### 1. Canonical depression-resolving drainage order

The river system starts with all ocean triangles in a minimum-priority queue. It visits land outward from the ocean in ascending elevation priority. When an unvisited land triangle is reached from an already visited triangle, its downflow edge is assigned toward the visited side.

This produces:

- a downflow edge for every reachable land triangle;
- a deterministic processing order when tie-breaking is deterministic;
- a drainage graph that reaches the ocean even when the raw heightfield contains local sinks;
- one shared order that can support flow accumulation and downstream hydrology products.

Computational shape:

- approximately `O(T log T)` for `T` triangles with a binary priority queue;
- bounded memory consisting primarily of one queue, one downflow array, and one order array;
- no repeated sink-search and fill cycle is required merely to produce a valid flow graph.

World Forge opportunity:

- Build one canonical drainage product from the authoritative surface.
- Publish the drainage receiver, drainage order, basin membership, and spill/depression metadata as generation-graph outputs.
- Let rivers, sediment routing, wetlands, erosion response, biome moisture, resources, and inspectors consume the same product.
- Rebuild it only after a terrain change materially invalidates the graph.

Important caveat:

The Red Blob algorithm effectively forces every land cell toward the ocean. World Forge needs explicit depression policy:

- retain as endorheic basin or lake;
- fill to spill elevation;
- breach through a selected outlet;
- force drainage only for presets that do not permit closed basins.

The reusable insight is the priority-ordered drainage graph, not the assumption that every basin should disappear.

### 2. Reverse-order flow accumulation

After the drainage order exists, each land triangle receives an initial flow based on moisture. The order is traversed backward, from upstream to downstream, and each tributary adds its flow to its receiver.

Computational shape:

- `O(T)` after routing is known;
- no per-cell downstream path walking;
- no repeated searches for tributaries;
- deterministic if the routing graph and order are deterministic.

World Forge opportunity:

- Use one reverse-order accumulation for rainfall runoff.
- Reuse the same primitive for sediment, ice discharge, pollutant or nutrient transport, and other additive downstream quantities.
- Support multiple accumulation fields in one fused pass when they share the same drainage graph.

This is one of the clearest candidates for reducing repeated hydrology work inside `world.deep-time-aging` and `ecology.hydrology-biomes`.

### 3. Graph algorithms independent of projection

The author notes that the mapgen4 river code transferred to the spherical world without algorithmic changes because it operated on graph adjacency rather than a rectangular grid.

World Forge opportunity:

- Keep natural-system algorithms expressed against authoritative topology interfaces.
- Treat map projections, tile windows, globes, and exports as consumers of world facts.
- Avoid encoding equirectangular seam behavior into climate, hydrology, or erosion logic.

This is already consistent with World Forge's intended topology-first architecture and reinforces that direction.

### 4. Region, triangle, and edge domains

The implementation stores different facts on the domain where they are easiest to compute:

- region points hold elevation, moisture, plate identity, and geographic position;
- triangle centers hold averaged elevation and moisture and become drainage nodes;
- half-edges hold directed flow and plate-boundary relationships.

World Forge opportunity:

- Do not require every natural-system field to live on the same cell domain.
- Use cells for broad scalar facts, edges for transport and boundaries, and vertices or triangles for junction and basin-routing operations where that simplifies the algorithm.
- Publish deterministic conversion operators between domains.

This can reduce awkward neighborhood scans and prevent duplicated representations masquerading as separate facts.

### 5. Topology-aware valley and ridge rendering

Each region-to-triangle quadrilateral can be triangulated in two ways. The renderer chooses the diagonal based on whether the edge represents a coast or river:

- coast or flow edge: fold the quad as a valley;
- otherwise: fold it as a ridge.

This is a cheap but effective visual technique. It creates visible terrain structure from the hydrology graph without requiring a high-cost physical erosion simulation.

World Forge opportunity:

- Use authoritative river, coast, ridge, and fault edges to guide terrain triangulation or local shading.
- At intermediate and detail scales, derive a display mesh whose topology reinforces valleys and ridges.
- Treat this as rendering only unless an authored edit or export explicitly needs the modified geometry to become authoritative.

This may help terrain views retain definition at deeper drilldown scales and reduce the temptation to solve every visual problem by increasing simulation resolution.

### 6. Preallocated typed arrays

A later performance pass replaced repeatedly resized JavaScript arrays with pre-sized `Float32Array` and `Int32Array` buffers. The author reports that this increased renderer capacity to at least ten million points for indexed quad rendering and one million for the centroid renderer.

World Forge opportunity:

- Size field arrays once when topology is created.
- Reuse buffers across generation stages when lifetimes do not overlap.
- Avoid object, tuple, and dynamic-array creation in inner loops.
- Keep transferable or shareable buffer layouts compatible with browser workers and eventual Node/VPS worker threads.
- Add allocation counts and peak live bytes to performance benchmarks.

The reported numbers apply to rendering capacity, not full generation throughput. They still demonstrate how expensive dynamic array growth and nested object allocation can be at planetary scale.

### 7. Dependency-scoped regeneration

The source separates:

- `generateMesh()`: topology and mesh-dependent storage;
- `generateMap()`: plates, elevation, flow, and display facts;
- `draw()`: presentation only.

Changing the plate count regenerates the map but not the mesh. Changing rotation redraws without regenerating world facts. Draw requests are batched through `requestAnimationFrame`.

World Forge opportunity:

- Preserve this separation in the world-builder cleanup.
- Display, camera, drilldown, and export-presentation changes must not trigger world generation.
- Parameter changes should invalidate only the generation-graph nodes that consume them.
- UI changes should be coalesced separately from simulation jobs.

This reinforces the derived-field caching and invalidation work identified in the `genworldvoronoi` review.

### 8. Constraint fields plus light detail noise

The elevation generator first establishes meaningful structural constraints, interpolates a broad elevation field from their graph distances, and then adds only a small amount of 3D noise.

World Forge opportunity:

- Let tectonics, crust type, collision exposure, rifting, and water constraints create the broad terrain field.
- Use noise as scale-appropriate detail modulation rather than as the primary cause of continents or mountain systems.
- Apply detail noise after coarse structural projection to avoid spending high-resolution effort on causes that can be represented coarsely.

The specific three-distance harmonic formula should not be adopted without evaluation, but the cause-first/detail-second ordering remains sound.

## Performance assessment

### What the source does efficiently

- Flat typed arrays for high-volume numeric fields.
- Compact half-edge topology through the dual-mesh dependency.
- One priority traversal for downflow.
- One reverse pass for flow accumulation.
- Reused priority queue storage.
- Separate topology, simulation, and rendering invalidation.
- GPU rendering and shader-based slope appearance.
- Graph algorithms that avoid projection-specific branches.

### What should not be mistaken for equivalent performance

The repository appears fast partly because it does not perform:

- deep-time aging;
- iterative hydraulic or thermal erosion;
- climate circulation;
- meaningful moisture transport;
- ocean heat transport;
- glacial accumulation or erosion;
- sediment deposition;
- ecology generation.

It does not demonstrate that World Forge's full quality target can be reached at the same runtime. It demonstrates that several important derived products can be built with one bounded graph pass rather than repeated whole-world simulation.

### Hot-path concerns

The tectonic collision loop slices small coordinate arrays and invokes vector-library operations for every cross-plate neighbor comparison. The random plate fill and distance fields use JavaScript `Set` objects and dynamic queues. Those are acceptable for a small experiment but are not ideal VPS hot-path models.

World Forge should prefer:

- direct scalar coordinate access;
- flat plate and boundary arrays;
- reusable integer queues;
- typed stop masks or generation-stamped visitation arrays;
- active boundary-edge lists instead of scanning all cells after plate assignment.

## Tectonics assessment

The plate model intentionally pursues the simplest approximation:

- random plate seeds;
- randomized flood growth;
- random local movement vectors;
- one-step comparison of boundary-cell distances;
- categorical mountain, coast, or ocean constraints;
- distance-field interpolation into the plate interiors.

This model has major problems for World Forge:

- no plate-history evolution;
- no Euler-pole rotation;
- no crust age or density evolution;
- no subduction history;
- no transform-fault system;
- no compactness or plate-size control;
- resolution-sensitive random plate shapes;
- no sediment or isostatic response;
- arbitrary collision threshold;
- documented collision-code bugs.

The 2022 correction notes two concrete problems:

1. the collision comparison appears to retain the least compressive neighbor rather than the most compressive neighbor;
2. ocean/land classification initially checked region IDs rather than the owning plate IDs.

The code still documents that correcting the comparison would require retuning the rest of the generator.

Conclusion:

- do not prototype World Forge tectonics from this implementation;
- do not treat `genworldvoronoi` as independent validation of it;
- retain only the broad constraint-field concept and graph-boundary processing shape.

## Erosion assessment

There is no physical erosion model.

Some downstream triangle elevations are lowered during flow accumulation so trunk segments do not remain above tributaries, and the display topology emphasizes river valleys. This is a drainage and rendering correction, not hydraulic or glacial erosion.

Useful lesson:

- separate the minimum terrain correction required for valid drainage from expensive geomorphic response;
- do not run a full erosion simulation when the current product requirement only needs a valid river network or clear valley rendering.

World Forge should retain its richer erosion goals, but may benefit from fidelity tiers:

- structural drainage only;
- bounded visual terrain response;
- full authored or high-fidelity aging.

## Climate and glaciation assessment

The article lists moisture, rainfall, and temperature as intended topics, but the active code assigns placeholder moisture from plate identity. The author explicitly says a proper atmospheric simulation was out of scope.

There is:

- no atmospheric circulation;
- no orographic rainfall model;
- no ocean-current model;
- no seasonal energy model;
- no glacial accumulation or routing;
- no glacial erosion.

This repository does not add a climate or glaciation prototype to the shortlist.

## Long, thin land ribbons

There is no ribbon detector, minimum-width control, compactness constraint, or narrow-neck interpretation.

The randomized plate fill deliberately creates irregular boundaries, and distance-field elevation can turn categorical boundary constraints into narrow land or water features. That may contribute to interesting coastlines, but it offers no guarantee against pathological land strips.

Conclusion:

- no direct ribbon-land solution;
- do not confuse random boundary roughness with geologically supported shape quality;
- World Orogen's compactness-constrained structural growth remains the stronger upstream prevention technique;
- World Forge still needs explicit width, skeleton, neck, and tectonic-support metrics.

## Rendering assessment

The renderer contains two useful low-cost quality techniques:

1. choose terrain triangulation according to valley or ridge semantics;
2. calculate slope-like lighting from interpolated elevation derivatives in the fragment shader.

These techniques are relevant to the current report that deeper drilldown terrain becomes fuzzy. They could improve shape readability without increasing authoritative simulation resolution.

They are primarily client-side presentation techniques and do not reduce hosted generation runtime. They may, however, allow lower-cost terrain products to look better, which affects how much full-resolution response simulation is actually necessary.

## File-format impact

All recommended techniques can be implemented behind existing World Forge contracts:

- drainage receiver and order caches;
- flow accumulation buffers;
- edge-domain transport fields;
- display-only valley/ridge triangulation;
- typed scratch storage;
- dependency-scoped invalidation.

A saved-format change would only be justified if a currently derived product later becomes an authoritative durable world fact. This review provides no reason for arbitrary format churn.

## License boundary

The source uses Apache-2.0.

Direct adaptation is legally more straightforward than from the GPL-3.0 World Orogen source, but required notices and attribution still need to be preserved. The current effort remains technique extraction.

## Recommended prototype order from this repository

### Prototype G: Canonical drainage product

Implement or isolate a canonical drainage node that publishes:

- receiver per hydrology node;
- stable upstream-to-downstream order;
- basin and outlet identity;
- depression and spill metadata;
- optional retain, fill, or breach decision;
- flow accumulation for one or more source fields.

Measure:

- `ecology.hydrology-biomes` runtime;
- hydrology work repeated inside `world.deep-time-aging`;
- number of drainage rebuilds;
- sink, lake, and endorheic-basin quality;
- river continuity;
- memory cost;
- deterministic signatures.

This should be considered alongside, or immediately after, the derived-field cache audit.

### Prototype H: Fused downstream accumulation

Given a fixed drainage order, accumulate multiple additive fields in one pass:

- water discharge;
- sediment load;
- ice discharge where applicable;
- nutrient or organic transport if later needed.

Measure whether fused accumulation reduces whole-world passes without creating unacceptable coupling between otherwise independent generation nodes.

### Prototype I: Topology-aware terrain display

Build a display-only mesh or shading path that uses:

- river edges as valley constraints;
- ridge and fault edges as ridge constraints;
- coast edges as shoreline constraints;
- shader-derived slope lighting.

Compare at macro, region, local, and detail scales against the current terrain raster and tile-cast views.

Measure:

- perceived terrain definition;
- render preparation time;
- GPU and memory cost;
- whether improved display permits lower simulation or export resolution without visible degradation.

This is a presentation experiment, not a replacement for physical erosion.

## Instrumentation hypotheses produced by this review

Add or retain measurements for:

- drainage graph rebuild count;
- priority-queue pushes and maximum queue size;
- cells or triangles whose receiver changes after each aging step;
- depression count and area before and after fill or breach decisions;
- time to construct drainage order;
- time for each reverse accumulation field;
- opportunity to fuse accumulation fields;
- repeated conversions among cell, edge, vertex, and triangle domains;
- dynamic allocations versus reused typed-buffer writes;
- simulation invalidations caused by display-only state changes;
- rendering cost separated from world-fact generation cost.

## Comparative position after three repositories

### World Orogen remains strongest for

- coarse structural simulation;
- deterministic fine projection;
- compactness-controlled plates and continents;
- bounded terrain response;
- sparse active-cell glaciation;
- automated quality metrics.

### genworldvoronoi remains strongest for

- basin-constrained synthetic gyres;
- environmental derived fields consumed by biology and civilization;
- flow-width and slope-profile erosion concepts;
- layered `Geo -> Bio -> Civ` organization.

### Red Blob 1843 contributes most strongly to

- the canonical priority-ordered drainage graph;
- one-pass reverse flow accumulation;
- region/triangle/edge domain separation;
- topology-aware valley and ridge rendering;
- clean dependency boundaries between mesh, world generation, and display;
- concrete evidence that preallocated typed arrays materially affect planetary-scale browser performance.

## Updated shortlist

Highest-priority architectural and algorithmic candidates now are:

1. coarse structural simulation with deterministic fine projection;
2. accumulated historical causes plus bounded visible response;
3. sparse climate-informed glacial routing and erosion;
4. derived-field cache and invalidation audit;
5. canonical depression-aware drainage order;
6. reverse-order, potentially fused downstream accumulation;
7. compactness and minimum-width constraints during crust or continent growth;
8. basin-constrained synthetic gyres;
9. directed climate transport sweeps;
10. topology-aware terrain rendering for valley and ridge definition.

## Bottom line

The repository's main lesson is that hydrology does not need repeated downstream path searches or repeated sink-resolution loops. A single ocean-upward priority traversal can establish a reusable drainage order, and a single reverse pass can accumulate flow.

That is a credible performance candidate for World Forge because it replaces repeated work while preserving causal structure. The tectonic generator, by contrast, is deliberately rough, historically buggy, and should not influence the World Forge tectonic shortlist beyond the broad idea of turning boundary causes into interior constraint fields.