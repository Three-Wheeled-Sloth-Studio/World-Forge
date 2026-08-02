import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '@world-forge/generator-core';
import type { WorldProject } from '@world-forge/shared';
import {
  buildGenerationRunSummary,
  buildProductionGenerationTimingRecord,
  estimateWorldProjectTransferBytes,
  formatGenerationDuration,
  generationTimingRecordMarkdown,
  stableGenerationConfigurationHash
} from './generationTiming';

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

  it('hashes equivalent generation configurations deterministically', () => {
    const first = createDefaultConfig('1001001');
    const second = structuredClone(first);
    expect(stableGenerationConfigurationHash(first)).toBe(stableGenerationConfigurationHash(second));
  });

  it('estimates typed layer bytes separately from metadata', () => {
    const layer = new Float32Array(16);
    const project = {
      projectId: 'project-test',
      primaryWorld: { mapModel: { layers: { elevation: layer } } }
    } as unknown as WorldProject;
    const estimate = estimateWorldProjectTransferBytes(project);
    expect(estimate.layerBytes).toBe(layer.byteLength);
    expect(estimate.metadataBytes).toBeGreaterThan(0);
    expect(estimate.estimatedBytes).toBe(estimate.layerBytes + estimate.metadataBytes);
  });

  it('separates worker, handoff, acceptance, and render boundaries', () => {
    const config = createDefaultConfig('1001001');
    const record = buildProductionGenerationTimingRecord({
      taskId: 'run-1',
      status: 'completed',
      completedAt: '2026-08-02T17:00:00.000Z',
      appVersion: '0.3.56',
      visibleVersion: '0.3.56',
      sourceCommit: 'abc123',
      workflowId: 'core.performance-foundation',
      workflowLabel: 'World Generation (Detailed)',
      workflowVersion: '1.2.0',
      config,
      launchSource: 'generator',
      uiLaunchAtMs: 1000,
      uiDispatchAtMs: 1005,
      pageVisibleAtLaunch: true,
      pageFocusedAtLaunch: true,
      userAgent: 'Vitest',
      logicalProcessorCount: 8,
      worker: {
        workerReceivedAtMs: 1010,
        generationStartedAtMs: 1012,
        generationFinishedAtMs: 4012,
        reconciliationFinishedAtMs: 4020,
        payloadEstimateFinishedAtMs: 4025,
        completedProjectPostStartedAtMs: 4026,
        previewCount: 4,
        previewBytesEmitted: 4096,
        previewCallbackMs: 12,
        payloadEstimateMs: 5,
        estimatedPayloadBytes: 8192,
        estimatedLayerBytes: 6144,
        estimatedMetadataBytes: 2048
      },
      completedProjectReceiptAtMs: 4050,
      projectAcceptanceStartedAtMs: 4051,
      projectAcceptanceFinishedAtMs: 4061,
      firstCommittedRenderAtMs: 4080,
      firstInteractivePaintAtMs: 4096,
      previewUiPaintCount: 3,
      previewUiPaintMs: 7,
      nativeStages: [{ stageId: 'world.initial-terrain', label: 'Initial world foundation', elapsedMs: 900 }],
      graphNodes: [{ stageId: 'biomes.cohesion', label: 'biomes.cohesion', elapsedMs: 20, parentStageId: 'world.biomes-features' }]
    });

    expect(record.durations.uiDispatchToWorkerReceiptMs).toBe(5);
    expect(record.durations.workerGenerationMs).toBe(3000);
    expect(record.durations.completedProjectHandoffMs).toBe(24);
    expect(record.durations.uiProjectAcceptanceMs).toBe(10);
    expect(record.durations.projectAcceptanceToRenderCommitMs).toBe(19);
    expect(record.durations.renderCommitToInteractivePaintMs).toBe(16);
    expect(record.durations.totalUserVisibleMs).toBe(3096);
    expect(record.graphNodes[0].parentStageId).toBe('world.biomes-features');
    expect(generationTimingRecordMarkdown(record)).toContain('Instrumented');
  });
});
