---
type: "Testing Reference"
title: "Production page performance harness"
tags:
- world-forge
- testing
---
# Production page performance harness

- Generated: 2026-08-02T20:19:58.785Z
- Source commit used for local build: 42ae4b6d79994235031220869ea1dff3b444c012
- Page: http://127.0.0.1:4173
- Browser: chromium headed
- Measurement layer: production bundle, real browser page, Generator controls, production worker, page timing record

| Case | Valid runs | User-visible median (range) | Worker median (range) | Handoff median (range) | UI median (range) | Slowest native stage |
|---|---:|---:|---:|---:|---:|---|
| earthlike-1024x512 | 3/3 | 17 s (13 s-20 s) | 16 s (13 s-19 s) | 47 ms (41 ms-51 ms) | 820 ms (582 ms-827 ms) | Biomes and features (7.1 s) |
| earthlike-2048x1024 | 3/3 | 1m 24s (1m 18s-1m 26s) | 1m 21s (1m 16s-1m 23s) | 224 ms (176 ms-230 ms) | 1.9 s (1.4 s-2.0 s) | Biomes and features (35 s) |
| earthlike-4096x2048 | 3/3 | 7m 09s (6m 59s-8m 11s) | 7m 00s (6m 49s-8m 00s) | 951 ms (938 ms-996 ms) | 5.8 s (5.3 s-6.6 s) | Biomes and features (3m 11s) |
| archipelago-1024x512 | 3/3 | 22 s (14 s-23 s) | 21 s (14 s-22 s) | 54 ms (43 ms-60 ms) | 689 ms (625 ms-723 ms) | Biomes and features (9.1 s) |
| archipelago-2048x1024 | 3/3 | 1m 49s (1m 46s-2m 02s) | 1m 47s (1m 43s-2m 00s) | 272 ms (253 ms-275 ms) | 1.7 s (1.7 s-1.7 s) | Biomes and features (51 s) |
| archipelago-4096x2048 | 3/3 | 8m 26s (8m 14s-8m 46s) | 8m 17s (8m 05s-8m 35s) | 911 ms (894 ms-1.0 s) | 5.7 s (5.6 s-6.3 s) | Biomes and features (4m 23s) |

Warmup runs are retained as evidence but excluded from the summary statistics. Parent stage and child operation timings must not be added together.
