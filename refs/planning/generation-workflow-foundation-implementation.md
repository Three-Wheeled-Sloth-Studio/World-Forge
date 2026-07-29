# Generation Workflow Foundation Implementation

Updated: 2026-07-29

Status: implementation slice for issue #14

## Intent

Complete the workflow and graph foundation before replacing structural-generation nodes. The production workflow remains available as the baseline and rollback path while an independent experimental workflow is modified and evaluated.

## Decisions

- Use the existing graph and node architecture rather than adding a parallel provider abstraction.
- Register two selectable workflows:
  - `core.live-world@1.0.0`
  - `core.performance-foundation@0.1.0`
- Keep the experimental workflow as an independent graph definition initially populated with the production node sequence.
- Preserve semantic node IDs across workflows so shared stages can be compared directly.
- Derive random streams from the root seed and semantic node or stage identity.
- Keep workflow and implementation identities in provenance, not in random seed derivation.
- Keep the production workflow as the default until the benchmark and quality gates support promotion.

## Implementation sequence

### 1. Workflow catalog and graph definitions

- Add a canonical workflow descriptor catalog.
- Expose independent production and experimental graph definitions.
- Resolve unknown or missing workflow IDs to the production workflow.
- Allow individual experimental nodes to be replaced without mutating the production workflow definition.

### 2. Execution plumbing

- Add the workflow selector to the Generator tab.
- Populate the Dev graph selector from the same workflow catalog.
- Carry the selected workflow through developer run events, generation configuration, the worker boundary, and generator-core execution.
- Leave partial graph restart behavior out of this slice. `startNodeId` remains telemetry until retained-artifact execution is implemented separately.

### 3. Deterministic seed isolation

- Replace shared mutable graph RNG consumption with node-scoped streams.
- Keep unchanged semantic nodes on identical streams across workflows and implementation replacements.
- Retain named substreams for future process-level isolation within large nodes.
- Add tests for deterministic replay, node isolation, and cross-workflow equivalence.

### 4. Provenance and replay

- Record workflow ID and version in replay manifests.
- Include workflow identity, version, node contracts, and implementation IDs in the workflow contract signature.
- Preserve source commit, application version, generator version, resolved configuration, selected values, and output signature.
- Treat missing workflow provenance in older manifests as the production workflow for backward compatibility.

### 5. Pairwise comparison harness

Add `npm run benchmark:workflows` with:

- exactly two selected workflows;
- fixed seeds;
- identical resolution and resolved configuration;
- sequential execution to avoid CPU and memory interference;
- source commit and runtime environment;
- workflow ID, version, and contract signature;
- total and wall-clock runtime;
- memory snapshots;
- output signatures;
- core quality and validity metrics;
- direct per-pair runtime deltas.

The first comparison should produce identical signatures because the experimental workflow begins as a copy of the production workflow. Once experimental nodes are replaced, signature differences are expected and must be evaluated through the PI quality scorecard.

## Acceptance for this slice

- Both workflow definitions are selectable from Generator and Dev views.
- The production workflow remains the default.
- The worker and generator execute the selected workflow.
- Production and experimental graph definitions are independent objects.
- Shared semantic stages receive the same random streams across workflows.
- Replay manifests identify the workflow and reject incompatible workflow contracts.
- The duplicate `system.orbit` artifact-summary key is removed.
- Pairwise workflow comparison output contains exact workflow and source provenance.
- Repository typecheck, tests, and build pass before merge.

## Follow-up implementation boundary

After this slice passes verification, begin issue #14 implementation by replacing nodes only in `core.performance-foundation`, starting with structural topology, crust growth, and bounded deep-time response. Do not modify the production workflow implementation except for shared instrumentation and proven reusable infrastructure.
