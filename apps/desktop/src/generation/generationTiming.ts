export type GenerationStageTiming = {
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
    totalElapsedMs: Number.isFinite(input.totalElapsedMs) ? Math.max(0, input.totalElapsedMs) : 0,
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
