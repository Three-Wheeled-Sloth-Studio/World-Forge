---
type: "Testing Reference"
title: "Generation Workflow Comparison"
tags:
- world-forge
- testing
---
# Generation Workflow Comparison

Generated: 2026-07-29T20:29:27.616Z
Source commit: 494c18e744c4f7a0a8f6494cf43c53b0c4499a3e
Workflows: core.performance-foundation-derived-control versus core.performance-foundation
Seed strategies: core.performance-foundation-derived-control=semantic-node, core.performance-foundation=semantic-node
Seeds: 1001001, 3141592, 8675309
Scenarios: earthlike-standard, archipelago-standard, geology-glacial-stress
Resolution: 512x256

## Runtime comparison

| Pair | Baseline total ms | Candidate total ms | Total delta | Baseline deep-time ms | Candidate deep-time ms | Deep-time delta | Same coarse signature | Same authoritative signature |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| earthlike-standard-1001001-512x256-run1 | 5897.2 | 5909.6 | 0.21% | 4383.8 | 3872.5 | -11.66% | yes | yes |
| earthlike-standard-1001001-512x256-run2 | 6593.2 | 5284.8 | -19.84% | 4612.1 | 3606.9 | -21.80% | yes | yes |
| earthlike-standard-1001001-512x256-run3 | 6140.9 | 5362.8 | -12.67% | 4498.5 | 3727.2 | -17.15% | yes | yes |
| earthlike-standard-3141592-512x256-run1 | 6254.1 | 5215.4 | -16.61% | 4606.9 | 3605.3 | -21.74% | yes | yes |
| earthlike-standard-3141592-512x256-run2 | 6073.5 | 5519.2 | -9.13% | 4149.7 | 3803.0 | -8.35% | yes | yes |
| earthlike-standard-3141592-512x256-run3 | 5871.3 | 5410.9 | -7.84% | 4224.0 | 3720.2 | -11.93% | yes | yes |
| earthlike-standard-8675309-512x256-run1 | 5896.6 | 5311.2 | -9.93% | 4226.6 | 3616.3 | -14.44% | yes | yes |
| earthlike-standard-8675309-512x256-run2 | 5128.6 | 3879.4 | -24.36% | 3498.8 | 2638.5 | -24.59% | yes | yes |
| earthlike-standard-8675309-512x256-run3 | 5599.3 | 6074.1 | 8.48% | 4342.4 | 4127.5 | -4.95% | yes | yes |
| archipelago-standard-1001001-512x256-run1 | 6709.6 | 5877.9 | -12.39% | 4784.5 | 3975.4 | -16.91% | yes | yes |
| archipelago-standard-1001001-512x256-run2 | 6681.7 | 5903.3 | -11.65% | 4778.2 | 3947.5 | -17.39% | yes | yes |
| archipelago-standard-1001001-512x256-run3 | 6640.8 | 5781.9 | -12.93% | 4778.4 | 3889.1 | -18.61% | yes | yes |
| archipelago-standard-3141592-512x256-run1 | 6819.7 | 6059.2 | -11.15% | 4877.8 | 4139.4 | -15.14% | yes | yes |
| archipelago-standard-3141592-512x256-run2 | 6790.2 | 5970.1 | -12.08% | 4813.9 | 4043.5 | -16.00% | yes | yes |
| archipelago-standard-3141592-512x256-run3 | 6729.7 | 6010.7 | -10.68% | 4800.2 | 4075.9 | -15.09% | yes | yes |
| archipelago-standard-8675309-512x256-run1 | 6888.4 | 6047.5 | -12.21% | 4962.1 | 4141.1 | -16.55% | yes | yes |
| archipelago-standard-8675309-512x256-run2 | 6894.7 | 6138.8 | -10.96% | 4966.7 | 4201.7 | -15.40% | yes | yes |
| archipelago-standard-8675309-512x256-run3 | 6935.7 | 6043.0 | -12.87% | 4964.0 | 4080.3 | -17.80% | yes | yes |
| geology-glacial-stress-1001001-512x256-run1 | 7002.1 | 6303.8 | -9.97% | 4937.4 | 4217.2 | -14.59% | yes | yes |
| geology-glacial-stress-1001001-512x256-run2 | 7029.7 | 6205.8 | -11.72% | 4967.5 | 4153.0 | -16.40% | yes | yes |
| geology-glacial-stress-1001001-512x256-run3 | 7103.2 | 6182.0 | -12.97% | 5053.9 | 4112.7 | -18.62% | yes | yes |
| geology-glacial-stress-3141592-512x256-run1 | 7198.9 | 6309.9 | -12.35% | 5100.7 | 4260.4 | -16.47% | yes | yes |
| geology-glacial-stress-3141592-512x256-run2 | 7255.5 | 6388.9 | -11.94% | 5116.9 | 4280.2 | -16.35% | yes | yes |
| geology-glacial-stress-3141592-512x256-run3 | 7058.5 | 6408.8 | -9.20% | 4972.2 | 4266.6 | -14.19% | yes | yes |
| geology-glacial-stress-8675309-512x256-run1 | 7161.7 | 6468.7 | -9.68% | 5011.8 | 4308.6 | -14.03% | yes | yes |
| geology-glacial-stress-8675309-512x256-run2 | 7190.7 | 6425.9 | -10.63% | 5046.2 | 4272.0 | -15.34% | yes | yes |
| geology-glacial-stress-8675309-512x256-run3 | 7159.2 | 6402.1 | -10.58% | 5068.7 | 4302.5 | -15.12% | yes | yes |

