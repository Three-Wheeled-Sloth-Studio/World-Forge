---
type: "Research Reference"
title: "Procedural Generation Research Framework and Technique Catalog"
tags:
- world-forge
- research
---
# Procedural Generation Research Framework and Technique Catalog

Updated: 2026-07-29

## Purpose

This document controls how procedural-generation sources are reviewed and how useful ideas are retained across the research pass.

The research has two parallel outputs:

1. **Optimization shortlist**: techniques worth prototyping soon against World Forge's current runtime and quality problems.
2. **Technique catalog**: all interesting approaches that may be useful anywhere in the product roadmap, even when they are not immediately relevant to the current slow phases.

A technique must not disappear merely because it is not the next implementation candidate.

## Research rules

For every repository, paper, postmortem, or commercial-system description, capture:

- system goal and constraints;
- topology and data model;
- structural terrain or tectonic approach;
- erosion, hydrology, climate, glaciation, ecology, and simulation techniques;
- rendering and presentation techniques;
- determinism and versioning implications;
- computational shape, memory behavior, and parallelization characteristics;
- quality controls and known artifacts;
- useful concepts outside the current optimization target;
- approaches to avoid or adopt only with major changes;
- license and provenance boundaries;
- likely World Forge insertion points;
- status as immediate prototype, later candidate, reference concept, or rejected implementation pattern.

Each review should end with both:

- changes to the immediate prototype shortlist;
- additions to the broader technique catalog.

## Refined land-ribbon quality definition

Narrow land is not inherently defective.

Desirable narrow features include:

- short peninsulas and capes;
- fjord and ria coastlines;
- barrier islands;
- island arcs and hotspot chains;
- compact archipelagos;
- rift shoulders and narrow tectonic uplifts;
- locally interesting coastal fingers;
- authored or named features.

The target defect is a **long, persistently narrow, continuous land corridor whose physical extent is implausibly large relative to its width and whose tectonic, volcanic, or erosional support is weak**.

A thin strip extending roughly one-third or more of the planet's circumference is an obvious suspicious case, but this is a diagnostic trigger rather than an automatic deletion threshold.

### Ribbon diagnostics

Evaluate a candidate feature using physical units and world-relative scale:

- geodesic centerline or skeleton length;
- median, minimum, and percentile local width;
- length-to-width ratio;
- fraction of the feature below selected physical-width bands;
- persistence of narrow width along the centerline;
- whether it connects two independently substantial land cores;
- component area and perimeter compactness;
- number and spacing of breaks into islands;
- curvature and branching pattern;
- relief coherence along the feature;
- support from plate boundaries, island arcs, hotspots, rifting, mountain belts, or crust type;
- feature and deformation age;
- whether sea-level classification alone created the connection;
- whether the feature is protected by authorship, naming, or scenario rules.

### Classification intent

Classify narrow terrain rather than treating it as a binary cleanup problem:

- **retain**: short or geologically supported narrow feature;
- **fragment**: plausible island chain or archipelago whose continuous connection is accidental;
- **submerge locally**: unsupported low-relief ribbon;
- **widen locally**: supported tectonic ridge whose width fell below the intended physical scale;
- **split macro membership only**: valid land bridge that should not merge continent identities;
- **flag for diagnostics**: ambiguous feature requiring visual review;
- **protect**: authored, named, or scenario-critical feature.

Repairs should normally occur at the crust, structural-cause, or elevation field before final coastline classification. Continent grouping should interpret narrow connections but should not be responsible for repairing terrain.

## Technique catalog

Statuses:

- **Prototype soon**: plausible direct response to current performance or quality problems.
- **Retain for later**: valuable for a later product increment or simulation layer.
- **Reference concept**: useful architectural or design pattern requiring substantial adaptation.
- **Avoid implementation**: instructive, but the source implementation should not be reproduced.

