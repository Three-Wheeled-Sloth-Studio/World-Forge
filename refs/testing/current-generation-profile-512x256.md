# Current Generation Performance Profile

Generated: 2026-08-02T15:19:06.337Z
Source commit: 9d6ea21a3493fab351b55df5c7ad8dc145ee9663
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 3 seeds x 3 scenarios x 1 run(s), 512x256

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 9 | 269.0 | 265.0 | 282.7 | 5.19% | 2736.5 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 9 | 146.9 | 146.6 | 167.7 | 2.83% | 1494.8 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.atmospheric-flow | 9 | 82.5 | 76.7 | 91.9 | 1.58% | 839.2 | 1.0000 | 2.00 | 0.75 |
| 4 | foundation.climate.ocean-currents | 9 | 74.8 | 65.0 | 84.6 | 1.42% | 760.8 | 1.0000 | 2.00 | 0.75 |
| 5 | foundation.hydrology.drainage-surface | 9 | 62.5 | 59.8 | 68.0 | 1.20% | 636.2 | 1.0000 | 1.00 | 0.38 |
| 6 | foundation.hydrology.water-distance | 9 | 51.4 | 51.7 | 53.3 | 0.99% | 522.8 | 1.0000 | 48.00 | 0.38 |
| 7 | topology-to-raster-final-projection | 9 | 41.6 | 39.9 | 45.6 | 0.80% | 422.8 | 1.3333 | 0.00 | 0.00 |
| 8 | permanent-ice-classification | 9 | 40.7 | 38.0 | 50.0 | 0.78% | 413.7 | 1.0000 | 4.00 | 0.56 |
| 9 | foundation.hydrology.elevation-ordering | 9 | 34.0 | 33.7 | 34.9 | 0.66% | 346.2 | 1.0000 | 0.00 | 0.75 |
| 10 | foundation.climate.moisture-candidate-water-distance | 9 | 26.5 | 26.2 | 27.1 | 0.51% | 270.0 | 1.0000 | 24.00 | 0.38 |
| 11 | foundation.climate.water-distance | 9 | 21.5 | 19.6 | 20.2 | 0.41% | 219.2 | 1.0000 | 18.00 | 0.38 |
| 12 | foundation.terrain.impacts | 9 | 16.5 | 19.1 | 22.4 | 0.31% | 168.1 | 1.0000 | 0.00 | 0.00 |
| 13 | foundation.climate.temperature-field | 9 | 14.8 | 15.2 | 16.1 | 0.29% | 150.6 | 1.0000 | 1.00 | 0.00 |
| 14 | reference-scale-field-reduction | 9 | 14.0 | 14.7 | 15.6 | 0.27% | 142.9 | 0.1711 | 0.00 | 0.12 |
| 15 | vacated-fragment-corridor-repair | 9 | 12.5 | 11.6 | 17.1 | 0.24% | 127.4 | 0.0786 | 1.00 | 0.03 |
| 16 | foundation.terrain.coastal-shelves | 9 | 10.4 | 10.7 | 16.1 | 0.20% | 105.6 | 1.0000 | 3.33 | 0.38 |
| 17 | masked-topology-field-expansion-and-blend | 9 | 10.2 | 10.5 | 12.3 | 0.20% | 103.6 | 0.1711 | 0.00 | 0.06 |
| 18 | foundation.climate.moisture-candidate-land-distance | 9 | 9.2 | 9.0 | 9.1 | 0.18% | 93.7 | 1.0000 | 8.00 | 0.38 |
| 19 | foundation.terrain.hydraulic-erosion | 9 | 7.3 | 6.6 | 10.1 | 0.14% | 73.8 | 1.0000 | 3.00 | 0.38 |
| 20 | foundation.projection.scalar-copy | 9 | 6.8 | 6.7 | 8.6 | 0.13% | 69.3 | 1.3333 | 0.00 | 0.00 |
| 21 | foundation.terrain.thermal-weathering | 9 | 6.3 | 5.7 | 9.2 | 0.12% | 64.2 | 1.0000 | 3.67 | 0.38 |
| 22 | foundation.hydrology.channel-marking | 9 | 5.7 | 6.1 | 8.0 | 0.11% | 57.6 | 1.0000 | 1.00 | 0.00 |
| 23 | foundation.hydrology.receiver-flow-initialization | 9 | 5.6 | 5.7 | 7.1 | 0.11% | 57.0 | 1.0000 | 1.00 | 0.75 |
| 24 | foundation.climate.moisture-candidate-smoothing | 9 | 4.8 | 4.4 | 6.1 | 0.09% | 49.2 | 1.0000 | 2.00 | 0.75 |
| 25 | foundation.hydrology.source-ordering | 9 | 4.5 | 4.1 | 6.7 | 0.09% | 45.6 | 1.0000 | 0.00 | 0.75 |
| 26 | foundation.hydrology.flow-accumulation | 9 | 4.3 | 3.7 | 5.6 | 0.08% | 43.9 | 1.0000 | 1.00 | 0.00 |
| 27 | authoritative-topology-signal-expansion | 18 | 4.1 | 3.5 | 5.1 | 0.08% | 41.9 | 0.0383 | 1.00 | 0.38 |
| 28 | foundation.projection.vector-copy | 9 | 3.2 | 3.3 | 3.7 | 0.06% | 32.2 | 1.3333 | 0.00 | 0.00 |
| 29 | reference-scale-signal-smoothing | 18 | 2.5 | 2.0 | 2.1 | 0.05% | 102.4 | 0.1534 | 7.00 | 0.66 |
| 30 | authoritative-topology-post-expansion-smoothing | 18 | 2.4 | 2.4 | 2.5 | 0.05% | 24.4 | 0.0383 | 2.00 | 0.75 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | surface-aging | 9 | 693.3 | 701.2 | 744.3 | 13.37% |
| 2 | climate-rebuild | 9 | 691.4 | 716.8 | 752.7 | 13.30% |
| 3 | biome-projection-validation | 9 | 638.3 | 705.9 | 748.6 | 12.26% |
| 4 | hydrology-rebuild | 9 | 356.3 | 369.6 | 395.0 | 6.86% |
| 5 | ledger-and-unattributed | 9 | 182.9 | 175.5 | 204.8 | 3.52% |
| 6 | fragment-placement | 9 | 158.8 | 157.1 | 188.7 | 3.07% |
| 7 | water-reconciliation | 9 | 131.4 | 129.1 | 135.8 | 2.54% |
| 8 | fragment-history | 9 | 112.5 | 103.9 | 135.0 | 2.16% |
| 9 | setup-models | 9 | 29.3 | 27.8 | 39.3 | 0.56% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | 5967.8 | 5968.5 | 3320.5 | 75.21 | 1.38 | 80 |
| earthlike-standard-3141592-512x256-run1 | 5336.5 | 5336.7 | 3150.7 | 73.99 | 2.74 | 80 |
| earthlike-standard-8675309-512x256-run1 | 5467.8 | 5468.0 | 3183.6 | 74.04 | 2.11 | 80 |
| archipelago-standard-1001001-512x256-run1 | 4709.9 | 4710.1 | 2670.2 | 68.92 | 9.94 | 55 |
| archipelago-standard-3141592-512x256-run1 | 4964.2 | 4964.4 | 2866.9 | 73.85 | 5.39 | 55 |
| archipelago-standard-8675309-512x256-run1 | 4941.0 | 4941.3 | 2927.3 | 80.32 | 0.00 | 55 |
| geology-glacial-stress-1001001-512x256-run1 | 4931.6 | 4931.8 | 2758.6 | 60.46 | 17.83 | 118 |
| geology-glacial-stress-3141592-512x256-run1 | 5218.6 | 5218.8 | 3025.2 | 68.07 | 7.61 | 118 |
| geology-glacial-stress-8675309-512x256-run1 | 5240.8 | 5241.2 | 3044.8 | 71.78 | 2.66 | 118 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

