export type GenerationPerformanceTraceRecord = {
  name: string;
  elapsedMs: number;
  topologyCells?: number;
  activeCells?: number;
  fullTopologyPasses?: number;
  allocatedBufferBytes?: number;
  parent?: boolean;
};

type TraceMetadata = Omit<GenerationPerformanceTraceRecord, 'name' | 'elapsedMs'>;
type TraceSink = (record: GenerationPerformanceTraceRecord) => void;

let traceSink: TraceSink | undefined;

export function setGenerationPerformanceTraceSink(sink?: TraceSink): void {
  traceSink = sink;
}

export function generationPerformanceTracingEnabled(): boolean {
  return traceSink !== undefined;
}

export function traceGenerationPerformance<T>(
  name: string,
  metadata: TraceMetadata,
  operation: () => T
): T {
  if (!traceSink) return operation();
  const startedAt = now();
  const result = operation();
  traceSink({
    name,
    elapsedMs: now() - startedAt,
    ...metadata
  });
  return result;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
