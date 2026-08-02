# Current Generation Performance Profile

Generated: 2026-08-02T15:38:13.085Z
Source commit: 9fced66219acfe8bf8ff314f024be322a7fba7c1
Workflow: core.performance-foundation@1.2.0
Environment: v22.23.1 on linux/x64
Matrix: 2 seeds x 1 scenarios x 1 run(s), 1024x512

## Fine phase ranking

| Rank | Phase | Samples | Average ms | Median ms | P90 ms | Average total share | ns/topology cell | Active share | Full passes | Buffer MB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep-time.final.basin-circulation | 2 | 2219.1 | 2366.6 | 2366.6 | 16.45% | 5643.5 | 1.3333 | 0.00 | 0.00 |
| 2 | basin-circulation.pack-gyres | 2 | 1978.6 | 2104.2 | 2104.2 | 14.66% | 5031.8 | 1.3333 | 14.00 | 1.00 |
| 3 | foundation.climate.wetness-traversal | 2 | 663.4 | 684.6 | 684.6 | 4.93% | 1687.1 | 1.0000 | 1.00 | 0.00 |
| 4 | foundation.climate.moisture-candidate-traversal | 2 | 363.6 | 379.4 | 379.4 | 2.70% | 924.7 | 1.0000 | 1.00 | 0.00 |
| 5 | foundation.hydrology.drainage-surface | 2 | 235.4 | 245.6 | 245.6 | 1.75% | 598.7 | 1.0000 | 1.00 | 1.50 |
| 6 | foundation.climate.atmospheric-flow | 2 | 200.4 | 207.0 | 207.0 | 1.49% | 509.5 | 1.0000 | 2.00 | 3.00 |
| 7 | foundation.climate.ocean-currents | 2 | 198.2 | 211.0 | 211.0 | 1.47% | 503.9 | 1.0000 | 2.00 | 3.00 |
| 8 | foundation.hydrology.water-distance | 2 | 147.4 | 161.2 | 161.2 | 1.10% | 374.9 | 1.0000 | 48.00 | 1.50 |
| 9 | foundation.hydrology.elevation-ordering | 2 | 100.4 | 109.5 | 109.5 | 0.75% | 255.3 | 1.0000 | 0.00 | 3.00 |
| 10 | permanent-ice-classification | 2 | 94.7 | 102.0 | 102.0 | 0.70% | 240.7 | 1.0000 | 4.00 | 2.25 |
| 11 | topology-to-raster-final-projection | 2 | 89.6 | 90.9 | 90.9 | 0.66% | 227.9 | 1.3333 | 0.00 | 0.00 |
| 12 | foundation.terrain.impacts | 2 | 86.9 | 89.8 | 89.8 | 0.64% | 221.1 | 1.0000 | 0.00 | 0.00 |
| 13 | foundation.climate.moisture-candidate-water-distance | 2 | 75.2 | 81.2 | 81.2 | 0.56% | 191.2 | 1.0000 | 24.00 | 1.50 |
| 14 | deep-time.final.biome-classification | 2 | 63.9 | 66.8 | 66.8 | 0.47% | 162.5 | 1.0000 | 1.00 | 0.00 |
| 15 | foundation.climate.water-distance | 2 | 58.2 | 62.0 | 62.0 | 0.43% | 147.9 | 1.0000 | 18.00 | 1.50 |
| 16 | basin-circulation.label-basins | 2 | 33.5 | 33.7 | 33.7 | 0.25% | 85.1 | 1.3333 | 1.00 | 2.00 |
| 17 | basin-circulation.coast-distance | 2 | 32.3 | 34.5 | 34.5 | 0.24% | 82.0 | 1.3333 | 2.00 | 2.00 |
| 18 | vacated-fragment-corridor-repair | 2 | 32.1 | 37.2 | 37.2 | 0.24% | 81.6 | 0.0573 | 1.00 | 0.09 |
| 19 | foundation.climate.temperature-field | 2 | 30.7 | 31.6 | 31.6 | 0.23% | 77.9 | 1.0000 | 1.00 | 0.00 |
| 20 | reference-scale-field-reduction | 2 | 28.5 | 36.1 | 36.1 | 0.21% | 72.5 | 0.1081 | 0.00 | 0.12 |
| 21 | foundation.climate.moisture-candidate-land-distance | 2 | 26.2 | 27.0 | 27.0 | 0.19% | 66.6 | 1.0000 | 8.00 | 1.50 |
| 22 | foundation.terrain.coastal-shelves | 2 | 20.7 | 22.8 | 22.8 | 0.15% | 52.5 | 1.0000 | 3.00 | 1.50 |
| 23 | masked-topology-field-expansion-and-blend | 2 | 17.3 | 19.8 | 19.8 | 0.13% | 43.9 | 0.1081 | 0.00 | 0.16 |
| 24 | foundation.terrain.thermal-weathering | 2 | 16.5 | 19.3 | 19.3 | 0.12% | 41.8 | 1.0000 | 3.00 | 1.50 |
| 25 | foundation.terrain.hydraulic-erosion | 2 | 14.3 | 16.2 | 16.2 | 0.11% | 36.2 | 1.0000 | 2.00 | 1.50 |
| 26 | deep-time.final.metrics-validation | 2 | 13.8 | 15.4 | 15.4 | 0.10% | 35.1 | 1.3333 | 1.00 | 0.00 |
| 27 | foundation.hydrology.source-ordering | 2 | 13.1 | 13.1 | 13.1 | 0.10% | 33.2 | 1.0000 | 0.00 | 3.00 |
| 28 | foundation.projection.scalar-copy | 2 | 12.5 | 14.1 | 14.1 | 0.09% | 31.8 | 1.3333 | 0.00 | 0.00 |
| 29 | authoritative-topology-signal-expansion | 4 | 11.8 | 13.1 | 13.3 | 0.09% | 29.9 | 0.0158 | 1.00 | 1.50 |
| 30 | foundation.hydrology.channel-marking | 2 | 11.7 | 13.3 | 13.3 | 0.09% | 29.6 | 1.0000 | 1.00 | 0.00 |

