import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  setGenerationPerformanceTraceSink,
  subscribeGenerationPerformanceTrace,
  traceGenerationPerformance
} from './generationPerformanceTrace';

afterEach(() => {
  setGenerationPerformanceTraceSink();
});

describe('generation performance tracing', () => {
  it('does not record work unless a sink is installed', () => {
    const operation = vi.fn(() => 42);

    expect(traceGenerationPerformance('test', { topologyCells: 6 }, operation)).toBe(42);
    expect(operation).toHaveBeenCalledOnce();
  });

  it('records elapsed time and supplied metadata when enabled', () => {
    const records: unknown[] = [];
    setGenerationPerformanceTraceSink((record) => records.push(record));

    expect(traceGenerationPerformance('test', { topologyCells: 6, activeCells: 2 }, () => 42)).toBe(42);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: 'test',
      topologyCells: 6,
      activeCells: 2
    });
    expect((records[0] as { elapsedMs: number }).elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('supports temporary subscribers without replacing the primary sink', () => {
    const primary: string[] = [];
    const subscribed: string[] = [];
    setGenerationPerformanceTraceSink((record) => primary.push(record.name));
    const unsubscribe = subscribeGenerationPerformanceTrace((record) => subscribed.push(record.name));

    traceGenerationPerformance('first', {}, () => 1);
    unsubscribe();
    traceGenerationPerformance('second', {}, () => 2);

    expect(primary).toEqual(['first', 'second']);
    expect(subscribed).toEqual(['first']);
  });
});
