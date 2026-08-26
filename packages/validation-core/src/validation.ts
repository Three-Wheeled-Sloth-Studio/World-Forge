export type ValidationTier = 'fast' | 'standard' | 'ultra';

export type ValidationEvidenceKind =
  | 'observed'
  | 'derived-proxy'
  | 'structural-invariant'
  | 'performance';

export type ValidationComponent = string;

export type ValidationScenario<TInput, TObservations> = {
  id: string;
  label: string;
  tier: ValidationTier;
  input: TInput;
  observations: TObservations;
  metadata?: Record<string, string | number | boolean>;
};

export type ValidationPerformance = {
  wallMs: number;
  stages?: Record<string, number>;
  counters?: Record<string, number>;
};

export type ValidationAdapterResult<TOutput> = {
  output: TOutput;
  performance: ValidationPerformance;
};

export type ValidationAdapter<TInput, TOutput> = {
  id: string;
  version: string;
  run(input: TInput): ValidationAdapterResult<TOutput> | Promise<ValidationAdapterResult<TOutput>>;
};

export type ValidationThreshold = {
  minimum?: number;
  maximum?: number;
};

export type ValidationMetricValue = {
  value: number;
  sampleCount?: number;
  details?: Record<string, string | number | boolean>;
};

export type ValidationMetricDefinition<TOutput, TObservations> = {
  id: string;
  label: string;
  component: ValidationComponent;
  evidence: ValidationEvidenceKind;
  unit: string;
  proves: string;
  doesNotProve: string;
  threshold?: ValidationThreshold;
  evaluate(output: TOutput, observations: TObservations): ValidationMetricValue;
};

export type ValidationBaselineMetric = {
  value: number;
  absoluteTolerance?: number;
  relativeTolerance?: number;
  regressionDirection?: 'lower' | 'higher' | 'either';
};

export type ValidationBaseline = {
  scenarioId: string;
  adapterId: string;
  adapterVersion?: string;
  metrics: Record<string, ValidationBaselineMetric>;
};

export type ValidationMetricResult = Omit<ValidationMetricDefinition<unknown, unknown>, 'evaluate'>
  & ValidationMetricValue
  & {
    thresholdPassed: boolean | null;
    baselineValue?: number;
    baselineDelta?: number;
    baselinePassed?: boolean;
  };

export type ValidationReport = {
  format: 'world-forge-validation-report';
  version: 1;
  generatedAt: string;
  scenario: {
    id: string;
    label: string;
    tier: ValidationTier;
    metadata?: Record<string, string | number | boolean>;
  };
  adapter: { id: string; version: string };
  performance: ValidationPerformance;
  metrics: ValidationMetricResult[];
  summary: {
    passed: boolean;
    evaluatedMetrics: number;
    failedThresholds: number;
    failedBaselines: number;
  };
};

export type RunValidationOptions = {
  baseline?: ValidationBaseline;
  generatedAt?: string;
};

export async function runValidationScenario<TInput, TOutput, TObservations>(
  scenario: ValidationScenario<TInput, TObservations>,
  adapter: ValidationAdapter<TInput, TOutput>,
  definitions: readonly ValidationMetricDefinition<TOutput, TObservations>[],
  options: RunValidationOptions = {},
): Promise<ValidationReport> {
  validateDefinitions(definitions);
  validateBaseline(options.baseline, scenario.id, adapter.id, adapter.version);
  const run = await adapter.run(scenario.input);
  validatePerformance(run.performance);
  const metrics = definitions.map((definition) => evaluateMetric(
    definition,
    run.output,
    scenario.observations,
    options.baseline?.metrics[definition.id],
  ));
  const failedThresholds = metrics.filter((metric) => metric.thresholdPassed === false).length;
  const failedBaselines = metrics.filter((metric) => metric.baselinePassed === false).length;
  return {
    format: 'world-forge-validation-report',
    version: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    scenario: {
      id: scenario.id,
      label: scenario.label,
      tier: scenario.tier,
      metadata: scenario.metadata,
    },
    adapter: { id: adapter.id, version: adapter.version },
    performance: run.performance,
    metrics,
    summary: {
      passed: failedThresholds === 0 && failedBaselines === 0,
      evaluatedMetrics: metrics.length,
      failedThresholds,
      failedBaselines,
    },
  };
}

function evaluateMetric<TOutput, TObservations>(
  definition: ValidationMetricDefinition<TOutput, TObservations>,
  output: TOutput,
  observations: TObservations,
  baseline?: ValidationBaselineMetric,
): ValidationMetricResult {
  const measured = definition.evaluate(output, observations);
  if (!Number.isFinite(measured.value)) throw new Error(`Validation metric ${definition.id} returned a non-finite value.`);
  const thresholdPassed = definition.threshold ? withinThreshold(measured.value, definition.threshold) : null;
  const baselinePassed = baseline ? withinBaseline(measured.value, baseline) : undefined;
  return {
    id: definition.id,
    label: definition.label,
    component: definition.component,
    evidence: definition.evidence,
    unit: definition.unit,
    proves: definition.proves,
    doesNotProve: definition.doesNotProve,
    threshold: definition.threshold,
    value: measured.value,
    sampleCount: measured.sampleCount,
    details: measured.details,
    thresholdPassed,
    baselineValue: baseline?.value,
    baselineDelta: baseline ? measured.value - baseline.value : undefined,
    baselinePassed,
  };
}

function withinThreshold(value: number, threshold: ValidationThreshold): boolean {
  return (threshold.minimum === undefined || value >= threshold.minimum)
    && (threshold.maximum === undefined || value <= threshold.maximum);
}

function withinBaseline(value: number, baseline: ValidationBaselineMetric): boolean {
  const tolerance = Math.max(
    baseline.absoluteTolerance ?? 0,
    Math.abs(baseline.value) * (baseline.relativeTolerance ?? 0),
  );
  const direction = baseline.regressionDirection ?? 'either';
  if (direction === 'higher') return value >= baseline.value - tolerance;
  if (direction === 'lower') return value <= baseline.value + tolerance;
  return Math.abs(value - baseline.value) <= tolerance;
}

function validateDefinitions<TOutput, TObservations>(
  definitions: readonly ValidationMetricDefinition<TOutput, TObservations>[],
): void {
  const ids = new Set<string>();
  for (const definition of definitions) {
    if (!definition.id.trim()) throw new Error('Validation metric IDs must not be empty.');
    if (ids.has(definition.id)) throw new Error(`Duplicate validation metric ID: ${definition.id}`);
    ids.add(definition.id);
  }
}

function validateBaseline(
  baseline: ValidationBaseline | undefined,
  scenarioId: string,
  adapterId: string,
  adapterVersion: string,
): void {
  if (!baseline) return;
  if (baseline.scenarioId !== scenarioId) throw new Error(`Baseline scenario ${baseline.scenarioId} does not match ${scenarioId}.`);
  if (baseline.adapterId !== adapterId) throw new Error(`Baseline adapter ${baseline.adapterId} does not match ${adapterId}.`);
  if (baseline.adapterVersion !== undefined && baseline.adapterVersion !== adapterVersion) {
    throw new Error(`Baseline adapter version ${baseline.adapterVersion} does not match ${adapterVersion}.`);
  }
}

function validatePerformance(performance: ValidationPerformance): void {
  if (!Number.isFinite(performance.wallMs) || performance.wallMs < 0) {
    throw new Error('Validation adapter wall time must be a finite non-negative number.');
  }
}