### Structural topology and scale

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Fixed coarse structural mesh with deterministic projection to final topology | World Orogen | Makes plate, crust, and historical-cause cost largely independent of final display resolution | Prototype soon |
| Stable geographic or structural anchors across resolution | genworldvoronoi, World Orogen | Prevents seed and event identity from reshuffling when topology detail changes | Prototype soon |
| Major plates plus bounded microplate overlays | realistic-planet-generation-and-simulation | Adds local tectonic complexity without increasing global plate count everywhere | Prototype soon |
| Separate broad tectonic units from fine local plate texture | World Orogen | Broad units define mountain-belt topology; smaller units modulate detail | Prototype soon |
| Cell, edge, triangle, and vertex domains for different facts | Red Blob 1843 | Places transport, boundaries, junctions, and scalar fields on their natural topology domains | Reference concept |
| Graph-first algorithms independent of map projection | Red Blob 1843 | Keeps simulation free of equirectangular seams and rendering concerns | Reference concept |
| Experimental coarse mesh plus tile or LOD cache | genworldvoronoi, incomplete | Corroborates the need for multiresolution structure, but not a working implementation | Reference concept |

### Tectonic history and terrain causes

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Multi-era tectonic superposition | realistic-planet-generation-and-simulation | Produces old and recent structures without simulating every intermediate year | Prototype soon |
| Typed sparse cause fields for collision, uplift, subduction, rifting, volcanism, and subsidence | realistic-planet-generation-and-simulation, World Orogen | Separates historical causes from final elevation response | Prototype soon |
| Geologic and process-specific age fields | realistic-planet-generation-and-simulation | Lets old terrain soften and recent terrain remain sharp without literal repeated aging | Prototype soon |
| Sparse stress propagation from active boundaries | World Orogen | Replaces repeated all-cell epoch scans with bounded frontier propagation | Prototype soon |
| Compactness-constrained plate and continent growth | World Orogen | Reduces spindly structural units before coastline formation | Prototype soon |
| Tectonic support as evidence for narrow features | Cross-source synthesis | Protects real arcs, ridges, and peninsulas while identifying unsupported ribbons | Prototype soon |
| Continental shelves from crust and coast distance | realistic-planet-generation-and-simulation | Improves coastal realism, resources, currents, fisheries, and settlement | Retain for later |
| Hotspot chains as age-ordered mantle-fixed events | realistic-planet-generation-and-simulation | Creates coherent island and seamount chains and supplies positive evidence for narrow-feature retention | Retain for later |
| Constraint fields followed by light detail noise | Red Blob 1843 | Keeps noise subordinate to causal terrain structure | Reference concept |
| Static one-step random-vector plate collision | Red Blob lineage | Fast visual approximation but weak kinematics, chronology, and crust physics | Avoid implementation |
| All-to-all event influence within plates | realistic-planet-generation-and-simulation | Useful cause-field concept implemented with unacceptable scaling | Avoid implementation |

### Deep time, erosion, and surface response

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Accumulated historical causes followed by bounded visible response | World Orogen, realistic-planet-generation-and-simulation | Primary alternative to hundreds of fine-resolution aging passes | Prototype soon |
| Age-modulated response kernels | realistic-planet-generation-and-simulation | Applies smoothing, incision, volcanism, or glacial response according to process age | Prototype soon |
| Active-set stream-power incision and hillslope creep | mewo2/terrain | Uses runoff and slope to carve terrain without whole-world literal simulation | Prototype soon |
| Rebuild routing only after meaningful terrain change | mewo2 plus Red Blob synthesis | Avoids repeated global hydrology work after negligible elevation updates | Prototype soon |
| Incremental slope repair with neighbor halo | Cross-source synthesis | Restricts recalculation after local terrain changes | Prototype soon |
| Flow-controlled valley width and slope-controlled profile | genworldvoronoi | Improves local river terrain quality | Retain for later |
| Separate structural drainage, bounded visual response, and high-fidelity authored aging | Red Blob 1843 synthesis | Supports explicit fidelity tiers | Reference concept |
| Repeated full-world sink filling, sorting, and slope reconstruction | mewo2/terrain | Clear example of how a small erosion loop becomes a runtime cliff | Avoid implementation |
| Global maximum normalization of erosion | mewo2/terrain | Creates unstable coupling across distant terrain and resolution changes | Avoid implementation |

