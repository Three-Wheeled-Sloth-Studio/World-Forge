# Downstream Generator Earth Validation Handoff

Updated: 2026-08-25

Repository: `Three-Wheeled-Sloth-Studio/World-Forge`

Branch: `dev`

## Execution model

Work from a **local checkout** of World Forge on `dev`.

Do not implement through GitHub remote-edit/API tooling. Use the local filesystem, local test runner, and normal git commands.

Before starting:

```text
git checkout dev
git pull
```

Make coherent local commits directly on `dev` in accordance with `AGENTS.md`. Push normally when the checkpoint is ready and authorized by the local environment.

## Accepted baseline

The accepted post-Ultra-Earth / CI-cleanup behavior baseline carried forward into this work is:

- World Forge commit: `a8dd952d78d06b69c2e74bf4d7f3a0801de6d885`
- visible runtime: `0.3.81`
- exact-head validation run: `32895300495`, green
- maintained Earth raster: `4096 x 2048`
- canonical Earth topology: `1024`

Current `dev` also contains this handoff document on top of that accepted baseline. Start from current `dev`; do not reset back to the baseline commit.

## Read first

1. `AGENTS.md`
2. `refs/README.md`
3. `refs/project.yaml`
4. `refs/handoffs/currentHandoff.md`
5. `refs/handoffs/next-dev-prompt.md`
6. `refs/research/reference-data/earth-reference-data.md`
7. `refs/testing/validationCommands.yaml`
8. `refs/testing/ci-suite-audit-2026-08-25.md`
9. generator-core climate, circulation, hydrology, and biome contracts/tests
10. World Forge issue `#124`

## Mission

Use the maintained high-resolution Earth reference project to validate and, where justified, improve downstream procedural generators including:

- atmospheric circulation / prevailing winds;
- ocean circulation / current fields;
- moisture transport / hydration / wetness;
- biome assignment;
- intermediate temperature, rainfall, evaporation, continentality, elevation, latitude, and seasonality signals consumed by those stages.

The goals are:

1. outputs should behave plausibly similar to observed Earth reality;
2. performance is a first-class requirement;
3. prefer **plausible but fast** over **ultra-fidelity but slow**.

This is not an attempt to build a numerical weather model, general circulation model, or research-grade ocean simulator. The target is a fast worldbuilding system that passes a knowledgeable-user sniff test.

## Future-reuse requirement

Build the validation architecture so the same pattern can later support systems such as:

- spread and migration of humanity;
- emergence of settlements;
- origins of civilization;
- spread of civilizations;
- state formation;
- trade and conflict;
- historical simulation.

Do **not** build those systems now.

The reusable abstraction should be:

```text
scenario -> production generator -> observations/invariants -> metrics -> performance -> report -> baseline comparison
```

Earth is the first reference scenario, not the validation framework itself.

## Scientific-validation rule

Observed/reference Earth data is an **evaluation target**, not privileged generator input.

Do not:

- feed observed Earth biome labels into the generic biome generator;
- feed maintained Earth wetness values into generic moisture generation;
- copy observed wind/current fields into procedural outputs;
- add Earth-specific continent names, coordinate masks, constants, or conditionals;
- tune behavior so narrowly that Earth improves while fictional worlds become less general.

The intended flow is:

```text
Earth physical/source inputs
        |
        v
generic procedural generator
        |
        v
generated Earth-like outputs
        |
        +---- compare against independent observed/reference evidence
```

Reference observations are the answer key, not an input feature.

## Maintained Earth guardrails

Do not weaken the accepted baseline:

- Earth raster remains `4096 x 2048`;
- topology remains `1024`;
- complete Sol remains one project;
- ordinary fictional-world defaults remain independent;
- Jupiter and Mars remain present;
- no Earth-specific renderer or package format;
- do not lower Earth resolution to improve generator timing.

The maintained Earth bundle currently provides evaluation evidence including:

- elevation/bathymetry;
- land/water mask;
- Koppen-Geiger-backed biome identity;
- derived wetness;
- permanent ice.

Be explicit about which references are observed and which are derived proxies. Do not claim validation against datasets we do not possess.

# Work package 0: audit the production pipeline

Before changing algorithms, document:

1. current generator stage order;
2. inputs and outputs of each downstream stage;
3. which outputs influence later stages;
4. current working/internal resolutions;
5. measured and asymptotic performance hot spots;
6. existing tests and what they actually prove;
7. behavioral-contract tests versus implementation-detail tests;
8. algorithmic assumptions most likely to affect Earth realism.

Create a concise planning/diagnostic reference under `refs/testing/` or `refs/planning/`.

Do not begin with knob-twisting.

# Work package 1: reusable validation framework

Create a diagnostic validation framework, not a set of Earth-specific scripts.

The framework should separate these concerns.

## Scenario/reference fixture

A scenario should describe at least:

- source project or fixture;
- body under evaluation;
- generator stages to run;
- generator configuration;
- deterministic seed;
- reference datasets or observational proxies;
- evaluation resolution(s);
- performance-budget metadata.

