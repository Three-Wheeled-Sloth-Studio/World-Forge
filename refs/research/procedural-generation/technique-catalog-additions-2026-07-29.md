---
type: "Research Reference"
title: "Procedural Generation Technique Catalog Additions"
tags:
- world-forge
- research
---
# Procedural Generation Technique Catalog Additions

Updated: 2026-07-29

This file extends `research-framework-and-technique-catalog.md` with techniques found after the initial catalog was created. It preserves useful approaches that are not necessarily immediate optimization candidates.

## Sources covered

- *Procedural Terrain Generation with Biome Ecosystem and Dynamic Weather*
- Dwarf Fortress advanced world generation controls
- World-Synth tectonic plates
- Clustered convection for procedural plate tectonics

## Structural topology and scale

| Technique | Source | World Forge value | Status |
|---|---|---|---|
| Global structural facts plus deterministic local terrain synthesis | World-Synth | Avoids precomputing the planet at local resolution while preserving causal regional structure | Retain for hosted drilldown |
| Spherical spatial indexing for sparse terrain features | World-Synth | Makes local patch generation query only nearby boundaries, rivers, faults, hotspots, and landmarks | Retain for hosted drilldown |
| Dynamic point-cloud approximation of a continuous material field | Clustered convection | Allows nonuniform crust properties and deformable plates without assigning one uniform value to each plate | Reference concept |
| Adaptive insertion and removal of structural samples | Clustered convection | Models crust creation, subduction, and changing material density | Reference concept |
| Global spherical facts projected into editable local raster patches | Zhou thesis synthesis | Gives local editing and rendering grid-friendly operations without replacing the authoritative world topology | Retain for editing increment |
| Weighted coarse author-control meshes | Dwarf Fortress | Biases broad distributions without replacing causal simulation or forbidding rare outcomes | Retain for advanced controls |
| World-relative anisotropic control fields | Dwarf Fortress synthesis | Allows directional climate, relief, or tectonic tendencies without projection-axis artifacts | Retain for advanced controls |

## Tectonic history and terrain causes

| Technique | Source | World Forge value | Status |
|---|---|---|---|
| Multi-objective frontier cost for plate and continental growth | World-Synth | Discourages planet-scale spindly structures while allowing controlled local irregularity | Prototype within coarse structural work |
| Separate continental-crust growth from oceanic-crust ownership | World-Synth | Preserves the distinction between continents, crust type, and tectonic plates | Prototype within coarse structural work |
| Continuous boundary pressure and shear | World-Synth | Supports nuanced convergent, divergent, transform, and dormant response | Prototype within multi-era causes |
| Ordered boundary chains with along-boundary smoothing | World-Synth | Produces coherent mountain, trench, rift, and transform systems | Prototype within multi-era causes |
| Crust thickness, density, age, and buoyancy as continuous fields | Clustered convection | Allows continental-like and oceanic-like behavior to emerge from material facts | Prototype within coarse structural work |
| Mantle or energetic-potential field driving plate force and torque | Clustered convection | Replaces arbitrary motion vectors with a bounded causal driver | Reference prototype |
| Divergence as creation of young crust | Clustered convection | Produces crust-age bands and supports bathymetry, density, resource, and subduction logic | Prototype within era transitions |
| Density-based subduction and approximate mass transfer | Clustered convection | Makes convergence depend on material properties and supports crust thickening and melt | Reference prototype |
| Coupled feedback from divergence and subduction into mantle potential | Clustered convection | Supports persistent spreading and subduction provinces across eras | Reference concept |
| Explicit plate lifecycle: birth, fracture, merger, subduction, and death | Clustered convection | Prevents tectonic structure from remaining frozen across deep time | Prototype at era boundaries |
| Era-boundary fracture using strain, thermal weakness, crust thickness, and inherited faults | Clustered convection synthesis | Adds plate reorganization without continuous expensive fracture simulation | Prototype within multi-era causes |
| Cost increasing with unsupported narrow-branch persistence | World-Synth synthesis | Targets long continuous land or crust noodles without removing small peninsulas and archipelagos | Prototype within compact growth |

## Deep time and surface response

| Technique | Source | World Forge value | Status |
|---|---|---|---|
| High-fidelity reference tectonic simulator used to calibrate a cheaper production model | Clustered convection synthesis | Lets experimentation inform bounded production approximations without forcing the expensive model into every job | Reference concept |
| A few structural eras with plate lifecycle instead of many small motion steps | Clustered convection synthesis | Preserves history and reorganization while respecting CPU-only hosted budgets | Prototype soon |
| Exposed process budgets with named fidelity levels and visible consequences | Dwarf Fortress | Makes runtime-quality tradeoffs understandable to users | Retain for world-builder cleanup |
| Stage-delta validation before and after transformative processes | Dwarf Fortress | Attributes loss of mountains, riverheads, glaciers, or biome patches to the stage that caused it | Prototype soon |
| Author-editable response curves over causal terrain fields | Zhou thesis | Provides stylistic control without replacing geological causes with arbitrary noise | Retain for editing increment |
| Generic box smoothing only as an explicit cosmetic edit | Zhou thesis | Prevents presentation cleanup from masquerading as geological aging | Retain as guardrail |

## Hydrology, ecology, and civilization

