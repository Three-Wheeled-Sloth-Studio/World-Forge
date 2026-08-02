# Current Generation Performance Profile

Generated: 2026-08-02T15:24:27.857Z
Source commit: e973d809aa1dc3d3c8e737e1970cdced2aa699f1
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 3 seeds x 3 scenarios x 1 run(s), 512x256

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 9 | 274.7 | 272.6 | 287.1 | 5.32% | 2794.7 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 9 | 150.8 | 151.2 | 169.9 | 2.91% | 1534.1 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.atmospheric-flow | 9 | 81.9 | 77.3 | 90.4 | 1.58% | 832.9 | 1.0000 | 2.00 | 0.75 |
| 4 | foundation.climate.ocean-currents | 9 | 69.9 | 61.2 | 84.7 | 1.33% | 711.4 | 1.0000 | 2.00 | 0.75 |
| 5 | foundation.hydrology.drainage-surface | 9 | 57.6 | 57.7 | 68.9 | 1.11% | 585.5 | 1.0000 | 1.00 | 0.38 |
| 6 | foundation.hydrology.water-distance | 9 | 45.8 | 45.6 | 47.0 | 0.89% | 465.6 | 1.0000 | 48.00 | 0.38 |
| 7 | permanent-ice-classification | 9 | 41.6 | 38.7 | 44.7 | 0.79% | 422.8 | 1.0000 | 4.00 | 0.56 |
| 8 | topology-to-raster-final-projection | 9 | 41.2 | 42.0 | 44.9 | 0.80% | 419.4 | 1.3333 | 0.00 | 0.00 |
| 9 | foundation.hydrology.elevation-ordering | 9 | 33.9 | 34.0 | 34.4 | 0.66% | 345.1 | 1.0000 | 0.00 | 0.75 |
| 10 | foundation.climate.moisture-candidate-water-distance | 9 | 23.8 | 23.1 | 25.5 | 0.46% | 242.1 | 1.0000 | 24.00 | 0.38 |
| 11 | foundation.climate.water-distance | 9 | 18.2 | 17.3 | 17.9 | 0.35% | 185.3 | 1.0000 | 18.00 | 0.38 |
| 12 | foundation.terrain.impacts | 9 | 15.2 | 17.8 | 20.1 | 0.29% | 154.4 | 1.0000 | 0.00 | 0.00 |
| 13 | foundation.climate.temperature-field | 9 | 13.9 | 14.1 | 14.9 | 0.27% | 141.6 | 1.0000 | 1.00 | 0.00 |
| 14 | reference-scale-field-reduction | 9 | 13.8 | 14.7 | 16.1 | 0.27% | 140.7 | 0.1711 | 0.00 | 0.12 |
| 15 | vacated-fragment-corridor-repair | 9 | 11.1 | 9.2 | 16.6 | 0.22% | 112.7 | 0.0786 | 1.00 | 0.03 |
| 16 | masked-topology-field-expansion-and-blend | 9 | 10.3 | 11.1 | 12.2 | 0.20% | 104.3 | 0.1711 | 0.00 | 0.06 |
| 17 | foundation.terrain.coastal-shelves | 9 | 9.4 | 7.1 | 13.7 | 0.18% | 95.7 | 1.0000 | 3.33 | 0.38 |
| 18 | foundation.climate.moisture-candidate-land-distance | 9 | 8.2 | 7.9 | 8.1 | 0.16% | 83.9 | 1.0000 | 8.00 | 0.38 |
| 19 | foundation.projection.scalar-copy | 9 | 7.6 | 7.8 | 8.5 | 0.15% | 77.5 | 1.3333 | 0.00 | 0.00 |
| 20 | foundation.terrain.hydraulic-erosion | 9 | 7.1 | 6.7 | 8.9 | 0.13% | 72.3 | 1.0000 | 3.00 | 0.38 |
| 21 | foundation.terrain.thermal-weathering | 9 | 6.0 | 5.4 | 10.5 | 0.11% | 61.5 | 1.0000 | 3.67 | 0.38 |
| 22 | foundation.hydrology.channel-marking | 9 | 5.7 | 5.2 | 8.4 | 0.11% | 57.6 | 1.0000 | 1.00 | 0.00 |
| 23 | foundation.hydrology.receiver-flow-initialization | 9 | 5.1 | 5.6 | 6.4 | 0.10% | 52.2 | 1.0000 | 1.00 | 0.75 |
| 24 | foundation.hydrology.flow-accumulation | 9 | 4.9 | 4.4 | 5.3 | 0.10% | 50.3 | 1.0000 | 1.00 | 0.00 |
| 25 | foundation.climate.moisture-candidate-smoothing | 9 | 4.5 | 4.8 | 5.2 | 0.09% | 46.1 | 1.0000 | 2.00 | 0.75 |
| 26 | foundation.hydrology.source-ordering | 9 | 4.5 | 4.5 | 5.1 | 0.09% | 45.8 | 1.0000 | 0.00 | 0.75 |
| 27 | foundation.projection.vector-copy | 9 | 3.8 | 3.9 | 4.3 | 0.07% | 38.8 | 1.3333 | 0.00 | 0.00 |
| 28 | authoritative-topology-signal-expansion | 18 | 3.3 | 2.5 | 5.3 | 0.06% | 33.1 | 0.0383 | 1.00 | 0.38 |
| 29 | reference-scale-signal-smoothing | 18 | 2.3 | 1.8 | 2.0 | 0.04% | 94.0 | 0.1534 | 7.00 | 0.66 |
| 30 | authoritative-topology-post-expansion-smoothing | 18 | 2.3 | 2.2 | 2.2 | 0.04% | 23.5 | 0.0383 | 2.00 | 0.75 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | climate-rebuild | 9 | 666.7 | 695.1 | 720.8 | 12.84% |
| 2 | surface-aging | 9 | 655.1 | 669.3 | 701.7 | 12.66% |
| 3 | biome-projection-validation | 9 | 646.6 | 668.2 | 759.1 | 12.42% |
| 4 | hydrology-rebuild | 9 | 351.3 | 370.0 | 386.4 | 6.77% |
| 5 | ledger-and-unattributed | 9 | 187.7 | 181.2 | 205.4 | 3.60% |
| 6 | fragment-placement | 9 | 172.5 | 168.0 | 198.9 | 3.32% |
| 7 | water-reconciliation | 9 | 132.4 | 130.5 | 138.0 | 2.55% |
| 8 | fragment-history | 9 | 110.1 | 104.7 | 131.6 | 2.11% |
| 9 | setup-models | 9 | 28.0 | 25.1 | 38.1 | 0.53% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | 6331.0 | 6331.9 | 3459.4 | 75.21 | 1.38 | 80 |
| earthlike-standard-3141592-512x256-run1 | 5349.5 | 5349.7 | 3098.0 | 73.99 | 2.74 | 80 |
| earthlike-standard-8675309-512x256-run1 | 5512.5 | 5512.7 | 3192.1 | 74.04 | 2.11 | 80 |
| archipelago-standard-1001001-512x256-run1 | 4713.8 | 4714.0 | 2667.8 | 68.92 | 9.94 | 55 |
| archipelago-standard-3141592-512x256-run1 | 4939.7 | 4939.9 | 2819.6 | 73.85 | 5.39 | 55 |
| archipelago-standard-8675309-512x256-run1 | 4777.2 | 4777.5 | 2742.1 | 80.32 | 0.00 | 55 |
| geology-glacial-stress-1001001-512x256-run1 | 4949.9 | 4950.2 | 2780.2 | 60.46 | 17.83 | 118 |
| geology-glacial-stress-3141592-512x256-run1 | 5128.6 | 5128.8 | 2942.3 | 68.07 | 7.61 | 118 |
| geology-glacial-stress-8675309-512x256-run1 | 5072.1 | 5072.5 | 2852.0 | 71.78 | 2.66 | 118 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

