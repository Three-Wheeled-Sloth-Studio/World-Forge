# Procedural Generation Review: Dwarf Fortress Advanced World Generation

Updated: 2026-07-29

Source examined:

`https://dwarffortresswiki.org/index.php/DF2014:Advanced_world_generation`

Source type: community-maintained parameter reference for the older DF2014 world generator, not engine source code or a formal algorithm paper.

## Review goal

Mine useful approaches for World Forge across:

- generator controls and presets;
- deterministic reproduction;
- quality gates and validation;
- performance budgeting;
- erosion and terrain-stage controls;
- biome and region requirements;
- author editing and world painting;
- later ecology, civilization, and historical simulation;
- hosted generation behavior;
- broader product design beyond the immediate slow-phase shortlist.

## 1. Initial verdict

This source is useful, but not as an algorithm source.

The wiki describes exposed controls and observed behavior rather than the internal implementation. It offers little reliable detail about:

- tectonic construction;
- crust physics;
- glaciation;
- exact erosion equations;
- hydrology algorithms;
- data structures;
- asymptotic performance.

Its strongest contribution is a mature world-generation control and validation model:

1. separate random streams for geography, history, names, and creatures;
2. shareable named parameter sets;
3. scalar field controls with ranges, directional variance, and weighted coarse meshes;
4. separate generation controls and rejection criteria;
5. initial and final validation checkpoints around transformative stages such as erosion;
6. explicit feature prerequisites;
7. stop conditions and budgets for historical simulation;
8. exported generation parameters for reproduction;
9. world painting layered over procedural generation;
10. strong examples of how contradictory constraints create endless rejection loops.

This does not change the immediate tectonic or glaciation shortlist. It adds several important product, validation, and future simulation techniques to the broader catalog.

## 2. Source lineage and reliability

The page is explicitly about an older version of Dwarf Fortress. It combines documented tokens, player experimentation, warnings, bugs, and some uncertain observations.

Use it as evidence for:

- exposed product concepts;
- parameter interactions;
- workflow strengths and failures;
- useful validation patterns;
- practical user experience lessons.

Do not treat it as authoritative evidence for hidden algorithms or exact physical models.

## 3. Product constraints

Dwarf Fortress world generation must produce a world that supports:

- terrain and climate variety;
- rivers, lakes, oceans, mountains, volcanoes, and caverns;
- biome and creature requirements;
- civilization placement;
- historical simulation;
- playable embark locations;
- later persistent gameplay and legends data.

This differs from generators focused only on a visually plausible height field. World validity depends on downstream simulation needs.

That makes the source especially relevant to World Forge's longer path from natural systems into species, civilizations, stories, and game converters.

## 4. Pipeline summary

The visible world-generation phases include:

1. elevation preparation;
2. temperature assignment;
3. river processing and erosion;
4. lakes and minerals;
5. vegetation;
6. terrain verification;
7. wildlife;
8. civilization and site placement;
9. creatures and special features;
10. prehistory and historical simulation;
11. finalization of materials, art, uniforms, and sites.

The precise order is acknowledged as approximate, but the exposed sequence reinforces the need for stage contracts and downstream dependency boundaries.

World Forge opportunity:

- publish explicit natural-system completion milestones;
- validate stage outputs before expensive downstream simulation;
- distinguish terrain-ready, ecology-ready, civilization-ready, and history-ready states;
- preserve stage provenance and algorithm versions.

## 5. Structural topology and control fields

### Coarse weighted control meshes

Dwarf Fortress exposes coarse meshes for terrain characteristics such as:

- elevation;
- rainfall;
- temperature;
- drainage;
- volcanism;
- savagery.

The documented conceptual process is:

1. create a coarse grid;
2. assign random control-point values according to weighted ranges;
3. smooth between the control points;
4. add variance or noise.

This is not a physical world model, but it is a strong author-control pattern.

World Forge opportunity:

- expose coarse authoring fields separately from causal simulation;
- allow presets to bias broad distributions without forbidding rare values;
- use weighted distributions rather than only hard minimum and maximum clamps;
- let broad control fields influence tectonic, climate, or ecology parameters before generation;
- make the control scale explicit in physical or world-relative units.

