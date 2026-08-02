# Current Generation Performance Profile

Generated: 2026-08-02T15:25:06.055Z
Source commit: e973d809aa1dc3d3c8e737e1970cdced2aa699f1
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 2 seeds x 1 scenarios x 1 run(s), 1024x512

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | foundation.climate.wetness-traversal | 2 | 1075.2 | 1079.7 | 1079.7 | 5.16% | 2734.4 | 1.0000 | 1.00 | 0.00 |
| 2 | foundation.climate.moisture-candidate-traversal | 2 | 589.7 | 592.3 | 592.3 | 2.83% | 1499.6 | 1.0000 | 1.00 | 0.00 |
| 3 | foundation.climate.atmospheric-flow | 2 | 326.7 | 337.5 | 337.5 | 1.56% | 830.8 | 1.0000 | 2.00 | 3.00 |
| 4 | foundation.hydrology.drainage-surface | 2 | 288.2 | 306.7 | 306.7 | 1.38% | 732.8 | 1.0000 | 1.00 | 1.50 |
| 5 | foundation.climate.ocean-currents | 2 | 280.2 | 311.7 | 311.7 | 1.34% | 712.6 | 1.0000 | 2.00 | 3.00 |
| 6 | foundation.hydrology.water-distance | 2 | 177.4 | 180.6 | 180.6 | 0.85% | 451.2 | 1.0000 | 48.00 | 1.50 |
| 7 | topology-to-raster-final-projection | 2 | 164.4 | 164.4 | 164.4 | 0.79% | 418.0 | 1.3333 | 0.00 | 0.00 |
| 8 | permanent-ice-classification | 2 | 161.0 | 169.4 | 169.4 | 0.77% | 409.4 | 1.0000 | 4.00 | 2.25 |
| 9 | foundation.hydrology.elevation-ordering | 2 | 136.2 | 140.6 | 140.6 | 0.65% | 346.4 | 1.0000 | 0.00 | 3.00 |
| 10 | foundation.terrain.impacts | 2 | 121.1 | 124.9 | 124.9 | 0.58% | 308.0 | 1.0000 | 0.00 | 0.00 |
| 11 | foundation.climate.moisture-candidate-water-distance | 2 | 88.4 | 90.1 | 90.1 | 0.42% | 224.9 | 1.0000 | 24.00 | 1.50 |
| 12 | foundation.climate.water-distance | 2 | 71.1 | 77.3 | 77.3 | 0.34% | 180.7 | 1.0000 | 18.00 | 1.50 |
| 13 | vacated-fragment-corridor-repair | 2 | 46.8 | 58.2 | 58.2 | 0.23% | 119.0 | 0.0573 | 1.00 | 0.09 |
| 14 | foundation.climate.temperature-field | 2 | 44.7 | 45.5 | 45.5 | 0.21% | 113.6 | 1.0000 | 1.00 | 0.00 |
| 15 | reference-scale-field-reduction | 2 | 41.5 | 52.7 | 52.7 | 0.20% | 105.5 | 0.1081 | 0.00 | 0.12 |
| 16 | foundation.climate.moisture-candidate-land-distance | 2 | 31.4 | 33.1 | 33.1 | 0.15% | 79.9 | 1.0000 | 8.00 | 1.50 |
| 17 | foundation.terrain.coastal-shelves | 2 | 27.7 | 30.4 | 30.4 | 0.13% | 70.4 | 1.0000 | 3.00 | 1.50 |
| 18 | masked-topology-field-expansion-and-blend | 2 | 26.4 | 29.0 | 29.0 | 0.13% | 67.0 | 0.1081 | 0.00 | 0.16 |
| 19 | foundation.terrain.thermal-weathering | 2 | 21.4 | 24.6 | 24.6 | 0.10% | 54.4 | 1.0000 | 3.00 | 1.50 |
| 20 | foundation.terrain.hydraulic-erosion | 2 | 19.5 | 22.4 | 22.4 | 0.09% | 49.6 | 1.0000 | 2.00 | 1.50 |
| 21 | foundation.hydrology.source-ordering | 2 | 19.4 | 20.0 | 20.0 | 0.09% | 49.3 | 1.0000 | 0.00 | 3.00 |
| 22 | foundation.projection.scalar-copy | 2 | 19.3 | 21.9 | 21.9 | 0.09% | 49.1 | 1.3333 | 0.00 | 0.00 |
| 23 | foundation.hydrology.channel-marking | 2 | 15.5 | 18.4 | 18.4 | 0.07% | 39.3 | 1.0000 | 1.00 | 0.00 |
| 24 | authoritative-topology-signal-expansion | 4 | 13.2 | 14.0 | 16.1 | 0.06% | 33.6 | 0.0158 | 1.00 | 1.50 |
| 25 | foundation.climate.moisture-candidate-smoothing | 2 | 12.8 | 14.0 | 14.0 | 0.06% | 32.6 | 1.0000 | 2.00 | 3.00 |
| 26 | foundation.hydrology.flow-accumulation | 2 | 11.1 | 13.1 | 13.1 | 0.05% | 28.1 | 1.0000 | 1.00 | 0.00 |
| 27 | authoritative-topology-post-expansion-smoothing | 4 | 9.0 | 9.5 | 9.8 | 0.04% | 22.8 | 0.0158 | 2.00 | 3.00 |
| 28 | foundation.projection.vector-copy | 2 | 9.0 | 10.4 | 10.4 | 0.04% | 22.8 | 1.3333 | 0.00 | 0.00 |
| 29 | foundation.hydrology.receiver-flow-initialization | 2 | 8.9 | 9.7 | 9.7 | 0.04% | 22.6 | 1.0000 | 1.00 | 3.00 |
| 30 | foundation.climate.wetness-smoothing | 2 | 6.4 | 8.3 | 8.3 | 0.03% | 16.3 | 1.0000 | 1.00 | 1.50 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 2 | 3661.7 | 3840.5 | 3840.5 | 17.53% |
| 2 | climate-rebuild | 2 | 2712.6 | 2717.9 | 2717.9 | 13.01% |
| 3 | surface-aging | 2 | 2673.3 | 2683.6 | 2683.6 | 12.82% |
| 4 | hydrology-rebuild | 2 | 1356.3 | 1384.7 | 1384.7 | 6.50% |
| 5 | ledger-and-unattributed | 2 | 673.9 | 701.9 | 701.9 | 3.23% |
| 6 | fragment-placement | 2 | 505.0 | 624.1 | 624.1 | 2.40% |
| 7 | water-reconciliation | 2 | 503.1 | 504.0 | 504.0 | 2.41% |
| 8 | fragment-history | 2 | 294.5 | 332.9 | 332.9 | 1.41% |
| 9 | setup-models | 2 | 86.3 | 115.0 | 115.0 | 0.41% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-1024x512-run1 | 21578.0 | 21578.9 | 12873.5 | 76.18 | 0.60 | 80 |
| earthlike-standard-3141592-1024x512-run1 | 20173.8 | 20174.5 | 12060.1 | 73.47 | 2.62 | 80 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

