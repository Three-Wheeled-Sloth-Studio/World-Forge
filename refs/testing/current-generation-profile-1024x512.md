# Current Generation Performance Profile

Generated: 2026-08-02T15:34:23.162Z
Source commit: 6133178c2d0e79d9bb1af52101b9e497805c6998
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 2 seeds x 1 scenarios x 1 run(s), 1024x512

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep-time.final.basin-circulation | 2 | 3396.1 | 3608.5 | 3608.5 | 16.51% | 8636.7 | 1.3333 | 0.00 | 0.00 |
| 2 | foundation.climate.wetness-traversal | 2 | 1044.4 | 1049.2 | 1049.2 | 5.09% | 2655.9 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.moisture-candidate-traversal | 2 | 566.6 | 569.5 | 569.5 | 2.76% | 1440.9 | 1.0000 | 1.00 | 0.00 |
| 4 | foundation.hydrology.drainage-surface | 2 | 330.6 | 351.6 | 351.6 | 1.61% | 840.8 | 1.0000 | 1.00 | 1.50 |
| 5 | foundation.climate.atmospheric-flow | 2 | 313.1 | 324.3 | 324.3 | 1.52% | 796.3 | 1.0000 | 2.00 | 3.00 |
| 6 | foundation.climate.ocean-currents | 2 | 280.3 | 310.0 | 310.0 | 1.36% | 712.8 | 1.0000 | 2.00 | 3.00 |
| 7 | foundation.hydrology.water-distance | 2 | 183.6 | 185.0 | 185.0 | 0.90% | 466.9 | 1.0000 | 48.00 | 1.50 |
| 8 | topology-to-raster-final-projection | 2 | 161.5 | 161.8 | 161.8 | 0.79% | 410.7 | 1.3333 | 0.00 | 0.00 |
| 9 | permanent-ice-classification | 2 | 150.2 | 158.9 | 158.9 | 0.73% | 382.0 | 1.0000 | 4.00 | 2.25 |
| 10 | foundation.hydrology.elevation-ordering | 2 | 148.1 | 154.6 | 154.6 | 0.72% | 376.8 | 1.0000 | 0.00 | 3.00 |
| 11 | foundation.terrain.impacts | 2 | 113.7 | 117.5 | 117.5 | 0.55% | 289.0 | 1.0000 | 0.00 | 0.00 |
| 12 | deep-time.final.biome-classification | 2 | 96.9 | 97.1 | 97.1 | 0.47% | 246.4 | 1.0000 | 1.00 | 0.00 |
| 13 | foundation.climate.moisture-candidate-water-distance | 2 | 92.6 | 93.1 | 93.1 | 0.45% | 235.5 | 1.0000 | 24.00 | 1.50 |
| 14 | foundation.climate.water-distance | 2 | 74.8 | 80.5 | 80.5 | 0.36% | 190.2 | 1.0000 | 18.00 | 1.50 |
| 15 | foundation.climate.temperature-field | 2 | 46.4 | 47.2 | 47.2 | 0.23% | 118.0 | 1.0000 | 1.00 | 0.00 |
| 16 | vacated-fragment-corridor-repair | 2 | 44.2 | 56.6 | 56.6 | 0.22% | 112.4 | 0.0573 | 1.00 | 0.09 |
| 17 | reference-scale-field-reduction | 2 | 38.5 | 49.4 | 49.4 | 0.19% | 97.8 | 0.1081 | 0.00 | 0.12 |
| 18 | foundation.climate.moisture-candidate-land-distance | 2 | 33.4 | 34.8 | 34.8 | 0.16% | 84.9 | 1.0000 | 8.00 | 1.50 |
| 19 | foundation.terrain.coastal-shelves | 2 | 29.6 | 33.0 | 33.0 | 0.14% | 75.3 | 1.0000 | 3.00 | 1.50 |
| 20 | foundation.projection.scalar-copy | 2 | 27.7 | 32.3 | 32.3 | 0.14% | 70.3 | 1.3333 | 0.00 | 0.00 |
| 21 | masked-topology-field-expansion-and-blend | 2 | 26.0 | 28.8 | 28.8 | 0.13% | 66.0 | 0.1081 | 0.00 | 0.16 |
| 22 | foundation.terrain.thermal-weathering | 2 | 22.5 | 24.8 | 24.8 | 0.11% | 57.1 | 1.0000 | 3.00 | 1.50 |
| 23 | deep-time.final.metrics-validation | 2 | 22.3 | 24.6 | 24.6 | 0.11% | 56.7 | 1.3333 | 1.00 | 0.00 |
| 24 | foundation.hydrology.source-ordering | 2 | 20.2 | 22.2 | 22.2 | 0.10% | 51.4 | 1.0000 | 0.00 | 3.00 |
| 25 | foundation.terrain.hydraulic-erosion | 2 | 19.7 | 22.4 | 22.4 | 0.10% | 50.0 | 1.0000 | 2.00 | 1.50 |
| 26 | foundation.hydrology.channel-marking | 2 | 15.2 | 17.3 | 17.3 | 0.07% | 38.7 | 1.0000 | 1.00 | 0.00 |
| 27 | authoritative-topology-signal-expansion | 4 | 14.1 | 15.4 | 16.6 | 0.07% | 35.9 | 0.0158 | 1.00 | 1.50 |
| 28 | foundation.hydrology.flow-accumulation | 2 | 12.2 | 13.3 | 13.3 | 0.06% | 31.0 | 1.0000 | 1.00 | 0.00 |
| 29 | foundation.climate.moisture-candidate-smoothing | 2 | 11.8 | 12.1 | 12.1 | 0.06% | 29.9 | 1.0000 | 2.00 | 3.00 |
| 30 | foundation.projection.vector-copy | 2 | 11.8 | 12.2 | 12.2 | 0.06% | 29.9 | 1.3333 | 0.00 | 0.00 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 2 | 3680.4 | 3895.1 | 3895.1 | 17.90% |
| 2 | climate-rebuild | 2 | 2629.6 | 2634.9 | 2634.9 | 12.82% |
| 3 | surface-aging | 2 | 2584.2 | 2602.8 | 2602.8 | 12.60% |
| 4 | hydrology-rebuild | 2 | 1333.4 | 1365.7 | 1365.7 | 6.49% |
| 5 | ledger-and-unattributed | 2 | 728.1 | 784.7 | 784.7 | 3.54% |
| 6 | water-reconciliation | 2 | 509.9 | 511.7 | 511.7 | 2.49% |
| 7 | fragment-placement | 2 | 499.5 | 622.6 | 622.6 | 2.41% |
| 8 | fragment-history | 2 | 289.0 | 326.6 | 326.6 | 1.40% |
| 9 | setup-models | 2 | 85.0 | 111.2 | 111.2 | 0.41% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-1024x512-run1 | 21304.5 | 21305.4 | 12814.4 | 76.18 | 0.60 | 80 |
| earthlike-standard-3141592-1024x512-run1 | 19787.1 | 19787.8 | 11864.1 | 73.47 | 2.62 | 80 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