Potential controls:

- continentality tendency;
- ocean coverage tendency;
- relief distribution;
- volcanic activity distribution;
- climate wetness tendency;
- biome diversity tendency;
- civilization habitability tendency.

The authoritative system should remain causal. These fields bias inputs or response, not replace tectonics and climate with interpolated noise.

### Directional variance

Separate X and Y variance controls can produce directional bands or patchwork.

World Forge opportunity:

- expose anisotropic correlation length rather than projection-axis-specific X/Y noise;
- align directional structure to latitude, prevailing winds, plate motion, mountain belts, or authored world-space axes;
- distinguish physical anisotropy from map-projection artifacts.

## 6. Tectonics and terrain causes

The page does not reveal a tectonic model.

Elevation, volcanism, drainage, and related properties are treated as generated scalar characteristics with downstream feature requirements. This is too weak for World Forge's physical goals.

Useful authoring idea:

- controls specify desired distributions and feasibility ranges;
- later feature placement consumes those fields;
- requirements check whether enough suitable terrain exists.

World Forge should retain stronger causal fields while using the same separation between:

- generative inputs;
- derived terrain facts;
- feature prerequisites;
- quality validation.

## 7. Deep time and erosion

### Erosion budget as an exposed fidelity control

Dwarf Fortress exposes an erosion cycle count. Increasing it reportedly:

- reduces jagged peaks;
- widens major rivers;
- can dissolve mountains into plains;
- can make later requirements impossible.

The internal algorithm is not described, so there is no erosion method to adopt.

The valuable idea is an explicit process budget with visible tradeoffs.

World Forge opportunity:

- expose named fidelity or process-response levels rather than raw loop counts by default;
- report predicted and actual runtime cost;
- show affected outputs such as relief, river width, drainage stability, and mountain retention;
- allow advanced users to inspect raw budgets;
- enforce stop criteria based on residual terrain change rather than blindly executing a fixed maximum.

### Initial and final validation around erosion

The generator can require biome square counts and contiguous-region counts both before and after erosion.

This is a very useful validation architecture.

World Forge opportunity:

- calculate pre-aging and post-aging metrics;
- detect when erosion destroys required mountain, glacier, wetland, or riverhead structure;
- compare connected-region counts before and after transformative stages;
- attribute a failed quality gate to the stage that caused it;
- avoid discovering at civilization placement that erosion erased all suitable origins.

Potential stage-delta gates:

- mountain-core retention;
- riverhead retention;
- coastline and island-component changes;
- biome patch fragmentation;
- glacier and tundra area;
- long-ribbon creation or removal;
- endorheic basin retention;
- continental shelf continuity;
- resource-host geology retention.

## 8. Hydrology

### River requirements are validators, not generators

The advanced parameters distinguish desired or minimum river starts from the terrain and rainfall conditions that actually allow rivers to form.

Raising the requirement does not create riverheads. It causes worlds without enough riverheads to be rejected.

This is an important UI and architecture lesson.

World Forge should label controls by role:

- **generation control**: changes the causal process;
- **target**: guides optimization or repair;
- **validation rule**: accepts, warns, or rejects;
- **display preference**: changes presentation only.

Users should not be forced to guess whether a number changes the algorithm or merely throws away its output.

### Riverhead pre/post checks

The page exposes minimum riverhead counts before and after erosion.

World Forge opportunity:

- track source count, source quality, and source distribution before and after terrain response;
- validate that river systems remain geographically distributed rather than merely meeting a global count;
- avoid forcing artificial river starts solely to satisfy a count;
- use transparent repair or parameter guidance when the target is infeasible.

## 9. Glaciation

The page treats glaciers as biome outcomes determined by combinations of elevation, temperature, and drainage. It does not describe ice accumulation, flow, erosion, deposition, advance, or retreat.

No glaciation algorithm is added to the shortlist.

Useful validation idea:

- presets can require a minimum amount and number of contiguous glacier regions;
- those requirements can be checked before and after terrain transformation.

World Forge should use its actual climate and glaciation facts for those checks.

