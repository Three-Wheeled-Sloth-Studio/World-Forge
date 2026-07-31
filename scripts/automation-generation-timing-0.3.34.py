from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:80]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


def append_once(path: str, marker: str, addition: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if addition.strip() in text:
        raise SystemExit(f'{path}: addition already present')
    if marker not in text:
        raise SystemExit(f'{path}: marker not found')
    target.write_text(text.replace(marker, marker + addition, 1), encoding='utf-8')


Path('apps/desktop/src/generation/generationTiming.ts').write_text("""export type GenerationStageTiming = {
  stageId: string;
  label: string;
  elapsedMs: number;
};

export type GenerationRunSummary = {
  completedAt: string;
  workflowId: string;
  workflowLabel: string;
  workflowVersion: string;
  totalElapsedMs: number;
  slowestStage?: GenerationStageTiming;
  stages: GenerationStageTiming[];
};

export function buildGenerationRunSummary(input: Omit<GenerationRunSummary, 'slowestStage' | 'stages'> & {
  stages: readonly GenerationStageTiming[];
}): GenerationRunSummary {
  const stages = input.stages
    .filter((stage) => Number.isFinite(stage.elapsedMs) && stage.elapsedMs >= 0)
    .map((stage) => ({ ...stage, elapsedMs: Math.max(0, stage.elapsedMs) }));
  const slowestStage = stages.reduce<GenerationStageTiming | undefined>((slowest, stage) => (
    !slowest || stage.elapsedMs > slowest.elapsedMs ? stage : slowest
  ), undefined);
  return {
    completedAt: input.completedAt,
    workflowId: input.workflowId,
    workflowLabel: input.workflowLabel,
    workflowVersion: input.workflowVersion,
    totalElapsedMs: Math.max(0, input.totalElapsedMs),
    slowestStage,
    stages
  };
}

export function formatGenerationDuration(elapsedMs: number): string {
  const safeMs = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  if (safeMs < 1000) return `${Math.round(safeMs)} ms`;
  if (safeMs < 60_000) {
    const seconds = safeMs / 1000;
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
  }
  let minutes = Math.floor(safeMs / 60_000);
  let seconds = Math.round((safeMs - minutes * 60_000) / 1000);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}
""", encoding='utf-8')

Path('apps/desktop/src/generation/generationTiming.test.ts').write_text("""import { describe, expect, it } from 'vitest';
import { buildGenerationRunSummary, formatGenerationDuration } from './generationTiming';

describe('generation timing presentation', () => {
  it('formats millisecond, second, and minute durations compactly', () => {
    expect(formatGenerationDuration(842)).toBe('842 ms');
    expect(formatGenerationDuration(5400)).toBe('5.4 s');
    expect(formatGenerationDuration(65_000)).toBe('1m 05s');
  });

  it('identifies the slowest completed native stage without reordering the breakdown', () => {
    const summary = buildGenerationRunSummary({
      completedAt: '2026-07-31T13:20:00.000Z',
      workflowId: 'core.world-generation-experimental',
      workflowLabel: 'World Generation (Experimental)',
      workflowVersion: '0.2.0',
      totalElapsedMs: 5100,
      stages: [
        { stageId: 'world.present-climate', label: 'Present-day climate', elapsedMs: 710 },
        { stageId: 'world.biomes-features', label: 'Biomes and features', elapsedMs: 735 },
        { stageId: 'world.outputs-validation', label: 'Outputs and validation', elapsedMs: 80 }
      ]
    });

    expect(summary.slowestStage).toEqual({
      stageId: 'world.biomes-features',
      label: 'Biomes and features',
      elapsedMs: 735
    });
    expect(summary.stages.map((stage) => stage.stageId)).toEqual([
      'world.present-climate',
      'world.biomes-features',
      'world.outputs-validation'
    ]);
  });

  it('drops invalid stage timings and clamps invalid totals', () => {
    const summary = buildGenerationRunSummary({
      completedAt: '2026-07-31T13:20:00.000Z',
      workflowId: 'core.performance-foundation',
      workflowLabel: 'World Generation (Detailed)',
      workflowVersion: '1.0.0',
      totalElapsedMs: Number.NaN,
      stages: [
        { stageId: 'bad', label: 'Bad', elapsedMs: Number.NaN },
        { stageId: 'negative', label: 'Negative', elapsedMs: -1 }
      ]
    });

    expect(summary.totalElapsedMs).toBe(0);
    expect(summary.stages).toEqual([]);
    expect(summary.slowestStage).toBeUndefined();
  });
});
""", encoding='utf-8')

replace_once(
    'apps/desktop/src/appVersion.ts',
    "export const APP_VERSION = '0.3.33';",
    "export const APP_VERSION = '0.3.34';"
)

replace_once(
    'apps/desktop/src/release/ReleaseNotesModal.tsx',
    """        <div className=\"release-notes-body\">\n          <section>\n            <p className=\"release-kicker\">Release 0.3.33</p>""",
    """        <div className=\"release-notes-body\">\n          <section>\n            <p className=\"release-kicker\">Release 0.3.34</p>\n            <h3>Generation timing you can actually see</h3>\n            <ul>\n              <li>Live generation now shows total wall time and active-stage elapsed time beside progress.</li>\n              <li>Build retains the last completed run with workflow provenance, completion time, total duration, slowest stage, and the native-stage breakdown.</li>\n              <li>The timing surface exposes existing telemetry without changing generator output or workflow behavior.</li>\n            </ul>\n          </section>\n\n          <section>\n            <p className=\"release-kicker\">Release 0.3.33</p>"""
)

replace_once(
    'apps/desktop/src/generation/generationEvents.ts',
    """  measured: boolean;\n  graphNode?: boolean;""",
    """  measured: boolean;\n  nativeStage?: boolean;\n  graphNode?: boolean;"""
)

for path in ['apps/desktop/src/generation/useGenerationWorkflow.ts', 'apps/desktop/src/generationWorker.ts']:
    replace_once(
        path,
        """    measured: true,\n    graphNode,\n    message:""",
        """    measured: true,\n    nativeStage: true,\n    graphNode,\n    message:"""
    )
    replace_once(
        path,
        """    measured: true,\n    graphNode: true,\n    dependencies:""",
        """    measured: true,\n    nativeStage: false,\n    graphNode: true,\n    dependencies:"""
    )

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """import {\n  generateProjectWithNativeStages,\n  type NativeGenerationStageEvent\n} from '@world-forge/generator-core/nativeStagePipeline';""",
    """import {\n  generateProjectWithNativeStages,\n  nativeGenerationStageIds,\n  type NativeGenerationStageEvent\n} from '@world-forge/generator-core/nativeStagePipeline';\nimport { generationWorkflowDescriptor } from '@world-forge/generator-core/workflows';"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """} from './generationEvents';\n\nexport { generationStageTelemetryEvent, generationTelemetryEvent } from './generationEvents';""",
    """} from './generationEvents';\nimport {\n  buildGenerationRunSummary,\n  type GenerationRunSummary,\n  type GenerationStageTiming\n} from './generationTiming';\n\nexport { generationStageTelemetryEvent, generationTelemetryEvent } from './generationEvents';"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """type GenerateOptions = { startNodeId?: string | null; source?: GenerationLaunchSource };""",
    """type GenerateOptions = { startNodeId?: string | null; source?: GenerationLaunchSource };\ntype WorkflowGenerationConfig = GenerationConfig & { workflowId?: string };"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """  const [generationNodeProgress, setGenerationNodeProgress] = useState<GenerationNodeProgress[]>(() => initialNodeProgress());\n  const [launchSource, setLaunchSource] = useState<GenerationLaunchSource | null>(null);""",
    """  const [generationNodeProgress, setGenerationNodeProgress] = useState<GenerationNodeProgress[]>(() => initialNodeProgress());\n  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);\n  const [generationStageElapsedMs, setGenerationStageElapsedMs] = useState(0);\n  const [lastGenerationRun, setLastGenerationRun] = useState<GenerationRunSummary | null>(null);\n  const [launchSource, setLaunchSource] = useState<GenerationLaunchSource | null>(null);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """  const generationLaunchSourceRef = useRef<GenerationLaunchSource>('generator');\n  const workerRef = useRef<Worker | null>(null);""",
    """  const generationLaunchSourceRef = useRef<GenerationLaunchSource>('generator');\n  const generationStageStartedAtRef = useRef(0);\n  const generationActiveStageIdRef = useRef('');\n  const generationStageTimingsRef = useRef(new Map<string, GenerationStageTiming>());\n  const generationWorkflowRef = useRef(generationWorkflowDescriptor(undefined));\n  const workerRef = useRef<Worker | null>(null);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """  useEffect(() => { previousProjectRef.current = previousProject; }, [previousProject]);\n  useEffect(() => { onProjectGeneratedRef.current = onProjectGenerated; }, [onProjectGenerated]);\n\n  useEffect(() => {""",
    """  useEffect(() => { previousProjectRef.current = previousProject; }, [previousProject]);\n  useEffect(() => { onProjectGeneratedRef.current = onProjectGenerated; }, [onProjectGenerated]);\n\n  const observeNativeStage = useCallback((stage: GenerationStageTelemetryDetail) => {\n    if (!stage.nativeStage) return;\n    if (stage.phase === 'started' || generationActiveStageIdRef.current !== stage.stageId) {\n      const observedElapsedMs = Math.max(0, stage.timestamp - stage.startedAt);\n      generationActiveStageIdRef.current = stage.stageId;\n      generationStageStartedAtRef.current = performance.now() - observedElapsedMs;\n      setGenerationStageElapsedMs(observedElapsedMs);\n    }\n    if (stage.phase === 'completed' && stage.elapsedMs !== undefined) {\n      generationStageTimingsRef.current.set(stage.stageId, {\n        stageId: stage.stageId,\n        label: stage.label,\n        elapsedMs: stage.elapsedMs\n      });\n      setGenerationStageElapsedMs(stage.elapsedMs);\n    }\n  }, []);\n\n  const completeGenerationRun = useCallback((completedProject: WorldProject) => {\n    const completedAt = new Date().toISOString();\n    const totalElapsedMs = Math.max(0, performance.now() - generationStartedAtRef.current);\n    const configuredWorkflowId = (completedProject.config as WorkflowGenerationConfig).workflowId;\n    const workflow = generationWorkflowDescriptor(configuredWorkflowId ?? generationWorkflowRef.current.id);\n    const stages = nativeGenerationStageIds.flatMap((stageId) => {\n      const timing = generationStageTimingsRef.current.get(stageId);\n      return timing ? [timing] : [];\n    });\n    setGenerationElapsedMs(totalElapsedMs);\n    setLastGenerationRun(buildGenerationRunSummary({\n      completedAt,\n      workflowId: workflow.id,\n      workflowLabel: workflow.label,\n      workflowVersion: workflow.version,\n      totalElapsedMs,\n      stages\n    }));\n  }, []);\n\n  useEffect(() => {"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """        emitGenerationStageTelemetry(stage);\n        if (stage.graphNode) {""",
    """        emitGenerationStageTelemetry(stage);\n        observeNativeStage(stage);\n        if (stage.graphNode) {"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """        const completedProject = acceptGeneratedProject(event.data.project);\n        generationEstimateRef.current = Math.max(3000, completedProject.diagnostics?.totalMs ?? generationEstimateRef.current);""",
    """        const completedProject = acceptGeneratedProject(event.data.project);\n        completeGenerationRun(completedProject);\n        generationEstimateRef.current = Math.max(3000, completedProject.diagnostics?.totalMs ?? generationEstimateRef.current);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """  }, [acceptGeneratedProject, failPendingReplay, finishGeneration, scheduleGenerationPreviewPaint]);""",
    """  }, [acceptGeneratedProject, completeGenerationRun, failPendingReplay, finishGeneration, observeNativeStage, scheduleGenerationPreviewPaint]);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """  useEffect(() => {\n    if (!isGenerating) { setGenerationProgress(0); return; }\n    const timer = window.setInterval(() => {\n      setGenerationProgress((current) => Math.min(current, 0.98));\n    }, 150);\n    return () => window.clearInterval(timer);\n  }, [isGenerating]);""",
    """  useEffect(() => {\n    if (!isGenerating) { setGenerationProgress(0); return; }\n    const refreshElapsed = () => {\n      const now = performance.now();\n      setGenerationElapsedMs(Math.max(0, now - generationStartedAtRef.current));\n      setGenerationStageElapsedMs(Math.max(0, now - generationStageStartedAtRef.current));\n    };\n    refreshElapsed();\n    const timer = window.setInterval(() => {\n      setGenerationProgress((current) => Math.min(current, 0.98));\n      refreshElapsed();\n    }, 100);\n    return () => window.clearInterval(timer);\n  }, [isGenerating]);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """    generationStartedAtRef.current = performance.now();\n    generationEstimateRef.current = Math.max(3000, previousProjectRef.current?.diagnostics?.totalMs ?? generationEstimateRef.current);""",
    """    generationStartedAtRef.current = performance.now();\n    generationStageStartedAtRef.current = generationStartedAtRef.current;\n    generationActiveStageIdRef.current = 'starting';\n    generationStageTimingsRef.current.clear();\n    generationWorkflowRef.current = generationWorkflowDescriptor((effectiveConfig as WorkflowGenerationConfig).workflowId);\n    setGenerationElapsedMs(0);\n    setGenerationStageElapsedMs(0);\n    generationEstimateRef.current = Math.max(3000, previousProjectRef.current?.diagnostics?.totalMs ?? generationEstimateRef.current);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """            emitGenerationStageTelemetry(stage);\n            if (stage.phase === 'started' || stage.phase === 'progress') {""",
    """            emitGenerationStageTelemetry(stage);\n            observeNativeStage(stage);\n            if (stage.phase === 'started' || stage.phase === 'progress') {"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """        const completedProject = acceptGeneratedProject(nextProject);\n        generationEstimateRef.current = Math.max(3000, completedProject.diagnostics?.totalMs ?? generationEstimateRef.current);""",
    """        const completedProject = acceptGeneratedProject(nextProject);\n        completeGenerationRun(completedProject);\n        generationEstimateRef.current = Math.max(3000, completedProject.diagnostics?.totalMs ?? generationEstimateRef.current);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """  }, [acceptGeneratedProject, failPendingReplay, finishGeneration]);""",
    """  }, [acceptGeneratedProject, completeGenerationRun, failPendingReplay, finishGeneration, observeNativeStage]);"""
)

replace_once(
    'apps/desktop/src/generation/useGenerationWorkflow.ts',
    """  return { isGenerating, launchSource, generationProgress, generationStage, generationNodeProgress, generate };""",
    """  return {\n    isGenerating,\n    launchSource,\n    generationProgress,\n    generationStage,\n    generationNodeProgress,\n    generationElapsedMs,\n    generationStageElapsedMs,\n    lastGenerationRun,\n    generate\n  };"""
)

replace_once(
    'apps/desktop/src/generator/GeneratorPanel.tsx',
    """import type { WorkspaceMode } from '../workspace/workspaceModes';""",
    """import type { WorkspaceMode } from '../workspace/workspaceModes';\nimport { formatGenerationDuration, type GenerationRunSummary } from '../generation/generationTiming';"""
)

replace_once(
    'apps/desktop/src/generator/GeneratorPanel.tsx',
    """  generationStage: string;\n  generationProgress: number;""",
    """  generationStage: string;\n  generationProgress: number;\n  generationElapsedMs: number;\n  generationStageElapsedMs: number;\n  lastGenerationRun: GenerationRunSummary | null;"""
)

replace_once(
    'apps/desktop/src/generator/GeneratorPanel.tsx',
    """function randomSeed(): string {""",
    """function completedAtLabel(value: string): string {\n  const date = new Date(value);\n  if (!Number.isFinite(date.getTime())) return value;\n  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });\n}\n\nfunction randomSeed(): string {"""
)

replace_once(
    'apps/desktop/src/generator/GeneratorPanel.tsx',
    """    sourceTopologyResolution, invalidRanges, isGenerating, generationStage, generationProgress,\n    onConfigChange, onRandomizeSeed, onGenerate, onGenerationQualityChange, onPresetChange,""",
    """    sourceTopologyResolution, invalidRanges, isGenerating, generationStage, generationProgress,\n    generationElapsedMs, generationStageElapsedMs, lastGenerationRun,\n    onConfigChange, onRandomizeSeed, onGenerate, onGenerationQualityChange, onPresetChange,"""
)

replace_once(
    'apps/desktop/src/generator/GeneratorPanel.tsx',
    """        {isGenerating && (\n          <div className=\"build-generation-progress\" role=\"status\" aria-live=\"polite\">\n            <span>{generationStage || generationAction}</span>\n            <progress value={generationProgress} max={1} />\n            <output>{Math.round(generationProgress * 100)}%</output>\n          </div>\n        )}\n        {hasCurrentProject && <p className=\"replacement-note\">""",
    """        {isGenerating && (\n          <div className=\"build-generation-progress\" role=\"status\" aria-live=\"polite\">\n            <span className=\"build-generation-progress-copy\">\n              <strong>{generationStage || generationAction}</strong>\n              <small>Total {formatGenerationDuration(generationElapsedMs)} · Stage {formatGenerationDuration(generationStageElapsedMs)}</small>\n            </span>\n            <progress value={generationProgress} max={1} />\n            <output>{Math.round(generationProgress * 100)}%</output>\n          </div>\n        )}\n        {!isGenerating && lastGenerationRun && (\n          <section className=\"last-generation-summary\" aria-labelledby=\"last-generation-summary-heading\">\n            <header>\n              <div>\n                <span className=\"generator-kicker\">Last generation</span>\n                <strong id=\"last-generation-summary-heading\" title={lastGenerationRun.workflowId}>\n                  {lastGenerationRun.workflowLabel} v{lastGenerationRun.workflowVersion}\n                </strong>\n              </div>\n              <time dateTime={lastGenerationRun.completedAt}>{completedAtLabel(lastGenerationRun.completedAt)}</time>\n            </header>\n            <div className=\"last-generation-headline\">\n              <span><small>Total wall time</small><strong>{formatGenerationDuration(lastGenerationRun.totalElapsedMs)}</strong></span>\n              <span>\n                <small>Slowest stage</small>\n                <strong>{lastGenerationRun.slowestStage?.label ?? 'No measured stage'}</strong>\n                {lastGenerationRun.slowestStage && <output>{formatGenerationDuration(lastGenerationRun.slowestStage.elapsedMs)}</output>}\n              </span>\n            </div>\n            <div className=\"last-generation-stage-grid\" aria-label=\"Last generation native stage durations\">\n              {lastGenerationRun.stages.map((stage) => (\n                <span key={stage.stageId} title={`${stage.label}: ${formatGenerationDuration(stage.elapsedMs)}`}>\n                  <small>{stage.label}</small>\n                  <output>{formatGenerationDuration(stage.elapsedMs)}</output>\n                </span>\n              ))}\n            </div>\n          </section>\n        )}\n        {hasCurrentProject && <p className=\"replacement-note\">"""
)

append_once(
    'apps/desktop/src/generator/generatorPanel.css',
    """.build-generation-progress output {\n  text-align: right;\n}\n""",
    """\n.build-generation-progress-copy {\n  display: grid;\n  gap: 1px;\n  min-width: 0;\n}\n\n.build-generation-progress-copy strong {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.build-generation-progress-copy small {\n  color: var(--pm-muted);\n  font-size: 9px;\n  font-weight: 700;\n}\n\n.last-generation-summary {\n  background: rgba(231, 240, 234, 0.66);\n  border: 1px solid rgba(94, 128, 103, 0.5);\n  border-radius: 7px;\n  display: grid;\n  gap: 8px;\n  padding: 9px;\n}\n\n.last-generation-summary header {\n  align-items: start;\n  display: flex;\n  gap: 8px;\n  justify-content: space-between;\n}\n\n.last-generation-summary header > div {\n  display: grid;\n  gap: 2px;\n  min-width: 0;\n}\n\n.last-generation-summary header strong {\n  font-size: 12px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.last-generation-summary time {\n  color: var(--pm-muted);\n  font-size: 9px;\n  white-space: nowrap;\n}\n\n.last-generation-headline {\n  display: grid;\n  gap: 6px;\n  grid-template-columns: 0.75fr 1.25fr;\n}\n\n.last-generation-headline > span {\n  background: rgba(255, 252, 244, 0.58);\n  border: 1px solid rgba(112, 136, 117, 0.34);\n  border-radius: 6px;\n  display: grid;\n  gap: 2px;\n  min-width: 0;\n  padding: 6px;\n}\n\n.last-generation-headline small,\n.last-generation-stage-grid small {\n  color: var(--pm-muted);\n  font-size: 9px;\n}\n\n.last-generation-headline strong {\n  font-size: 11px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.last-generation-headline output {\n  color: #31513a;\n  font-size: 10px;\n  font-weight: 800;\n}\n\n.last-generation-stage-grid {\n  display: grid;\n  gap: 4px 8px;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n}\n\n.last-generation-stage-grid > span {\n  align-items: center;\n  border-top: 1px solid rgba(112, 136, 117, 0.25);\n  display: grid;\n  gap: 5px;\n  grid-template-columns: minmax(0, 1fr) auto;\n  min-width: 0;\n  padding-top: 4px;\n}\n\n.last-generation-stage-grid small {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.last-generation-stage-grid output {\n  color: #31513a;\n  font-size: 9px;\n  font-weight: 800;\n  white-space: nowrap;\n}\n"""
)

replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    """import { useDismissiblePopover } from '../shared/useDismissiblePopover';""",
    """import { useDismissiblePopover } from '../shared/useDismissiblePopover';\nimport { formatGenerationDuration } from '../generation/generationTiming';"""
)

replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    """  generationStage: string;\n  generationProgress: number;\n  generationNodeProgress:""",
    """  generationStage: string;\n  generationProgress: number;\n  generationElapsedMs: number;\n  generationStageElapsedMs: number;\n  generationNodeProgress:"""
)

replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    """  generationStage,\n  generationProgress,\n  generationNodeProgress,""",
    """  generationStage,\n  generationProgress,\n  generationElapsedMs,\n  generationStageElapsedMs,\n  generationNodeProgress,"""
)

replace_once(
    'apps/desktop/src/workspace/WorldWorkspace.tsx',
    """            <div className=\"generation-progress-total\">\n              <span>{generationStage || 'Generating world'}</span><progress value={generationProgress} max={1} /><output>{Math.round(generationProgress * 100)}%</output>\n            </div>""",
    """            <div className=\"generation-progress-total\">\n              <span className=\"generation-progress-copy\">\n                <strong>{generationStage || 'Generating world'}</strong>\n                <small>Total {formatGenerationDuration(generationElapsedMs)} · Stage {formatGenerationDuration(generationStageElapsedMs)}</small>\n              </span>\n              <progress value={generationProgress} max={1} />\n              <output>{Math.round(generationProgress * 100)}%</output>\n            </div>"""
)

append_once(
    'apps/desktop/src/workspace/workspaceToolbar.css',
    """.workspace-toolbar-stack {\n  display: grid;\n  gap: 7px;\n  min-width: 0;\n}\n""",
    """\n.generation-progress-copy {\n  display: grid;\n  gap: 1px;\n  min-width: 0;\n}\n\n.generation-progress-copy strong {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.generation-progress-copy small {\n  color: rgba(255, 247, 232, 0.74);\n  font-size: 10px;\n  font-weight: 700;\n  white-space: nowrap;\n}\n"""
)

replace_once(
    'apps/desktop/src/main.tsx',
    """  const { isGenerating, generationProgress, generationStage, generationNodeProgress } = generation;""",
    """  const {\n    isGenerating, generationProgress, generationStage, generationNodeProgress,\n    generationElapsedMs, generationStageElapsedMs, lastGenerationRun\n  } = generation;"""
)

replace_once(
    'apps/desktop/src/main.tsx',
    """            generationStage={generationStage}\n            generationProgress={generationProgress}\n            onConfigChange={setConfig}""",
    """            generationStage={generationStage}\n            generationProgress={generationProgress}\n            generationElapsedMs={generationElapsedMs}\n            generationStageElapsedMs={generationStageElapsedMs}\n            lastGenerationRun={lastGenerationRun}\n            onConfigChange={setConfig}"""
)

replace_once(
    'apps/desktop/src/main.tsx',
    """        generationStage={generationStage}\n        generationProgress={generationProgress}\n        generationNodeProgress={generationNodeProgress}""",
    """        generationStage={generationStage}\n        generationProgress={generationProgress}\n        generationElapsedMs={generationElapsedMs}\n        generationStageElapsedMs={generationStageElapsedMs}\n        generationNodeProgress={generationNodeProgress}"""
)

print('Applied World Forge 0.3.34 generation timing slice')
