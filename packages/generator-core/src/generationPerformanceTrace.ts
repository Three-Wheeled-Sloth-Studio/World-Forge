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
const traceSubscribers = new Set<TraceSink>();

export function setGenerationPerformanceTraceSink(sink?: TraceSink): void {
  traceSink = sink;
}

export function subscribeGenerationPerformanceTrace(sink: TraceSink): () => void {
  traceSubscribers.add(sink);
  return () => {
    traceSubscribers.delete(sink);
  };
}

export function generationPerformanceTracingEnabled(): boolean {
  return traceSink !== undefined || traceSubscribers.size > 0;
}

function emitTrace(record: GenerationPerformanceTraceRecord): void {
  traceSink?.(record);
  for (const subscriber of traceSubscribers) {
    if (subscriber !== traceSink) subscriber(record);
  }
}

export function traceGenerationPerformance<T>(
  name: string,
  metadata: TraceMetadata,
  operation: () => T
): T {
  if (!generationPerformanceTracingEnabled()) return operation();
  const startedAt = now();
  const result = operation();
  emitTrace({
    name,
    elapsedMs: now() - startedAt,
    ...metadata
  });
  return result;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
