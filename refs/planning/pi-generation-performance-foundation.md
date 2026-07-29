# PI: Generation Performance Foundation

Updated: 2026-07-29

Status: proposed first implementation PI after procedural-generation research pass

## PI intent

Build and validate a faster production generation path for the current world builder, concentrating on the dominant `deep-time-aging` cost while preserving or improving visible and causal quality.

This PI is not a wholesale rewrite of every natural system. It establishes the structural, measurement, and quality foundations needed to replace the most expensive repeated work safely.

## Current baseline

Observed on a mid-spec approximation laptop under realistic background load:

| Phase | Observed time |
|---|---:|
| `deep-time-aging` | 144,916 ms |
| `topology.climate-glaciation-node` | 25,498 ms |
| `topology.climate` | 15,388 ms |
| `topology.terrain.crust-fields` | 10,564 ms |
| `topology.hydrology-biomes-node` | 8,199 ms |

The five listed phases total approximately 204.6 seconds. `deep-time-aging` alone accounts for roughly 71% of that subtotal.

The primary production target remains:

- CPU-authoritative generation;
- Linux VPS compatibility;
- bounded per-job CPU and memory;
- safe concurrency across multiple queued jobs;
- deterministic results under a versioned algorithm;
- acceptable performance on a mid-spec desktop or laptop;
- no arbitrary saved-format changes.

## Product and architecture decisions from the research pass

The PI adopts these combined findings:

1. **Run structural geology on a bounded coarse topology.**
2. **Project structural facts deterministically to the authoritative final topology.**
3. **Represent geological history as a few meaningful eras and typed cause fields.**
4. **Apply bounded, age-sensitive surface response instead of hundreds of fine-resolution aging passes.**
5. **Treat drainage, slope, flow order, distance fields, and similar graph products as reusable outputs.**
6. **Use sparse active sets for processes that affect only part of the world.**
7. **Measure long land ribbons by physical extent, persistent narrowness, and geological support rather than deleting all narrow features.**
8. **Keep the production solver replaceable so desktop high-fidelity providers can be added later.**
9. **Separate generator controls, targets, validators, and presentation preferences.**
10. **Validate before and after transformative stages so failures can be attributed to the stage that caused them.**

## PI outcome

At the end of the PI, World Forge should have:

- a repeatable fixed-seed benchmark suite;
- exact build and algorithm provenance in benchmark output;
- substage and work-shape instrumentation for deep-time aging;
- a versioned experimental structural-generation provider;
- a bounded coarse structural topology;
- deterministic projection to the final topology;
- typed crust, age, and tectonic-cause fields;
- a bounded age-modulated terrain-response pass;
- long-persistent-ribbon diagnostics;
- pre/post quality metrics around aging;
- an evidence-based decision to adopt, revise, or reject the experimental path;
- no silent change to existing saved-project formats.

## Success targets

These are PI targets, not assumptions that the first implementation will automatically meet them.

### Performance target

On the fixed benchmark matrix and CPU-only execution:

- reduce median `deep-time-aging` runtime by at least 50%;
- reduce median complete generation runtime by at least 30%;
- avoid increasing peak generation memory by more than 25%;
- prevent unbounded worker creation or per-job core oversubscription;
- preserve predictable completion time across repeated runs.

A result below the target may still justify adoption if it materially improves quality, memory, determinism, or future scalability. That decision must be explicit.

### Quality target

The experimental path must not produce a material regression in:

- coastline and landmass coherence;
- requested versus achieved land fraction;
- mountain-core retention;
- riverhead count and distribution;
- drainage validity;
- climate and biome continuity;
- major tectonic-boundary relationships;
- deterministic regeneration;
- visible terrain detail at world scale;
- island and archipelago variety.

Long narrow features must be classified using extent and support. The implementation must not treat every peninsula or island chain as a defect.

### Determinism target

For the same:

- resolved settings;
- seed streams;
- algorithm versions;
- topology identities;
- fidelity level;

repeat runs must produce identical authoritative signatures under the same supported runtime contract.

Exact reproduction of legacy algorithm output is not required.

## Scope

### In scope

