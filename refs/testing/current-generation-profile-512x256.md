# Current Generation Performance Profile

Generated: 2026-08-02T15:37:45.768Z
Source commit: 9fced66219acfe8bf8ff314f024be322a7fba7c1
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 3 seeds x 3 scenarios x 1 run(s), 512x256

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep-time.final.basin-circulation | 9 | 385.3 | 431.7 | 457.1 | 11.58% | 3919.4 | 1.3333 | 0.00 | 0.00 |
| 2 | basin-circulation.pack-gyres | 9 | 291.2 | 318.9 | 355.9 | 8.78% | 2962.2 | 1.3333 | 14.00 | 0.25 |
| 3 | foundation.climate.wetness-traversal | 9 | 164.9 | 161.8 | 171.7 | 5.00% | 1677.9 | 1.0000 | 1.00 | 0.00 |
| 4 | foundation.climate.moisture-candidate-traversal | 9 | 91.2 | 97.6 | 102.3 | 2.76% | 928.2 | 1.0000 | 1.00 | 0.00 |
| 5 | foundation.climate.atmospheric-flow | 9 | 51.2 | 46.9 | 57.0 | 1.54% | 520.9 | 1.0000 | 2.00 | 0.75 |
| 6 | foundation.climate.ocean-currents | 9 | 49.5 | 43.6 | 57.7 | 1.47% | 503.8 | 1.0000 | 2.00 | 0.75 |
| 7 | foundation.hydrology.drainage-surface | 9 | 44.9 | 40.7 | 51.2 | 1.35% | 456.4 | 1.0000 | 1.00 | 0.38 |
| 8 | foundation.hydrology.water-distance | 9 | 39.2 | 38.4 | 39.3 | 1.19% | 399.2 | 1.0000 | 48.00 | 0.38 |
| 9 | permanent-ice-classification | 9 | 25.4 | 24.7 | 30.0 | 0.76% | 258.2 | 1.0000 | 4.00 | 0.56 |
| 10 | foundation.hydrology.elevation-ordering | 9 | 24.0 | 23.8 | 24.1 | 0.73% | 244.3 | 1.0000 | 0.00 | 0.75 |
| 11 | topology-to-raster-final-projection | 9 | 22.8 | 21.6 | 24.5 | 0.69% | 232.4 | 1.3333 | 0.00 | 0.00 |
| 12 | foundation.climate.moisture-candidate-water-distance | 9 | 19.4 | 19.0 | 19.7 | 0.59% | 197.5 | 1.0000 | 24.00 | 0.38 |
| 13 | deep-time.final.biome-classification | 9 | 16.5 | 15.8 | 18.4 | 0.50% | 167.6 | 1.0000 | 1.00 | 0.00 |
| 14 | foundation.climate.water-distance | 9 | 15.1 | 14.2 | 14.8 | 0.46% | 153.9 | 1.0000 | 18.00 | 0.38 |
| 15 | foundation.terrain.impacts | 9 | 11.3 | 11.9 | 15.4 | 0.34% | 115.4 | 1.0000 | 0.00 | 0.00 |
| 16 | basin-circulation.label-basins | 9 | 10.9 | 9.4 | 18.1 | 0.32% | 110.4 | 1.3333 | 1.00 | 0.50 |
| 17 | foundation.climate.temperature-field | 9 | 9.7 | 9.6 | 10.8 | 0.29% | 98.7 | 1.0000 | 1.00 | 0.00 |
| 18 | reference-scale-field-reduction | 9 | 8.8 | 9.1 | 9.8 | 0.27% | 89.6 | 0.1711 | 0.00 | 0.12 |
| 19 | basin-circulation.coast-distance | 9 | 8.8 | 6.0 | 15.2 | 0.26% | 89.5 | 1.3333 | 2.00 | 0.50 |
| 20 | foundation.terrain.coastal-shelves | 9 | 7.4 | 6.1 | 10.2 | 0.22% | 75.3 | 1.0000 | 3.33 | 0.38 |
| 21 | vacated-fragment-corridor-repair | 9 | 7.3 | 7.1 | 9.9 | 0.22% | 74.1 | 0.0786 | 1.00 | 0.03 |
| 22 | foundation.climate.moisture-candidate-land-distance | 9 | 6.9 | 6.5 | 6.7 | 0.21% | 69.9 | 1.0000 | 8.00 | 0.38 |
| 23 | deep-time.final.metrics-validation | 9 | 6.8 | 7.6 | 9.0 | 0.20% | 69.2 | 1.3333 | 1.00 | 0.00 |
| 24 | masked-topology-field-expansion-and-blend | 9 | 5.8 | 6.0 | 6.9 | 0.17% | 58.7 | 0.1711 | 0.00 | 0.06 |
| 25 | foundation.projection.scalar-copy | 9 | 5.3 | 5.2 | 5.9 | 0.16% | 54.0 | 1.3333 | 0.00 | 0.00 |
| 26 | foundation.terrain.hydraulic-erosion | 9 | 5.2 | 4.8 | 6.5 | 0.15% | 53.2 | 1.0000 | 3.00 | 0.38 |
| 27 | foundation.terrain.thermal-weathering | 9 | 4.4 | 3.8 | 6.8 | 0.13% | 44.4 | 1.0000 | 3.67 | 0.38 |
| 28 | foundation.hydrology.channel-marking | 9 | 4.3 | 4.5 | 6.1 | 0.13% | 44.1 | 1.0000 | 1.00 | 0.00 |
| 29 | foundation.hydrology.receiver-flow-initialization | 9 | 4.0 | 3.9 | 5.0 | 0.12% | 40.6 | 1.0000 | 1.00 | 0.75 |
| 30 | foundation.hydrology.flow-accumulation | 9 | 3.9 | 3.9 | 4.7 | 0.11% | 39.2 | 1.0000 | 1.00 | 0.00 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | climate-rebuild | 9 | 439.5 | 442.3 | 516.2 | 13.26% |
| 2 | biome-projection-validation | 9 | 433.3 | 476.2 | 506.2 | 13.03% |
| 3 | surface-aging | 9 | 416.7 | 416.0 | 446.8 | 12.60% |
| 4 | hydrology-rebuild | 9 | 230.1 | 233.3 | 264.3 | 6.95% |
| 5 | ledger-and-unattributed | 9 | 134.2 | 131.7 | 149.8 | 4.03% |
| 6 | fragment-placement | 9 | 101.4 | 93.3 | 130.0 | 3.06% |
| 7 | water-reconciliation | 9 | 83.5 | 79.8 | 94.6 | 2.52% |
| 8 | fragment-history | 9 | 76.9 | 75.5 | 102.1 | 2.30% |
| 9 | setup-models | 9 | 17.2 | 15.9 | 24.5 | 0.51% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | 4185.5 | 4186.1 | 2392.8 | 75.21 | 1.38 | 80 |
| earthlike-standard-3141592-512x256-run1 | 3470.0 | 3470.2 | 2045.7 | 73.99 | 2.74 | 80 |
| earthlike-standard-8675309-512x256-run1 | 3473.3 | 3473.5 | 2050.5 | 74.04 | 2.11 | 80 |
| archipelago-standard-1001001-512x256-run1 | 2907.0 | 2907.2 | 1646.8 | 68.92 | 9.94 | 55 |
| archipelago-standard-3141592-512x256-run1 | 3126.8 | 3127.0 | 1814.6 | 73.85 | 5.39 | 55 |
| archipelago-standard-8675309-512x256-run1 | 3068.2 | 3068.4 | 1826.6 | 80.32 | 0.00 | 55 |
| geology-glacial-stress-1001001-512x256-run1 | 3019.6 | 3019.8 | 1689.0 | 60.46 | 17.83 | 118 |
| geology-glacial-stress-3141592-512x256-run1 | 3216.0 | 3216.2 | 1878.5 | 68.07 | 7.61 | 118 |
| geology-glacial-stress-8675309-512x256-run1 | 3393.2 | 3393.5 | 2050.8 | 71.78 | 2.66 | 118 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

