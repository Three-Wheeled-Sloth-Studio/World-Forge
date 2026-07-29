# Procedural Generation Review: Clustered Convection for Plate Tectonics

Updated: 2026-07-29

Source examined:

Nick McDonald, *Clustered Convection for Procedural Plate Tectonics*, posted 2020-12-03.

Source repository:

`weigert/SimpleTectonics`

Repository commit reviewed:

`e9d561df86037b3a8812a8f8900514db6b9d4a50`

License: MIT.

## Review goal

Mine useful approaches for World Forge across:

- structural plate representation;
- tectonic lifecycle and deep-time causality;
- crust thickness, density, age, and buoyancy;
- convergent and divergent boundary behavior;
- dynamic plate deformation and fracture;
- performance on a CPU-first hosted service;
- long-persistent-ribbon diagnosis;
- deterministic generation;
- broader technique-catalog additions beyond the immediate optimization shortlist.

## 1. Initial verdict

This is the most physically generative tectonic model reviewed in the current research pass.

Its core contribution is **clustered convection**: represent a nominally continuous lithosphere with a dynamic point cloud whose points carry local physical properties while groups of points move approximately as rigid plates.

This enables:

- nonuniform thickness, density, mass, and buoyant height within one plate;
- plate deformation without reducing a plate to one uniform Voronoi cell;
- crust creation in divergent gaps;
- density-based local subduction;
- transfer and redistribution of mass at convergent boundaries;
- feedback between mantle-like thermal potential and crust behavior;
- dynamic plate disappearance, creation, and potential fracture.

The source is highly valuable as a model and research reference.

It is a poor direct production fit for World Forge's current target because:

- the implementation is planar rather than spherical;
- it relies heavily on GPU-accelerated Voronoi rendering, shaders, atomics, and GPU readback;
- it advances the world through many explicit simulation steps;
- the author states that a non-GPU implementation would be significantly slower;
- the production target is a CPU-only VPS supporting multiple concurrent jobs;
- authoritative determinism across GPU hardware is not established.

Conclusion:

- Do not port clustered convection directly into the hosted generator.
- Preserve it as a high-value reference model and possible offline tectonic laboratory.
- Extract its local crust-property model, plate lifecycle, mantle coupling, and mass-transfer concepts into the coarse multi-era cause-field architecture.

## 2. Source lineage and independence

This source is substantially more independent than the Red Blob-derived family reviewed earlier.

It shares general ingredients with other procedural tectonic systems:

- Voronoi-like ownership;
- plate grouping;
- boundary collision;
- height-field generation.

Its distinctive contributions are:

- a dynamic multi-centroid representation for one plate;
- local properties attached to crust segments;
- plate-scale rigid motion derived from forces on individual segments;
- local crystallization and dissolution;
- density-driven subduction and mass transfer;
- thermal feedback from divergence and convergence;
- adaptive insertion and removal of crust segments.

The model remains explicitly simplified and exploratory. It should not be treated as validated geophysics.

## 3. Product constraints

The implementation targets:

- a fixed planar grid;
- a 256 by 256 label and height domain in the demonstrated configuration;
- C++17 and OpenGL;
- real-time interactive visualization;
- GPU-accelerated Voronoi labeling;
- repeated simulation over approximately one thousand demonstrated cycles;
- terrain generation as an initial condition for later erosion.

World Forge differs in several important ways:

- authoritative topology is spherical;
- production generation is expected to run CPU-only on a VPS;
- multiple jobs may run concurrently;
- runtime and memory must be bounded and predictable;
- deterministic results must survive machines and deployments;
- tectonics must feed hydrology, climate, glaciation, resources, ecology, and later civilization systems;
- output is a persistent world model, not only an animated heightmap.

These differences make architectural extraction more appropriate than direct adaptation.

## 4. Pipeline summary

The demonstrated pipeline is:

1. Poisson-disc sample a point cloud over the domain.
2. Generate a Voronoi-style label map assigning every raster location to a point.
3. Accumulate the represented area of each point on the GPU.
4. Store per-segment mass, thickness, density, buoyant height, position, and velocity.
5. Group segments into plates.
6. Maintain a heat or energetic-potential map representing asthenosphere conditions.
7. Crystallize or dissolve crust locally based on the heat field.
8. Derive plate translation and rotation from heat-gradient forces acting on member segments.
9. Move segments with their plate's approximate rigid-body motion.
10. Remove segments that leave the domain and insert new segments in gaps, creating divergent crust.
11. Detect local collisions between segments from different plates.
12. Subduct the denser segment and transfer mass and thickness to the less-dense segment.
13. Redistribute collision height and mass through a local cascading process.
14. Feed divergence and subduction events back into the heat field through cooling, heating, and diffusion.
15. Convert segment buoyant heights into a smoother raster heightmap through another cascading pass.
16. Select a sea level to classify land and ocean.

This is a tightly coupled dynamical system rather than a sequence of unrelated procedural filters.

## 5. Structural topology

### Dynamic point cloud as a continuous-field approximation

Each point represents the properties of a local region of influence. The raster label map determines that region at each simulation step.

Advantages:

- one plate can contain many independently varying crust segments;
- plates can deform while retaining an approximate rigid-body identity;
- properties move with material rather than remaining fixed to raster cells;
- points can be inserted in low-density gaps;
- points can be removed where material is subducted or leaves the domain;
- the same representation can approximate several continuous fields.

World Forge value:

- supports crust thickness, density, composition, thermal age, buoyancy, and strain as local structural facts;
- avoids treating every plate as internally uniform;
- creates a natural distinction between material identity and the sampling topology used to display it.

### Production concern

The source recomputes a raster Voronoi label map every simulation step. This is fast because it uses GPU rendering and a depth buffer.

A CPU VPS should not reproduce this design literally.

Possible CPU-friendly alternatives for experimentation:

- a fixed coarse spherical graph whose cells carry material ownership;
- moving material particles projected back to the graph only at bounded era checkpoints;
- a graph nearest-owner solve run infrequently rather than every small step;
- centroidal regions with cached adjacency and local incremental updates;
- a small segment count, such as a few thousand, for an offline reference simulation;
- no full-resolution raster label map inside the tectonic loop.

## 6. Tectonics and terrain causes

### Local crust properties instead of binary continental/oceanic labels

Each segment stores:

- mass;
- thickness;
- represented area;
- derived density;
- derived buoyant height.

Cold regions crystallize material more quickly and with different density. Warm regions reduce equilibrium thickness and can dissolve crust.

This allows continental-like and oceanic-like behavior to emerge from thickness, density, age, and buoyancy instead of being assigned solely through a categorical plate type.

World Forge opportunity:

Use continuous structural fields even if categorical crust classes remain convenient:

- crust thickness;
- crust density;
- thermal age;
- composition or buoyancy class;
- submerged thickness;
- exposed elevation contribution;
- deformation and strain;
- melt or volcanic potential.

A categorical `continental`, `oceanic`, or `transitional` label can then be derived from those facts rather than replacing them.

### Mantle or energetic-potential field

The source uses a heat map as a simplified proxy for asthenosphere heat, density, and convective potential.

Its gradient applies local forces to crust segments. Those forces are aggregated into plate acceleration and torque. Plate motion is therefore an outcome of a field rather than an arbitrary random vector.

World Forge opportunity:

- generate a coarse mantle-potential field from planetary heat, age, compositional heterogeneity, and controlled noise;
- use its gradients as one input into plate motion and rift tendency;
- preserve slab pull, ridge push, and gravitational terms separately if later added;
- treat the field as a tectonic cause, not a literal high-fidelity mantle simulation.

This could improve coherence between:

- plate motion;
- rifting;
- volcanism;
- crust production;
- subduction zones;
- long-lived tectonic provinces.

### Rigid-body plate motion from local forces

Forces acting on individual segments contribute to the plate's net translation and torque. The plate then moves its segments approximately as a rigid body.