### Hydrology and water storage

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Canonical depression-aware drainage order | Red Blob 1843 | One reusable routing product for rivers, sediment, wetlands, resources, and erosion | Prototype soon |
| Reverse-order downstream accumulation | Red Blob 1843 | Linear-time accumulation for runoff, sediment, ice, nutrients, and later pollutants | Prototype soon |
| Explicit depression policy: lake, fill, breach, endorheic, or forced outlet | Cross-source synthesis | Preserves inland basins instead of silently deleting them | Prototype soon |
| Shared basin, receiver, spill, slope, and coast-distance products | genworldvoronoi | Eliminates repeated helper-level recomputation | Prototype soon |
| Dynamic reservoir, groundwater, lake, and edge-flow relaxation | realistic-planet-generation-and-simulation | Supports seasonal or authored water simulation after baseline generation | Retain for later |
| Connected biome and water components as first-class facts | genworldvoronoi | Useful for ecology, naming, regions, and civilization | Retain for later |
| Presentation smoothing of river and coast paths without changing facts | mewo2/terrain | Improves export and drilldown clarity while preserving authoritative topology | Retain for later |
| Iterative sink fill by repeated whole-world relaxation | mewo2/terrain | Poor scaling and removes meaningful closed basins | Avoid implementation |

### Glaciation

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Climate-informed active glacial-cell mask | World Orogen adapted | Avoids running glacial work on unaffected terrain | Prototype soon |
| Reusable steepest-descent ice-flow graph and upstream accumulation | World Orogen | Provides bounded glacial routing and erosion response | Prototype soon |
| Bounded carving, widening, overdeepening, moraine, and fjord response | World Orogen | Preserves visible glacial signatures without literal annual stepping | Prototype soon |
| Separate persistent ice, erosion exposure, and deglaciation fields | Cross-source synthesis | Prevents one overloaded ice variable from controlling unrelated processes | Prototype soon |
| Temperature-triggered generic wider erosion | genworldvoronoi | Does not represent accumulation, routing, advance, retreat, or deposition | Avoid implementation |

### Climate and ocean circulation

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Basin-constrained synthetic ocean gyres from boundary-distance potential | realistic-planet-generation-and-simulation, genworldvoronoi | Produces basin-scale circulation without fluid simulation | Prototype soon after climate profiling |
| Directed atmospheric and ocean transport sweeps | genworldvoronoi synthesis | Replaces indefinite iterative diffusion with bounded graph transport | Prototype soon after climate profiling |
| Separate ocean, surface, and air temperature | realistic-planet-generation-and-simulation | Improves causal climate structure and later simulation | Retain for later |
| Lower update cadence for slowly changing fields such as wind | realistic-planet-generation-and-simulation | Reduces transient simulation cost | Retain for later |
| Running rainfall and cloud-cover normals | realistic-planet-generation-and-simulation | Allows transient weather to feed stable climate summaries | Retain for later |
| Terrain barriers applied to transport and diffusion | realistic-planet-generation-and-simulation | Supports rain shadows and regional climate separation | Retain for later |
| Static climate generation separated from optional transient weather | realistic-planet-generation-and-simulation | Prevents hosted baseline generation from waiting on indefinite weather stepping | Reference concept |
| BFS from every ocean cell to find a gyre seed | realistic-planet-generation-and-simulation | Strong gyre concept with catastrophic graph implementation | Avoid implementation |
| Unbounded explicit weather iteration without convergence metrics | realistic-planet-generation-and-simulation | Poor default for queued VPS generation | Avoid implementation |

### Ecology, resources, and civilization

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Explicit Geo -> Bio -> Civ dependency layers | genworldvoronoi | Keeps later simulation from rebuilding or reaching through natural-system internals | Retain for later |
| Shared environmental fitness and proximity fields | genworldvoronoi | Supports resources, species, settlements, hazards, and civilizations | Retain for later |
| River, lake, rainfall, and terrain facts combined into ecological wetness | realistic-planet-generation-and-simulation | More useful than rainfall alone for biome and species response | Retain for later |
| Continental shelves as fisheries, resources, and settlement inputs | realistic-planet-generation-and-simulation | Extends shelf generation beyond map appearance | Retain for later |
| Stable natural-system facts consumed by simulation ticks | genworldvoronoi | Supports future civilization aging without regenerating geology | Reference concept |

