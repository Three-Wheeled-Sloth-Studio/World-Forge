#!/usr/bin/env bash
set -euo pipefail
BRANCH='automation/all-system-bodies-20260801-r8'
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
python - <<'PYFIX'
from pathlib import Path
path = Path('/tmp/apply-all-bodies.py')
text = path.read_text(encoding='utf-8')
old = r"    workflow: artifact.workflow,\n    source: artifact.source,"
new = r"    workflow: {\n      id: artifact.workflow.id,\n      version: artifact.workflow.version,\n      graphSignature: artifact.workflow.graphSignature\n    },\n    source: artifact.source,"
if text.count(old) != 1:
    raise SystemExit(f'expected one deterministic-signature patch point, found {text.count(old)}')
path.write_text(text.replace(old, new), encoding='utf-8')
PYFIX
printf '%s  %s\n' \
  '5a1f2b1d89a771485ac178d2b40deee0d3489370add53cecdab0d15b17ef0647' '/tmp/apply-all-bodies.py' > /tmp/all-bodies-fixed.sha256
sha256sum -c /tmp/all-bodies-fixed.sha256
cp .github/scripts/qa-all-bodies-source.mjs /tmp/qa-all-bodies.mjs
python -m py_compile /tmp/apply-all-bodies.py
node --check /tmp/qa-all-bodies.mjs

git fetch origin dev
test "$(git rev-parse origin/dev)" = "${BASE_SHA}"
git checkout -B dev origin/dev
npm ci
python /tmp/apply-all-bodies.py
python - <<'PYINTEGRATE'
from pathlib import Path
import re

def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')

# Register the generic workflow ID with shared enrichment events. The descriptor itself is profile-resolved.
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "import {\n  STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,\n  stellarSurfacePresentationWorkflowDescriptor\n} from './stellarSurfacePresentation';",
    "import {\n  STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID,\n  stellarSurfacePresentationWorkflowDescriptor\n} from './stellarSurfacePresentation';\nimport { SYSTEM_BODY_GENERATION_WORKFLOW_ID } from './systemBodyGeneration';"
)
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "export type ProjectEnrichmentWorkflowId = typeof SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID | typeof ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID | typeof STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID | typeof AIRLESS_ROCKY_BODY_WORKFLOW_ID;",
    "export type ProjectEnrichmentWorkflowId = typeof SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID | typeof ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID | typeof STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID | typeof AIRLESS_ROCKY_BODY_WORKFLOW_ID | typeof SYSTEM_BODY_GENERATION_WORKFLOW_ID;"
)
replace_once(
    'packages/generation-runtime/src/enrichment/systemOrbitalContext.ts',
    "return value === SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID || value === ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID || value === STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID || value === AIRLESS_ROCKY_BODY_WORKFLOW_ID;",
    "return value === SYSTEM_ORBITAL_CONTEXT_WORKFLOW_ID || value === ATMOSPHERIC_WEATHER_PRESENTATION_WORKFLOW_ID || value === STELLAR_SURFACE_PRESENTATION_WORKFLOW_ID || value === AIRLESS_ROCKY_BODY_WORKFLOW_ID || value === SYSTEM_BODY_GENERATION_WORKFLOW_ID;"
)

# Match the established enrichment validation issue contract.
generation_path = Path('packages/generation-runtime/src/enrichment/systemBodyGeneration.ts')
generation_text = generation_path.read_text(encoding='utf-8')
generation_text, issue_count = re.subn(
    r"\{ code: '[^']+', message:",
    "{ severity: 'error', message:",
    generation_text
)
if issue_count != 9:
    raise SystemExit(f'expected nine validation issue conversions, found {issue_count}')
generation_path.write_text(generation_text, encoding='utf-8')