This is an elegant compromise:

- local fields influence motion;
- plates retain coherent movement;
- internally varying material properties are preserved;
- torque emerges from off-center forcing.

World Forge should retain the concept while using proper spherical rotation:

- represent plate motion with an Euler pole and angular velocity;
- estimate force and torque from coarse member cells or boundary causes;
- update motion only at bounded era checkpoints;
- avoid small explicit motion steps unless a prototype proves they are necessary.

### Divergence as material creation

When moving segments leave gaps, new points are inserted. Those points crystallize into new lithosphere.

This is a strong conceptual improvement over merely lowering elevation at a divergent boundary.

World Forge opportunity:

- create new oceanic crust age bands at active spreading boundaries;
- assign young thermal age and low sediment cover;
- move older oceanic crust away from the ridge through era transitions;
- feed crust age into bathymetry, density, resources, and subduction likelihood.

The production generator does not need to insert literal moving points every frame to preserve this result.

### Density-based subduction and mass transfer

When two segments collide, the denser segment is removed beneath the less-dense segment. Some mass and thickness are transferred to the overriding segment, followed by local redistribution.

Useful World Forge concepts:

- subduction choice should depend on density, age, thickness, buoyancy, and relative motion;
- convergent boundaries should conserve or account for material approximately;
- collision creates uplift, crust thickening, metamorphism, melt, and sediment response rather than only adding arbitrary elevation;
- subducted material can feed mantle heat and volcanic potential;
- local redistribution can broaden a mountain belt beyond the exact boundary cell.

The source transfer formula is intentionally simple. Borrow the accounting concepts, not the constants.

### Coupled thermal feedback

Divergent gaps cool the mantle field while subduction events add heat, followed by diffusion.

This closes a feedback loop:

`mantle potential -> plate motion and crust growth -> divergence/subduction -> mantle potential`

World Forge opportunity:

- preserve a bounded, coarse feedback loop across tectonic eras;
- use it to create persistent spreading provinces, migrating subduction systems, and hotspot or melt tendencies;
- stop after a small number of structural epochs rather than running indefinite transient dynamics.

### Plate fracture and lifecycle

The source does not currently fracture plates, but proposes splitting where crust is thin or low-density and convective forces are strong.

This is a useful missing feature for World Forge:

- plate birth;
- rift-driven fracture;
- microplate creation;
- plate merger;
- complete subduction and death;
- reorganization between tectonic eras.

A production approximation could evaluate fracture only at era boundaries using:

- tensile strain;
- crust thickness;
- thermal weakness;
- inherited faults;
- mantle upwelling;
- plate size and aspect ratio;
- long-persistent-ribbon or neck diagnostics.

## 7. Deep time and erosion

The source runs explicit tectonic cycles and demonstrates terrain after approximately one thousand steps.

This provides real temporal evolution:

- crust creation;
- crust growth and dissolution;
- plate motion;
- collision;
- subduction;
- heat feedback;
- changing elevation.

However, the author notes that erosion is not naturally interleaved because the heightmap is regenerated from segment heights each tectonic step. Erosion is more naturally applied after a sufficient number of tectonic cycles.

World Forge implications:

- the model does not solve our expensive combined deep-time aging loop directly;
- it reinforces separating tectonic structural history from final surface response;
- tectonics can produce a structural initial condition and age/cause fields;
- erosion, hydrology, climate, and glaciation can respond in bounded later stages;
- selected large erosion feedbacks may be summarized between coarse tectonic eras instead of simulated every step.

### Recommended extraction

Use a few coarse structural eras rather than one thousand small steps:

1. initialize mantle potential and crust segments;
2. solve a bounded plate-motion and lifecycle update;
3. accumulate divergence, convergence, subduction, strain, and crust-age fields;
4. optionally update the mantle-potential field;
5. repeat for a small number of eras;
6. project final cause and age fields to the authoritative topology;
7. run bounded erosion and climate response.

