# Current Generation Performance Profile

Generated: 2026-08-02T15:20:40.958Z
Source commit: 7153aa3ec73718ce3ee30f7e86186203009ca979
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 3 seeds x 3 scenarios x 1 run(s), 512x256

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 9 | 145.8 | 147.2 | 151.2 | 5.43% | 1483.4 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 9 | 79.2 | 77.9 | 92.8 | 2.95% | 805.9 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.atmospheric-flow | 9 | 44.1 | 41.4 | 48.9 | 1.63% | 449.1 | 1.0000 | 2.00 | 0.75 |
| 4 | foundation.climate.ocean-currents | 9 | 38.5 | 34.2 | 46.9 | 1.41% | 392.0 | 1.0000 | 2.00 | 0.75 |
| 5 | foundation.hydrology.drainage-surface | 9 | 32.7 | 34.4 | 37.6 | 1.21% | 332.5 | 1.0000 | 1.00 | 0.38 |
| 6 | foundation.hydrology.water-distance | 9 | 25.6 | 25.7 | 26.5 | 0.95% | 260.0 | 1.0000 | 48.00 | 0.38 |
| 7 | foundation.hydrology.elevation-ordering | 9 | 21.3 | 20.5 | 23.8 | 0.79% | 216.3 | 1.0000 | 0.00 | 0.75 |
| 8 | topology-to-raster-final-projection | 9 | 20.6 | 21.1 | 22.6 | 0.77% | 209.9 | 1.3333 | 0.00 | 0.00 |
| 9 | permanent-ice-classification | 9 | 19.8 | 18.6 | 23.5 | 0.73% | 201.8 | 1.0000 | 4.00 | 0.56 |
| 10 | foundation.climate.moisture-candidate-water-distance | 9 | 12.9 | 12.9 | 13.1 | 0.48% | 131.1 | 1.0000 | 24.00 | 0.38 |
| 11 | foundation.climate.water-distance | 9 | 10.2 | 9.7 | 10.0 | 0.38% | 103.8 | 1.0000 | 18.00 | 0.38 |
| 12 | foundation.terrain.impacts | 9 | 7.9 | 9.7 | 10.2 | 0.29% | 80.1 | 1.0000 | 0.00 | 0.00 |
| 13 | foundation.climate.temperature-field | 9 | 7.7 | 7.8 | 8.0 | 0.29% | 78.4 | 1.0000 | 1.00 | 0.00 |
| 14 | reference-scale-field-reduction | 9 | 6.9 | 6.9 | 8.3 | 0.26% | 70.5 | 0.1711 | 0.00 | 0.12 |
| 15 | foundation.terrain.coastal-shelves | 9 | 5.3 | 4.7 | 8.1 | 0.19% | 54.0 | 1.0000 | 3.33 | 0.38 |
| 16 | vacated-fragment-corridor-repair | 9 | 5.2 | 4.1 | 7.9 | 0.20% | 53.1 | 0.0786 | 1.00 | 0.03 |
| 17 | foundation.projection.scalar-copy | 9 | 4.9 | 4.9 | 6.0 | 0.18% | 50.1 | 1.3333 | 0.00 | 0.00 |
| 18 | masked-topology-field-expansion-and-blend | 9 | 4.8 | 5.0 | 5.3 | 0.18% | 49.3 | 0.1711 | 0.00 | 0.06 |
| 19 | foundation.climate.moisture-candidate-land-distance | 9 | 4.5 | 4.3 | 4.4 | 0.17% | 45.7 | 1.0000 | 8.00 | 0.38 |
| 20 | foundation.terrain.hydraulic-erosion | 9 | 4.0 | 3.6 | 5.8 | 0.15% | 40.9 | 1.0000 | 3.00 | 0.38 |
| 21 | foundation.hydrology.receiver-flow-initialization | 9 | 3.8 | 3.5 | 4.5 | 0.14% | 39.0 | 1.0000 | 1.00 | 0.75 |
| 22 | foundation.terrain.thermal-weathering | 9 | 3.1 | 2.6 | 4.9 | 0.11% | 31.9 | 1.0000 | 3.67 | 0.38 |
| 23 | foundation.hydrology.source-ordering | 9 | 3.0 | 2.8 | 2.9 | 0.11% | 30.5 | 1.0000 | 0.00 | 0.75 |
| 24 | foundation.hydrology.channel-marking | 9 | 2.9 | 2.5 | 4.7 | 0.11% | 29.6 | 1.0000 | 1.00 | 0.00 |
| 25 | foundation.climate.moisture-candidate-smoothing | 9 | 2.7 | 3.0 | 3.1 | 0.10% | 27.5 | 1.0000 | 2.00 | 0.75 |
| 26 | foundation.hydrology.flow-accumulation | 9 | 2.7 | 2.3 | 3.9 | 0.10% | 27.8 | 1.0000 | 1.00 | 0.00 |
| 27 | foundation.projection.vector-copy | 9 | 2.6 | 2.6 | 3.0 | 0.09% | 26.0 | 1.3333 | 0.00 | 0.00 |
| 28 | authoritative-topology-signal-expansion | 18 | 1.6 | 1.3 | 2.5 | 0.06% | 16.7 | 0.0383 | 1.00 | 0.38 |
| 29 | reference-scale-signal-smoothing | 18 | 1.2 | 0.9 | 0.9 | 0.04% | 47.2 | 0.1534 | 7.00 | 0.66 |
| 30 | reference-scale-corridor-propagation | 9 | 1.1 | 0.5 | 2.9 | 0.04% | 46.6 | 0.6843 | 4.00 | 0.38 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 9 | 349.6 | 373.3 | 428.2 | 12.88% |
| 2 | climate-rebuild | 9 | 328.1 | 341.9 | 359.0 | 12.17% |
| 3 | surface-aging | 9 | 322.3 | 334.1 | 346.4 | 11.97% |
| 4 | hydrology-rebuild | 9 | 181.3 | 191.3 | 193.5 | 6.72% |
| 5 | ledger-and-unattributed | 9 | 110.5 | 109.9 | 124.6 | 4.08% |
| 6 | fragment-placement | 9 | 89.9 | 86.0 | 104.2 | 3.33% |
| 7 | water-reconciliation | 9 | 68.3 | 66.4 | 73.3 | 2.53% |
| 8 | fragment-history | 9 | 61.1 | 64.1 | 76.2 | 2.25% |
| 9 | setup-models | 9 | 15.8 | 12.6 | 21.8 | 0.58% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | 3079.2 | 3079.7 | 1709.3 | 75.21 | 1.38 | 80 |
| earthlike-standard-3141592-512x256-run1 | 2858.9 | 2859.1 | 1684.9 | 73.99 | 2.74 | 80 |
| earthlike-standard-8675309-512x256-run1 | 2935.0 | 2935.2 | 1697.3 | 74.04 | 2.11 | 80 |
| archipelago-standard-1001001-512x256-run1 | 2440.5 | 2440.7 | 1337.2 | 68.92 | 9.94 | 55 |
| archipelago-standard-3141592-512x256-run1 | 2618.5 | 2618.7 | 1497.4 | 73.85 | 5.39 | 55 |
| archipelago-standard-8675309-512x256-run1 | 2537.5 | 2537.7 | 1460.3 | 80.32 | 0.00 | 55 |
| geology-glacial-stress-1001001-512x256-run1 | 2524.5 | 2524.7 | 1371.3 | 60.46 | 17.83 | 118 |
| geology-glacial-stress-3141592-512x256-run1 | 2646.8 | 2647.0 | 1491.4 | 68.07 | 7.61 | 118 |
| geology-glacial-stress-8675309-512x256-run1 | 2655.1 | 2655.4 | 1492.3 | 71.78 | 2.66 | 118 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

