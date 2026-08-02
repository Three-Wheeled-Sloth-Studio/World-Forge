# Current Generation Performance Profile

Generated: 2026-08-02T15:33:41.556Z
Source commit: 6133178c2d0e79d9bb1af52101b9e497805c6998
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 3 seeds x 3 scenarios x 1 run(s), 512x256

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep-time.final.basin-circulation | 9 | 567.8 | 645.5 | 686.4 | 11.21% | 5776.2 | 1.3333 | 0.00 | 0.00 |
| 2 | foundation.climate.wetness-traversal | 9 | 268.2 | 266.0 | 280.7 | 5.33% | 2728.2 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.moisture-candidate-traversal | 9 | 146.5 | 150.6 | 165.7 | 2.91% | 1490.7 | 1.0000 | 1.00 | 0.00 |
| 4 | foundation.climate.atmospheric-flow | 9 | 80.5 | 75.1 | 88.7 | 1.59% | 818.4 | 1.0000 | 2.00 | 0.75 |
| 5 | foundation.climate.ocean-currents | 9 | 71.6 | 62.7 | 82.7 | 1.40% | 728.0 | 1.0000 | 2.00 | 0.75 |
| 6 | foundation.hydrology.drainage-surface | 9 | 64.8 | 61.4 | 71.6 | 1.28% | 659.6 | 1.0000 | 1.00 | 0.38 |
| 7 | foundation.hydrology.water-distance | 9 | 48.0 | 47.7 | 49.2 | 0.95% | 487.8 | 1.0000 | 48.00 | 0.38 |
| 8 | topology-to-raster-final-projection | 9 | 41.3 | 40.1 | 44.7 | 0.82% | 419.7 | 1.3333 | 0.00 | 0.00 |
| 9 | foundation.hydrology.elevation-ordering | 9 | 38.6 | 37.4 | 42.1 | 0.77% | 392.4 | 1.0000 | 0.00 | 0.75 |
| 10 | permanent-ice-classification | 9 | 37.0 | 34.9 | 45.0 | 0.73% | 375.9 | 1.0000 | 4.00 | 0.56 |
| 11 | foundation.climate.moisture-candidate-water-distance | 9 | 24.6 | 24.1 | 25.0 | 0.49% | 250.0 | 1.0000 | 24.00 | 0.38 |
| 12 | deep-time.final.biome-classification | 9 | 24.6 | 24.9 | 25.9 | 0.49% | 249.9 | 1.0000 | 1.00 | 0.00 |
| 13 | foundation.climate.water-distance | 9 | 19.3 | 18.3 | 18.8 | 0.38% | 196.2 | 1.0000 | 18.00 | 0.38 |
| 14 | foundation.terrain.impacts | 9 | 15.3 | 17.5 | 20.7 | 0.30% | 155.6 | 1.0000 | 0.00 | 0.00 |
| 15 | foundation.climate.temperature-field | 9 | 13.7 | 13.9 | 14.6 | 0.27% | 138.9 | 1.0000 | 1.00 | 0.00 |
| 16 | reference-scale-field-reduction | 9 | 13.2 | 13.3 | 15.3 | 0.26% | 134.3 | 0.1711 | 0.00 | 0.12 |
| 17 | vacated-fragment-corridor-repair | 9 | 10.4 | 10.2 | 15.4 | 0.21% | 105.9 | 0.0786 | 1.00 | 0.03 |
| 18 | masked-topology-field-expansion-and-blend | 9 | 10.3 | 10.2 | 13.6 | 0.20% | 105.2 | 0.1711 | 0.00 | 0.06 |
| 19 | foundation.terrain.coastal-shelves | 9 | 10.0 | 8.5 | 14.0 | 0.19% | 101.8 | 1.0000 | 3.33 | 0.38 |
| 20 | deep-time.final.metrics-validation | 9 | 9.7 | 10.7 | 12.9 | 0.19% | 98.6 | 1.3333 | 1.00 | 0.00 |
| 21 | foundation.climate.moisture-candidate-land-distance | 9 | 8.9 | 8.5 | 8.8 | 0.18% | 90.4 | 1.0000 | 8.00 | 0.38 |
| 22 | foundation.projection.scalar-copy | 9 | 7.9 | 7.8 | 9.4 | 0.16% | 80.5 | 1.3333 | 0.00 | 0.00 |
| 23 | foundation.terrain.hydraulic-erosion | 9 | 7.5 | 7.0 | 8.6 | 0.15% | 76.0 | 1.0000 | 3.00 | 0.38 |
| 24 | foundation.terrain.thermal-weathering | 9 | 6.0 | 5.4 | 9.8 | 0.12% | 61.1 | 1.0000 | 3.67 | 0.38 |
| 25 | foundation.hydrology.flow-accumulation | 9 | 6.0 | 5.5 | 8.7 | 0.12% | 60.6 | 1.0000 | 1.00 | 0.00 |
| 26 | foundation.hydrology.channel-marking | 9 | 6.0 | 4.8 | 8.0 | 0.12% | 61.5 | 1.0000 | 1.00 | 0.00 |
| 27 | foundation.hydrology.receiver-flow-initialization | 9 | 5.7 | 5.7 | 6.8 | 0.11% | 57.5 | 1.0000 | 1.00 | 0.75 |
| 28 | foundation.climate.moisture-candidate-smoothing | 9 | 4.8 | 5.0 | 5.7 | 0.10% | 49.2 | 1.0000 | 2.00 | 0.75 |
| 29 | foundation.hydrology.source-ordering | 9 | 4.8 | 4.6 | 5.6 | 0.09% | 49.3 | 1.0000 | 0.00 | 0.75 |
| 30 | foundation.projection.vector-copy | 9 | 3.9 | 4.3 | 4.8 | 0.08% | 40.1 | 1.3333 | 0.00 | 0.00 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 9 | 646.1 | 720.7 | 770.4 | 12.76% |
| 2 | climate-rebuild | 9 | 636.5 | 672.5 | 690.5 | 12.61% |
| 3 | surface-aging | 9 | 629.1 | 653.7 | 661.4 | 12.48% |
| 4 | hydrology-rebuild | 9 | 340.7 | 357.5 | 363.1 | 6.75% |
| 5 | ledger-and-unattributed | 9 | 196.5 | 194.1 | 220.4 | 3.88% |
| 6 | fragment-placement | 9 | 172.1 | 166.2 | 213.0 | 3.40% |
| 7 | water-reconciliation | 9 | 128.1 | 125.1 | 139.3 | 2.54% |
| 8 | fragment-history | 9 | 109.7 | 105.0 | 137.2 | 2.16% |
| 9 | setup-models | 9 | 27.6 | 24.4 | 44.2 | 0.54% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | 5888.8 | 5889.6 | 3247.4 | 75.21 | 1.38 | 80 |
| earthlike-standard-3141592-512x256-run1 | 5209.7 | 5210.0 | 3062.9 | 73.99 | 2.74 | 80 |
| earthlike-standard-8675309-512x256-run1 | 5469.3 | 5469.6 | 3214.6 | 74.04 | 2.11 | 80 |
| archipelago-standard-1001001-512x256-run1 | 4534.1 | 4534.4 | 2539.0 | 68.92 | 9.94 | 55 |
| archipelago-standard-3141592-512x256-run1 | 4823.4 | 4823.7 | 2752.0 | 73.85 | 5.39 | 55 |
| archipelago-standard-8675309-512x256-run1 | 4797.8 | 4798.1 | 2805.7 | 80.32 | 0.00 | 55 |
| geology-glacial-stress-1001001-512x256-run1 | 4758.7 | 4759.0 | 2637.1 | 60.46 | 17.83 | 118 |
| geology-glacial-stress-3141592-512x256-run1 | 4957.0 | 4957.2 | 2823.7 | 68.07 | 7.61 | 118 |
| geology-glacial-stress-8675309-512x256-run1 | 5045.5 | 5045.8 | 2897.2 | 71.78 | 2.66 | 118 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

