# Case-collision regression guard

World Forge supports Windows development and must not contain tracked paths that differ only by capitalization.

## Automated guard

Run:

```bash
npm run check:case-collisions
```

The command reads `git ls-files` when a Git checkout is available, case-folds each complete relative path, and fails if two distinct tracked paths collapse to the same result. A filesystem-walk fallback exists for source snapshots without `.git`.

The guard runs automatically before both `npm run typecheck` and `npm run build`.

## Regression examples

Invalid:

```text
apps/desktop/src/regions/GeographicAtlasContextMap.tsx
apps/desktop/src/regions/geographicAtlasContextMap.ts
```

Valid:

```text
apps/desktop/src/regions/GeographicAtlasContextMap.tsx
apps/desktop/src/regions/geographicAtlasContextGeometry.ts
```

## Manual review

For every file addition or rename:

1. Confirm the full new path does not differ from another tracked path only by capitalization.
2. Confirm every import uses the exact tracked casing.
3. Use a semantic helper suffix rather than case alone to distinguish related modules.
4. Use a temporary intermediate path for case-only renames.

A Windows `TS1149` or `TS1261` failure is evidence that the repository path design is invalid. It is not an acceptable platform exception.
