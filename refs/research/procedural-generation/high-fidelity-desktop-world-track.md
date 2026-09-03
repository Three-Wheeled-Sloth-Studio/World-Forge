---
type: "Research Reference"
title: "High-Fidelity Desktop World Track"
tags:
- world-forge
- research
---
# High-Fidelity Desktop World Track

Updated: 2026-07-29

Status: preserved future track, not part of the first production optimization PI

## Purpose

Preserve the more computationally involved procedural-generation approaches found during the research pass for either:

- a premium desktop-only generation mode inside Parchment Worlds;
- an optional developer or laboratory mode;
- a later dedicated high-fidelity world-simulation product.

These ideas are not useless merely because the first hosted service is CPU-first. The product family is expected to support both VPS generation and desktop execution, and desktop hardware can support longer jobs, larger memory budgets, optional GPU compute, resumable simulation, and specialist controls.

## Product split

### Production hosted generator

Primary constraints:

- CPU-authoritative Linux VPS execution;
- bounded runtime and memory;
- multiple concurrent queued jobs;
- deterministic output under a versioned algorithm;
- predictable cost;
- no dependence on a particular GPU or graphics driver;
- staged completion and graceful degradation;
- strong bias against saved-format breakage.

### High-fidelity desktop or laboratory generator

Permitted constraints:

- longer generation times;
- explicit user-selected compute budgets;
- local checkpointing and resume;
- larger memory footprint;
- optional GPU compute or native acceleration;
- richer intermediate diagnostics;
- many more tectonic or climate epochs;
- interactive simulation playback;
- high-resolution local refinement;
- experimental algorithms that are not yet suitable for shared hosted execution.

The two tracks should share semantic outputs where practical, but they do not need to share the same internal solver.

## Integration principle

Use a common generation contract with interchangeable providers.

Conceptual shape:

```text
resolved world specification
          |
          +-- hosted bounded provider
          |
          +-- desktop high-fidelity provider
          |
          +-- research/reference provider
                    |
                    v
       normalized authoritative world facts
```

Shared output concepts should include, where available:

- topology identity and projection metadata;
- plate and crust ownership;
- crust thickness, density, age, buoyancy, and composition;
- tectonic boundary type, pressure, shear, and orientation;
- uplift, subsidence, rift, subduction, volcanism, and strain fields;
- elevation and bathymetry;
- hydrology, climate, glaciation, resources, and ecology outputs;
- stage provenance and algorithm identities;
- generation manifest and deterministic seed streams.

A high-fidelity provider may populate richer optional facts. The shared schema should not be expanded casually. Any persisted additions require a demonstrated downstream use, an ADR, versioning, and a migration or graceful fallback plan.

## High-value advanced techniques to preserve

### 1. Dynamic clustered-convection tectonics

Reference source: Nick McDonald / SimpleTectonics.

Capabilities:

- plates represented by clusters of local material segments;
- nonuniform crust thickness, density, mass, buoyancy, and age;
- mantle-potential-driven plate force and torque;
- crust creation in divergent gaps;
- density-based subduction;
- approximate material transfer and crust thickening;
- coupled divergence and subduction feedback into mantle potential;
- plate disappearance and potential fracture;
- many explicit tectonic cycles.

Potential desktop implementation:

- native Rust, C++, or compute-shader worker;
- WebGPU or platform GPU backend where available;
- CPU fallback with lower segment and step counts;
- checkpointed segment state;
- deterministic ordering and stable integer IDs;
- periodic projection to the spherical authoritative topology;
- diagnostic playback of plate motion, crust creation, and subduction.

This remains a research model until spherical behavior, deterministic cross-device output, memory bounds, and downstream quality are demonstrated.

### 2. High-resolution moving-material plate laboratory

A separate reference simulator may use a few thousand to tens of thousands of moving spherical material segments to explore:

- plate lifecycle;
- fracture criteria;
- microplate formation;
- terrane accretion;
- crustal recycling;
- subduction polarity;
- mass balance;
- thermal and compositional provinces;
- calibration of cheaper production response rules.

Its primary value may be generating benchmark histories and parameter relationships rather than shipping directly to ordinary users.

### 3. Many-era tectonic and surface coevolution

The hosted model should use a few bounded eras. A desktop high-fidelity mode may support:

- dozens or hundreds of tectonic checkpoints;
- plate birth, motion, collision, fracture, merger, and death;
- periodic crust-age and sediment updates;
- interleaved coarse erosion and basin evolution;
- changing sea level and continental connectivity;
- glacial cycles;
- climate-regime transitions;
- replayable geological history.

The simulator should still avoid blindly running every process at every small time step. Different processes need different update cadences.

### 4. Higher-fidelity glacial dynamics

Potential additions beyond the production sparse glacial response:

- ice thickness and mass balance;
- accumulation and ablation zones;
- shallow-ice or flowline approximation;
- basal sliding;
- isostatic depression and rebound;
- advance and retreat histories;
- moraine and outwash deposition;
- proglacial and subglacial lakes;
- repeated fjord and valley excavation;
- glacial-interglacial sea-level effects.

