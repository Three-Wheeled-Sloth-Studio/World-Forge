# Handoff: Earth Climate Calibration Benchmark

Updated: 2026-08-04
Status: Planned side project; Definition of Ready not yet met
Priority: Non-blocking enrichment work

## Product boundary

This work uses known Earth topology and climate observations to test and improve World Forge's generic climate, precipitation, wetness, ice, and biome logic.

It is **not** part of the critical path for:

- continued construction of the Sol reference system;
- acceptance or distribution of the imported Earth climate and biome data;
- rebuilding the shared Sol `.wforge` fixture;
- importing that fixture into Parchment Worlds;
- adding additional Sol bodies;
- package-pipeline, loading, or performance work.

The imported Earth layers may be accepted as the authoritative reference-project baseline while this side project proceeds independently. The calibration work must not replace, delay, or invalidate accepted imported data unless a later explicit product decision changes that boundary.

## Why this exists

Earth provides a rare controlled benchmark for a procedural world generator:

- real elevation and bathymetry are available;
- land and ocean geometry are known;
- orbital and rotational parameters are known;
- broad temperature, precipitation, climate-zone, ice, and biome observations are available;
- major successes and failures are visually recognizable.

The useful question is not whether World Forge can import a finished Earth classification. That path is already valid for the Sol reference package.

The useful question is:

> Given known Earth topology, oceans, latitude, elevation, axial tilt, rotation, and orbital inputs, how closely does the ordinary World Forge climate pipeline reproduce broad observed temperature, precipitation, wetness, ice, and biome patterns?

Answers should improve fictional-world generation through reusable physical mechanisms, not through Earth-specific patches.

## Read first

1. `refs/planning/climatological-pressure-and-circulation-v6.md`
2. `refs/planning/present-climate-derived-field-reuse.md`
3. `refs/planning/reference-system-etl-and-multi-body-navigation.md`
4. `refs/research/reference-data/earth-reference-data.md`
5. `tools/reference-etl/prepare_etopo_earth.py`
6. Existing climate, hydrology, pressure, circulation, wetness, ice, and biome implementation and tests

## Current starting point

The Earth reference ETL can currently prepare:

- imported ETOPO elevation and bathymetry;
- a derived water mask;
- imported Beck et al. 1991-2020 Koppen-Geiger climate classes;
- World Forge biome, wetness, and permanent-ice layers derived from those imported classes.

Those imported and derived layers are suitable for the reference fixture and may be accepted independently.

For this benchmark, the imported climate classes, wetness, ice, and biome outputs are **comparison targets only**. They must not be fed into the candidate procedural climate run being evaluated.

## Definition of Ready

Do not begin material implementation until the following are documented and accepted:

### Benchmark inputs

- The exact fixed Earth physical and topological inputs supplied to the procedural pipeline.
- The source and treatment of elevation, bathymetry, coastline, land, ocean, lakes, and permanent water.
- The Earth orbital, rotational, atmospheric, and solar parameters used by the run.
- Any fields intentionally excluded because the current generic pipeline does not support them.

### Reference targets

- Which datasets are benchmark-only.
- Which datasets may be redistributed in repository fixtures or generated evidence.
- The selected annual precipitation or wetness reference.
- The selected annual temperature reference, if used.
- The role of Koppen-Geiger classes as validation evidence.
- The mapping between reference classes and the smaller World Forge biome vocabulary.

### Execution contract

- The exact workflow and algorithm version under test.
- The deterministic seed policy.
- Input topology resolution and output comparison resolution.
- Runtime and memory budget.
- Whether the benchmark runs through the normal workflow graph, a developer-only workflow clone, or a dedicated harness that invokes the same production functions.

### Acceptance evidence

- Required summary metrics.
- Required regional checks.
- Required maps or visual comparisons.
- Thresholds that distinguish an informative benchmark from a passing algorithm increment.
- The explicit boundary against overfitting to Earth.

### Experiment discipline

- A baseline run is captured before any algorithm change.
- Each candidate algorithm change is isolated behind an experimental workflow or versioned implementation.
- Candidate and control use identical Earth inputs.
- No production algorithm is replaced based only on qualitative resemblance.

