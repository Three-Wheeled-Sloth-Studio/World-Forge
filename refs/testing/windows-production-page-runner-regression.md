# Windows Production Page Runner Regression

Observed on Windows PowerShell from the repository root:

```text
Error: spawn EINVAL
    at ChildProcess.spawn
    at scripts/profile-production-page.ts:289
```

Root cause: the original harness spawned `npm.cmd` directly for build and preview orchestration. That is not a reliable Node child-process boundary on Windows.

Correction:

- `npm run profile:production-page` now starts `scripts/profile-production-page-runner.ts`;
- the runner executes the active npm CLI through `process.execPath` and `process.env.npm_execpath`;
- a `cmd.exe` fallback remains for environments that do not expose `npm_execpath`;
- the inner browser harness receives a managed `--base-url` and no longer owns npm subprocess orchestration on the public command path;
- runner self-tests cover the Windows npm-CLI path, Windows fallback, and inner argument forwarding;
- the CI browser smoke uses the public runner path.

Reproduction command after the fix:

```bash
npm run profile:production-page -- --plan refs/testing/production-page-performance-plan.example.json
```
