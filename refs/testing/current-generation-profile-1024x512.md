# Current Generation Performance Profile

Generated: 2026-08-02T15:19:49.481Z
Source commit: 9d6ea21a3493fab351b55df5c7ad8dc145ee9663
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 2 seeds x 1 scenarios x 1 run(s), 1024x512

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 2 | 1055.6 | 1069.0 | 1069.0 | 4.95% | 2684.5 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 2 | 570.8 | 575.1 | 575.1 | 2.68% | 1451.5 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.hydrology.drainage-surface | 2 | 344.1 | 355.6 | 355.6 | 1.62% | 875.1 | 1.0000 | 1.00 | 1.50 |
| 4 | foundation.climate.atmospheric-flow | 2 | 331.6 | 339.8 | 339.8 | 1.55% | 843.3 | 1.0000 | 2.00 | 3.00 |
| 5 | foundation.climate.ocean-currents | 2 | 299.2 | 332.7 | 332.7 | 1.40% | 760.9 | 1.0000 | 2.00 | 3.00 |
| 6 | foundation.hydrology.water-distance | 2 | 191.6 | 195.6 | 195.6 | 0.90% | 487.4 | 1.0000 | 48.00 | 1.50 |
| 7 | topology-to-raster-final-projection | 2 | 164.3 | 164.4 | 164.4 | 0.77% | 417.8 | 1.3333 | 0.00 | 0.00 |
| 8 | permanent-ice-classification | 2 | 162.3 | 170.5 | 170.5 | 0.76% | 412.8 | 1.0000 | 4.00 | 2.25 |
| 9 | foundation.hydrology.elevation-ordering | 2 | 133.6 | 137.2 | 137.2 | 0.63% | 339.8 | 1.0000 | 0.00 | 3.00 |
| 10 | foundation.terrain.impacts | 2 | 124.1 | 125.3 | 125.3 | 0.58% | 315.6 | 1.0000 | 0.00 | 0.00 |
| 11 | foundation.climate.moisture-candidate-water-distance | 2 | 96.0 | 98.4 | 98.4 | 0.45% | 244.0 | 1.0000 | 24.00 | 1.50 |
| 12 | foundation.climate.water-distance | 2 | 78.2 | 82.8 | 82.8 | 0.37% | 198.7 | 1.0000 | 18.00 | 1.50 |
| 13 | foundation.climate.temperature-field | 2 | 49.0 | 49.4 | 49.4 | 0.23% | 124.6 | 1.0000 | 1.00 | 0.00 |
| 14 | vacated-fragment-corridor-repair | 2 | 46.8 | 55.8 | 55.8 | 0.22% | 119.1 | 0.0573 | 1.00 | 0.09 |
| 15 | reference-scale-field-reduction | 2 | 43.5 | 55.3 | 55.3 | 0.20% | 110.5 | 0.1081 | 0.00 | 0.12 |
| 16 | foundation.climate.moisture-candidate-land-distance | 2 | 33.8 | 34.9 | 34.9 | 0.16% | 86.0 | 1.0000 | 8.00 | 1.50 |
| 17 | foundation.terrain.coastal-shelves | 2 | 28.5 | 32.0 | 32.0 | 0.13% | 72.5 | 1.0000 | 3.00 | 1.50 |
| 18 | masked-topology-field-expansion-and-blend | 2 | 28.4 | 29.3 | 29.3 | 0.13% | 72.2 | 0.1081 | 0.00 | 0.16 |
| 19 | foundation.terrain.thermal-weathering | 2 | 21.3 | 25.2 | 25.2 | 0.10% | 54.2 | 1.0000 | 3.00 | 1.50 |
| 20 | foundation.terrain.hydraulic-erosion | 2 | 20.4 | 22.5 | 22.5 | 0.10% | 51.9 | 1.0000 | 2.00 | 1.50 |
| 21 | foundation.hydrology.source-ordering | 2 | 19.2 | 22.3 | 22.3 | 0.09% | 48.7 | 1.0000 | 0.00 | 3.00 |
| 22 | foundation.projection.scalar-copy | 2 | 17.9 | 19.9 | 19.9 | 0.08% | 45.5 | 1.3333 | 0.00 | 0.00 |
| 23 | authoritative-topology-signal-expansion | 4 | 17.0 | 18.4 | 19.3 | 0.08% | 43.2 | 0.0158 | 1.00 | 1.50 |
| 24 | foundation.hydrology.channel-marking | 2 | 16.1 | 18.9 | 18.9 | 0.08% | 40.9 | 1.0000 | 1.00 | 0.00 |
| 25 | foundation.climate.moisture-candidate-smoothing | 2 | 12.9 | 13.3 | 13.3 | 0.06% | 32.7 | 1.0000 | 2.00 | 3.00 |
| 26 | foundation.hydrology.flow-accumulation | 2 | 10.2 | 12.1 | 12.1 | 0.05% | 25.9 | 1.0000 | 1.00 | 0.00 |
| 27 | authoritative-topology-post-expansion-smoothing | 4 | 9.8 | 9.6 | 10.4 | 0.05% | 24.8 | 0.0158 | 2.00 | 3.00 |
| 28 | foundation.hydrology.receiver-flow-initialization | 2 | 9.4 | 9.7 | 9.7 | 0.04% | 23.8 | 1.0000 | 1.00 | 3.00 |
| 29 | foundation.projection.vector-copy | 2 | 7.7 | 8.0 | 8.0 | 0.04% | 19.6 | 1.3333 | 0.00 | 0.00 |
| 30 | foundation.climate.wetness-smoothing | 2 | 6.9 | 9.0 | 9.0 | 0.03% | 17.5 | 1.0000 | 1.00 | 1.50 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 2 | 3827.9 | 4078.4 | 4078.4 | 17.92% |
| 2 | surface-aging | 2 | 2838.9 | 2856.4 | 2856.4 | 13.32% |
| 3 | climate-rebuild | 2 | 2832.0 | 2835.9 | 2835.9 | 13.29% |
| 4 | hydrology-rebuild | 2 | 1374.3 | 1399.2 | 1399.2 | 6.44% |
| 5 | ledger-and-unattributed | 2 | 697.0 | 730.3 | 730.3 | 3.26% |
| 6 | water-reconciliation | 2 | 514.2 | 515.2 | 515.2 | 2.41% |
| 7 | fragment-placement | 2 | 490.2 | 597.5 | 597.5 | 2.28% |
| 8 | fragment-history | 2 | 294.8 | 336.6 | 336.6 | 1.38% |
| 9 | setup-models | 2 | 88.2 | 117.2 | 117.2 | 0.41% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-1024x512-run1 | 22100.3 | 22101.1 | 13431.7 | 76.18 | 0.60 | 80 |
| earthlike-standard-3141592-1024x512-run1 | 20580.1 | 20580.7 | 12483.5 | 73.47 | 2.62 | 80 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

