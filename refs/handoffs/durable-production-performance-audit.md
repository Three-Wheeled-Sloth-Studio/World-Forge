# Durable Production Performance Audit Handoff

The page timing buffer and command-line harness currently provide local evidence only. They do not write to PostgreSQL or another shared audit service.

Authoritative requirements are in:

- `refs/planning/durable-production-performance-audit.md`

The implementation increment should add an authenticated, append-only PostgreSQL ingestion path, local retry queue, duplicate-safe record IDs, Dev upload status, and a query/export path for matched production baselines.

Do not block world generation on audit upload availability. Do not upload generated world rasters or arbitrary user content.