- benchmark and provenance harness;
- deep-time substage instrumentation;
- structural-topology prototype;
- deterministic structural-to-final projection;
- compact plate and continental-crust growth;
- separate continental and oceanic crust facts;
- continuous crust thickness, density, thermal age, and buoyancy fields;
- a small number of tectonic eras;
- sparse cause fields for uplift, subsidence, rifting, convergence, subduction, volcanism, and strain;
- age-sensitive bounded terrain response;
- derived-field reuse required by the prototype;
- stage-delta quality metrics;
- long-persistent-ribbon diagnostics;
- feature flag or provider selection for legacy versus experimental generation;
- documentation and a go/no-go report.

### Explicitly out of scope

- direct clustered-convection production implementation;
- authoritative GPU generation;
- thousands of tectonic time steps;
- full moving-material plate simulation;
- high-fidelity sediment transport;
- transient atmosphere and ocean simulation;
- complete world-builder UI redesign;
- local space-to-ground terrain generation;
- editing and undo implementation;
- civilization or history simulation;
- arbitrary project-file schema changes;
- removing the legacy path before the experimental path passes acceptance.

### Stretch scope

Only after the core path is benchmarked:

- sparse climate-informed glacial routing and bounded erosion response;
- one deterministic era-boundary plate fracture or retirement rule;
- cache audit beyond fields directly used by the prototype;
- staged terrain-ready completion before climate and ecology finish.

## Work package 1: Benchmark, provenance, and deep-time instrumentation

### Goal

Create a trustworthy baseline and expose what `deep-time-aging` is actually doing.

### Deliverables

- Fixed benchmark matrix.
- Machine and runtime metadata capture.
- Embedded visible application version, commit SHA, and algorithm identities.
- Stage and substage timers.
- Work counters.
- Allocation and retained-memory observations where practical.
- JSON and human-readable benchmark output.
- Benchmark comparison command or script.

### Benchmark matrix

Minimum matrix:

- three fixed seeds;
- two representative presets;
- one current production topology/detail setting;
- one stress case with high geological and glacial activity.

Each run records:

- total runtime;
- phase and substage runtime;
- topology counts;
- cells visited per pass;
- active cells versus total cells;
- number of epochs and iterations;
- terrain cells changed above selected thresholds;
- routing and climate reconciliation rebuild counts;
- sort counts and sorted element counts;
- full-array clone and allocation counts where available;
- cache builds and hits;
- worker count and worker utilization;
- peak memory estimate;
- deterministic output signatures;
- quality metrics.

### Deep-time distinctions to instrument

At minimum:

- coarse or structural work versus final-topology work;
- all-cell scans versus active-cell scans;
- tectonic cause accumulation;
- erosion and weathering response;
- drainage reconstruction;
- water and sea-level reconciliation;
- climate recomputation;
- glacial recomputation;
- hydrology and biome recomputation;
- projection and field conversion;
- validation and serialization;
- array cloning and scratch-buffer creation.

### Acceptance

- Every benchmark result identifies the exact code and algorithm version.
- Repeated baseline runs are stable enough to support comparison.
- `deep-time-aging` time can be attributed to meaningful substages.
- Current `0.3.32`-style provenance ambiguity is no longer possible in benchmark output.

## Work package 2: Structural provider boundary

### Goal

Allow the legacy and experimental structural pipelines to coexist without duplicating the entire application.

### Proposed contract

Introduce a versioned internal provider boundary, conceptually:

```ts
interface StructuralWorldProvider {
  readonly algorithmId: string
  generate(input: ResolvedWorldSpec, context: GenerationContext): StructuralWorldResult
}
```

The exact interface should follow repository conventions, but it must support:

- legacy production provider;
- experimental coarse multi-era provider;
- future desktop high-fidelity provider;
- deterministic manifest output;
- shared normalized structural facts;
- explicit node invalidation and cache identity.

### Deliverables

- Provider selection behind a developer or experimental flag.
- Legacy path behavior unchanged by default.
- Algorithm identity recorded in output and diagnostics.
- Shared normalized result contract.
- No persisted schema change unless separately approved.

### Acceptance

