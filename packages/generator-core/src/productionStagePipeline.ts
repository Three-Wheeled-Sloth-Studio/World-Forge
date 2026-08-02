import type { GenerationConfig, GenerationDiagnostics, WorldProject } from '@world-forge/shared';
import {
  generateProjectWithNativeStages,
  type GenerateProjectWithNativeStagesOptions
} from './nativeStagePipeline';
import {
  subscribeGenerationPerformanceTrace,
  type GenerationPerformanceTraceRecord
} from './generationPerformanceTrace';

export const productionStagePhasePrefix = 'production.stage.';
export const productionOperationPhasePrefix = 'performance.operation.';

const sourceStagePhaseNames = {
  foundation: 'primary-world',
  motion: 'plate-motion-vector-scaling',
  history: 'deep-time-aging',
  reconciliation: 'terminal-orbital-phase-alignment-and-reconciliation'
} as const;

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function phaseTotal(diagnostics: GenerationDiagnostics, name: string): number {
  return diagnostics.phases
    .filter((phase) => phase.name === name && Number.isFinite(phase.ms) && phase.ms >= 0)
    .reduce((sum, phase) => sum + phase.ms, 0);
}

function roundedMs(value: number): number {
  return Number(Math.max(0, value).toFixed(3));
}

export function appendProductionPerformanceDiagnostics(
  diagnostics: GenerationDiagnostics,
  traces: readonly GenerationPerformanceTraceRecord[],
  totalElapsedMs: number
): void {
  const sourceNames = new Set<string>(Object.values(sourceStagePhaseNames));
  const foundationMs = phaseTotal(diagnostics, sourceStagePhaseNames.foundation);
  const motionMs = phaseTotal(diagnostics, sourceStagePhaseNames.motion);
  const historyMs = phaseTotal(diagnostics, sourceStagePhaseNames.history);
  const reconciliationMs = phaseTotal(diagnostics, sourceStagePhaseNames.reconciliation);
  const postprocessMs = phaseTotal(diagnostics, 'biomes.cohesion') + phaseTotal(diagnostics, 'biomes.diagnostics');
  const attributedMs = foundationMs + motionMs + historyMs + reconciliationMs + postprocessMs;
  const unattributedMs = Math.max(0, totalElapsedMs - attributedMs);

  diagnostics.phases = diagnostics.phases.filter((phase) =>
    !sourceNames.has(phase.name)
      && !phase.name.startsWith(productionStagePhasePrefix)
      && !phase.name.startsWith(productionOperationPhasePrefix)
  );

  diagnostics.phases.push(
    { name: `${productionStagePhasePrefix}foundation`, ms: roundedMs(foundationMs) },
    { name: `${productionStagePhasePrefix}motion`, ms: roundedMs(motionMs) },
    { name: `${productionStagePhasePrefix}history`, ms: roundedMs(historyMs) },
    { name: `${productionStagePhasePrefix}reconciliation`, ms: roundedMs(reconciliationMs) },
    { name: `${productionStagePhasePrefix}postprocess`, ms: roundedMs(postprocessMs) },
    { name: `${productionStagePhasePrefix}unattributed`, ms: roundedMs(unattributedMs) }
  );

  const operationTotals = new Map<string, number>();
  for (const trace of traces) {
    if (trace.parent || !Number.isFinite(trace.elapsedMs) || trace.elapsedMs < 0) continue;
    operationTotals.set(trace.name, (operationTotals.get(trace.name) ?? 0) + trace.elapsedMs);
  }
  for (const [name, elapsedMs] of [...operationTotals.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    diagnostics.phases.push({
      name: `${productionOperationPhasePrefix}${name}`,
      ms: roundedMs(elapsedMs)
    });
  }
}

export function generateProjectWithProductionAttribution(
  input: Partial<GenerationConfig> = {},
  options: GenerateProjectWithNativeStagesOptions = {}
): WorldProject {
  const traces: GenerationPerformanceTraceRecord[] = [];
  const unsubscribe = subscribeGenerationPerformanceTrace((record) => traces.push({ ...record }));
  const startedAt = nowMs();
  try {
    const project = generateProjectWithNativeStages(input, options);
    const elapsedMs = nowMs() - startedAt;
    if (project.diagnostics) {
      appendProductionPerformanceDiagnostics(project.diagnostics, traces, elapsedMs);
      project.diagnostics.totalMs = roundedMs(elapsedMs);
    }
    return project;
  } finally {
    unsubscribe();
  }
}
