# Polar Climate and Initial Foundation Profiling Increment

Updated: 2026-08-02

Status: approved implementation plan

Related:

- Issue #14: Generation performance foundation PI
- Issue #111: Restore coherent Earthlike polar temperature gradients and permanent ice
- `refs/planning/pi-generation-performance-foundation.md`
- `refs/planning/parameter-target-audit-and-correlation.md`

## Decision

Implement two tightly bounded changes in the same development increment:

1. an output-changing Experimental climate candidate that restores a physically coherent Earthlike latitude-temperature gradient and permanent polar ice;
2. output-neutral fine-grained profiling of the native Initial world foundation path for both Detailed and Experimental workflows.

The two changes may share a branch and validation run, but they have separate acceptance gates. Profiling must not alter authoritative output. The climate candidate must remain isolated to Experimental until fixed-seed, integration, and visual QA support promotion.

## Current problem

The current initial topology climate formula uses an approximately 28 C equator-to-pole latitude term. With an Earthlike global target near 15 C, a sea-level pole lands around 1 C before local variation and later stellar/orbital forcing.

Permanent-ice classification evaluates warm-season survival. At Earthlike axial tilt, the existing seasonal term adds roughly 7 C at the pole before applying water and land ice thresholds. The generated annual polar field is therefore normally too warm to retain permanent ice even when the focused classifier tests pass.

The focused tests use synthetic latitude gradients materially steeper than the production climate path. They verify that the classifier can form ice but do not verify that ordinary Earthlike generation supplies a compatible temperature field.

## Climate implementation boundary

### Workflow isolation

- Detailed remains the accepted production baseline.
- Experimental receives a distinct climate/glaciation implementation ID and node version.
- Legacy and developer control workflows retain their existing climate behavior.
- No system-generation, orbit-generation, parameter-distribution, moisture-fetch, hydrology, or biome-rule changes are included.

### Mean-centered latitude profile

The selected `averageTemperatureC` remains the intended global mean target.

The replacement latitude term must be area-weighted and approximately mean-zero over the sphere. It may redistribute thermal energy by latitude but must not silently add or remove global heat.

Use a profile based on absolute normalized latitude and subtract its spherical area-weighted mean. Initial calibration target:

- equator-to-pole contrast: benchmark 38 C, 40 C, and 42 C;
- initial implementation candidate: 40 C unless the fixed-seed integration matrix rejects it;
- authoritative mean drift before elevation, local noise, and stellar forcing: less than 0.25 C at topology resolution 64 and above.

The implementation should expose one named helper with a stable algorithm identifier rather than embedding a new magic coefficient inside the climate loop.

### Permanent ice

- Reuse the existing warm-season permanent-ice classifier initially.
- Do not lower ice thresholds merely to force white poles.
- Preserve asymmetric north/south results from land/ocean distribution, elevation, circulation, and stellar/orbital forcing.
- Preserve warm-world ice suppression, cold-world expansion, and alpine ice.
- Keep permanent ice separate from seasonal snow and seasonal sea-ice presentation.

### Diagnostics added with the candidate

Record or expose at least:

- authoritative mean temperature;
- equatorial mean temperature;
- north high-latitude mean temperature;
- south high-latitude mean temperature;
- north and south permanent-ice share above the selected polar latitude threshold;
- land-ice and water-ice counts;
- selected latitude-profile algorithm ID and contrast.

These diagnostics are the beginning of the planned parameter target ledger, not a substitute for it.

## Initial world foundation profiling boundary

The user-facing `Initial world foundation` stage currently groups six native graph nodes:

1. `terrain.topology-elevation`
2. `terrain.finalization`
3. `terrain.water-geology`
4. `climate.glaciation`
5. `ecology.hydrology-biomes`
6. `projection.equirectangular-assembly`

Fine profiling must retain these node timings and add stable subphase timings beneath them.

### Required subphases

#### Terrain finalization

- sea-level solve, pre-aging;
- impacts;
- thermal weathering;
- hydraulic erosion;
- coastal shelf shaping;
- terrain enrichment;
- sea-level solve, final.

#### Water and geology

- water mask;
- volcanism.

#### Climate and glaciation

- latitude/elevation temperature field;
- atmospheric flow;
- ocean currents;
- wetness/moisture traversal;
- climate-moisture candidate traversal;
- permanent-ice classification;
- climate preview/summary assembly.

#### Hydrology and biomes

- water-distance or ocean-influence construction;
- drainage-surface fill;
- receiver construction and flow accumulation;
- source scoring and ordering;
- river path tracing;
- lake marking;
- biome assignment.

#### Projection assembly

- topology-to-raster scalar layers;
- topology-to-raster vector layers;
- river projection and object assembly.

### Profiling rules

- Use the existing diagnostics recorder and performance-trace conventions.
- Stable phase IDs are part of the developer observability contract.
- Do not double-count subphase timings when aggregating user-facing native stage totals.
- Do not make generated output depend on whether profiling is enabled.
- Avoid timing wrappers inside extremely tight per-cell loops; profile coherent operations.
- Include basic work-shape counters where the existing performance tracer supports them.
- Preserve current stage labels and user-facing timing behavior.

## Validation matrix

### Output-neutral profiling gate

For Detailed and Experimental before the climate candidate is enabled:

- authoritative signatures identical before and after profiling;
- selected values and system/orbit models identical;
- node outputs and metrics identical;
- full repository validation passes.

### Climate candidate gate

Compare Detailed baseline against Experimental candidate using at least:

- seeds `1001001`, `3141592`, and `8675309`;
- Earthlike;
- Habitable World;
- explicitly warm Earthlike or Habitable case;
- explicitly cold Earthlike or Habitable case;
- high-tilt case.

Required checks:

- system-generation and orbit outputs remain identical;
- selected parameter values remain identical;
- authoritative global mean temperature remains close to the selected target after accounting for documented elevation and stellar forcing;
- ordinary Earthlike worlds show coherent high-latitude permanent ice unless an inspectable forcing explains an ice-free result;
- warm cases can remain ice-free;
- cold cases expand permanent ice;
- high tilt may reduce permanent ice through warm-season survival rather than through a global-temperature error;
- no routine low-latitude ice except supported alpine cases;
- hydrology validity and biome continuity remain acceptable;
- deterministic replay remains exact within each workflow version.

### Visual QA

Review at minimum:

- flat biome/climate view;
- Globe view at both poles;
- opposite seasonal dates;
- land-dominant pole;
- ocean-dominant pole;
- warm and cold edge cases.

Reject symmetric painted caps, salt-and-pepper ice, equatorial leakage, or ice that appears only in presentation but not authoritative layers.

## Promotion rule

Promote the Experimental climate candidate into Detailed only after:

- fixed-seed integration tests pass;
- full repository validation passes;
- manual visual QA accepts the polar behavior;
- no system-generation regression is observed;
- the global target remains interpretable;
- issue #111 records the evidence and decision.

The finer profiling may land independently because it is output-neutral.

## Explicitly deferred

- physical-distance moisture fetch;
- source-water width and the 2,000 km inland carry rule;
- preliminary lake generation before climate;
- runoff semantics beyond current compatibility behavior;
- latent parameter correlations;
- the full stage-aware target-versus-achieved ledger;
- performance changes based on the new profiling evidence.

Those changes begin only after this increment produces reliable measurements and an accepted polar climate candidate.
