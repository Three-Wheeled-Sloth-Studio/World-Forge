---
type: "Research Reference"
title: "Procedural Generation Review: World-Synth Tectonic Plates"
tags:
- world-forge
- research
---
# Procedural Generation Review: World-Synth Tectonic Plates

Updated: 2026-07-29

Source examined:

Kenneth Pirman, *Modeling Verisimilitudinous Worlds: Part 1 - Tectonic Plates*, posted 2024-02-05, plus the linked World-Synth repository and spherical spatial-hashing article where necessary to understand the architecture.

Source repository:

`kenjinp/world-synth`

Repository commit represented by the reviewed source URLs:

`9e27c5a31e0b75cfd801600ca6194ed414e0850a`

Repository package license: MIT.

## Review goal

Mine useful approaches for World Forge across:

- structural plate construction;
- compact continent and crust growth;
- separation of continental and oceanic crust;
- tectonic boundary causes;
- coarse-to-fine generation;
- streamed local terrain;
- spatial indexing of sparse world features;
- long-persistent-ribbon prevention;
- deterministic CPU-first hosted generation;
- rendering and drilldown;
- broader technique-catalog additions beyond the current optimization shortlist.

## 1. Initial verdict

This source is useful.

Its strongest contributions are:

1. plate and continental growth as a tunable cost-minimization process rather than blind random flood fill;
2. explicit evidence that distance and direction costs reduce long, spindly plates;
3. separate growth phases for continental crust and surrounding oceanic crust;
4. a hybrid offline/online architecture in which global structural facts are generated once and local terrain is synthesized on demand;
5. spherical spatial indexing for sparse geological features;
6. plate-boundary stress represented as pressure and shear along ordered boundary edges;
7. stress smoothing along contiguous boundary chains;
8. sparse, threshold-terminated propagation of boundary elevation response into plate interiors;
9. a world-scale performance target that separates global generation latency from local chunk-streaming latency.

The source does not provide:

- plate-history evolution;
- deep-time erosion;
- hydrology;
- climate;
- glaciation;
- sediment transport;
- a completed continent or ribbon-quality validator.

It strengthens the structural-topology, compactness, sparse-cause, and drilldown architecture in the existing shortlist.

## 2. Source lineage and independence

World-Synth explicitly cites Experilous' tectonic planet generator and Frozen Fractal's world-generation writing as inspiration.

The project is not independent evidence for every underlying tectonic idea. It is independently useful for:

- cost-driven plate growth;
- the particular offline/online generation split;
- spatially hashed terrain-feature queries;
- space-to-ground rendering requirements;
- practical browser-performance targets;
- the implementation of boundary stress and elevation propagation.

The code remains a work in progress and includes acknowledged shortcuts and incomplete stages.

## 3. Product constraints

World-Synth targets:

- Earth-sized spherical worlds;
- browser execution;
- global structural generation in seconds;
- space-to-ground rendering;
- streaming local terrain chunks in near real time;
- enough regional structure to support mountains, island chains, volcanoes, rivers, and other causally related features;
- avoiding petabytes of precomputed terrain data.

The author reports a goal of roughly ten seconds for global model generation and under one hundred milliseconds for local chunk generation. The article reports approximately thirteen seconds and one hundred twenty milliseconds on the author's hardware at that point in development.

These targets align unusually well with World Forge's eventual hosted architecture:

- bounded global job latency;
- reusable structural output;
- fast on-demand local refinement;
- no requirement to persist every high-resolution terrain sample for the whole planet.

## 4. Pipeline summary

The reviewed implementation performs:

1. Create initial plate seed regions.
2. Grow continental crust until a target land-area fraction is reached.
3. Continue growing the same plates outward as oceanic crust until the surface is assigned.
4. Fill any residual unassigned regions.
5. Identify plate boundaries and boundary edges.
6. Calculate relative plate movement at boundary endpoints.
7. Decompose movement into boundary-normal pressure and boundary-tangent shear.
8. Order boundary edges into contiguous chains.
9. Smooth pressure and shear along those chains.
10. Classify convergent, divergent, transform, and dormant boundary segments.
11. Propagate boundary-specific elevation response into plate interiors until the response change falls below a threshold.
12. Create hotspot records.
13. Later local terrain chunks query global structural features and synthesize detail on demand.

The article's first installment describes only the early plate-growth stages. The repository contains later boundary and elevation work, which was reviewed because it clarifies the actual technique trajectory.

