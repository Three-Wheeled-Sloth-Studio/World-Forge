# Present-climate topology traversal benchmark

- Source commit: `5051d4bf3913bea3ca50ca0db39dfcd880469846`
- Baseline: `core.performance-foundation`
- Candidate: `core.world-generation-experimental`
- Matched pairs: 9
- Coarse signatures: 9/9 identical
- Authoritative signatures: 9/9 identical
- Metric objects: 9/9 identical
- Mean climate-rebuild reduction: **66.81%**
- Mean deep-time reduction: **32.53%**
- Mean total-generation reduction: **22.85%**
- Climate-rebuild range: 64.42% to 70.65%
- Maximum post-run RSS: baseline 276.7 MB; candidate 275.1 MB

The RSS reading is sequential process RSS before and after each run, not a peak-stage memory measurement.

## Pair results

| Scenario | Seed | Climate reduction | Deep-time reduction | Total reduction |
| --- | ---: | ---: | ---: | ---: |
| archipelago-standard | 1001001 | 70.05% | 30.11% | 19.94% |
| archipelago-standard | 3141592 | 70.41% | 36.48% | 25.02% |
| archipelago-standard | 8675309 | 70.65% | 32.85% | 22.68% |
| earthlike-standard | 1001001 | 64.95% | 32.25% | 25.42% |
| earthlike-standard | 3141592 | 64.95% | 37.16% | 28.90% |
| earthlike-standard | 8675309 | 66.85% | 31.76% | 23.29% |
| geology-glacial-stress | 1001001 | 64.46% | 28.85% | 19.31% |
| geology-glacial-stress | 3141592 | 64.55% | 33.83% | 21.66% |
| geology-glacial-stress | 8675309 | 64.42% | 29.45% | 19.48% |

## Implementation boundary

Only `core.world-generation-experimental` enables the traversal optimization. Detailed, Legacy, and developer controls retain their existing paths. Rollback is workflow selection or reverting the isolated feature flag and helper module.