- Both providers can run from the same resolved world specification.
- Switching providers does not require UI or export rewrites.
- Legacy results remain available for comparison.
- Experimental intermediate state can remain ephemeral.

## Work package 3: Coarse structural topology and compact growth

### Goal

Make plate, crust, and tectonic-history cost largely independent of final output resolution.

### Structural topology

Benchmark at least two candidate structural sizes rather than hardcoding one borrowed value. Initial candidates may be in the broad range of 8,000 to 24,000 cells, subject to current topology constraints.

The topology must provide:

- stable cell identity;
- physical area;
- cell neighbors;
- stable edge identity;
- boundary incidence;
- world-coordinate lookup;
- deterministic projection relationships to the final topology.

### Structural growth

Use a deterministic frontier priority process rather than repeated full-frontier rescans.

Candidate cost terms:

- incremental geodesic distance from current frontier;
- distance from plate or continent core;
- area-budget pressure;
- compactness delta;
- unsupported narrow-branch persistence;
- directional persistence;
- plate-motion or mantle-potential anisotropy;
- resistance near another established core;
- controlled low-amplitude noise;
- bounded microplate context.

### Crust facts

Track at least:

- plate ownership;
- continental, oceanic, or transitional summary class;
- crust thickness;
- crust density or buoyancy;
- thermal age;
- deformation age;
- base elevation contribution;
- strain or weakness;
- melt or volcanic potential.

The continuous facts are authoritative within the experimental provider. Summary classes are derived conveniences.

### Continents and plates

Continental crust growth and full plate ownership must remain distinct:

- a plate may include continental and oceanic crust;
- coastlines do not define plate boundaries;
- compact continental masses may sit inside larger tectonic plates;
- oceanic crust can support later ridges, trenches, and island arcs.

### Long-branch control

Do not impose a blunt minimum width.

Instead, increasing penalties should apply when a branch is:

- continuously narrow;
- extremely long in physical units;
- growing without a substantial core;
- unsupported by plate-boundary, rift, hotspot, arc, or inherited-structure causes;
- likely to connect two large cores through a low-relief accidental corridor.

Short peninsulas, archipelagos, barrier islands, rifts, and supported island arcs remain valid.

### Acceptance

- Structural generation time is bounded against final topology resolution.
- Projection back to final topology is deterministic.
- Requested land fraction and broad plate count remain controllable.
- Plate and continental facts do not collapse into one label.
- Diagnostic worlds do not show more unsupported planetary-scale narrow branches than the legacy path.

## Work package 4: Multi-era tectonic cause accumulation

### Goal

Replace large amounts of literal fine-resolution aging with a few meaningful structural eras.

### First-pass era model

Use a small fixed or bounded count, initially around three eras:

1. ancient assembly and broad crust formation;
2. mature deformation, erosion exposure, and reorganization;
3. recent active boundaries, rifts, uplift, and volcanism.

The exact number is an experimental parameter, not a user-facing raw loop count.

### Cause fields

Accumulate typed fields for:

- uplift;
- subsidence;
- convergence pressure;
- transform shear;
- rifting and spreading;
- subduction exposure;
- volcanism and melt;
- strain and inherited weakness;
- crust creation age;
- last deformation age;
- erosion susceptibility.

### Boundary processing

- Calculate motion at boundary points.
- Preserve continuous pressure and shear.
- Group boundary edges into stable chains.
- Smooth along physical boundary distance.
- Apply anisotropic response along and across chains.
- Use sparse multi-source propagation.
- Stop propagation when marginal response is negligible.

### Plate lifecycle posture

Core PI:

- provide identities and hooks for era reorganization;
- allow bounded microplate overlays;
- do not require full dynamic plate fracture.

Stretch:

- implement one deterministic era-boundary fracture or retirement rule based on strain, thermal weakness, thickness, aspect ratio, and inherited faults.

### Acceptance

- Cause fields are deterministic and inspectable.
- Boundary response does not require one queue per boundary cell.
- Propagation visits only affected structural areas where practical.
- Recent terrain remains sharper than old terrain through age fields rather than repeated arbitrary smoothing.

## Work package 5: Deterministic projection and bounded surface response

### Goal

Convert structural history into authoritative final-topology terrain with a small number of response passes.