Clustered convection is evidence that richer tectonic histories can emerge from local material facts. It is not evidence that World Forge must run a thousand explicit production steps.

## 8. Hydrology

No hydrology system is present.

The source suggests choosing sea level directly or deriving it after a later hydrology simulation, but it does not provide:

- drainage routing;
- rivers;
- lakes;
- basin storage;
- sediment transport;
- coastline evolution.

The hydrology shortlist remains unchanged.

## 9. Glaciation

No glacial system is present.

There is no ice accumulation, routing, erosion, deposition, advance, or retreat.

The glaciation shortlist remains unchanged.

## 10. Climate and ocean circulation

The heat map is an asthenosphere or energetic-potential field, not surface climate.

There is no atmospheric or ocean circulation model.

The source does suggest that the clustered-convection representation could be reused artistically for clouds, weather, water, smoke, or fire, but this is a broader procedural-animation concept rather than a planetary climate algorithm.

## 11. Ecology, resources, and civilization

No ecology or civilization systems are present.

The tectonic fields would nevertheless be useful downstream:

- crust age and type for mineral resources;
- subduction and volcanism for ore provinces;
- uplift and rifting for relief and drainage;
- thermal provinces for volcanism and geothermal activity;
- plate lifecycle for long-term continental connectivity;
- tectonic scars and terranes for regional identity and naming.

## 12. Rendering and drilldown

The source renders a smooth heightmap derived from coarse segment properties through a cascading filter.

Useful principle:

- structural material properties can remain coarse;
- a derived surface response can hide segment boundaries;
- visible terrain does not need to expose the simulation tessellation.

World Forge already has stronger candidates for local drilldown rendering, but this reinforces the separation between structural facts and display geometry.

## 13. Performance and memory

### Why it is fast in the source

The source uses:

- GPU-instanced Voronoi rendering;
- depth-buffer labeling;
- shader storage buffers;
- atomic area accumulation;
- shader diffusion;
- shader subduction feedback;
- shader height cascading;
- parallel raster processing.

The author explicitly states that the same concept is possible without GPU programming but would be significantly slower.

### Why a direct port is a poor VPS fit

A CPU-only implementation would need to replace:

- repeated raster Voronoi reconstruction;
- GPU area accumulation;
- texture-based nearest-owner lookup;
- repeated diffusion passes;
- raster collision-ring sampling;
- GPU height cascading;
- frequent CPU/GPU readback.

Running several concurrent worlds would multiply those costs.

### Potential CPU-friendly research implementation

A bounded tectonic laboratory could use:

- 2,000 to 8,000 coarse spherical segments;
- fixed-capacity typed arrays;
- compact nearest-neighbor graph adjacency;
- a deterministic segment pool with free-list reuse;
- local density and collision checks on graph neighbors;
- multi-source graph propagation for crust ownership and cause fields;
- a few era-scale motion updates;
- no high-resolution raster inside the structural loop;
- no persisted transient point positions unless required for diagnosis.

This prototype should be treated as a calibration and discovery tool. Production should likely use its outputs to inform a cheaper coarse cause-field model.

### Data-layout lessons

The source identifies pointer invalidation and reference reassignment after vector growth as a major flaw.

World Forge should use:

- stable integer segment IDs;
- structure-of-arrays storage;
- fixed or chunked capacity;
- explicit alive flags and free lists;
- no pointers into movable vectors;
- deterministic compaction only at controlled checkpoints;
- no object allocation in inner simulation loops.

## 14. Determinism

The repository accepts a seed, but the source does not establish a durable cross-platform deterministic contract.

Potential risks:

- GPU floating-point differences;
- atomic operation ordering;
- shader behavior across drivers;
- dynamic point insertion order;
- random scanning for gap placement;
- mutable vector order after removal;
- hardware-dependent convergence.

World Forge requirements:

- authoritative generation must remain CPU-deterministic across supported deployments;
- all tie-breaking must be explicit;
- segment insertion, collision, and removal ordering must be stable;
- fixed-point or carefully bounded floating-point math may be needed for a reference prototype;
- GPU execution may be used for presentation or optional experimentation, not as the only authoritative path.

