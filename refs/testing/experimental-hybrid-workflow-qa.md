# Experimental Hybrid Workflow QA

Validated against Detailed at 256 x 128 using seeds `1001001`, `3141592`, and `8675309` across Earthlike, Archipelago, and geology/glacial stress scenarios.

## Required contract checks

- Detailed remains `core.performance-foundation@1.0.0`.
- Experimental is `core.world-generation-experimental@0.3.0`.
- The terrestrial-habitable capability profile resolves the complete current graph.
- Structurally inapplicable nodes are omitted with deterministic reasons.
- Nodes whose applicability depends on runtime results can emit `skipped` with an explicit reason and typed fallback output.
- Skipped nodes do not execute their main function.
- Worker telemetry and the Dev graph preserve the skipped phase and reason.
- Detailed and Experimental produce matching rendered-output and normalized authoritative signatures.
- Full repository verification passes.
- Experimental generation completes in Chromium at 1440 x 900 and 1920 x 1080 without console errors or page overflow.
