# Current Generation Performance Profile

Generated: 2026-08-02T15:25:10.045Z
Source commit: e973d809aa1dc3d3c8e737e1970cdced2aa699f1
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 2 seeds x 1 scenarios x 1 run(s), 1024x512

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 2 | 1077.5 | 1080.6 | 1080.6 | 5.17% | 2740.2 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 2 | 591.8 | 593.8 | 593.8 | 2.84% | 1504.9 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.atmospheric-flow | 2 | 327.4 | 338.1 | 338.1 | 1.57% | 832.5 | 1.0000 | 2.00 | 3.00 |
| 4 | foundation.hydrology.drainage-surface | 2 | 286.7 | 313.9 | 313.9 | 1.37% | 729.1 | 1.0000 | 1.00 | 1.50 |
| 5 | foundation.climate.ocean-currents | 2 | 275.1 | 303.7 | 303.7 | 1.32% | 699.5 | 1.0000 | 2.00 | 3.00 |
| 6 | foundation.hydrology.water-distance | 2 | 175.5 | 176.8 | 176.8 | 0.84% | 446.3 | 1.0000 | 48.00 | 1.50 |
| 7 | topology-to-raster-final-projection | 2 | 165.4 | 167.5 | 167.5 | 0.79% | 420.5 | 1.3333 | 0.00 | 0.00 |
| 8 | permanent-ice-classification | 2 | 159.1 | 168.4 | 168.4 | 0.76% | 404.6 | 1.0000 | 4.00 | 2.25 |
| 9 | foundation.hydrology.elevation-ordering | 2 | 140.1 | 145.9 | 145.9 | 0.67% | 356.3 | 1.0000 | 0.00 | 3.00 |
| 10 | foundation.terrain.impacts | 2 | 121.6 | 125.9 | 125.9 | 0.58% | 309.1 | 1.0000 | 0.00 | 0.00 |
| 11 | foundation.climate.moisture-candidate-water-distance | 2 | 88.4 | 90.1 | 90.1 | 0.42% | 224.8 | 1.0000 | 24.00 | 1.50 |
| 12 | foundation.climate.water-distance | 2 | 71.6 | 78.1 | 78.1 | 0.34% | 182.0 | 1.0000 | 18.00 | 1.50 |
| 13 | vacated-fragment-corridor-repair | 2 | 49.5 | 59.0 | 59.0 | 0.24% | 125.9 | 0.0573 | 1.00 | 0.09 |
| 14 | foundation.climate.temperature-field | 2 | 44.4 | 45.5 | 45.5 | 0.21% | 112.9 | 1.0000 | 1.00 | 0.00 |
| 15 | reference-scale-field-reduction | 2 | 41.1 | 51.5 | 51.5 | 0.20% | 104.4 | 0.1081 | 0.00 | 0.12 |
| 16 | foundation.climate.moisture-candidate-land-distance | 2 | 31.0 | 32.4 | 32.4 | 0.15% | 78.8 | 1.0000 | 8.00 | 1.50 |
| 17 | foundation.terrain.coastal-shelves | 2 | 27.8 | 31.3 | 31.3 | 0.13% | 70.7 | 1.0000 | 3.00 | 1.50 |
| 18 | masked-topology-field-expansion-and-blend | 2 | 25.8 | 28.7 | 28.7 | 0.12% | 65.6 | 0.1081 | 0.00 | 0.16 |
| 19 | foundation.terrain.thermal-weathering | 2 | 25.5 | 33.3 | 33.3 | 0.12% | 65.0 | 1.0000 | 3.00 | 1.50 |
| 20 | foundation.hydrology.source-ordering | 2 | 21.4 | 22.7 | 22.7 | 0.10% | 54.3 | 1.0000 | 0.00 | 3.00 |
| 21 | foundation.terrain.hydraulic-erosion | 2 | 20.5 | 23.1 | 23.1 | 0.10% | 52.0 | 1.0000 | 2.00 | 1.50 |
| 22 | foundation.projection.scalar-copy | 2 | 20.4 | 23.8 | 23.8 | 0.10% | 51.8 | 1.3333 | 0.00 | 0.00 |
| 23 | foundation.hydrology.channel-marking | 2 | 15.5 | 18.4 | 18.4 | 0.07% | 39.3 | 1.0000 | 1.00 | 0.00 |
| 24 | authoritative-topology-signal-expansion | 4 | 13.0 | 14.0 | 15.6 | 0.06% | 33.0 | 0.0158 | 1.00 | 1.50 |
| 25 | foundation.climate.moisture-candidate-smoothing | 2 | 12.9 | 14.0 | 14.0 | 0.06% | 32.8 | 1.0000 | 2.00 | 3.00 |
| 26 | foundation.hydrology.flow-accumulation | 2 | 11.9 | 12.6 | 12.6 | 0.06% | 30.1 | 1.0000 | 1.00 | 0.00 |
| 27 | foundation.projection.vector-copy | 2 | 10.3 | 12.9 | 12.9 | 0.05% | 26.1 | 1.3333 | 0.00 | 0.00 |
| 28 | foundation.hydrology.receiver-flow-initialization | 2 | 9.8 | 10.1 | 10.1 | 0.05% | 24.8 | 1.0000 | 1.00 | 3.00 |
| 29 | authoritative-topology-post-expansion-smoothing | 4 | 9.0 | 9.7 | 9.9 | 0.04% | 22.9 | 0.0158 | 2.00 | 3.00 |
| 30 | foundation.climate.wetness-smoothing | 2 | 6.3 | 8.1 | 8.1 | 0.03% | 15.9 | 1.0000 | 1.00 | 1.50 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 2 | 3641.3 | 3818.7 | 3818.7 | 17.45% |
| 2 | climate-rebuild | 2 | 2701.8 | 2719.2 | 2719.2 | 12.97% |
| 3 | surface-aging | 2 | 2668.0 | 2680.4 | 2680.4 | 12.81% |
| 4 | hydrology-rebuild | 2 | 1334.0 | 1359.1 | 1359.1 | 6.40% |
| 5 | ledger-and-unattributed | 2 | 681.1 | 710.9 | 710.9 | 3.27% |
| 6 | water-reconciliation | 2 | 505.6 | 513.5 | 513.5 | 2.43% |
| 7 | fragment-placement | 2 | 497.4 | 616.2 | 616.2 | 2.37% |
| 8 | fragment-history | 2 | 295.7 | 336.7 | 336.7 | 1.41% |
| 9 | setup-models | 2 | 83.1 | 108.2 | 108.2 | 0.39% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-1024x512-run1 | 21570.9 | 21571.7 | 12822.5 | 76.18 | 0.60 | 80 |
| earthlike-standard-3141592-1024x512-run1 | 20137.2 | 20137.8 | 11993.7 | 73.47 | 2.62 | 80 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

