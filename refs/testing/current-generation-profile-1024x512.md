# Current Generation Performance Profile

Generated: 2026-08-02T15:21:03.007Z
Source commit: 7153aa3ec73718ce3ee30f7e86186203009ca979
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 2 seeds x 1 scenarios x 1 run(s), 1024x512

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 2 | 573.7 | 577.0 | 577.0 | 5.28% | 1458.9 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 2 | 308.8 | 310.1 | 310.1 | 2.84% | 785.3 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.atmospheric-flow | 2 | 175.6 | 181.1 | 181.1 | 1.61% | 446.4 | 1.0000 | 2.00 | 3.00 |
| 4 | foundation.hydrology.drainage-surface | 2 | 168.1 | 176.1 | 176.1 | 1.55% | 427.6 | 1.0000 | 1.00 | 1.50 |
| 5 | foundation.climate.ocean-currents | 2 | 155.1 | 165.1 | 165.1 | 1.42% | 394.6 | 1.0000 | 2.00 | 3.00 |
| 6 | foundation.hydrology.water-distance | 2 | 98.9 | 101.3 | 101.3 | 0.91% | 251.6 | 1.0000 | 48.00 | 1.50 |
| 7 | foundation.hydrology.elevation-ordering | 2 | 81.2 | 84.0 | 84.0 | 0.75% | 206.4 | 1.0000 | 0.00 | 3.00 |
| 8 | permanent-ice-classification | 2 | 78.0 | 81.7 | 81.7 | 0.72% | 198.4 | 1.0000 | 4.00 | 2.25 |
| 9 | topology-to-raster-final-projection | 2 | 77.4 | 77.7 | 77.7 | 0.71% | 196.8 | 1.3333 | 0.00 | 0.00 |
| 10 | foundation.terrain.impacts | 2 | 56.9 | 59.2 | 59.2 | 0.52% | 144.7 | 1.0000 | 0.00 | 0.00 |
| 11 | foundation.climate.moisture-candidate-water-distance | 2 | 48.6 | 49.9 | 49.9 | 0.45% | 123.5 | 1.0000 | 24.00 | 1.50 |
| 12 | foundation.climate.water-distance | 2 | 39.6 | 43.8 | 43.8 | 0.36% | 100.6 | 1.0000 | 18.00 | 1.50 |
| 13 | foundation.climate.temperature-field | 2 | 26.0 | 26.9 | 26.9 | 0.24% | 66.0 | 1.0000 | 1.00 | 0.00 |
| 14 | vacated-fragment-corridor-repair | 2 | 22.1 | 28.4 | 28.4 | 0.21% | 56.2 | 0.0573 | 1.00 | 0.09 |
| 15 | reference-scale-field-reduction | 2 | 21.2 | 25.4 | 25.4 | 0.19% | 53.8 | 0.1081 | 0.00 | 0.12 |
| 16 | foundation.climate.moisture-candidate-land-distance | 2 | 16.8 | 17.9 | 17.9 | 0.15% | 42.7 | 1.0000 | 8.00 | 1.50 |
| 17 | foundation.terrain.coastal-shelves | 2 | 15.2 | 16.7 | 16.7 | 0.14% | 38.5 | 1.0000 | 3.00 | 1.50 |
| 18 | foundation.projection.scalar-copy | 2 | 14.4 | 16.5 | 16.5 | 0.13% | 36.5 | 1.3333 | 0.00 | 0.00 |
| 19 | masked-topology-field-expansion-and-blend | 2 | 12.8 | 14.5 | 14.5 | 0.12% | 32.4 | 0.1081 | 0.00 | 0.16 |
| 20 | foundation.terrain.hydraulic-erosion | 2 | 11.3 | 12.7 | 12.7 | 0.10% | 28.6 | 1.0000 | 2.00 | 1.50 |
| 21 | foundation.terrain.thermal-weathering | 2 | 11.1 | 12.7 | 12.7 | 0.10% | 28.4 | 1.0000 | 3.00 | 1.50 |
| 22 | foundation.hydrology.source-ordering | 2 | 10.9 | 11.9 | 11.9 | 0.10% | 27.7 | 1.0000 | 0.00 | 3.00 |
| 23 | foundation.hydrology.channel-marking | 2 | 9.5 | 10.7 | 10.7 | 0.09% | 24.0 | 1.0000 | 1.00 | 0.00 |
| 24 | authoritative-topology-signal-expansion | 4 | 7.4 | 8.2 | 9.0 | 0.07% | 18.9 | 0.0158 | 1.00 | 1.50 |
| 25 | foundation.projection.vector-copy | 2 | 7.0 | 7.9 | 7.9 | 0.06% | 17.8 | 1.3333 | 0.00 | 0.00 |
| 26 | foundation.climate.moisture-candidate-smoothing | 2 | 6.3 | 6.6 | 6.6 | 0.06% | 15.9 | 1.0000 | 2.00 | 3.00 |
| 27 | foundation.hydrology.flow-accumulation | 2 | 6.2 | 7.2 | 7.2 | 0.06% | 15.6 | 1.0000 | 1.00 | 0.00 |
| 28 | foundation.hydrology.receiver-flow-initialization | 2 | 5.4 | 5.7 | 5.7 | 0.05% | 13.7 | 1.0000 | 1.00 | 3.00 |
| 29 | authoritative-topology-post-expansion-smoothing | 4 | 4.3 | 4.2 | 4.9 | 0.04% | 10.8 | 0.0158 | 2.00 | 3.00 |
| 30 | foundation.climate.wetness-smoothing | 2 | 3.7 | 5.1 | 5.1 | 0.03% | 9.3 | 1.0000 | 1.00 | 1.50 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 2 | 1950.7 | 2086.3 | 2086.3 | 17.91% |
| 2 | climate-rebuild | 2 | 1338.7 | 1380.9 | 1380.9 | 12.31% |
| 3 | surface-aging | 2 | 1335.8 | 1336.8 | 1336.8 | 12.30% |
| 4 | hydrology-rebuild | 2 | 700.1 | 723.2 | 723.2 | 6.44% |
| 5 | ledger-and-unattributed | 2 | 394.4 | 414.0 | 414.0 | 3.62% |
| 6 | fragment-placement | 2 | 268.3 | 329.8 | 329.8 | 2.45% |
| 7 | water-reconciliation | 2 | 261.2 | 265.9 | 265.9 | 2.40% |
| 8 | fragment-history | 2 | 155.9 | 179.5 | 179.5 | 1.43% |
| 9 | setup-models | 2 | 43.7 | 56.9 | 56.9 | 0.40% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-1024x512-run1 | 11350.6 | 11351.2 | 6773.5 | 76.18 | 0.60 | 80 |
| earthlike-standard-3141592-1024x512-run1 | 10411.3 | 10411.7 | 6124.1 | 73.47 | 2.62 | 80 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