## 10. Climate and ocean circulation

### Factorized biome inputs

Biomes emerge from combinations of independently generated characteristics such as:

- elevation;
- rainfall;
- temperature;
- drainage.

This is substantially simpler than World Forge's intended ecology, but the factorization is useful.

World Forge should preserve separate climate, water, terrain, soil, and ecology facts rather than directly painting a biome label.

### Optional orographic precipitation

Dwarf Fortress exposes orographic precipitation and rain shadows as a switch. The wiki notes that enabling it can move rainfall outside the nominal base ranges and create more extreme regional climate.

World Forge opportunity:

- treat base climate controls as priors, not guaranteed final values;
- report when terrain-driven processes move outcomes outside requested base ranges;
- distinguish raw forcing ranges from final realized climate ranges;
- allow simplified climate modes while making the quality difference visible.

The source does not reveal a transport algorithm and therefore adds no direct climate performance technique.

## 11. Ecology, resources, and civilization

### Explicit prerequisite graph

The page repeatedly documents dependencies such as:

- some civilizations require certain biomes;
- dwarves require mountains;
- kobolds require caves;
- rivers require suitable terrain and rainfall;
- mountain peaks require sufficiently high elevation;
- volcanoes require sufficiently high volcanism;
- changing one terrain range may make another requested outcome impossible.

This implies a prerequisite graph across generation systems.

World Forge opportunity:

- formalize feature prerequisites as machine-readable constraints;
- preflight presets before generation;
- explain which requested outcomes conflict;
- suggest the smallest parameter adjustment that restores feasibility;
- validate downstream support before running expensive civilization or history jobs.

Examples:

- requested species versus required biome and climate support;
- civilization archetypes versus resource, terrain, and navigability support;
- volcano count versus active-margin and hotspot support;
- river density versus precipitation, relief, and basin structure;
- glacier coverage versus temperature, elevation, and accumulation zones.

### Initial and final contiguous region counts

The generator can require both a number of biome squares and a number of distinct contiguous regions.

This distinction is important. One huge forest and twelve separate forests may cover the same area but create very different ecological and civilization opportunities.

World Forge opportunity:

- validate both area and topology;
- track patch count, size distribution, isolation, and adjacency;
- use these metrics for species dispersal, civilization placement, trade, naming, and macro-region formation.

### History budgets dominate cost

The wiki notes that world size is not the sole driver of generation time; historical duration and event volume can dominate. Population caps, site caps, civilization count, and historical-figure retention materially affect runtime and memory.

This is highly relevant to the future civilization simulator.

World Forge opportunity:

- separate natural generation cost from history-simulation cost;
- expose history duration, population detail, site count, and event-retention budgets;
- offer fidelity tiers for historical simulation;
- use aggregate populations for unimportant actors;
- promote individuals to durable historical figures only when they become narratively relevant;
- report projected job cost before running long history simulations.

### Cull unimportant history as a fidelity tradeoff

Dwarf Fortress exposes culling of unimportant historical figures, trading detailed legends against memory and save/load performance.

World Forge opportunity:

- retain full detail for named or consequential figures;
- aggregate low-impact lives and events;
- preserve reproducible summaries and counts;
- allow later expansion only when sufficient causal data exists;
- make history-retention fidelity an explicit author or tier choice.

## 12. Rendering and drilldown

This page contributes little to rendering algorithms.

The useful product lesson is that world facts are inspected through several scales:

- world map;
- biome and subregion overlays;
- local embark area;
- underground layers;
- legends and historical views.

World Forge should maintain scale-specific presentations over shared authoritative facts, not one overloaded map layer.

## 13. Performance and memory

### Reject-and-reroll is dangerous for hosted generation

Dwarf Fortress uses numerous rejection criteria. Contradictory or overly strict settings can cause endless rejection and rerandomization.

This is an important anti-pattern for World Forge's VPS target.

Do not silently burn CPU until a random world passes.

Preferred World Forge behavior:

1. preflight obvious infeasibility;
2. generate once from deterministic inputs;
3. calculate quality and requirement metrics;
4. apply bounded deterministic repair where appropriate;
5. explain unmet requirements;
6. optionally run a user-approved bounded retry with a derived seed;
7. stop at a declared retry and cost limit.