## 15. Land-ribbon and morphology behavior

This source contributes useful indirect mechanisms but no explicit ribbon diagnostic.

Potentially helpful behavior:

- plates can deform rather than remaining frozen seeded regions;
- divergence creates new material;
- convergence destroys or thickens material;
- complete subduction can remove narrow extensions;
- future fracture could split weak necks;
- land emerges from buoyancy and sea level rather than direct continent painting;
- temporal persistence provides evidence about whether a feature is structurally supported.

Potential problems:

- long narrow uplift scars may still emerge along plate interactions;
- sea-level choice can convert marginal buoyant ridges into continuous land;
- the planar boundary can create artifacts;
- there is no local-width or circumference-relative quality check;
- transform boundaries are not modeled explicitly;
- the absence of erosion during tectonic cycling can leave unrealistic narrow elevated scars.

### New diagnostic signal: temporal support

A useful addition to World Forge's ribbon classifier is **geological persistence and cause continuity**.

For a narrow feature, record:

- how many tectonic eras it persists;
- whether it migrates coherently with one crustal structure;
- whether its uplift is continuously supported by convergence, rifting, volcanism, or hotspot activity;
- whether it is a final sea-level accident over a weak submerged ridge;
- whether fracture, subduction, and erosion should have broken it.

A short or geologically persistent narrow feature can be retained.

A feature spanning a large fraction of the planet, remaining continuously narrow, and lacking persistent structural support should be flagged, fragmented, submerged locally, or widened according to its cause.

## 16. Quality metrics and tuning

A clustered-convection or derived tectonic prototype should report:

- plate count and area distribution over time;
- segment count and represented-area distribution;
- unassigned or multiply represented surface area;
- crust thickness, density, age, and buoyancy distributions;
- continental-like versus oceanic-like area by derived class;
- divergence-created versus subducted crust balance;
- approximate mass conservation;
- mantle-potential range and residual change;
- plate translation and angular velocity distributions;
- collision and subduction event rates;
- boundary-length distribution;
- fracture and merger rates;
- land fraction sensitivity to sea level;
- mountain-belt continuity;
- long-ribbon length, width, persistence, and structural support;
- runtime and memory per era;
- deterministic state signatures after each era.

## 17. File-format implications

No recommended technique requires an immediate saved-world format change.

The following can remain internal derived state during experimentation:

- segment positions;
- mantle-potential fields;
- transient plate forces;
- collision queues;
- temporary Voronoi or owner maps;
- per-era scratch state.

Potential durable outputs can be written into existing or versioned structural fields when product value is demonstrated:

- crust age;
- crust thickness;
- crust density or buoyancy class;
- plate identity;
- plate motion;
- deformation age;
- convergence, divergence, and subduction exposure;
- volcanic and thermal potential.

Compatibility should remain the strong default. A persisted schema change should require a demonstrated downstream need.

## 18. License boundary

The source repository is MIT licensed.

Direct adaptation would still require retaining the applicable copyright and license notice.

The current recommendation remains technique extraction rather than source transplantation.

## 19. Immediate prototype candidates

### Candidate T1: Segment-property tectonic reference laboratory

Status: **Reference prototype, not production candidate yet**.

Build a small CPU-deterministic spherical model with:

- a few thousand structural segments;
- mass, thickness, density, age, and buoyancy;
- a coarse mantle-potential field;
- bounded plate translation and rotation;
- divergence-created crust;
- density-based subduction;
- approximate mass accounting;
- era-level fracture and merger.

Purpose:

- discover which dynamic relationships materially improve visible and downstream quality;
- generate reference distributions and cause fields;
- calibrate a cheaper production approximation;
- test whether explicit plate lifecycle reduces structural artifacts.

This prototype should have a strict runtime ceiling and should not replace the current generator until it beats quality and performance gates.

### Candidate T2: Production extraction into multi-era cause fields