| Technique | Source | World Forge value | Status |
|---|---|---|---|
| Generation controls, targets, validators, and display preferences as distinct roles | Dwarf Fortress | Prevents users from confusing feature creation with rejection criteria | Prototype in world-builder cleanup |
| Machine-readable feature prerequisite graph | Dwarf Fortress | Detects impossible species, biome, river, glacier, resource, and civilization requests before expensive generation | Retain for staged implementation |
| Area and connected-patch counts validated separately | Dwarf Fortress | Distinguishes one huge biome from many ecologically distinct patches | Retain for ecology and civilization |
| Explicit natural, ecology, civilization, and history completion milestones | Dwarf Fortress synthesis | Supports staged hosted jobs and prevents downstream work from running on invalid prerequisites | Retain for hosted architecture |
| Separate natural-generation and history-simulation budgets | Dwarf Fortress | Prevents later civilization aging from hiding its cost inside world size | Retain for civilization roadmap |
| Aggregate ordinary populations and promote consequential individuals to durable history | Dwarf Fortress synthesis | Preserves rich narrative history without full simulation and storage for every actor | Retain for civilization roadmap |
| GPU material-weight maps derived from authoritative biome and substrate facts | Zhou thesis | Supports smooth local rendering while keeping visual packing out of the world schema | Retain for local rendering |
| Jittered-grid or blue-noise vegetation instances derived from ecology | Zhou thesis | Generates stable visible vegetation without persisting every plant | Retain for local rendering |

## Rendering, drilldown, and authoring

| Technique | Source | World Forge value | Status |
|---|---|---|---|
| Height- and slope-aware material blending | Zhou thesis | Makes local terrain visually coherent without redefining biome identity | Retain for local rendering |
| Selective triplanar mapping only on steep terrain | Zhou thesis | Uses expensive texture sampling only where it fixes visible stretching | Retain for local rendering |
| Central-difference normals derived from height patches | Zhou thesis | Improves local lighting and avoids persisting redundant normal data | Retain for local rendering |
| Mipmap pyramids and anisotropic filtering for terrain fields | Zhou thesis | Reduces avoidable drilldown blur, shimmer, and oblique-angle degradation | Prototype in rendering cleanup |
| Broad geometric water motion plus fine shader normal detail | Zhou thesis | Keeps visual water rich without requiring full hydrodynamic simulation | Retain for local rendering |
| GPU-looped rain particles and smooth environment transitions | Zhou thesis | Supports later visual weather without affecting climate facts | Retain for local exploration |
| Scope-matched optimization review before adding LOD infrastructure | Zhou thesis | Prevents implementing fashionable systems that do not accelerate the actual workload | Adopt as architecture gate |
| Structural material properties hidden by derived surface response | Clustered convection | Prevents simulation tessellation from leaking into visible terrain | Reference concept |

## Validation, determinism, and hosted execution

| Technique | Source | World Forge value | Status |
|---|---|---|---|
| Separate seeds and algorithm identities by subsystem | Dwarf Fortress, clustered convection caution | Allows names, history, ecology, and detail to change without rebuilding geology | Prototype soon |
| Human-readable generation manifest with resolved parameters and stage provenance | Dwarf Fortress | Supports exact reproduction, sharing, debugging, and hosted job audits | Retain for runtime cleanup |
| Feasibility preflight before generation | Dwarf Fortress | Avoids endless reject-and-reroll loops on the VPS | Prototype soon |
| Bounded deterministic repair before retry | Dwarf Fortress synthesis | Preserves compute budgets and explains unmet targets | Retain for validation framework |
| Predicted and actual stage-cost reporting | Dwarf Fortress | Makes fidelity and hosted-credit costs understandable | Retain for hosted service |
| CPU-authoritative generation with GPU use limited to presentation or optional experimentation | Clustered convection caution | Avoids driver-dependent authoritative results and unavailable VPS acceleration | Adopt as production guardrail |
| Fixed-capacity structure-of-arrays segment storage with stable integer IDs | Clustered convection synthesis | Avoids pointer invalidation and unbounded object allocation | Reference implementation pattern |
| Temporal persistence as evidence for landform legitimacy | Clustered convection synthesis | Helps distinguish supported narrow tectonic features from final sea-level accidents | Prototype in ribbon diagnostics |
| Mass, crust-age, plate-lifecycle, and mantle-potential diagnostics | Clustered convection | Adds physical accounting gates to tectonic prototypes | Retain for benchmark suite |

## Important implementation patterns to avoid

- GPU-only authoritative tectonic generation for the CPU-hosted service.
- Full moving Voronoi reconstruction at every small production step.
- GPU-to-CPU readback inside the authoritative inner loop.
- Planar square-boundary behavior presented as a spherical solution.
- Random gap insertion or collision ordering without a deterministic contract.
- Raw reject-and-reroll until a world happens to pass constraints.
- Visual weather controls silently changing climate facts.
- Packed RGBA biome textures becoming the authoritative ecology schema.
- Generic smoothing being presented as erosion or geological aging.
- Adding quadtrees, LOD systems, or spatial indexes without a measured workload that needs them.

## Immediate shortlist effect

The top-level optimization order remains mostly stable. The later sources refine several entries:

1. Coarse structural topology with deterministic final projection.
2. Multi-era tectonic cause fields.
3. Add continuous crust thickness, density, thermal age, and buoyancy to the structural model.
4. Add era-boundary plate fracture, creation, merger, and retirement.
5. Age-modulated bounded surface response.
6. Sparse climate-informed glaciation.
7. Derived-field caching and invalidation.
8. Canonical depression-aware drainage and reverse-order accumulation.
9. Active-set incision, creep, and deposition.
10. Compact structural growth with long-persistent-ribbon diagnostics.
11. Typed-array, allocation, CPU-budget, and memory audits.
12. Stage-aware validation and feasibility preflight.

Direct clustered convection remains a reference prototype rather than a production candidate.