The user should see why a world failed and what changing a control would do.

### Stage budgets and stop conditions

Dwarf Fortress exposes:

- history end year;
- population and site caps;
- creature and civilization counts;
- event-based early history stoppage;
- erosion cycle count;
- regional complexity limits.

World Forge opportunity:

- represent expensive stages with explicit budgets;
- allow stop conditions based on convergence, story state, extinction, saturation, or target year;
- separate quality thresholds from compute budgets;
- estimate cost before queue submission;
- make hosted tier limits understandable rather than arbitrary.

### Complexity caps

The maximum subregion count limits biome fragmentation. A highly variable world may exceed the cap and be rejected.

World Forge opportunity:

- measure region-complexity growth;
- use soft warnings for excessive fragmentation;
- cap derived rendering or naming complexity without deleting authoritative ecology;
- distinguish simulation complexity, UI complexity, and export complexity;
- avoid a single hard cap serving unrelated purposes.

## 14. Determinism and reproducibility

### Separate seeds by subsystem

The generator exposes separate seeds for:

- world geography;
- history;
- names;
- creatures.

This is a strong pattern already supported by the prior research.

World Forge should maintain independent versioned streams for:

- topology and tectonics;
- terrain response;
- climate;
- hydrology;
- ecology;
- resources;
- species;
- civilizations;
- names and languages;
- history and story events;
- local detail and rendering instances.

Changing a name seed should not rebuild tectonics.

### Export exact generation parameters

Dwarf Fortress stores named parameter sets in text and can export the parameters used for an existing world.

World Forge opportunity:

- export a human-readable generation manifest;
- include algorithm versions, seeds, resolved presets, derived defaults, and fidelity settings;
- allow users to share and clone parameter packs;
- separate the manifest from the larger saved world payload;
- support reproducibility even if the application UI changes.

This reinforces the current bias against arbitrary saved-format changes while allowing a stable, explicit generation contract.

### Parameter sensitivity and dependency identity

The wiki warns that changing terrain-related tokens while keeping seeds can produce a different world, while some history or gameplay controls may not change geography.

World Forge should make dependency boundaries explicit:

- identify which parameters invalidate each generation node;
- calculate node cache keys from only relevant inputs;
- show users whether a control will regenerate geography, climate, ecology, civilization, history, or presentation.

## 15. Land-ribbon and morphology behavior

The page does not discuss long planetary land ribbons.

It does contribute useful adjacent metrics:

- initial and final contiguous-region counts;
- maximum subregion count;
- terrain variance and patchwork behavior;
- ocean-edge requirements;
- minimum mountain and riverhead counts;
- erosion effects on region survival.

World Forge's refined ribbon diagnostic remains unchanged. These metrics can supplement it by showing whether a repair:

- breaks one implausible corridor into a plausible archipelago;
- destroys too many legitimate contiguous regions;
- causes excessive biome fragmentation;
- changes ocean connectivity;
- erases required terrain cores.

## 16. Quality metrics and tuning

### Generation controls versus acceptance contracts

The strongest product pattern in the source is the distinction between:

- controls that shape generated fields;
- weighted distributions that bias outcomes;
- feature-placement settings;
- rejection checks that only accept or reject results.

World Forge should formalize these categories in both schema and UI.

Proposed control metadata:

- `role: generator | target | validator | presentation`;
- affected generation nodes;
- expected runtime impact;
- hard or soft behavior;
- feasibility dependencies;
- default and advanced visibility;
- whether automatic repair is allowed;
- whether the control changes saved world facts.

### Feasibility preflight

Before generation, evaluate obvious contradictions such as:

- requested oceans with elevation ranges that cannot create ocean;
- requested mountain civilization origins without mountain-supporting terrain;
- requested glaciers without freezing climate;
- requested rivers without sufficient rainfall or relief;
- required region counts exceeding available cells;
- complexity limits lower than required diversity.

Not every outcome can be proven feasible in advance, but obvious impossibilities should not reach the expensive pipeline.