## Deep-time substage ranking

| Rank | Substage | Samples | Average ms | Median ms | P90 ms | Average total share |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | biome-projection-validation | 2 | 2389.3 | 2543.0 | 2543.0 | 17.71% |
| 2 | surface-aging | 2 | 1804.8 | 1896.7 | 1896.7 | 13.42% |
| 3 | climate-rebuild | 2 | 1749.8 | 1788.5 | 1788.5 | 12.98% |
| 4 | hydrology-rebuild | 2 | 880.8 | 897.0 | 897.0 | 6.54% |
| 5 | ledger-and-unattributed | 2 | 479.9 | 501.9 | 501.9 | 3.56% |
| 6 | fragment-placement | 2 | 338.9 | 415.2 | 415.2 | 2.50% |
| 7 | water-reconciliation | 2 | 314.6 | 316.2 | 316.2 | 2.34% |
| 8 | fragment-history | 2 | 189.8 | 213.9 | 213.9 | 1.40% |
| 9 | setup-models | 2 | 58.0 | 71.7 | 71.7 | 0.43% |

## Runs

| Run | Total ms | Wall ms | Deep-time ms | Ocean % | Ice % | Rivers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| earthlike-standard-1001001-1024x512-run1 | 13868.1 | 13868.7 | 8460.2 | 76.18 | 0.60 | 80 |
| earthlike-standard-3141592-1024x512-run1 | 13090.5 | 13091.0 | 7951.5 | 73.47 | 2.62 | 80 |

## Interpretation rule

Use this report to select the next isolated optimization candidate. A phase must be consistently expensive across the matrix, have an inspectable work shape, and admit a bounded implementation change with output and quality gates. Do not optimize from a single seed or one unusually slow run.