This may be appropriate for desktop jobs or dedicated polar/local refinements rather than global hosted defaults.

### 5. Higher-fidelity erosion and sediment

Potential desktop-only or premium processes:

- multi-material sediment classes;
- transport capacity and deposition;
- hillslope diffusion and mass wasting;
- coastal erosion and sediment cells;
- delta growth;
- river avulsion;
- basin subsidence and sediment loading;
- lithology-dependent erosion;
- weathering and soil formation;
- tectonic uplift coupled to erosion through longer histories.

The production model can retain bounded cause-and-response approximations while the high-fidelity model provides richer local and historical results.

### 6. Transient atmosphere and ocean simulation

Potential later capabilities:

- seasonal energy balance;
- transient winds and moisture;
- ocean heat transport;
- changing currents after tectonic reorganization;
- persistent climate normals accumulated from transient state;
- storm tracks;
- monsoons;
- orbital-cycle forcing;
- climate transitions caused by gateways, uplift, or sea level.

A premium desktop implementation could use longer integration windows, optional GPU compute, and resumable jobs. Hosted production should continue using bounded climate normals rather than indefinite weather stepping.

### 7. Space-to-ground deterministic local refinement

Reference sources: World-Synth, Red Blob, Zhou thesis.

Capabilities:

- global structural facts generated once;
- sparse spherical index for faults, boundaries, rivers, hotspots, craters, and landmarks;
- deterministic terrain patches synthesized on demand;
- high-resolution local erosion and materials;
- local vegetation instances from stable world-space hashing;
- terrain and material mip pyramids;
- selective triplanar mapping and richer desktop rendering;
- patch cache keyed by world version, location, scale, algorithm, and edit version.

This is a plausible premium feature even if the underlying world was generated by the hosted provider.

### 8. Interactive geological authoring

Potential desktop controls:

- edit mantle-potential fields;
- split or merge plates;
- move plate Euler poles;
- paint crust thickness or composition;
- establish rifts, hotspots, inherited faults, or terranes;
- replay a selected number of eras;
- rerun bounded erosion, weathering, or glaciation;
- inspect stage-delta metrics;
- undo and version every change.

Author edits should produce explicit causes and invalidate only dependent stages.

## Fidelity tiers

Possible future product shape:

### Standard hosted

- bounded CPU generation;
- coarse structural topology;
- a few tectonic eras;
- sparse glaciation;
- bounded erosion and climate;
- predictable queue cost.

### Enhanced desktop

- larger structural topology;
- more eras;
- richer crust fields;
- more local refinement;
- optional native parallelism;
- checkpoints and resume.

### High-fidelity desktop

- dynamic material segments or richer plate lifecycle;
- optional GPU compute;
- much longer tectonic, erosion, glacial, or climate histories;
- diagnostic playback;
- specialist author controls;
- export of richer geological provenance.

### Research laboratory

- experimental solvers;
- reference simulations;
- calibration runs;
- no guarantee of ordinary product latency;
- strict version and provenance capture.

## Determinism policy

High fidelity does not excuse irreproducibility.

Required where feasible:

- versioned algorithm identities;
- subsystem RNG streams;
- deterministic queue and collision ordering;
- stable segment IDs;
- checkpoint manifests;
- declared numeric precision;
- recorded hardware/backend when GPU execution may affect results;
- warning when exact cross-device reproduction is not guaranteed.

For authoritative saved worlds, CPU-normalized or backend-independent results remain preferable. GPU output may be accepted as authoritative only after deterministic behavior is demonstrated and product policy explicitly allows it.

## File-format posture

There is no blanket compatibility requirement, but there is a strong bias against breaking existing files.

Preferred sequence:

1. Keep advanced solver state ephemeral or in sidecar checkpoints.
2. Normalize final results into existing authoritative fields.
3. Add optional extension blocks only for demonstrated product use.
4. Version extensions independently where possible.
5. Require an ADR and migration plan before altering core saved-world contracts.

This allows the high-fidelity path to evolve without forcing every hosted world or old save to carry experimental simulation state.

## Relationship to the first optimization PI

The first PI should make future high-fidelity work easier by establishing:

- coarse structural topology;
- typed crust cause and age fields;
- provider boundaries;
- deterministic generation manifests;
- quality metrics;
- stage provenance;
- projection between structural and final topology;
- explicit invalidation and cache identities.

It should not implement clustered convection, GPU compute, many-step tectonic playback, transient weather, or high-resolution local simulation.

## Resume conditions

Revisit this track when one or more are true:

- the bounded hosted tectonic model is stable enough to serve as a baseline;
- desktop packaging and native-worker infrastructure are mature;
- premium desktop differentiation becomes a roadmap priority;
- local space-to-ground rendering requires richer structural inputs;
- users request detailed geological history rather than only plausible final worlds;
- a standalone high-fidelity simulator has a credible audience;
- reference simulation is needed to calibrate production approximations.