### Rendering, drilldown, and export

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Topology-aware valley-versus-ridge triangulation | Red Blob 1843 | Keeps terrain readable at deeper drilldown without increasing simulation resolution | Retain for later |
| Edge facts driving coast, river, fault, and ridge shading | Red Blob 1843 | Makes authoritative structure visible in display geometry | Retain for later |
| Separate display-path smoothing and simplification by scale | mewo2/terrain | Improves clarity without modifying simulation facts | Retain for later |
| GPU or shader presentation over compact authoritative fields | Red Blob 1843 | Avoids baking every visual cue into terrain generation | Reference concept |
| Display, camera, and export changes isolated from generation invalidation | Red Blob 1843 | Directly relevant to world-builder cleanup and hosted job cost | Prototype soon in UI/runtime cleanup |

### Performance engineering and hosted execution

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Typed arrays and structure-of-arrays storage | All reviewed optimized paths | Reduces allocations, improves locality, and supports worker transfer | Prototype soon |
| Flat adjacency offsets and neighbor arrays | World Orogen, Red Blob synthesis | Replaces object-heavy graph access | Prototype soon |
| Reusable queues, visitation stamps, and scratch buffers | Cross-source synthesis | Bounds memory and avoids repeated initialization | Prototype soon |
| Derived-field cache with explicit invalidation identities | genworldvoronoi | Prevents repeated slope, drainage, distance, basin, and ordering builds | Prototype soon |
| Dependency-scoped regeneration | Red Blob 1843, World Orogen | Changes only nodes whose authoritative inputs changed | Prototype soon |
| Bounded per-job CPU and memory budgets | genworldvoronoi synthesis | Allows multiple queued VPS generations without worker oversubscription | Prototype soon |
| Parallelize only independent scans with deterministic merges | genworldvoronoi | Separates clean worker tasks from ordered graph algorithms | Prototype soon |
| Staged completion and deferred climate or ecology | World Orogen | Improves perceived latency and queue utilization | Retain for hosted implementation |
| Separate RNG streams by subsystem | realistic-planet-generation-and-simulation | Prevents unrelated parameter changes from reshuffling all downstream facts | Prototype soon |
| Geometric incidence reconstruction through nested searches | realistic-planet-generation-and-simulation | Severe avoidable cost; topology should publish incidence directly | Avoid implementation |

### Quality gates and tuning

| Technique | Source lineage | World Forge value | Status |
|---|---|---|---|
| Fixed-seed performance and quality benchmark suite | Cross-source synthesis | Makes comparisons repeatable | Prototype soon |
| Numeric terrain and climate quality metrics | World Orogen | Detects regressions beyond visual impression | Prototype soon |
| Ribbon length, local width, persistence, and support metrics | Current refinement | Targets the actual pathological feature rather than all narrow terrain | Prototype soon |
| Requested versus achieved land fraction and continent behavior | mewo2/terrain synthesis | Validates preset and author-control outcomes | Prototype soon |
| Automated climate calibration against reference distributions | World Orogen | Potentially useful when climate solver stabilizes | Retain for later |
| Diagnostic-only rich scoring, lightweight production metrics | World Orogen synthesis | Keeps generation lean while preserving development visibility | Reference concept |

## Immediate optimization shortlist

The current shortlist remains intentionally narrower than the catalog:

1. coarse structural topology with deterministic fine projection;
2. multi-era tectonic cause fields;
3. age-modulated bounded surface response;
4. sparse climate-informed glaciation;
5. derived-field caching and invalidation audit;
6. canonical depression-aware drainage;
7. reverse-order runoff, sediment, and ice accumulation;
8. active-set incision, creep, and deposition;
9. compact major plates with bounded microplates;
10. long-persistent-ribbon diagnostics based on physical width, extent, and geological support;
11. typed-array and allocation audit;
12. bounded VPS worker and memory scheduling.

The shortlist answers what to prototype next. The catalog preserves the rest of what we learned.

## Review output template

Future source reviews should include these headings even when the answer is “not present”:

1. Initial verdict
2. Source lineage and independence
3. Product constraints
4. Pipeline summary
5. Structural topology
6. Tectonics and terrain causes
7. Deep time and erosion
8. Hydrology
9. Glaciation
10. Climate and ocean circulation
11. Ecology, resources, and civilization
12. Rendering and drilldown
13. Performance and memory
14. Determinism
15. Land-ribbon and morphology behavior
16. Quality metrics and tuning
17. File-format implications
18. License boundary
19. Immediate prototype candidates
20. Broader technique-catalog additions
21. Approaches to avoid
22. Instrumentation hypotheses

This prevents research from collapsing into a narrow search for whatever happens to be slow today.