## 5. Structural topology

### Neighbor-aware spherical regions

The project uses roughly forty-one thousand H3 regions as a world-scale structural grid. Each region can:

- identify its neighbors;
- resolve from latitude/longitude or three-dimensional position;
- report area;
- identify shared vertices;
- store plate, crust type, and elevation facts.

The exact H3 choice is not essential. The useful contract is:

- globally addressable stable structural cells;
- neighbor traversal;
- physical area;
- shared-boundary identities;
- spatial lookup from world coordinates.

World Forge opportunity:

- preserve the current authoritative spherical topology;
- consider a smaller bounded structural layer for tectonic causes;
- expose direct cell, edge, and boundary incidence;
- use stable world-relative identities for projection into final topology and local drilldown patches.

### Grid hiding is presentation, not simulation

The source intends to hide the coarse region structure through jitter, noise, and fine terrain synthesis.

World Forge should preserve the distinction:

- structural cells store causes and broad facts;
- fine terrain response prevents visible hex or Voronoi artifacts;
- presentation noise must not rewrite plate ownership or geological history.

## 6. Tectonics and terrain causes

### Cost-driven plate and continental growth

The plate generator grows each plate from a seed through neighboring cells. Candidate regions receive a normalized cost based on:

- distance from the plate seed;
- difference from a desired growth bearing;
- three-dimensional noise modulation;
- a per-plate growth bias;
- a maximum allowed cost.

The lowest-cost available candidate is selected.

The source explicitly reports that unweighted growth created long, spindly, far-reaching plates, while distance and directional costs produced more coherent structures.

This is directly relevant to World Forge's long-persistent-ribbon defect.

The important refinement is that the current cost measures bearing from the original seed. The author notes that this creates cone or seashell projections and suggests measuring direction from the nearest owned frontier cell instead.

World Forge candidate cost terms:

- incremental geodesic distance from the current structural frontier;
- distance from one or more plate cores;
- area-budget pressure;
- compactness delta;
- local-width or neck penalty;
- directional persistence from nearby growth history;
- plate-motion-aligned anisotropy;
- resistance from neighboring established plate cores;
- controlled low-amplitude noise;
- tectonic-context terms for arcs, rifts, and microplates.

Do not reduce this to a single seed-distance circle. Use a multi-objective frontier cost.

### Separate continental and oceanic crust growth

The source first grows continental regions until the requested land fraction is reached, then runs a second expansion with looser costs and lower noise to assign surrounding oceanic crust to the same plates.

This is a useful structural distinction:

- plates are not synonymous with continents;
- one plate may contain both continental and oceanic crust;
- continental geometry can be compact while the complete plate extends much farther;
- coastlines do not need to align with plate boundaries;
- oceanic crust can supply the space in which later convergence, rifting, and island arcs occur.

World Forge already models crust and plates separately in intent. This source strengthens the case for explicitly validating that the implementation preserves that distinction.

### Plate motion and boundary stress

The repository gives each plate:

- a random three-dimensional drift axis;
- a drift rate;
- a spin rate around the plate's seed region.

Movement at a boundary point is calculated from cross products, producing a tangent motion vector on the sphere. Relative movement between adjacent plates is decomposed into:

- pressure normal to the boundary;
- shear tangent to the boundary.

A bounded nonlinear transform normalizes those values before boundary classification.

This is stronger than latitude/longitude delta motion and closer to an Euler-pole-style representation, although the extra seed-centered spin term is heuristic.

Useful World Forge ideas:

- calculate motion at the actual boundary point;
- decompose relative velocity against local boundary normal and tangent;
- preserve pressure and shear as continuous cause fields;
- classify only after smoothing and normalization;
- keep boundary orientation available for anisotropic mountain, trench, and rift response.

### Ordered boundary chains

Boundary edges are connected into contiguous chains before smoothing and classification.

This is valuable because tectonic features are not isolated cells. Mountain belts, trenches, rifts, and transforms have along-boundary continuity.

World Forge opportunity:

- create stable boundary segments and chains from topology incidence;
- smooth or regularize stress along physical arc length;
- detect junctions and branch points explicitly;
- preserve segment identity for naming, resources, volcanism, and regional inspection;
- apply different kernels along and across the boundary.

The source implementation reconstructs chains through coordinate rounding and repeated searches through remaining edge sets. World Forge should derive edge adjacency directly from topology vertex identities.