Status: **Prototype soon within the existing coarse-structure experiment**.

Add continuous fields to the coarse structural model:

- crust thickness;
- density or buoyancy;
- thermal age;
- deformation age;
- spreading exposure;
- subduction exposure;
- mantle or melt potential.

Use a few deterministic era transitions rather than continuously moving a Voronoi cloud.

This captures most of the downstream value at much lower cost.

### Candidate T3: Era-boundary fracture and renewal

Status: **Retain for the structural prototype**.

At selected era boundaries:

- identify thin, hot, strained, or overlong plate necks;
- split plates deterministically where fracture support is strongest;
- create microplates only where warranted;
- merge or retire plates after complete subduction;
- regenerate spreading crust at divergent boundaries.

Measure plate quality, ribbon incidence, mountain continuity, and runtime.

## 20. Broader technique-catalog additions

Additions from this source:

- dynamic point-cloud approximation of continuous material fields;
- multiple local property samples per plate;
- adaptive insertion and removal of material samples;
- emergent continental and oceanic behavior from thickness, density, age, and buoyancy;
- mantle-potential-driven plate force and torque;
- local crust crystallization and dissolution;
- divergent creation of young crust;
- density-based subduction;
- approximate material transfer and conservation at convergence;
- mantle feedback from divergence and subduction;
- explicit plate lifecycle: birth, fracture, merger, subduction, and death;
- temporal persistence as evidence for landform legitimacy;
- a high-fidelity reference simulator used to calibrate a cheaper production generator;
- clustered convection as a possible artistic motion system for non-authoritative clouds, smoke, water, or weather.

## 21. Approaches to avoid

Do not reproduce directly:

- GPU-only authoritative generation for the hosted service;
- a planar square domain with boundary deletion;
- full raster Voronoi reconstruction at every small production step;
- frequent GPU-to-CPU readback;
- random gap insertion without deterministic ordering;
- pointer-based segments referencing movable vector storage;
- ring-scan collision detection when direct neighborhood data is available;
- transform boundaries treated only as mixed micro-convergence and divergence;
- one thousand production steps without convergence or cost justification;
- terrain smoothing that hides failed mass or boundary accounting;
- final sea-level selection without landform morphology validation.

## 22. Instrumentation hypotheses

If a segment-property or multi-era prototype is built, instrument:

- time per era and substage;
- number of active segments;
- insertion, deletion, collision, subduction, fracture, and merger counts;
- graph-neighbor visits per event;
- ownership or nearest-owner reconstruction time;
- force and torque solve time;
- crust-property update time;
- mass-balance residual;
- mantle-potential residual;
- percentage of structural cells materially changed per era;
- cause-field sparsity;
- projected final-topology update cost;
- deterministic signatures per era;
- long-ribbon persistence and support metrics;
- quality gain relative to the simpler multi-era cause-field model.

## Comparative position after the research pass

This source is strongest for:

- dynamic plate lifecycle;
- nonuniform material properties within plates;
- emergent crust classes;
- mantle-crust feedback;
- explicit divergence and subduction material accounting.

World Orogen remains stronger for:

- a directly usable coarse-to-fine production architecture;
- bounded sparse glacial response;
- compact structural growth;
- automated quality tuning.

World-Synth remains stronger for:

- CPU/browser-oriented compact plate growth;
- boundary pressure and shear chains;
- global facts plus on-demand local terrain;
- spherical feature indexing.

Red Blob and mewo2 remain stronger for:

- canonical drainage and bounded fluvial response.

## Bottom line

Clustered convection should not become the next production implementation.

It should change the production model in two ways:

1. stop treating crust as only plate membership plus elevation, and add continuous thickness, density, age, and buoyancy causes;
2. allow plates to be born, fracture, merge, create new crust, and die across a small number of structural eras.

The best practical strategy is:

`high-fidelity clustered-convection concepts -> small deterministic reference laboratory -> calibrated coarse multi-era production model -> bounded surface response`

That preserves the interesting physics while respecting the CPU-only hosted target.