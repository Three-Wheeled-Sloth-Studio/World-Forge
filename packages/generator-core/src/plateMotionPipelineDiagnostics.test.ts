import { describe, expect, it } from 'vitest';
import {
  synchronizeFinalHydrologyDiagnostics,
  type DeepTimeProject,
} from './plateMotionPipeline';

const LOW_ACCEPTANCE_NOTE = 'Named river acceptance is below capacity even though source candidates exist; path claiming or minimum path length may be suppressing rivers.';
const SHORT_RIVER_NOTE = 'Most named rivers are short at topology scale; sparse tile export is likely from short paths collapsing during downsampling.';

describe('final hydrology diagnostic synchronization', () => {
  it('recomputes named-river diagnostics after final river supplementation', () => {
    const project = {
      primaryWorld: {
        seaLevel: 1,
        topologyLayers: {
          water: Uint8Array.from([0, 0, 0, 1]),
          elevation: Float32Array.from([2, 1.5, 1.1, 0]),
        },
        rivers: [
          {
            id: 'river-1',
            path: [0, 1, 2, 3],
            topologyPath: [0, 1, 2, 3],
            sourceIndex: 0,
            mouthIndex: 3,
            terminus: 'ocean',
          },
          {
            id: 'river-2',
            path: [2, 1, 0],
            topologyPath: [2, 1, 0],
            sourceIndex: 2,
            mouthIndex: 0,
            terminus: 'basin',
          },
        ],
        deepTime: {
          hydrology: {
            landCellCount: 3,
            sourceCandidateCount: 20,
            acceptedRiverCount: 1,
            maximumRiverCount: 10,
            namedRiverCapacityUse: 0.1,
            namedRiverPathCellShare: 0.5,
            shortRiverShare: 0,
            medianSourceToMouthDrop: 0,
            meanRiverPathLength: 0,
            medianRiverPathLength: 0,
            p90RiverPathLength: 0,
            meanSourceElevationAboveSeaLevel: 0,
            medianSourceElevationAboveSeaLevel: 0,
            meanMouthElevationAboveSeaLevel: 0,
            oceanTerminusShare: 0,
            lakeTerminusShare: 0,
            wetlandTerminusShare: 0,
            basinTerminusShare: 0,
            notes: [LOW_ACCEPTANCE_NOTE, SHORT_RIVER_NOTE],
          },
        },
      },
    } as unknown as DeepTimeProject;

    const synchronized = synchronizeFinalHydrologyDiagnostics(project);
    const hydrology = synchronized.primaryWorld.deepTime.hydrology;

    expect(project.primaryWorld.deepTime.hydrology.acceptedRiverCount).toBe(1);
    expect(hydrology.acceptedRiverCount).toBe(2);
    expect(hydrology.namedRiverCapacityUse).toBe(0.2);
    expect(hydrology.namedRiverPathCellShare).toBe(1);
    expect(hydrology.shortRiverShare).toBe(1);
    expect(hydrology.meanRiverPathLength).toBe(3.5);
    expect(hydrology.medianRiverPathLength).toBe(3.5);
    expect(hydrology.p90RiverPathLength).toBe(3.9);
    expect(hydrology.medianSourceToMouthDrop).toBeCloseTo(0.55, 5);
    expect(hydrology.meanSourceElevationAboveSeaLevel).toBeCloseTo(0.55, 5);
    expect(hydrology.medianSourceElevationAboveSeaLevel).toBeCloseTo(0.55, 5);
    expect(hydrology.meanMouthElevationAboveSeaLevel).toBe(0);
    expect(hydrology.oceanTerminusShare).toBe(0.5);
    expect(hydrology.lakeTerminusShare).toBe(0);
    expect(hydrology.wetlandTerminusShare).toBe(0);
    expect(hydrology.basinTerminusShare).toBe(0.5);
    expect(hydrology.notes).toContain(LOW_ACCEPTANCE_NOTE);
    expect(hydrology.notes).toContain(SHORT_RIVER_NOTE);
  });
});
