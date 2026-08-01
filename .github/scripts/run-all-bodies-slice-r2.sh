#!/usr/bin/env bash
set -euo pipefail
BRANCH='automation/all-system-bodies-20260801-r3'
BASE_SHA='a8fe9af37e1581cf4d4c03c2c1c3e62d7700354e'
VITE_PID=''
cleanup() {
  if [ -n "${VITE_PID}" ]; then kill "${VITE_PID}" || true; fi
  git push origin --delete "${BRANCH}" || true
}
trap cleanup EXIT

cat .github/scripts/apply-all-bodies.part.* > /tmp/apply-all-bodies.b64
base64 -d /tmp/apply-all-bodies.b64 | gzip -d > /tmp/apply-all-bodies.py
printf '%s  %s\n' \
  '89317db4a65eb92420cb93f482a5a4829bbb15d6dff6308ee3228bca6f734c61' '/tmp/apply-all-bodies.py' > /tmp/all-bodies-source.sha256
sha256sum -c /tmp/all-bodies-source.sha256
cp .github/scripts/qa-all-bodies-source.mjs /tmp/qa-all-bodies.mjs
python -m py_compile /tmp/apply-all-bodies.py
node --check /tmp/qa-all-bodies.mjs

git fetch origin dev
test "$(git rev-parse origin/dev)" = "${BASE_SHA}"
git checkout -B dev origin/dev
npm ci
python /tmp/apply-all-bodies.py
git diff --check

npx vitest run \
  packages/generation-runtime/src/enrichment/systemBodyGeneration.test.ts \
  packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.test.ts \
  apps/desktop/src/system/systemPresentation.test.ts \
  apps/desktop/src/globe/globeBodyTarget.test.ts
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
console.log('POST_ALL_BODY_EQUIVALENCE=' + JSON.stringify(report.comparisons));
if (failed.length) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(2);
}
NODE

mkdir -p .github/scripts
cp /tmp/qa-all-bodies.mjs .github/scripts/qa-all-bodies.runtime.mjs
npx playwright install chromium
npm run dev -- --host 127.0.0.1 > /tmp/world-forge-vite.log 2>&1 &
VITE_PID=$!
for i in {1..60}; do
  if curl -fsS http://127.0.0.1:5173 >/dev/null; then break; fi
  sleep 1
done
node .github/scripts/qa-all-bodies.runtime.mjs || {
  cat /tmp/world-forge-vite.log
  exit 1
}
kill "${VITE_PID}" || true
VITE_PID=''
rm .github/scripts/qa-all-bodies.runtime.mjs

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add \
  packages/shared/src/index.ts \
  packages/generation-runtime/src/enrichment/systemBodyGeneration.ts \
  packages/generation-runtime/src/enrichment/systemBodyGeneration.test.ts \
  packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.ts \
  packages/generation-runtime/src/enrichment/bodyGenerationLifecycle.test.ts \
  apps/desktop/src/enrichmentWorker.ts
git diff --cached --check
git commit -m "Add capability-resolved system body generation"

git add \
  apps/desktop/src/enrichment/useBodyGenerationQueue.ts \
  apps/desktop/src/system/generatedBodyPresentation.ts \
  apps/desktop/src/system/BodyGenerationPanel.tsx \
  apps/desktop/src/system/SystemViewer.tsx \
  apps/desktop/src/system/systemPresentation.ts \
  apps/desktop/src/system/systemPresentation.test.ts \
  apps/desktop/src/globe/globeBodyTarget.ts \
  apps/desktop/src/globe/globeBodyTarget.test.ts \
  apps/desktop/src/globe/GlobeViewer.tsx
git diff --cached --check
git commit -m "Render and inspect every generated system body"

git add \
  apps/desktop/src/appVersion.ts \
  refs/planning/pi-system-visualization-and-progressive-body-enrichment.md \
  refs/handoffs/system-visualization-enrichment.md \
  refs/testing/all-system-body-generation-qa.md
git diff --cached --check
git commit -m "Document all-body generation boundary"

git push origin HEAD:dev
echo "Validated dev commit: $(git rev-parse HEAD)"