# Finish converting the primary-Globe orbital helpers from the airless proof to generic body artifacts.
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "import type { AtmosphericWeatherPresentationArtifact, OrbitalPresentationBody, SystemOrbitalContextArtifact, WeatherPresentationSystem, WorldProject } from '@world-forge/shared';",
    "import type { AtmosphericWeatherPresentationArtifact, GeneratedSystemBodyArtifact, OrbitalPresentationBody, SystemOrbitalContextArtifact, WeatherPresentationSystem, WorldProject } from '@world-forge/shared';"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "type OrbitalBodyVisual = {\n  body: OrbitalPresentationBody;\n  group: THREE.Group;\n  mesh: THREE.Mesh;\n  displayRadius: number;\n};",
    "type OrbitalBodyVisual = {\n  body: OrbitalPresentationBody;\n  group: THREE.Group;\n  mesh: THREE.Object3D;\n  displayRadius: number;\n};"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "        const generatedArtifact = airlessArtifactForBody(project, artifact, body.id, fidelity);",
    "        const generatedArtifact = bodyArtifactForBody(project, artifact, body.id, fidelity);"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "      .map((body) => createOrbitalBodyVisual(scene, body, displayRadiusForVisibleBody(body), null))",
    "      .map((body) => {\n        const fidelity = project.bodyGeneration?.records[body.id]?.requestedFidelity ?? 'preview';\n        const generatedArtifact = bodyArtifactForBody(project, artifact, body.id, fidelity);\n        return createOrbitalBodyVisual(scene, body, displayRadiusForVisibleBody(body), generatedArtifact);\n      })"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "function createOrbitalBodyVisual(scene: THREE.Scene, body: OrbitalPresentationBody, displayRadius: number, generatedArtifact: import('@world-forge/shared').AirlessRockyBodyArtifact | null): OrbitalBodyVisual {",
    "function createOrbitalBodyVisual(scene: THREE.Scene, body: OrbitalPresentationBody, displayRadius: number, generatedArtifact: GeneratedSystemBodyArtifact | null): OrbitalBodyVisual {"
)
replace_once(
    'apps/desktop/src/globe/GlobeViewer.tsx',
    "  const mesh = generatedArtifact\n    ? createAirlessBodyMesh(generatedArtifact, radius)",
    "  const mesh = generatedArtifact\n    ? createGeneratedBodyObject(generatedArtifact, radius)"
)

# Drive queue continuation from persisted lifecycle state rather than a recursive timeout chain.
replace_once(
    'apps/desktop/src/enrichment/useBodyGenerationQueue.ts',
    "        window.setTimeout(() => runNext(completedLifecycle), 0);",
    ""
)
replace_once(
    'apps/desktop/src/enrichment/useBodyGenerationQueue.ts',
    "  useEffect(() => {\n    if (!lifecycle?.activeBodyId) return;\n    const refresh = () => setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));\n    refresh();\n    const timer = window.setInterval(refresh, 100);\n    return () => window.clearInterval(timer);\n  }, [lifecycle?.activeBodyId]);\n\n  const updateAndMaybeRun",
    "  useEffect(() => {\n    if (!lifecycle?.activeBodyId) return;\n    const refresh = () => setElapsedMs(Math.max(0, performance.now() - taskStartedAtRef.current));\n    refresh();\n    const timer = window.setInterval(refresh, 100);\n    return () => window.clearInterval(timer);\n  }, [lifecycle?.activeBodyId]);\n\n  const queuedBodyIds = lifecycle?.queue.join('|') ?? '';\n  useEffect(() => {\n    if (!lifecycle || lifecycle.paused || lifecycle.activeBodyId || lifecycle.queue.length === 0 || taskIdRef.current) return;\n    const timer = window.setTimeout(() => runNext(lifecycle), 0);\n    return () => window.clearTimeout(timer);\n  }, [lifecycle?.activeBodyId, lifecycle?.paused, queuedBodyIds, runNext]);\n\n  const updateAndMaybeRun"
)
PYINTEGRATE
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
  packages/generation-runtime/src/enrichment/systemOrbitalContext.ts \
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