### Threshold-terminated elevation propagation

The source launches propagation fronts from every contiguous boundary edge into both adjacent plates. Boundary-type-specific response functions calculate elevation. Propagation stops from a region when the elevation change is below a fixed threshold.

The strong idea is:

- sparse boundary sources;
- graph propagation into affected plate interiors;
- process-specific response functions;
- early termination when marginal change is negligible.

This matches the existing `historical causes -> bounded response` architecture.

World Forge improvements:

- run on a bounded structural topology;
- use one multi-source propagation per compatible cause class instead of one queue per boundary edge;
- use physical-distance attenuation;
- align response anisotropically to boundary orientation;
- accumulate causes separately from final elevation;
- use residual thresholds expressed in physical relief or normalized process energy;
- avoid order-dependent in-place competition between many edge fronts.

## 7. Deep time and erosion

No deep-time aging or erosion model is presented.

The source supports the broader architecture by generating sparse structural causes that a later multi-era aging system could consume.

Potential World Forge integration:

1. Generate compact structural plates and crust domains.
2. Generate continuous boundary pressure and shear.
3. Record dated collision, divergence, transform, and hotspot causes by era.
4. Propagate those causes on the coarse topology.
5. Project accumulated fields to final topology.
6. Apply age-sensitive erosion and surface response.

The source does not alter the active erosion or glaciation algorithm shortlist.

## 8. Hydrology

No hydrology algorithm is provided.

The article argues correctly that pure noise lacks relationships needed for rivers and mountain chains. The structural dataset is intended to provide those regional relationships later.

World Forge should continue treating drainage as its own canonical graph product, downstream of structural terrain.

## 9. Glaciation

No glacial system is present.

The glaciation shortlist remains unchanged.

## 10. Climate and ocean circulation

No climate or current implementation is described in this installment.

The source references later climate ambitions but provides no algorithm to evaluate here.

## 11. Ecology, resources, and civilization

No ecology or civilization simulation is present.

However, the sparse feature-query architecture is useful downstream. Local generation may query nearby:

- geological boundaries;
- volcanoes and hotspots;
- rivers and basins;
- resource provinces;
- ecological patches;
- settlements and roads;
- authored features.

The same spatial index can serve multiple feature classes, provided authoritative ownership and invalidation remain explicit.

## 12. Rendering and drilldown

### Offline/online hybrid generation

The article rejects both extremes:

- precomputing the complete high-resolution planetary surface, which would be too large;
- using only procedural noise, which lacks regional causal relationships.

Its proposed hybrid is:

- generate global structural facts once;
- retain them in a compact queryable dataset;
- synthesize high-resolution terrain chunks on demand;
- query nearby structural features while generating each chunk.

This is one of the strongest architecture matches found in the research so far.

World Forge opportunity:

- global job produces authoritative structural, terrain, climate, hydrology, and ecology fields at bounded resolution;
- local drilldown projects and refines only the requested area;
- local detail generation consumes nearby causes and parent-scale constraints;
- generated patches are cached by world version, location, scale, and algorithm version;
- local edits invalidate only intersecting patches and dependent facts;
- the saved world need not contain every local height sample.

This may eventually resolve both fuzzy drilldown and hosted-storage concerns.

### Spherical spatial feature indexing

The linked spatial-hashing approach assigns each terrain feature to every coarse spherical bucket intersected by its radius. A local terrain vertex or patch then queries its bucket and evaluates only nearby features.

The article reports local high-resolution chunk generation falling from roughly fifteen seconds in the naive feature-scan approach to roughly twenty milliseconds in an idealized hashed case.

Treat those figures as author-reported experiment results, not a guaranteed World Forge outcome.

World Forge opportunity:

- index sparse features by intersecting structural cells or a dedicated hierarchical spherical index;
- query by patch bounds rather than per vertex where possible;
- deduplicate features spanning several buckets;
- separate feature identity from bucket membership;
- use bounded support radii;
- maintain per-feature-class indices if query patterns differ;
- make index rebuilding incremental after edits.

Candidate indexed features:

- tectonic boundary segments;
- uplift and rift sources;
- hotspots and volcanic chains;
- impact craters;
- river centerlines and canyon corridors;
- glacial valleys;
- faults;
- reefs, shelves, and coastal structures;
- roads and settlements;
- authored landmarks.

This is a rendering and local-refinement performance technique, not necessarily a replacement for dense full-world arrays used by global simulation.

