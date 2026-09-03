---
type: "Testing Reference"
title: "Production Performance Audit Gap"
tags:
- world-forge
- testing
---
# Production Performance Audit Gap

The production page timing feature currently retains records in a bounded browser-local buffer and exposes manual export. The command-line harness writes durable local files. Neither path currently writes to a centralized PostgreSQL audit table.

This gap must remain explicit in all performance reporting until the durable audit pipeline in `refs/planning/durable-production-performance-audit.md` is implemented.
