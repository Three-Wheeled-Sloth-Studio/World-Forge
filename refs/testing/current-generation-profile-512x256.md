# Current Generation Performance Profile

Generated: 2026-08-02T15:24:23.813Z
Source commit: e973d809aa1dc3d3c8e737e1970cdced2aa699f1
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 3 seeds x 3 scenarios x 1 run(s), 512x256

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 9 | 274.1 | 274.4 | 284.4 | 5.29% | 2788.5 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 9 | 151.6 | 149.3 | 172.2 | 2.92% | 1541.8 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.atmospheric-flow | 9 | 82.7 | 77.7 | 88.1 | 1.59% | 841.7 | 1.0000 | 2.00 | 0.75 |
| 4 | foundation.climate.ocean-currents | 9 | 70.9 | 61.8 | 83.8 | 1.35% | 721.2 | 1.0000 | 2.00 | 0.75 |
| 5 | foundation.hydrology.drainage-surface | 9 | 56.3 | 51.8 | 64.1 | 1.08% | 572.8 | 1.0000 | 1.00 | 0.38 |
| 6 | foundation.hydrology.water-distance | 9 | 46.0 | 45.9 | 47.0 | 0.89% | 467.7 | 1.0000 | 48.00 | 0.38 |
| 7 | permanent-ice-classification | 9 | 41.1 | 37.6 | 48.7 | 0.79% | 418.4 | 1.0000 | 4.00 | 0.56 |
| 8 | topology-to-raster-final-projection | 9 | 40.5 | 39.3 | 43.4 | 0.78% | 411.9 | 1.3333 | 0.00 | 0.00 |
| 9 | foundation.hydrology.elevation-ordering | 9 | 36.4 | 34.8 | 39.1 | 0.70% | 370.1 | 1.0000 | 0.00 | 0.75 |
| 10 | foundation.climate.moisture-candidate-water-distance | 9 | 23.5 | 23.1 | 23.8 | 0.45% | 238.6 | 1.0000 | 24.00 | 0.38 |
| 11 | foundation.climate.water-distance | 9 | 18.5 | 17.3 | 17.8 | 0.35% | 188.6 | 1.0000 | 18.00 | 0.38 |
| 12 | foundation.terrain.impacts | 9 | 15.1 | 16.6 | 20.4 | 0.29% | 154.1 | 1.0000 | 0.00 | 0.00 |
| 13 | reference-scale-field-reduction | 9 | 13.5 | 13.9 | 15.7 | 0.26% | 137.4 | 0.1711 | 0.00 | 0.12 |
| 14 | foundation.climate.temperature-field | 9 | 13.4 | 13.6 | 14.4 | 0.26% | 135.9 | 1.0000 | 1.00 | 0.00 |
| 15 | vacated-fragment-corridor-repair | 9 | 11.1 | 10.7 | 16.1 | 0.22% | 113.4 | 0.0786 | 1.00 | 0.03 |
| 16 | masked-topology-field-expansion-and-blend | 9 | 10.7 | 10.9 | 12.7 | 0.21% | 108.7 | 0.1711 | 0.00 | 0.06 |
| 17 | foundation.terrain.coastal-shelves | 9 | 9.5 | 7.4 | 13.7 | 0.18% | 96.2 | 1.0000 | 3.33 | 0.38 |
| 18 | foundation.climate.moisture-candidate-land-distance | 9 | 8.8 | 7.9 | 11.9 | 0.17% | 89.7 | 1.0000 | 8.00 | 0.38 |
| 19 | foundation.projection.scalar-copy | 9 | 7.6 | 7.9 | 9.2 | 0.15% | 77.8 | 1.3333 | 0.00 | 0.00 |
| 20 | foundation.terrain.hydraulic-erosion | 9 | 7.0 | 6.9 | 8.4 | 0.13% | 71.0 | 1.0000 | 3.00 | 0.38 |
| 21 | foundation.terrain.thermal-weathering | 9 | 5.9 | 5.4 | 9.7 | 0.11% | 59.7 | 1.0000 | 3.67 | 0.38 |
| 22 | foundation.hydrology.channel-marking | 9 | 5.9 | 4.8 | 8.8 | 0.11% | 59.7 | 1.0000 | 1.00 | 0.00 |
| 23 | foundation.hydrology.flow-accumulation | 9 | 5.6 | 5.4 | 7.4 | 0.11% | 57.0 | 1.0000 | 1.00 | 0.00 |
| 24 | foundation.hydrology.receiver-flow-initialization | 9 | 5.2 | 5.5 | 6.6 | 0.10% | 52.7 | 1.0000 | 1.00 | 0.75 |
| 25 | foundation.climate.moisture-candidate-smoothing | 9 | 5.0 | 4.8 | 6.0 | 0.10% | 50.5 | 1.0000 | 2.00 | 0.75 |
| 26 | foundation.hydrology.source-ordering | 9 | 4.8 | 4.2 | 7.0 | 0.09% | 49.2 | 1.0000 | 0.00 | 0.75 |
| 27 | foundation.projection.vector-copy | 9 | 3.8 | 4.3 | 4.6 | 0.07% | 38.4 | 1.3333 | 0.00 | 0.00 |
| 28 | authoritative-topology-signal-expansion | 18 | 3.3 | 2.5 | 6.2 | 0.06% | 33.5 | 0.0383 | 1.00 | 0.38 |
| 29 | reference-scale-signal-smoothing | 18 | 2.4 | 1.8 | 1.9 | 0.04% | 96.1 | 0.1534 | 7.00 | 0.66 |
| 30 | authoritative-topology-post-expansion-smoothing | 18 | 2.3 | 2.2 | 2.2 | 0.04% | 23.2 | 0.0383 | 2.00 | 0.75 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | surface-aging | 9 | 670.6 | 680.3 | 719.3 | 12.92% |
| 2 | climate-rebuild | 9 | 668.2 | 689.9 | 719.8 | 12.85% |
| 3 | biome-projection-validation | 9 | 654.7 | 728.0 | 758.8 | 12.57% |
| 4 | hydrology-rebuild | 9 | 349.0 | 359.7 | 379.5 | 6.72% |
| 5 | ledger-and-unattributed | 9 | 190.2 | 190.9 | 210.4 | 3.65% |
| 6 | fragment-placement | 9 | 169.7 | 167.8 | 209.0 | 3.26% |
| 7 | water-reconciliation | 9 | 133.1 | 131.3 | 146.2 | 2.57% |
| 8 | fragment-history | 9 | 113.4 | 106.4 | 140.9 | 2.16% |
| 9 | setup-models | 9 | 28.8 | 25.4 | 43.7 | 0.55% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | 6085.7 | 6086.6 | 3414.9 | 75.21 | 1.38 | 80 |
| earthlike-standard-3141592-512x256-run1 | 5318.0 | 5318.2 | 3117.7 | 73.99 | 2.74 | 80 |
| earthlike-standard-8675309-512x256-run1 | 5538.2 | 5538.4 | 3239.3 | 74.04 | 2.11 | 80 |
| archipelago-standard-1001001-512x256-run1 | 4674.7 | 4674.9 | 2617.5 | 68.92 | 9.94 | 55 |
| archipelago-standard-3141592-512x256-run1 | 4994.3 | 4994.5 | 2866.1 | 73.85 | 5.39 | 55 |
| archipelago-standard-8675309-512x256-run1 | 4959.2 | 4959.5 | 2925.9 | 80.32 | 0.00 | 55 |
| geology-glacial-stress-1001001-512x256-run1 | 4898.0 | 4898.2 | 2700.6 | 60.46 | 17.83 | 118 |
| geology-glacial-stress-3141592-512x256-run1 | 5119.4 | 5119.6 | 2912.0 | 68.07 | 7.61 | 118 |
| geology-glacial-stress-8675309-512x256-run1 | 5220.5 | 5220.8 | 3005.9 | 71.78 | 2.66 | 118 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