Earth is one scenario implementation.

## Generator adapter

The harness must invoke normal production generator code.

Do not reimplement generator logic inside the evaluator.

The adapter contract should be generic enough that a future civilization/history system can expose:

- inputs;
- generated outputs;
- timings;
- deterministic run identity.

## Metric registry

Metrics should be modular and separately named.

A useful generic shape is:

```text
metric
  id
  stage
  description
  observed/reference source
  generated field(s)
  measurements
  score if useful
  acceptance interpretation
```

Do not reduce all plausibility to one opaque score. A summary score may exist, but preserve the component measurements.

## Performance instrumentation

Capture at least:

- elapsed time per generator stage;
- total downstream generation time;
- input/output resolution;
- major allocation or memory evidence where practical;
- enough detail to identify scaling regressions.

Prefer existing instrumentation seams where available.

## Report output

Produce both:

- machine-readable JSON;
- concise human-readable Markdown/text.

Reports should include:

- measurements;
- PASS/WARN/FAIL interpretation where justified;
- timings next to plausibility results;
- deterministic run/scenario identity.

Diagnostic raster/image artifacts are useful when cheap, but screenshots must not be the only evidence.

## Baseline comparison

Support comparison of:

- current run;
- accepted baseline;
- proposed algorithm change.

A quality improvement that doubles runtime must be obvious in the report.

# Work package 2: atmospheric circulation validation

Validate Earth-scale atmospheric structure at worldbuilding scale, not day-to-day weather.

Candidate structural checks include:

- broad Hadley / mid-latitude / polar circulation behavior;
- tropical trade-wind direction;
- mid-latitude westerlies;
- polar easterly tendency;
- equatorial/ITCZ convergence if represented;
- subtropical divergence/dry-belt behavior if represented;
- latitude-band statistics;
- terrain or land/ocean deviations only where the current model claims to support them.

Prefer robust coarse structural comparisons over pixel-perfect vector matching.

If the current model does not represent a phenomenon, record that explicitly rather than creating a meaningless metric.

# Work package 3: ocean circulation validation

Evaluate worldbuilding-scale ocean-current behavior.

Candidate structural checks include:

- basin-scale gyre direction by hemisphere;
- equatorial current tendency;
- western/eastern boundary behavior where modeled;
- consistency with prevailing winds and Coriolis assumptions;
- behavior around continental barriers;
- no impossible cross-land current transport;
- no pathological circulation artifacts.

Do not target numerical ocean-model fidelity.

# Work package 4: hydration/moisture validation

Evaluate generated moisture/hydration against independent Earth evidence.

Look for broad structural plausibility such as:

- wet equatorial regions;
- subtropical arid belts;
- mid-latitude moisture patterns;
- continental-interior drying;
- windward/leeward orographic effects where supported;
- rainforest/desert contrast;
- sensible coastal versus interior tendencies.

The maintained wetness/Koppen evidence is a comparison target, not generator input.

Candidate metrics include:

- correlation at appropriately aggregated resolution;
- wet/dry quantile agreement;
- latitudinal distribution;
- land-area fractions above/below broad thresholds;
- confusion between broad hydration bands;
- representative-region diagnostics.

Do not overfit exact continuous values if the reference is itself a derived proxy.

# Work package 5: biome validation

Validate procedural biome assignment against broad Earth biome identity.

Prefer meaningful worldbuilding families over exact Koppen reproduction, for example:

- tropical wet;
- tropical seasonal;
- arid/desert;
- temperate;
- continental/boreal;
- tundra;
- permanent ice;
- mountain/highland where represented separately.

Candidate measurements include:

- broad-class confusion matrix;
- total land-area share by biome family;
- latitudinal distribution;
- agreement at aggregated spatial resolution;
- category inversions;
- contiguous-region coherence;
- representative-region diagnostics.

The evaluator should clearly catch gross failures such as:

- Sahara becoming grassland;
- Amazon becoming desert;
- Siberia becoming tropical forest;
- arbitrary checkerboarding;
- globally implausible biome proportions.

# Work package 6: performance budgets and diagnostic tiers

Do not invent hard limits before measuring the current implementation.

First capture the existing baseline, then establish stage-level performance expectations.

Use three diagnostic tiers sharing the same scenario/metric/report contracts.

## Fast development diagnostic

Reduced but representative resolution for frequent iteration.

Purpose:

- catch gross behavior changes;
- compare candidate algorithms quickly;
- run locally many times.

## Standard Earth diagnostic

High enough resolution to judge large-scale Earth plausibility without paying full Ultra cost every run.

This should become the normal manual scientific-validation command.

## Full Ultra acceptance

Use maintained Earth `4096 x 2048` only for significant checkpoints and final measurements.

Do not run this on every push.

Candidate command shape, subject to repository audit:

```text
npm run validate:earth-fast
npm run validate:earth
npm run validate:earth-ultra
```