### Stage-aware quality gates

Record metrics at meaningful checkpoints:

- structural topology complete;
- base terrain complete;
- deep-time response complete;
- hydrology complete;
- climate complete;
- ecology complete;
- civilization prerequisites complete;
- history complete.

A failed gate should identify which stage introduced the regression.

## 17. File-format implications

The useful concepts do not require breaking the current world format.

Potential additions can remain separate or derived:

- generation manifest;
- preset definition;
- validation report;
- performance report;
- prerequisite graph;
- stage metrics;
- retry and repair provenance.

Only fields that become authoritative product facts should be considered for persistence in the world schema.

## 18. License and provenance boundary

The reviewed page is community wiki documentation about Dwarf Fortress parameters and observed behavior. It is not a reusable source-code package.

Extract product and architectural ideas. Do not copy proprietary Dwarf Fortress implementation code or assume undocumented algorithms.

Any copied wiki text would need to comply with the wiki's content license. This review paraphrases concepts and observations.

## 19. Immediate prototype candidates

This source does not replace the existing structural, deep-time, glaciation, or hydrology prototypes.

It adds two near-term supporting prototypes:

### Prototype G: Parameter-role and invalidation metadata

For existing world-builder controls, record:

- generator, target, validator, or presentation role;
- affected graph nodes;
- expected runtime impact;
- hard versus soft behavior;
- invalidation and cache identity;
- feasibility prerequisites.

This directly supports the world-builder cleanup.

### Prototype H: Stage-aware validation and feasibility preflight

Implement a small initial set:

- requested and achieved land coverage;
- mountain-core retention before and after aging;
- riverhead count before and after aging;
- glacier-support feasibility;
- requested biome-area feasibility;
- long-ribbon diagnostics;
- obvious contradictory-control detection.

Do not reject and reroll automatically. Return diagnostics and bounded repair options.

## 20. Broader technique-catalog additions

Additions from this source:

- weighted coarse control meshes for author bias;
- anisotropic broad-field variance controls;
- named shareable parameter packs;
- exported generation manifests;
- separate generator, target, validator, and presentation controls;
- pre- and post-transform validation checkpoints;
- biome area versus contiguous-region requirements;
- machine-readable prerequisite graphs;
- feasibility preflight for contradictory settings;
- bounded deterministic repair before retry;
- explicit retry and compute budgets;
- history fidelity controls;
- aggregate versus durable historical figures;
- population, site, event, and duration budgets;
- event-based simulation stop conditions;
- stage-aware failure attribution;
- complexity caps separated by simulation, presentation, and export concern;
- world painting combined with relaxed or repairable constraints.

## 21. Approaches to avoid

Do not reproduce:

- indefinite reject-and-reroll loops;
- hidden validation-only controls presented as if they generate features;
- impossible parameter combinations discovered only after expensive generation;
- one global seed stream for unrelated systems;
- raw process iteration counts as the only fidelity interface;
- one hard subregion cap serving simulation, UI, and export simultaneously;
- history simulation that creates every individual and event at full fidelity by default;
- author painting that is invalidated by opaque constraints without actionable explanation.

## 22. Instrumentation hypotheses

Future World Forge instrumentation should include:

- number and cost of retries;
- quality-gate pass/fail by stage;
- preflight contradictions detected;
- automatic repairs attempted and accepted;
- requested versus achieved feature counts;
- pre- and post-aging connected-region counts;
- riverhead and mountain-core retention;
- stage invalidation caused by each changed control;
- cache hit rate after non-geographic parameter edits;
- history events, durable figures, aggregate populations, and sites by simulated year;
- memory cost by retained history detail;
- predicted versus actual stage runtime.

## Bottom line

Dwarf Fortress's advanced world-generation documentation is not a useful source for modern tectonic or erosion algorithms.

It is a very useful source for the surrounding system:

- make generation controls explicit;
- separate them from acceptance rules;
- validate before and after destructive stages;
- model downstream prerequisites;
- export exact generation manifests;
- budget history independently from geography;
- never let a hosted generator silently reroll forever because the user asked for an impossible world.