### Projection

Project structural fields to the final topology using stable world-relative relationships.

Requirements:

- no nearest-neighbor all-to-all search;
- deterministic interpolation or ownership resolution;
- stable large-scale structure across detail levels;
- controlled fine boundary perturbation only where appropriate;
- no visible structural-grid imprint;
- explicit projection algorithm identity.

### Surface response

Apply bounded, process-aware response:

- uplift and subsidence;
- age-sensitive smoothing or relaxation;
- active-set stream-power incision;
- hillslope creep;
- limited sediment or deposition response if already supported;
- tectonic or lithology-conditioned resistance;
- threshold-based stop conditions.

Avoid:

- repeated full-world sink filling;
- sorting the complete final topology during every minor pass;
- global maximum normalization;
- rebuilding hydrology after negligible terrain changes;
- generic blur presented as geological aging.

### Derived-field reuse

At minimum, cache or reuse as explicit products when inputs remain valid:

- slope and steepness;
- elevation or drainage order;
- downhill receiver;
- basin and spill relationships;
- runoff accumulation;
- coast and water distance;
- active erosion cells.

### Acceptance

- Surface response runs in a bounded number of passes.
- The experimental deep-time phase meets or approaches the performance target.
- Terrain remains causally aligned with tectonic fields.
- Hydrology does not become materially less valid.
- Old and recent terrain are visibly differentiated without hundreds of epochs.

## Work package 6: Quality gates and ribbon diagnostics

### Goal

Prevent performance work from quietly degrading world quality.

### Required metrics

Before and after the experimental aging response, calculate:

- land fraction;
- connected land component count and size distribution;
- coastline complexity;
- mountain-core area and retention;
- relief distribution;
- riverhead count, quality, and spatial distribution;
- basin count and endorheic retention;
- glacier-eligible or persistent-ice area where available;
- biome area and connected-patch distribution;
- tectonic-boundary versus relief alignment;
- deterministic signatures.

### Long-persistent-ribbon metrics

For suspicious land structures, capture:

- geodesic skeleton or centerline length;
- median and percentile local width;
- length-to-width ratio;
- fraction of length below physical width bands;
- persistence of narrowness;
- whether it connects substantial land cores;
- relief continuity;
- plate-boundary, rift, hotspot, arc, or volcanic support;
- feature and deformation age;
- whether the connection is created only by sea-level thresholding.

### Classification

Possible outcomes:

- retain;
- fragment into an archipelago;
- submerge unsupported low-relief sections;
- widen a strongly supported tectonic feature;
- split macro-region membership without changing terrain;
- flag for review;
- protect authored or named features.

The PI requires diagnostics and prevention during structural growth. Automatic final-terrain repair is optional and should remain conservative.

### Acceptance

- Benchmark output shows stage deltas.
- A quality failure identifies the responsible stage.
- Narrow local features are not broadly suppressed.
- Planet-scale unsupported ribbons are detected reliably enough for visual review.
- The experimental path does not regress the benchmark quality matrix.

## Work package 7: Comparison, rollout decision, and handoff

### Deliverables

- Legacy versus experimental benchmark report.
- Per-phase timing table.
- Quality scorecard and screenshots.
- Memory and concurrency observations.
- Determinism results.
- Known failure modes.
- File-format impact statement.
- Recommendation:
  - adopt behind experimental toggle;
  - adopt as new default;
  - revise and run another prototype;
  - reject and retain selected infrastructure only.
- Updated roadmap and handoff.

### Rollout posture

- Keep legacy generation available during evaluation.
- Do not promote the experimental provider to default based on one attractive seed.
- Require the fixed benchmark matrix and browser QA.
- Require exact commit and algorithm provenance.
- Do not promote to `qa` or `main` until the accepted `dev` commit passes repository verification and browser QA.

## Stretch work package: Sparse glaciation prototype

This is the next most valuable performance experiment after the deep-time path because the observed phase cost is approximately 25.5 seconds.

### Candidate shape