## Recommended benchmark shape

### Fixed input baseline

Use real Earth values for inputs that a generated world would ordinarily know before climate generation:

- elevation and bathymetry;
- land and ocean identity;
- latitude and longitude;
- axial tilt;
- orbital eccentricity and year length;
- rotation period;
- stellar flux or equivalent insolation inputs;
- broad atmospheric parameters supported by the generic model.

Do not supply observed precipitation, wetness, climate class, biome, or ice values to the procedural candidate run.

### Candidate outputs

Capture at minimum:

- annual or representative temperature;
- pressure regimes;
- prevailing wind vectors;
- convergence, subsidence, and storm-track potential;
- ocean influence;
- orographic lift and rain shadow;
- precipitation;
- wetness;
- permanent or broad ice classification;
- final biome classification.

### Comparison evidence

Produce machine-readable and visual evidence including:

- generated-versus-reference biome confusion matrix;
- per-biome precision, recall, and area share;
- desert precision and recall;
- precipitation or wetness correlation where the selected reference supports it;
- temperature error or correlation if temperature is included;
- latitude-band summaries;
- land-only and coast-versus-interior summaries;
- side-by-side generated and reference maps;
- difference maps;
- deterministic run metadata and signatures.

### Regional diagnostic set

At minimum, report behavior for:

- Sahara and Sahel;
- Arabian Peninsula;
- Amazon Basin;
- Congo Basin;
- India and Southeast Asia;
- central Australia and wetter margins;
- Atacama and western South America;
- western North American rain shadows;
- Mediterranean climate regions;
- tundra and permanent ice regions.

These are diagnostic regions, not coordinate-specific implementation targets.

## First likely experiment

The first experiment should be selected from baseline evidence rather than assumed in advance.

A strong initial candidate is a bounded refinement of the interaction among:

- subtropical subsidence;
- convergence and storm tracks;
- moisture transport from ocean sources;
- continental drying;
- orographic lift and rain shadows.

That mechanism is valuable only if it remains generic and improves multiple relevant Earth regions without materially degrading unrelated regions or generated-world behavior.

## Guardrails

- Do not add Earth-specific latitude/longitude masks.
- Do not add rules naming or directly targeting the Sahara, Amazon, Atacama, Australia, or any other real region.
- Do not use imported Koppen, precipitation, wetness, ice, or biome values as hidden inputs to the candidate run.
- Do not mutate the accepted Sol Earth fixture as part of benchmark experiments.
- Do not make the benchmark a runtime dependency.
- Do not destabilize ordinary generated-world replay signatures outside an explicitly versioned candidate workflow.
- Do not broaden this into a fluid-dynamics simulation or GIS product.
- Do not hold up Sol pipeline work, fixture acceptance, imported-data acceptance, or additional-body work.

## Deliverables

1. Accepted Definition of Ready addendum or planning note.
2. Deterministic Earth climate benchmark command.
3. Frozen baseline inputs and signatures.
4. Baseline machine-readable metrics.
5. Generated, reference, and difference maps.
6. Regional diagnostic report.
7. Ranked algorithm weaknesses and likely causal mechanisms.
8. Recommendation for one bounded A/B experiment.
9. Candidate-versus-control evidence if that experiment is implemented.
10. Explicit recommendation to merge, revise, or reject the candidate.

## Definition of Done

This side project is complete when:

- the benchmark can be reproduced from documented inputs;
- the ordinary World Forge climate pipeline can run against known Earth topology without consuming observed climate outputs;
- baseline metrics and maps are durable under `refs/testing/`;
- at least one algorithm hypothesis has been evaluated through a matched control/candidate comparison, or the baseline evidence demonstrates that no bounded experiment is currently justified;
- any accepted algorithm change is generic, versioned, deterministic, and validated against both Earth and representative generated worlds;
- the accepted imported Earth reference data remains usable regardless of the benchmark outcome.

## Handoff instruction

The developer taking this work should begin with Definition of Ready closure and baseline-design review. Do not start by changing climate algorithms.

This handoff is intentionally parked as an independent enrichment track. The active Sol reference-system developer should continue pipeline, packaging, body-ingestion, and browser-acceptance work without waiting for it.
