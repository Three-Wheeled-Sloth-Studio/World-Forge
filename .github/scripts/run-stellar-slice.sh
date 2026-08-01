#!/usr/bin/env bash
set -euo pipefail
BRANCH='automation/stellar-surface-slice-20260801-r3'
BASE_SHA='15b5c253481b8242f42464333e78ec3ee4029f15'
VITE_PID=''
cleanup() {
  if [ -n "${VITE_PID}" ]; then kill "${VITE_PID}" || true; fi
  git push origin --delete "${BRANCH}" || true
}
trap cleanup EXIT

printf '%s  %s\n' \
  '73d19a71ea5d956661baaeaad20af6ab3b051cebc297ffabaa379dcf203d3194' '/tmp/apply-stellar.b64' > /tmp/stellar-inputs.sha256
cat .github/scripts/apply-stellar.part.* > /tmp/apply-stellar.b64
sha256sum -c /tmp/stellar-inputs.sha256
base64 -d /tmp/apply-stellar.b64 | gzip -d > /tmp/apply-stellar.py
cp .github/scripts/qa-stellar-source.mjs /tmp/qa-stellar.mjs
python -m py_compile /tmp/apply-stellar.py
node --check /tmp/qa-stellar.mjs

git fetch origin dev
test "$(git rev-parse origin/dev)" = "${BASE_SHA}"
git checkout -B dev origin/dev
npm ci
python /tmp/apply-stellar.py
git diff --check

npx vitest run \
  packages/generation-runtime/src/enrichment/stellarSurfacePresentation.test.ts \
  packages/generation-runtime/src/enrichment/systemOrbitalContext.test.ts \
  packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.test.ts \
  apps/desktop/src/system/systemPresentation.test.ts
npm run verify

npm run benchmark:workflows -- \
  --workflows=core.performance-foundation,core.world-generation-experimental \
  --resolution=256x128 \
  --runs=1 \
  --seeds=1001001,3141592,8675309 \
  --scenarios=earthlike-standard,archipelago-standard,geology-glacial-stress \
  --source-commit="${BASE_SHA}"
REPORT="$(ls -1t refs/testing/generation-workflow-comparison-*.json | head -n 1)"
node --input-type=module - "$REPORT" <<'NODE'
import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const failed = report.comparisons.filter((entry) => !entry.signaturesEqual || !entry.authoritativeSignaturesEqual);
console.log('POST_STELLAR_EQUIVALENCE=' + JSON.stringify(report.comparisons));
if (failed.length) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(2);
}
NODE

npx playwright install chromium
npm run dev -- --host 127.0.0.1 > /tmp/world-forge-vite.log 2>&1 &
VITE_PID=$!
for i in {1..60}; do
  if curl -fsS http://127.0.0.1:5173 >/dev/null; then break; fi
  sleep 1
done
node /tmp/qa-stellar.mjs || {
  cat /tmp/world-forge-vite.log
  exit 1
}
kill "${VITE_PID}" || true
VITE_PID=''

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add \
  packages/shared/src/index.ts \
  packages/generation-runtime/src/enrichment/stellarSurfacePresentation.ts \
  packages/generation-runtime/src/enrichment/stellarSurfacePresentation.test.ts \
  packages/generation-runtime/src/enrichment/systemOrbitalContext.ts \
  packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.test.ts \
  apps/desktop/src/enrichmentWorker.ts
git diff --cached --check
git commit -m "Add Experimental stellar presentation workflow"

git add \
  apps/desktop/src/enrichment/useStellarSurfaceEnrichment.ts \
  apps/desktop/src/system/StellarSurfacePanel.tsx \
  apps/desktop/src/system/stellarSurfacePresentation.ts \
  apps/desktop/src/system/SystemViewer.tsx \
  apps/desktop/src/system/BodyGenerationPanel.tsx \
  apps/desktop/src/system/systemViewer.css \
  apps/desktop/src/main.tsx
git diff --cached --check
git commit -m "Render generated stellar activity in System view"

git add \
  apps/desktop/src/appVersion.ts \
  refs/planning/pi-system-visualization-and-progressive-body-enrichment.md \
  refs/handoffs/system-visualization-enrichment.md \
  refs/testing/stellar-surface-presentation-qa.md
git diff --cached --check
git commit -m "Document stellar presentation boundary"

git push origin HEAD:dev
echo "Validated dev commit: $(git rev-parse HEAD)"
