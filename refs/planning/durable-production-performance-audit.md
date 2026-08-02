# Durable Production Performance Audit

Updated: 2026-08-02

Related:

- Issue #14
- `refs/planning/production-performance-instrumentation-plan.md`
- `refs/testing/production-page-performance-harness.md`

## Correction

The production page currently records timing data in a bounded browser-local history and allows manual JSON/Markdown export. That is a telemetry buffer, not a durable audit log.

The command-line page harness writes durable local evidence files, but it also does not provide centralized audit persistence. Neither mechanism currently writes production performance records to PostgreSQL or another shared server-side evidence store.

## Required outcome

Add an authenticated, append-only production performance audit pipeline backed by PostgreSQL.

Each completed or failed generation record should be submitted asynchronously after the local record is finalized. Generation must remain usable when the audit service is unavailable; failed uploads should remain queued locally and retry with bounded backoff.

## Minimum record identity

- immutable audit record ID;
- generation task ID;
- user ID or explicitly anonymous installation/session ID;
- application version and source commit;
- workflow ID and version;
- launch source;
- world preset, star preset, seeds, resolution, topology size, and relevant configuration hash;
- started, completed, received, accepted, committed, and first-interactive timestamps;
- completion or failure status;
- target platform, browser/webview identity, logical processor count, and visibility/focus state.

## Timing payload

Persist the complete versioned production timing record, including:

- user-visible wall time;
- worker generation and reconciliation;
- completed-project structured-clone handoff;
- UI acceptance, React commit, and first interactive paint;
- native stage timings;
- measured graph-node timings;
- measured child diagnostic operations and parent relationships;
- preview count, transferred bytes, callback overhead, and UI paint overhead;
- estimated completed-project payload size;
- declared instrumentation gaps and harness warnings.

The original JSON payload should be retained as the authoritative evidence object. Query-friendly columns may be extracted for indexing and analysis, but must not replace the original record.

## Suggested PostgreSQL shape

### `generation_performance_audit`

- `audit_id uuid primary key`
- `recorded_at timestamptz not null default now()`
- `client_completed_at timestamptz`
- `user_id text null`
- `installation_id text null`
- `task_id text not null`
- `status text not null`
- `app_version text not null`
- `source_commit text not null`
- `workflow_id text not null`
- `workflow_version text not null`
- `world_seed text not null`
- `star_seed text null`
- `preset_id text null`
- `resolution_width integer not null`
- `resolution_height integer not null`
- `wall_time_ms double precision null`
- `worker_generation_ms double precision null`
- `project_handoff_ms double precision null`
- `ui_interactive_ms double precision null`
- `payload jsonb not null`

Recommended indexes:

- `(recorded_at desc)`
- `(source_commit, workflow_id, resolution_width, resolution_height)`
- `(world_seed, preset_id, workflow_id)`
- `(status, recorded_at desc)`

## Security and privacy

- Require authenticated writes for signed-in users.
- Use server-side authorization; never expose a privileged database credential in the client.
- Accept only the versioned performance schema and enforce payload-size limits.
- Do not upload generated world rasters, project packages, email addresses, access tokens, or arbitrary user content.
- Support an explicit telemetry preference before general public release.
- Retain enough installation identity to diagnose repeated hardware-specific behavior without treating the performance table as an analytics free-for-all.

## Delivery sequence

1. Confirm the existing hosted backend path and PostgreSQL ownership.
2. Add migration, least-privilege ingestion endpoint, and schema validation.
3. Add a local upload queue with retry and duplicate-safe audit IDs.
4. Write completed and failed records after local finalization.
5. Add Dev visibility for local status: queued, uploaded, rejected, or disabled.
6. Add a query/export path for matched baseline analysis.
7. Backfill command-line harness summaries through the same endpoint or an explicit import command.

Until this is implemented, reports must distinguish among:

- browser-local telemetry buffer;
- durable local harness evidence;
- centralized durable audit evidence.
