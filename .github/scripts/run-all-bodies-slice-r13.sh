#!/usr/bin/env bash
set -euo pipefail
python - <<'PY'
from pathlib import Path
source = Path('.github/scripts/run-all-bodies-slice-r2.sh').read_text(encoding='utf-8')
source = source.replace(
    "BRANCH='automation/all-system-bodies-20260801-r8'",
    "BRANCH='automation/all-system-bodies-20260801-r13'",
    1
)
marker = ")\nPYINTEGRATE\ngit diff --check"
addition = r''')

# Only classify persisted active work as interrupted once when a project/orbital artifact is opened.
replace_once(
    'apps/desktop/src/enrichment/useBodyGenerationQueue.ts',
    "  const activeWorkflowNodesRef = useRef<ReturnType<typeof systemBodyGenerationWorkflowDescriptor>['nodes']>([]);\n  const projectRef = useRef(project);",
    "  const activeWorkflowNodesRef = useRef<ReturnType<typeof systemBodyGenerationWorkflowDescriptor>['nodes']>([]);\n  const interruptionCheckKeyRef = useRef('');\n  const projectRef = useRef(project);"
)
replace_once(
    'apps/desktop/src/enrichment/useBodyGenerationQueue.ts',
    "  useEffect(() => {\n    const interruptedBodyId = lifecycle?.activeBodyId;\n    if (!interruptedBodyId || taskIdRef.current) return;\n    persistLifecycle(failBodyGeneration(\n      lifecycle,\n      interruptedBodyId,\n      'Body generation was interrupted before the project was reopened. Retry to resume from a clean deterministic workflow run.'\n    ));\n  }, [lifecycle, persistLifecycle]);",
    "  useEffect(() => {\n    if (!project || !orbitalContext || !lifecycle) return;\n    const checkKey = `${project.projectId}:${orbitalContext.artifactSignature}`;\n    if (interruptionCheckKeyRef.current === checkKey) return;\n    interruptionCheckKeyRef.current = checkKey;\n    const interruptedBodyId = lifecycle.activeBodyId;\n    if (!interruptedBodyId || taskIdRef.current) return;\n    persistLifecycle(failBodyGeneration(\n      lifecycle,\n      interruptedBodyId,\n      'Body generation was interrupted before the project was reopened. Retry to resume from a clean deterministic workflow run.'\n    ));\n  }, [lifecycle, orbitalContext, persistLifecycle, project]);"
)
PYINTEGRATE
git diff --check'''
if source.count(marker) != 1:
    raise SystemExit(f'expected one integration marker, found {source.count(marker)}')
Path('/tmp/run-all-bodies-slice-r13.sh').write_text(source.replace(marker, addition, 1), encoding='utf-8')
PY
bash /tmp/run-all-bodies-slice-r13.sh