## 13. Performance and memory

### Useful performance structure

- Global structural generation and local terrain generation have separate budgets.
- Sparse features are evaluated only near their support.
- Local terrain is generated on demand rather than persisted globally.
- Region iteration is expressed as generators with progress events.
- Propagation stops when response falls below a threshold.
- Reusable vector temporaries appear in some hot code.

### Plate-growth performance concern

The current plate-growth implementation repeatedly:

1. obtains all neighboring candidate regions for a plate;
2. evaluates every unassigned candidate;
3. scans for the minimum cost;
4. repeats after adding one region.

Depending on frontier size and implementation of `getNeighboringRegions`, this can become much more expensive than a normal flood fill.

World Forge should use:

- a deterministic priority queue per plate or a global queue keyed by cost;
- incremental frontier updates;
- stale-entry detection when another plate claims a cell;
- explicit fair scheduling among plates;
- area and compactness governors;
- stable tie-breaking;
- bounded recalculation only when local ownership changes affect a candidate's cost.

If cost depends on evolving compactness or local frontier direction, recompute only affected candidates rather than the whole plate frontier.

### Boundary-chain performance concern

The source orders edges by repeatedly searching remaining edges and comparing rounded coordinates. This may scale poorly and can be fragile near numerical seams.

World Forge should publish:

- vertex-to-edge incidence;
- edge-to-segment adjacency;
- stable endpoint identities;
- direct junction classification.

### Elevation-front performance concern

The source creates a queue for each boundary edge and allows many fronts to visit overlapping plate interiors.

At large scale, this can multiply work substantially.

Prefer:

- multi-source propagation;
- top-k source retention only where necessary;
- compatible cause-field fusion;
- bounded support radii;
- active-cell masks;
- deterministic reductions.

### Hosted execution

The architecture maps well to a VPS service:

- expensive structural job once;
- local patch jobs as separate queue items;
- patch cache and content-addressed identities;
- bounded feature queries;
- CPU-only operation;
- no need to allocate the complete local-resolution planet.

Global simulation still needs bounded dense fields where every cell participates. Do not force every system through the sparse feature index merely because it is excellent for local terrain queries.

## 14. Determinism

The reviewed code uses random helpers but the article does not establish a durable subsystem seed or algorithm-version contract.

World Forge adaptation must require:

- separate seeded RNG streams;
- stable plate-seed identities;
- stable priority-queue tie-breaking;
- deterministic noise sampling;
- fixed iteration and reduction order;
- versioned structural and patch algorithms;
- local patch identity independent of request order.

## 15. Land-ribbon and morphology behavior

This is one of the more directly relevant sources for preventing pathological long land corridors.

The article's blind flood-fill attempt produced long, spindly, far-reaching plates. Adding distance and bearing costs reduced that behavior.

However:

- plate compactness is not the same as land compactness;
- seed-relative bearing can create very long conical projections;
- controlled noise can still form narrow corridors;
- no physical local-width or circumference-relative validator is present;
- continental growth currently stops only by total land area, not feature-shape quality.

World Forge should incorporate the useful cost terms while retaining the refined ribbon definition:

- short narrow features are desirable;
- compact archipelagos and island arcs are desirable;
- the defect is a persistently narrow corridor with implausibly large geodesic extent and weak geological support.

Candidate growth-stage controls:

- penalty for extending an already long narrow branch;
- reward for adding width beside a narrow supported branch;
- penalty for connecting distant substantial cores through a weak neck;
- feature-length budget in physical units;
- context exemption for island arcs, hotspot tracks, rifts, and active mountain belts;
- preference for fragmentation into islands when elevation support is intermittent;
- post-growth diagnostic rather than blind morphological deletion.

## 16. Quality metrics and tuning

The source strongly supports exposing normalized cost terms and visualizing their effects.

World Forge should record for plate and crust growth:

- final contribution of each cost term;
- plate and continental area distribution;
- compactness;
- maximum geodesic extent;
- local-width distribution;
- branch and skeleton lengths;
- number of isolated fragments;
- target versus achieved land area;
- plate/crust overlap behavior;
- cost-limit stalls;
- frontier queue size and stale-entry rate;
- effect of noise on the same seed.

A diagnostic mode should compare the same seed with:

- no compactness cost;
- compactness only;
- direction only;
- controlled noise;
- full multi-objective cost.

This would convert cost tuning from screenshot folklore into measurable optimization.