## Deep-time substage comparison

| Pair | Substage | Baseline ms | Candidate ms | Delta |
| --- | --- | ---: | ---: | ---: |
| earthlike-standard-1001001-512x256-run1 | setup-models | 22.9 | 37.3 | 63.20% |
| earthlike-standard-1001001-512x256-run1 | fragment-placement | 81.1 | 98.3 | 21.21% |
| earthlike-standard-1001001-512x256-run1 | surface-aging | 432.9 | 620.7 | 43.41% |
| earthlike-standard-1001001-512x256-run1 | fragment-history | 41.8 | 44.1 | 5.66% |
| earthlike-standard-1001001-512x256-run1 | water-reconciliation | 92.9 | 123.5 | 32.90% |
| earthlike-standard-1001001-512x256-run1 | climate-rebuild | 1876.4 | 1865.6 | -0.58% |
| earthlike-standard-1001001-512x256-run1 | hydrology-rebuild | 1027.5 | 304.6 | -70.35% |
| earthlike-standard-1001001-512x256-run1 | biome-projection-validation | 646.6 | 627.1 | -3.01% |
| earthlike-standard-1001001-512x256-run1 | ledger-and-unattributed | 161.9 | 151.3 | -6.57% |
| earthlike-standard-1001001-512x256-run2 | setup-models | 21.6 | 21.5 | -0.51% |
| earthlike-standard-1001001-512x256-run2 | fragment-placement | 103.4 | 94.0 | -9.06% |
| earthlike-standard-1001001-512x256-run2 | surface-aging | 570.5 | 554.4 | -2.83% |
| earthlike-standard-1001001-512x256-run2 | fragment-history | 48.2 | 32.2 | -33.09% |
| earthlike-standard-1001001-512x256-run2 | water-reconciliation | 117.0 | 103.0 | -11.93% |
| earthlike-standard-1001001-512x256-run2 | climate-rebuild | 1904.6 | 1810.8 | -4.93% |
| earthlike-standard-1001001-512x256-run2 | hydrology-rebuild | 999.0 | 285.0 | -71.47% |
| earthlike-standard-1001001-512x256-run2 | biome-projection-validation | 702.6 | 597.1 | -15.01% |
| earthlike-standard-1001001-512x256-run2 | ledger-and-unattributed | 145.1 | 108.8 | -25.04% |
| earthlike-standard-1001001-512x256-run3 | setup-models | 20.5 | 19.6 | -4.40% |
| earthlike-standard-1001001-512x256-run3 | fragment-placement | 74.9 | 83.8 | 11.80% |
| earthlike-standard-1001001-512x256-run3 | surface-aging | 571.3 | 572.3 | 0.18% |
| earthlike-standard-1001001-512x256-run3 | fragment-history | 32.5 | 36.7 | 13.16% |
| earthlike-standard-1001001-512x256-run3 | water-reconciliation | 112.4 | 94.9 | -15.60% |
| earthlike-standard-1001001-512x256-run3 | climate-rebuild | 2004.6 | 1906.2 | -4.91% |
| earthlike-standard-1001001-512x256-run3 | hydrology-rebuild | 1011.4 | 287.8 | -71.55% |
| earthlike-standard-1001001-512x256-run3 | biome-projection-validation | 545.4 | 611.8 | 12.16% |
| earthlike-standard-1001001-512x256-run3 | ledger-and-unattributed | 125.4 | 114.0 | -9.08% |
| earthlike-standard-3141592-512x256-run1 | setup-models | 17.7 | 12.8 | -27.81% |
| earthlike-standard-3141592-512x256-run1 | fragment-placement | 71.4 | 64.9 | -9.12% |
| earthlike-standard-3141592-512x256-run1 | surface-aging | 607.3 | 572.6 | -5.71% |
| earthlike-standard-3141592-512x256-run1 | fragment-history | 40.3 | 26.5 | -34.33% |
| earthlike-standard-3141592-512x256-run1 | water-reconciliation | 107.7 | 100.2 | -6.96% |
| earthlike-standard-3141592-512x256-run1 | climate-rebuild | 2051.2 | 1832.2 | -10.68% |
| earthlike-standard-3141592-512x256-run1 | hydrology-rebuild | 991.8 | 315.0 | -68.24% |
| earthlike-standard-3141592-512x256-run1 | biome-projection-validation | 579.4 | 529.1 | -8.68% |
| earthlike-standard-3141592-512x256-run1 | ledger-and-unattributed | 140.1 | 152.0 | 8.48% |
| earthlike-standard-3141592-512x256-run2 | setup-models | 17.7 | 16.9 | -4.95% |
| earthlike-standard-3141592-512x256-run2 | fragment-placement | 69.0 | 69.1 | 0.15% |
| earthlike-standard-3141592-512x256-run2 | surface-aging | 614.4 | 577.2 | -6.06% |
| earthlike-standard-3141592-512x256-run2 | fragment-history | 28.6 | 40.5 | 41.77% |
| earthlike-standard-3141592-512x256-run2 | water-reconciliation | 107.2 | 122.0 | 13.80% |
| earthlike-standard-3141592-512x256-run2 | climate-rebuild | 1835.9 | 2014.7 | 9.73% |
| earthlike-standard-3141592-512x256-run2 | hydrology-rebuild | 914.5 | 322.9 | -64.69% |
| earthlike-standard-3141592-512x256-run2 | biome-projection-validation | 444.1 | 511.7 | 15.22% |
| earthlike-standard-3141592-512x256-run2 | ledger-and-unattributed | 118.2 | 128.1 | 8.35% |
| earthlike-standard-3141592-512x256-run3 | setup-models | 18.6 | 14.3 | -23.17% |
| earthlike-standard-3141592-512x256-run3 | fragment-placement | 57.4 | 53.5 | -6.82% |
| earthlike-standard-3141592-512x256-run3 | surface-aging | 615.6 | 654.7 | 6.36% |
| earthlike-standard-3141592-512x256-run3 | fragment-history | 36.0 | 29.5 | -18.09% |
| earthlike-standard-3141592-512x256-run3 | water-reconciliation | 116.0 | 115.5 | -0.42% |
| earthlike-standard-3141592-512x256-run3 | climate-rebuild | 1804.9 | 1916.8 | 6.20% |
| earthlike-standard-3141592-512x256-run3 | hydrology-rebuild | 914.6 | 335.5 | -63.32% |
| earthlike-standard-3141592-512x256-run3 | biome-projection-validation | 516.4 | 484.5 | -6.18% |
| earthlike-standard-3141592-512x256-run3 | ledger-and-unattributed | 144.5 | 115.9 | -19.79% |
| earthlike-standard-8675309-512x256-run1 | setup-models | 21.3 | 23.2 | 8.87% |
| earthlike-standard-8675309-512x256-run1 | fragment-placement | 83.9 | 92.0 | 9.65% |
| earthlike-standard-8675309-512x256-run1 | surface-aging | 546.8 | 568.1 | 3.89% |
| earthlike-standard-8675309-512x256-run1 | fragment-history | 29.4 | 22.6 | -23.09% |
| earthlike-standard-8675309-512x256-run1 | water-reconciliation | 113.1 | 92.3 | -18.37% |
| earthlike-standard-8675309-512x256-run1 | climate-rebuild | 1855.6 | 1971.5 | 6.25% |
| earthlike-standard-8675309-512x256-run1 | hydrology-rebuild | 998.7 | 306.1 | -69.36% |
| earthlike-standard-8675309-512x256-run1 | biome-projection-validation | 444.4 | 430.7 | -3.10% |
| earthlike-standard-8675309-512x256-run1 | ledger-and-unattributed | 133.2 | 109.7 | -17.60% |
| earthlike-standard-8675309-512x256-run2 | setup-models | 26.6 | 23.2 | -12.54% |
| earthlike-standard-8675309-512x256-run2 | fragment-placement | 106.2 | 72.3 | -31.88% |
| earthlike-standard-8675309-512x256-run2 | surface-aging | 590.9 | 414.6 | -29.84% |
| earthlike-standard-8675309-512x256-run2 | fragment-history | 27.2 | 19.2 | -29.25% |
| earthlike-standard-8675309-512x256-run2 | water-reconciliation | 101.4 | 84.2 | -16.98% |
| earthlike-standard-8675309-512x256-run2 | climate-rebuild | 1531.9 | 1411.7 | -7.84% |
| earthlike-standard-8675309-512x256-run2 | hydrology-rebuild | 712.8 | 227.9 | -68.03% |
| earthlike-standard-8675309-512x256-run2 | biome-projection-validation | 301.0 | 290.5 | -3.50% |
| earthlike-standard-8675309-512x256-run2 | ledger-and-unattributed | 100.9 | 94.8 | -6.06% |
| earthlike-standard-8675309-512x256-run3 | setup-models | 17.9 | 23.0 | 28.82% |
| earthlike-standard-8675309-512x256-run3 | fragment-placement | 73.4 | 110.1 | 49.95% |
| earthlike-standard-8675309-512x256-run3 | surface-aging | 416.8 | 664.7 | 59.49% |
| earthlike-standard-8675309-512x256-run3 | fragment-history | 20.9 | 31.1 | 48.76% |
| earthlike-standard-8675309-512x256-run3 | water-reconciliation | 80.1 | 127.1 | 58.58% |
| earthlike-standard-8675309-512x256-run3 | climate-rebuild | 1985.2 | 2225.5 | 12.10% |
| earthlike-standard-8675309-512x256-run3 | hydrology-rebuild | 1106.4 | 334.5 | -69.77% |
| earthlike-standard-8675309-512x256-run3 | biome-projection-validation | 497.1 | 474.0 | -4.66% |
| earthlike-standard-8675309-512x256-run3 | ledger-and-unattributed | 144.6 | 137.5 | -4.88% |
| archipelago-standard-1001001-512x256-run1 | setup-models | 27.5 | 26.3 | -4.28% |
| archipelago-standard-1001001-512x256-run1 | fragment-placement | 107.7 | 105.1 | -2.37% |
| archipelago-standard-1001001-512x256-run1 | surface-aging | 622.3 | 600.5 | -3.50% |
| archipelago-standard-1001001-512x256-run1 | fragment-history | 35.6 | 31.0 | -12.84% |
| archipelago-standard-1001001-512x256-run1 | water-reconciliation | 120.9 | 141.0 | 16.59% |
| archipelago-standard-1001001-512x256-run1 | climate-rebuild | 2172.4 | 2168.3 | -0.19% |
| archipelago-standard-1001001-512x256-run1 | hydrology-rebuild | 1114.7 | 300.8 | -73.01% |
| archipelago-standard-1001001-512x256-run1 | biome-projection-validation | 449.4 | 469.4 | 4.44% |
| archipelago-standard-1001001-512x256-run1 | ledger-and-unattributed | 134.1 | 133.0 | -0.84% |
| archipelago-standard-1001001-512x256-run2 | setup-models | 31.7 | 27.6 | -12.93% |
| archipelago-standard-1001001-512x256-run2 | fragment-placement | 112.9 | 111.8 | -1.03% |
| archipelago-standard-1001001-512x256-run2 | surface-aging | 587.3 | 603.6 | 2.77% |
| archipelago-standard-1001001-512x256-run2 | fragment-history | 36.4 | 34.4 | -5.33% |
| archipelago-standard-1001001-512x256-run2 | water-reconciliation | 127.7 | 126.6 | -0.87% |
| archipelago-standard-1001001-512x256-run2 | climate-rebuild | 2193.4 | 2163.0 | -1.39% |
| archipelago-standard-1001001-512x256-run2 | hydrology-rebuild | 1099.1 | 298.6 | -72.83% |
| archipelago-standard-1001001-512x256-run2 | biome-projection-validation | 459.4 | 453.0 | -1.39% |
| archipelago-standard-1001001-512x256-run2 | ledger-and-unattributed | 130.2 | 128.8 | -1.02% |
| archipelago-standard-1001001-512x256-run3 | setup-models | 31.2 | 31.5 | 1.20% |
| archipelago-standard-1001001-512x256-run3 | fragment-placement | 108.2 | 106.0 | -2.08% |
| archipelago-standard-1001001-512x256-run3 | surface-aging | 630.6 | 623.4 | -1.14% |
| archipelago-standard-1001001-512x256-run3 | fragment-history | 34.7 | 30.7 | -11.53% |
| archipelago-standard-1001001-512x256-run3 | water-reconciliation | 128.9 | 130.4 | 1.11% |
| archipelago-standard-1001001-512x256-run3 | climate-rebuild | 2150.3 | 2127.5 | -1.06% |
| archipelago-standard-1001001-512x256-run3 | hydrology-rebuild | 1108.2 | 287.4 | -74.07% |
| archipelago-standard-1001001-512x256-run3 | biome-projection-validation | 441.5 | 430.2 | -2.57% |
| archipelago-standard-1001001-512x256-run3 | ledger-and-unattributed | 144.8 | 122.0 | -15.71% |
| archipelago-standard-3141592-512x256-run1 | setup-models | 21.4 | 21.9 | 2.21% |
| archipelago-standard-3141592-512x256-run1 | fragment-placement | 77.0 | 75.7 | -1.62% |
| archipelago-standard-3141592-512x256-run1 | surface-aging | 652.1 | 667.5 | 2.37% |
| archipelago-standard-3141592-512x256-run1 | fragment-history | 29.0 | 30.0 | 3.28% |
| archipelago-standard-3141592-512x256-run1 | water-reconciliation | 132.5 | 144.8 | 9.26% |
| archipelago-standard-3141592-512x256-run1 | climate-rebuild | 2181.6 | 2191.8 | 0.47% |
| archipelago-standard-3141592-512x256-run1 | hydrology-rebuild | 1107.6 | 310.9 | -71.93% |
| archipelago-standard-3141592-512x256-run1 | biome-projection-validation | 527.7 | 562.1 | 6.52% |
| archipelago-standard-3141592-512x256-run1 | ledger-and-unattributed | 149.1 | 134.8 | -9.57% |
| archipelago-standard-3141592-512x256-run2 | setup-models | 18.7 | 16.7 | -10.86% |
| archipelago-standard-3141592-512x256-run2 | fragment-placement | 74.5 | 77.0 | 3.37% |
| archipelago-standard-3141592-512x256-run2 | surface-aging | 617.0 | 653.3 | 5.88% |
| archipelago-standard-3141592-512x256-run2 | fragment-history | 28.6 | 31.0 | 8.26% |
| archipelago-standard-3141592-512x256-run2 | water-reconciliation | 128.0 | 125.0 | -2.35% |
| archipelago-standard-3141592-512x256-run2 | climate-rebuild | 2149.0 | 2150.7 | 0.08% |
| archipelago-standard-3141592-512x256-run2 | hydrology-rebuild | 1096.3 | 303.6 | -72.31% |
| archipelago-standard-3141592-512x256-run2 | biome-projection-validation | 548.2 | 543.2 | -0.92% |
| archipelago-standard-3141592-512x256-run2 | ledger-and-unattributed | 153.5 | 143.0 | -6.81% |
| archipelago-standard-3141592-512x256-run3 | setup-models | 19.2 | 22.6 | 18.02% |
| archipelago-standard-3141592-512x256-run3 | fragment-placement | 69.8 | 80.2 | 14.91% |
| archipelago-standard-3141592-512x256-run3 | surface-aging | 628.8 | 636.5 | 1.23% |
| archipelago-standard-3141592-512x256-run3 | fragment-history | 25.9 | 32.2 | 24.31% |
| archipelago-standard-3141592-512x256-run3 | water-reconciliation | 135.1 | 127.3 | -5.76% |
| archipelago-standard-3141592-512x256-run3 | climate-rebuild | 2153.0 | 2167.6 | 0.68% |
| archipelago-standard-3141592-512x256-run3 | hydrology-rebuild | 1081.6 | 303.0 | -71.98% |
| archipelago-standard-3141592-512x256-run3 | biome-projection-validation | 542.1 | 561.1 | 3.51% |
| archipelago-standard-3141592-512x256-run3 | ledger-and-unattributed | 144.9 | 145.4 | 0.33% |
| archipelago-standard-8675309-512x256-run1 | setup-models | 27.9 | 36.3 | 30.23% |
| archipelago-standard-8675309-512x256-run1 | fragment-placement | 118.5 | 117.5 | -0.81% |
| archipelago-standard-8675309-512x256-run1 | surface-aging | 628.8 | 629.5 | 0.11% |
| archipelago-standard-8675309-512x256-run1 | fragment-history | 30.1 | 34.0 | 12.91% |
| archipelago-standard-8675309-512x256-run1 | water-reconciliation | 143.1 | 129.5 | -9.50% |
| archipelago-standard-8675309-512x256-run1 | climate-rebuild | 2188.5 | 2163.2 | -1.16% |
| archipelago-standard-8675309-512x256-run1 | hydrology-rebuild | 1098.3 | 306.3 | -72.11% |
| archipelago-standard-8675309-512x256-run1 | biome-projection-validation | 580.6 | 591.0 | 1.80% |
| archipelago-standard-8675309-512x256-run1 | ledger-and-unattributed | 146.3 | 133.7 | -8.60% |
| archipelago-standard-8675309-512x256-run2 | setup-models | 33.2 | 31.0 | -6.77% |
| archipelago-standard-8675309-512x256-run2 | fragment-placement | 114.8 | 115.4 | 0.49% |
| archipelago-standard-8675309-512x256-run2 | surface-aging | 645.6 | 630.6 | -2.33% |
| archipelago-standard-8675309-512x256-run2 | fragment-history | 31.0 | 34.4 | 10.97% |
| archipelago-standard-8675309-512x256-run2 | water-reconciliation | 133.4 | 134.3 | 0.65% |
| archipelago-standard-8675309-512x256-run2 | climate-rebuild | 2182.5 | 2190.2 | 0.35% |
| archipelago-standard-8675309-512x256-run2 | hydrology-rebuild | 1109.3 | 301.3 | -72.84% |
| archipelago-standard-8675309-512x256-run2 | biome-projection-validation | 581.4 | 632.0 | 8.70% |
| archipelago-standard-8675309-512x256-run2 | ledger-and-unattributed | 135.4 | 132.7 | -2.05% |
| archipelago-standard-8675309-512x256-run3 | setup-models | 32.2 | 28.4 | -11.66% |
| archipelago-standard-8675309-512x256-run3 | fragment-placement | 110.6 | 108.0 | -2.41% |
| archipelago-standard-8675309-512x256-run3 | surface-aging | 663.4 | 620.7 | -6.44% |
| archipelago-standard-8675309-512x256-run3 | fragment-history | 34.2 | 32.5 | -5.09% |
| archipelago-standard-8675309-512x256-run3 | water-reconciliation | 138.8 | 127.7 | -7.99% |
| archipelago-standard-8675309-512x256-run3 | climate-rebuild | 2185.8 | 2166.9 | -0.87% |
| archipelago-standard-8675309-512x256-run3 | hydrology-rebuild | 1101.7 | 301.3 | -72.65% |
| archipelago-standard-8675309-512x256-run3 | biome-projection-validation | 570.3 | 560.0 | -1.81% |
| archipelago-standard-8675309-512x256-run3 | ledger-and-unattributed | 127.1 | 135.0 | 6.22% |
| geology-glacial-stress-1001001-512x256-run1 | setup-models | 28.0 | 25.6 | -8.48% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-placement | 104.0 | 100.0 | -3.89% |
| geology-glacial-stress-1001001-512x256-run1 | surface-aging | 686.1 | 703.8 | 2.57% |
| geology-glacial-stress-1001001-512x256-run1 | fragment-history | 38.1 | 37.3 | -1.93% |
| geology-glacial-stress-1001001-512x256-run1 | water-reconciliation | 134.9 | 121.7 | -9.77% |
| geology-glacial-stress-1001001-512x256-run1 | climate-rebuild | 2271.4 | 2323.0 | 2.27% |
| geology-glacial-stress-1001001-512x256-run1 | hydrology-rebuild | 1169.6 | 415.4 | -64.48% |
| geology-glacial-stress-1001001-512x256-run1 | biome-projection-validation | 362.5 | 357.3 | -1.43% |
| geology-glacial-stress-1001001-512x256-run1 | ledger-and-unattributed | 142.7 | 133.0 | -6.84% |
| geology-glacial-stress-1001001-512x256-run2 | setup-models | 30.6 | 30.6 | 0.06% |
| geology-glacial-stress-1001001-512x256-run2 | fragment-placement | 104.3 | 97.0 | -7.04% |
| geology-glacial-stress-1001001-512x256-run2 | surface-aging | 695.6 | 713.4 | 2.56% |
| geology-glacial-stress-1001001-512x256-run2 | fragment-history | 37.4 | 35.0 | -6.47% |
| geology-glacial-stress-1001001-512x256-run2 | water-reconciliation | 120.5 | 113.8 | -5.51% |
| geology-glacial-stress-1001001-512x256-run2 | climate-rebuild | 2290.3 | 2247.4 | -1.87% |
| geology-glacial-stress-1001001-512x256-run2 | hydrology-rebuild | 1213.2 | 426.3 | -64.86% |
| geology-glacial-stress-1001001-512x256-run2 | biome-projection-validation | 349.6 | 350.7 | 0.32% |
| geology-glacial-stress-1001001-512x256-run2 | ledger-and-unattributed | 125.9 | 138.7 | 10.19% |
| geology-glacial-stress-1001001-512x256-run3 | setup-models | 27.4 | 23.1 | -15.84% |
| geology-glacial-stress-1001001-512x256-run3 | fragment-placement | 99.5 | 101.3 | 1.76% |
| geology-glacial-stress-1001001-512x256-run3 | surface-aging | 727.6 | 683.7 | -6.03% |
| geology-glacial-stress-1001001-512x256-run3 | fragment-history | 39.7 | 36.7 | -7.69% |
| geology-glacial-stress-1001001-512x256-run3 | water-reconciliation | 129.0 | 134.5 | 4.28% |
| geology-glacial-stress-1001001-512x256-run3 | climate-rebuild | 2311.5 | 2256.7 | -2.37% |
| geology-glacial-stress-1001001-512x256-run3 | hydrology-rebuild | 1227.9 | 395.9 | -67.76% |
| geology-glacial-stress-1001001-512x256-run3 | biome-projection-validation | 357.6 | 341.8 | -4.42% |
| geology-glacial-stress-1001001-512x256-run3 | ledger-and-unattributed | 133.6 | 139.0 | 4.06% |
| geology-glacial-stress-3141592-512x256-run1 | setup-models | 18.2 | 29.0 | 59.16% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-placement | 63.3 | 63.9 | 1.05% |
| geology-glacial-stress-3141592-512x256-run1 | surface-aging | 766.6 | 752.6 | -1.83% |
| geology-glacial-stress-3141592-512x256-run1 | fragment-history | 31.0 | 28.2 | -9.04% |
| geology-glacial-stress-3141592-512x256-run1 | water-reconciliation | 131.2 | 120.1 | -8.46% |
| geology-glacial-stress-3141592-512x256-run1 | climate-rebuild | 2312.3 | 2237.7 | -3.23% |
| geology-glacial-stress-3141592-512x256-run1 | hydrology-rebuild | 1191.7 | 420.1 | -64.75% |
| geology-glacial-stress-3141592-512x256-run1 | biome-projection-validation | 443.0 | 459.1 | 3.65% |
| geology-glacial-stress-3141592-512x256-run1 | ledger-and-unattributed | 143.3 | 149.6 | 4.33% |
| geology-glacial-stress-3141592-512x256-run2 | setup-models | 13.7 | 19.1 | 40.23% |
| geology-glacial-stress-3141592-512x256-run2 | fragment-placement | 68.5 | 65.1 | -4.89% |
| geology-glacial-stress-3141592-512x256-run2 | surface-aging | 762.9 | 768.1 | 0.69% |
| geology-glacial-stress-3141592-512x256-run2 | fragment-history | 30.3 | 33.1 | 9.28% |
| geology-glacial-stress-3141592-512x256-run2 | water-reconciliation | 119.5 | 121.2 | 1.41% |
| geology-glacial-stress-3141592-512x256-run2 | climate-rebuild | 2297.0 | 2252.9 | -1.92% |
| geology-glacial-stress-3141592-512x256-run2 | hydrology-rebuild | 1214.8 | 411.5 | -66.13% |
| geology-glacial-stress-3141592-512x256-run2 | biome-projection-validation | 472.9 | 469.8 | -0.65% |
| geology-glacial-stress-3141592-512x256-run2 | ledger-and-unattributed | 137.3 | 139.3 | 1.42% |
| geology-glacial-stress-3141592-512x256-run3 | setup-models | 17.5 | 19.4 | 10.73% |
| geology-glacial-stress-3141592-512x256-run3 | fragment-placement | 60.0 | 66.3 | 10.55% |
| geology-glacial-stress-3141592-512x256-run3 | surface-aging | 732.2 | 755.5 | 3.19% |
| geology-glacial-stress-3141592-512x256-run3 | fragment-history | 30.8 | 38.0 | 23.34% |
| geology-glacial-stress-3141592-512x256-run3 | water-reconciliation | 115.4 | 134.0 | 16.11% |
| geology-glacial-stress-3141592-512x256-run3 | climate-rebuild | 2255.1 | 2245.6 | -0.42% |
| geology-glacial-stress-3141592-512x256-run3 | hydrology-rebuild | 1186.8 | 410.0 | -65.46% |
| geology-glacial-stress-3141592-512x256-run3 | biome-projection-validation | 446.9 | 451.1 | 0.95% |
| geology-glacial-stress-3141592-512x256-run3 | ledger-and-unattributed | 127.6 | 146.8 | 15.03% |
| geology-glacial-stress-8675309-512x256-run1 | setup-models | 29.4 | 29.6 | 0.62% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-placement | 96.9 | 100.8 | 4.01% |
| geology-glacial-stress-8675309-512x256-run1 | surface-aging | 701.9 | 693.7 | -1.17% |
| geology-glacial-stress-8675309-512x256-run1 | fragment-history | 35.4 | 29.2 | -17.51% |
| geology-glacial-stress-8675309-512x256-run1 | water-reconciliation | 119.4 | 125.4 | 5.05% |
| geology-glacial-stress-8675309-512x256-run1 | climate-rebuild | 2271.4 | 2324.4 | 2.34% |
| geology-glacial-stress-8675309-512x256-run1 | hydrology-rebuild | 1191.5 | 433.8 | -63.59% |
| geology-glacial-stress-8675309-512x256-run1 | biome-projection-validation | 425.7 | 433.5 | 1.84% |
| geology-glacial-stress-8675309-512x256-run1 | ledger-and-unattributed | 140.4 | 138.2 | -1.57% |
| geology-glacial-stress-8675309-512x256-run2 | setup-models | 28.4 | 28.6 | 0.93% |
| geology-glacial-stress-8675309-512x256-run2 | fragment-placement | 105.0 | 101.3 | -3.53% |
| geology-glacial-stress-8675309-512x256-run2 | surface-aging | 709.5 | 707.1 | -0.34% |
| geology-glacial-stress-8675309-512x256-run2 | fragment-history | 40.2 | 36.9 | -8.11% |
| geology-glacial-stress-8675309-512x256-run2 | water-reconciliation | 126.0 | 114.0 | -9.53% |
| geology-glacial-stress-8675309-512x256-run2 | climate-rebuild | 2238.7 | 2274.2 | 1.59% |
| geology-glacial-stress-8675309-512x256-run2 | hydrology-rebuild | 1209.3 | 433.5 | -64.15% |
| geology-glacial-stress-8675309-512x256-run2 | biome-projection-validation | 452.0 | 446.6 | -1.18% |
| geology-glacial-stress-8675309-512x256-run2 | ledger-and-unattributed | 137.1 | 129.6 | -5.43% |
| geology-glacial-stress-8675309-512x256-run3 | setup-models | 26.0 | 25.9 | -0.70% |
| geology-glacial-stress-8675309-512x256-run3 | fragment-placement | 107.5 | 105.7 | -1.72% |
| geology-glacial-stress-8675309-512x256-run3 | surface-aging | 671.4 | 701.9 | 4.54% |
| geology-glacial-stress-8675309-512x256-run3 | fragment-history | 34.7 | 28.8 | -16.91% |
| geology-glacial-stress-8675309-512x256-run3 | water-reconciliation | 133.8 | 128.1 | -4.25% |
| geology-glacial-stress-8675309-512x256-run3 | climate-rebuild | 2294.9 | 2281.1 | -0.60% |
| geology-glacial-stress-8675309-512x256-run3 | hydrology-rebuild | 1211.1 | 432.4 | -64.30% |
| geology-glacial-stress-8675309-512x256-run3 | biome-projection-validation | 457.6 | 453.8 | -0.84% |
| geology-glacial-stress-8675309-512x256-run3 | ledger-and-unattributed | 131.6 | 144.9 | 10.10% |

The workflows run sequentially with the same seed, scenario, and resolved configuration. Production preserves its legacy shared-stream contract; the experimental workflow uses semantic node streams, so signature differences are expected and must be evaluated through the quality scorecard.

Substage timing is captured from the existing deep-time progress contract. The ledger-and-unattributed row exposes mutation-ledger setup/finalization and any work not yet bounded by an explicit progress transition.
