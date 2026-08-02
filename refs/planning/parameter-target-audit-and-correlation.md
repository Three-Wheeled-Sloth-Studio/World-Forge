# Parameter Target Audit and Correlation Plan

Updated: 2026-08-02

Status: planned follow-on to distribution-based parameter generation

## Intent

Make generated-world parameters both more coherent and more inspectable.

The distribution increment establishes target, standard deviation, and hard safety bounds as the normal parameter shape. This follow-on adds two related capabilities:

1. correlated world-level forcing so parameters do not behave like unrelated dice rolls;
2. a durable audit trail showing what each stage was trying to achieve, which upstream facts changed that target, what value the stage resolved or produced, and how far the result landed from the active target.

This is not a request for a giant covariance matrix in the user interface. User-facing controls should remain comprehensible: move a target, widen or narrow its variation, and inspect why the generated world landed where it did.

## Core principles

- Presets define target distributions, not smooth min-max sampling bands.
- Hard limits are safety rails and scientific or product plausibility boundaries.
- Explicit user overrides remain visible and authoritative at their declared scope.
- Upstream decisions may adjust downstream targets, but those adjustments must be recorded rather than silently replacing the original intent.
- A parameter may have several meaningful values: requested target, sampled input, adjusted downstream target, achieved output, and final reconciled value.
- Diagnostics must distinguish an input parameter from an observed output metric with the same general name.
- Deterministic replay includes the target definitions, sampled values, influence rules, and algorithm versions that produced the result.

## Correlation model

Start with a small set of named latent factors. Each preset defines a center and spread for these factors. Individual parameter distributions then derive bounded adjustments from them.

Initial factors:

- **Water balance**: ocean inventory, atmospheric moisture availability, runoff pressure, lake support, and broad aridity.
- **Thermal regime**: stellar flux, average temperature, ice pressure, evaporation capacity, and habitability margin.
- **Tectonic activity**: system age, world size, plate speed and count tendencies, volcanism, relief renewal, and impact retention.
- **Continental fragmentation**: continent count, continent scale, island density, plate subdivision, and coastline complexity.
- **System maturity**: stellar activity, geological age, impact history, weathering, and long-term stabilization.

The first implementation should use explicit influence functions and bounded coefficients rather than a hidden statistical matrix. Each influence must have a stable ID, version, source parameter or factor, target parameter, direction, strength, and clamp behavior.

Example:

```text
fragmentation.high
  -> continentCount target +1.2 SD
  -> continentScale target -0.8 SD
  -> islandDensity target +1.0 SD
  -> plateCount target +0.4 SD
```

## Parameter target ledger

Add a versioned generation artifact or diagnostic section containing one record for every relevant parameter at every stage where its meaning changes.

Conceptual record:

```ts
interface ParameterTargetLedgerEntry {
  parameterId: string
  stageId: string
  semanticRole: 'preset-target' | 'sampled-input' | 'adjusted-target' | 'achieved-output' | 'reconciled-output'
  unit?: string
  distribution?: {
    kind: string
    target: number
    standardDeviation?: number
    hardMin: number
    hardMax: number
  }
  value?: number
  source: {
    kind: 'preset' | 'user-override' | 'sample' | 'derived' | 'measured' | 'reconciliation'
    id: string
    version?: string
  }
  influences: ParameterInfluenceRecord[]
  comparison?: {
    target: number
    delta: number
    standardizedDelta?: number
    withinHardBounds: boolean
    withinPreferredBand?: boolean
  }
}
```

Each `ParameterInfluenceRecord` should identify:

- influence ID and version;
- upstream parameter, factor, or generated fact;
- input value;
- adjustment applied;
- target before and after the adjustment;
- clamp or reconciliation that limited the adjustment;
- short human-readable explanation.

## Example audit path

For final ocean coverage, the inspectable chain may look like:

1. Earthlike preset target: 68%, SD 5 percentage points.
2. Seed sample: 65.8%.
3. User override: none.
4. Water-balance factor adjustment: +1.4 points.
5. Active terrain-stage target: 67.2%.
6. Initial sea-level reconciliation achieved: 66.9%.
7. Deep-time terrain mutation shifted provisional coverage to 65.7%.
8. Final water reconciliation achieved: 67.0%.
9. Final deviation from active target: -0.2 points; within tolerance.

The same pattern should work for average temperature, runoff pressure, plate count, continent structure, ice coverage, and other parameters where upstream forcing changes downstream expectations.

## River and runoff semantics

The existing `riverDensity` identifier remains temporarily for compatibility, but its product meaning is runoff and river-network pressure.

The audit must distinguish:

- requested runoff/network target;
- precipitation and meltwater support;
- terrain drainage capacity;
- channel threshold selected by hydrology;
- achieved drainage density;
- named river count and length distribution.

A future schema revision may rename the input to `runoffNetworkTarget` while retaining an import alias for legacy projects.

## Stage integration

Recommended sequence:

1. `system.orbit`: record preset distributions, explicit overrides, latent factors, sampled inputs, and stellar/orbital forcing.
2. `terrain.crust-fields` and `terrain.topology-elevation`: record adjusted structural targets and achieved continent/plate/relief metrics.
3. `terrain.finalization`: record ocean target, sea-level solve, and achieved water fraction.
4. `climate.glaciation`: record thermal and moisture targets, forcing adjustments, and achieved climate metrics.
5. `ecology.hydrology-biomes`: record runoff/network target, selected channel thresholds, and achieved hydrology metrics.
6. `world.deep-time-aging`: append target changes and stage deltas rather than replacing initial records.
7. `world.outputs-validation`: reconcile the ledger, flag unexplained target movement, and attach final comparisons.

## Validation and guardrails

- Every target adjustment must identify at least one influence source.
- No stage may silently overwrite the original preset or user target.
- Repeated runs with identical seeds, distributions, influence versions, and workflows must produce identical ledgers.
- User overrides must remain distinguishable from sampled or derived values.
- The audit must remain compact enough to save with ordinary projects. Large cell-level evidence belongs in optional diagnostic artifacts.
- Missing audit records should warn during development and validation before they become package-breaking errors.

## Delivery increments

### Increment 1: Correlation foundation

- Define latent-factor contracts and versioned influence rules.
- Sample factors deterministically from node-scoped streams.
- Apply bounded adjustments to resolved parameter distributions.
- Add fixed-seed tests proving coherent directional effects.

### Increment 2: Parameter target ledger

- Add the versioned ledger contract.
- Record preset, override, sampled, and adjusted values in system/orbit.
- Carry the ledger through the generation graph.
- Add final target-versus-achieved summaries for ocean, temperature, plate count, continents, and runoff.

### Increment 3: Stage-complete audit

- Instrument each relevant node.
- Show upstream influence chains and reconciliation events.
- Add consistency checks for unexplained target drift.
- Include the ledger in replay signatures and `.wforge` compatibility planning.

### Increment 4: Inspection UI

- Add a parameter audit view in Dev first.
- Provide expandable influence chains and before/after target comparisons.
- Promote a simplified user-facing explanation view only after the ledger proves stable and useful.

## Relationship to other planned work

- Physical moisture fetch should write source-water width, maximum inland carry, rainout, and orographic adjustments into the climate portion of the ledger.
- Initial-world-foundation optimization must preserve the same target and influence semantics even when intermediate full-world products are deferred.
- Parameter distributions and correlation rules should be maintained in the companion Google Sheet, while algorithm-specific influence logic remains versioned in source.