- use existing World Forge climate and ice-pressure facts;
- create an active glacial-cell mask;
- build a reusable downhill or ice-flow graph;
- accumulate upstream ice discharge;
- apply bounded carving, widening, overdeepening, moraine, and fjord response;
- rebuild routing only after meaningful terrain changes;
- preserve persistent ice, erosion exposure, and deglaciation as separate fields.

### Acceptance target

- materially reduce glaciation runtime;
- preserve glacier placement and visible signatures;
- avoid running glacial work over the entire world;
- prevent hydrology regressions in glaciated terrain.

If this cannot fit without compromising the core PI, it becomes the first follow-up PI.

## File-format constraint

The PI maintains a strong bias toward compatibility.

Allowed without project-format change:

- internal provider interfaces;
- ephemeral structural topologies;
- typed scratch and cause fields;
- cache identities;
- benchmark manifests;
- sidecar development artifacts;
- algorithm version changes;
- internal pipeline reordering.

Any persisted field addition, rename, or semantic change requires:

- a demonstrated product or downstream simulation need;
- an ADR;
- schema versioning;
- migration or graceful fallback behavior;
- explicit review of old-save and export impact.

## Risks

### Prototype grows into a rewrite

Mitigation:

- keep legacy provider;
- limit the first implementation to structural fields, projection, and bounded response;
- defer full plate lifecycle and high-fidelity simulation.

### Faster but visibly worse terrain

Mitigation:

- fixed-seed quality matrix;
- stage-delta metrics;
- screenshots;
- legacy comparison;
- no default rollout until quality gates pass.

### Coarse topology leaks into visible terrain

Mitigation:

- deterministic projection;
- controlled fine response;
- topology-aware rendering;
- grid-imprint metrics and visual QA.

### Memory savings are lost to duplicated providers and caches

Mitigation:

- measure peak live bytes;
- reuse scratch buffers;
- scope caches by job;
- release experimental intermediate fields after projection where safe.

### VPS concurrency collapses under parallel jobs

Mitigation:

- shared bounded worker pool;
- per-job CPU and memory budgets;
- deterministic scheduling;
- benchmark concurrent jobs, not only one unconstrained process.

### Ribbon controls erase interesting geography

Mitigation:

- use physical length, persistence, and geological support;
- protect archipelagos, arcs, peninsulas, and authored features;
- start with diagnostics and growth penalties, not aggressive final cleanup.

### Provider abstraction forces schema churn

Mitigation:

- normalize into existing outputs;
- keep richer fields ephemeral during the prototype;
- require an ADR for persistent contract changes.

## Dependencies

- existing generation graph and runtime timing support;
- stable current final topology;
- access to current deep-time implementation;
- fixed-seed test worlds;
- repository verification workflow;
- browser QA environment;
- ability to compare visible outputs at identical settings.

## Definition of done

The PI is done when:

1. The benchmark suite runs repeatably and records exact provenance.
2. Deep-time cost is broken into meaningful measured substages.
3. The experimental provider runs end to end on the benchmark matrix.
4. Structural work occurs on a bounded coarse topology.
5. Projection to final topology is deterministic.
6. Typed crust, age, and tectonic-cause fields drive bounded surface response.
7. Long-persistent-ribbon diagnostics run and preserve legitimate narrow geography.
8. Pre/post quality metrics show no material regression on accepted worlds.
9. Performance, memory, and determinism results are documented.
10. Saved-format impact is either none or supported by an approved ADR and migration plan.
11. A clear adopt, revise, or reject decision is recorded.
12. The exact accepted `dev` commit passes repository verification and browser QA before promotion.

## Follow-up sequence

Expected sequence after this PI:

1. sparse glaciation, if not completed as stretch;
2. broader derived-field cache and invalidation audit;
3. climate profiling followed by directed transport and basin-gyre prototypes;
4. canonical hydrology and sediment-response refinement;
5. local deterministic terrain synthesis and rendering cleanup;
6. optional enhanced desktop provider;
7. high-fidelity desktop or standalone world-simulation track.

See also:

- `refs/research/procedural-generation/research-framework-and-technique-catalog.md`
- `refs/research/procedural-generation/technique-catalog-additions-2026-07-29.md`
- `refs/research/procedural-generation/high-fidelity-desktop-world-track.md`