Use better names if repository conventions suggest them.

# Optimization philosophy

When choosing between approaches, prefer the simpler/faster one unless the slower approach materially improves worldbuilding plausibility.

Examples:

Good trade:

- roughly 2x faster;
- nearly identical broad circulation;
- slightly less local precision.

Bad trade:

- roughly 4x slower;
- a few percentage points better pixel-level Earth correlation;
- no meaningful improvement at worldbuilding scale.

Potentially justified trade:

- roughly 15% slower;
- fixes globally incorrect desert placement or reversed ocean gyres.

Prefer where practical:

- bounded-resolution intermediate fields;
- typed-array/vectorized operations;
- coarse-to-fine influence fields;
- reusable precomputed latitude/Coriolis/terrain terms;
- avoiding repeated full-resolution passes;
- deterministic approximations.

Avoid expensive iterative solvers with poorly bounded runtime unless measurement shows they are necessary.

# Algorithm-change discipline

After the baseline evaluator exists:

1. run the existing production generators unchanged;
2. record Earth plausibility and performance;
3. identify the largest material errors;
4. fix one class of error at a time;
5. rerun the same metrics;
6. retain changes only where the plausibility/performance trade is defensible.

Do not rewrite air, ocean, hydration, and biome logic simultaneously before establishing baseline evidence.

When tuning constants:

- derive them from generic physical reasoning where possible;
- keep them named and documented;
- avoid Earth-coordinate calibration;
- verify several deterministic fictional worlds for pathological regression.

# Fictional-world anti-overfitting suite

Alongside Earth comparison, run a small deterministic set of generated worlds exercising different conditions, such as:

- Earth-like temperate world;
- mostly ocean world;
- high-land-fraction world;
- strong mountain/topography world;
- warmer world;
- colder world;
- low/high axial tilt if already supported.

Do not create a large fixture zoo.

Use invariant checks such as:

- no NaN/Infinity;
- currents remain in water;
- biome codes valid;
- moisture bounded;
- deterministic outputs;
- no unjustified single-biome collapse;
- reasonable performance scaling.

# CI policy

The expensive scientific/reference diagnostics must **not** become routine push CI.

Routine CI should retain normal deterministic unit/integration contracts.

Manual diagnostic GitHub Actions, if useful, should normally be:

- `workflow_dispatch` only;
- artifact-producing;
- clearly labeled diagnostic/non-blocking;
- scheduled only if there is a demonstrated reason.

Do not add the expensive Earth comparison runs to `npm run verify`.

However, cheap tests for the validation framework itself should remain routine CI where appropriate, including:

- metric math;
- report schema;
- scenario parsing;
- adapter contracts;
- deterministic fixture behavior;
- inexpensive invariants.

Keep these four evidence classes distinct:

1. unit contracts: routine CI;
2. cheap invariant/property validation: routine CI where stable;
3. Earth/reference scientific validation: manual diagnostic suite;
4. performance/quality benchmarking: manual diagnostic suite.

A deterministic/type-correct generator can still be scientifically poor. Do not confuse unit-test success with plausibility validation.

Likewise, do not turn noisy real-world similarity metrics into flaky push-CI gates.

# Deliverables

At completion provide:

1. reusable validation framework;
2. Earth validation scenario;
3. atmospheric metrics;
4. ocean metrics;
5. hydration metrics;
6. biome metrics;
7. performance instrumentation;
8. fast/standard/Ultra diagnostic modes;
9. small fictional-world anti-overfitting suite;
10. baseline reports for existing algorithms before major tuning;
11. quality/performance delta reports for accepted adjustments;
12. updated `refs/testing/validationCommands.yaml`;
13. a testing/design reference explaining future simulator integration;
14. updated `refs/handoffs/currentHandoff.md`;
15. updated `refs/handoffs/next-dev-prompt.md`;
16. issue tracking evidence with diagnostic run IDs and summarized findings where remote diagnostic workflows are used.

# Acceptance criteria

Do not call the slice complete merely because a harness exists.

At minimum:

- existing downstream generators have measured Earth reference baselines;
- evaluator can distinguish an intentionally degraded/broken result from a reasonable one;
- atmospheric, ocean, hydration, and biome stages each have meaningful structural metrics or an explicit reason a metric is not applicable;
- stage and total performance are measured;
- standard diagnostics run outside routine CI;
- Ultra Earth is available as an explicit checkpoint;
- fictional worlds still generate correctly;
- validation code is domain-extensible rather than climate-specific;
- no Earth observational answer data leaks into production generation;
- no Earth-specific algorithm hacks are introduced;
- `npm run verify` remains green;
- scientific diagnostics remain outside routine push CI.

# First response before production changes

Before changing production algorithms, report back with:

1. audited generator-stage architecture;
2. proposed reusable validation-framework shape;
3. proposed Earth metrics and what each actually proves;
4. current baseline timings;
5. the first one or two material plausibility defects worth correcting.

Then proceed incrementally from measured evidence.