## 17. File-format implications

None of the recommended prototypes requires an arbitrary saved-format change.

Potential internal or manifest additions include:

- structural feature index identity;
- algorithm version;
- compactness and growth parameters;
- resolved plate and crust budgets;
- local patch cache keys.

These can remain derived runtime metadata until a demonstrated persistence need arises.

## 18. License boundary

The repository package declares MIT licensing. No root `LICENSE` file was found during this review, but the package metadata is explicit.

Direct adaptation should retain the appropriate copyright and permission notice. Technique extraction remains the default approach.

## 19. Immediate prototype candidates

### Prototype G: Multi-objective compact crust growth

On a coarse structural topology, compare:

1. current World Forge structural growth;
2. seed-distance cost;
3. local-front direction cost;
4. compactness and local-width cost;
5. complete multi-objective cost with low-amplitude noise.

Measure:

- runtime;
- requested versus achieved land coverage;
- plate and continent area distribution;
- long-persistent-ribbon rate;
- narrow-feature retention;
- archipelago and island-arc behavior;
- determinism;
- priority-queue operations and memory.

This can be paired with the existing coarse structural topology prototype rather than built separately.

### Prototype H: Sparse structural feature index for local drilldown

Build a diagnostic index for a small set of existing World Forge causes:

- plate boundaries;
- faults;
- volcanism;
- major rivers;
- glacial corridors.

Generate or inspect local patches by querying only intersecting features.

Measure:

- index-build time;
- index memory;
- query candidates by patch scale;
- patch generation time;
- duplicate-feature handling;
- cache hit rate;
- edit invalidation cost;
- visual continuity across patch boundaries.

This is a later drilldown and hosted prototype, not part of the first deep-time optimization experiment.

### Prototype I: Boundary-chain cause propagation

Construct stable boundary chains from authoritative topology incidence, compute continuous pressure and shear, and compare:

- per-edge independent propagation;
- multi-source cause propagation;
- anisotropic along/across-boundary response.

Measure:

- runtime;
- chain continuity;
- mountain-belt coherence;
- transform and rift visibility;
- affected-cell ratio;
- cause-field determinism.

## 20. Broader technique-catalog additions

Add or strengthen:

- offline global structure plus online local terrain synthesis;
- hierarchical spherical spatial indexing for sparse features;
- multi-objective cost-driven plate and crust growth;
- frontier-relative directional persistence;
- separate continental and oceanic growth phases;
- contiguous tectonic boundary chains as first-class facts;
- pressure/shear cause fields along boundary edges;
- sparse threshold-terminated boundary response;
- local patches generated from parent-scale structural constraints;
- separate latency budgets for world generation and patch streaming;
- on-demand local terrain caches rather than full planetary persistence;
- visual noise used to hide structural grids without replacing causes.

## 21. Approaches to avoid

- Blind randomized flood fill for plate or land growth.
- Seed-relative direction as the only anisotropy term.
- Rescanning the entire plate frontier after every claimed cell.
- One propagation queue per boundary edge at planetary scale.
- Reconstructing boundary adjacency through rounded coordinates.
- Iterating every global feature for every local terrain vertex.
- Treating sparse feature indexing as the universal data structure for dense climate or hydrology fields.
- Letting display noise alter authoritative structural ownership.

## 22. Instrumentation hypotheses

This source adds the following useful measurements:

- plate-growth candidate evaluations per accepted cell;
- frontier size and queue operations;
- stale candidate rate;
- time by cost term;
- compactness delta per growth step;
- branch extension and local-width change;
- cost-limit stalls;
- contiguous-boundary chain construction time;
- stress smoothing iterations and residual;
- elevation propagation fronts, visits, overlaps, and termination reasons;
- number of sparse features returned per local patch query;
- spatial index build time, memory, and bucket duplication;
- local patch generation time by structural feature class;
- cache identity and hit rate by drilldown scale.

## Bottom line

World-Synth's most valuable tectonic lesson is that plate and crust shape should be treated as a tunable optimization problem, not a random flood-fill accident.

Its most valuable architectural lesson is the split between:

- compact global structural facts generated once;
- local high-resolution terrain synthesized and cached on demand;
- spatial indices that limit local work to nearby features.

For World Forge, this strengthens the case for combining coarse multi-era structural simulation, multi-objective compactness-aware growth, stable boundary cause fields, and on-demand drilldown refinement.