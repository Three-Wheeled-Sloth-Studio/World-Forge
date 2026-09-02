import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '@world-forge/shared';
import { generateProjectWithNativeStages } from '../../../../packages/generator-core/src/nativeStagePipeline';
import { prepareSystemOrbitConfig, reconcileSystemOrbitPresets } from '../../../../packages/generator-core/src/systemOrbitPreset';
import { configForTestCase, type PresetTestCase } from './presetValidation';

const cases: PresetTestCase[] = [
  {
    id: 'plate-contract-earthlike-sol',
    seed: '1001001',
    starPresetId: 'sol-like',
    worldPresetId: 'Earthlike',
    baselineId: 'plate-contract-earthlike-sol'
  },
  {
    id: 'plate-contract-earthlike-habitable',
    seed: '1001002',
    starPresetId: 'habitable',
    worldPresetId: 'Earthlike',
    baselineId: 'plate-contract-earthlike-habitable'
  },
  {
    id: 'plate-contract-waterworld-sol',
    seed: '1001003',
    starPresetId: 'sol-like',
    worldPresetId: 'Waterworld',
    baselineId: 'plate-contract-waterworld-sol'
  }
];

function generate(testCase: PresetTestCase) {
  const base = createDefaultConfig(testCase.seed, { width: 64, height: 32 });
  const config = configForTestCase(base, testCase);
  config.outputResolution = { width: 64, height: 32 };
  config.topologyResolution = 16;
  return reconcileSystemOrbitPresets(generateProjectWithNativeStages(prepareSystemOrbitConfig(config)));
}

function expectFragmentPlacementSchema(diagnostics: NonNullable<ReturnType<typeof generate>['primaryWorld']['deepTime']['fragmentPlacement']>) {
  expect(diagnostics.modelVersion).toBe('fragment-placement-v2');
  expect(diagnostics.fragmentCount).toBeGreaterThanOrEqual(0);
  expect(diagnostics.movingFragmentCount).toBeGreaterThanOrEqual(0);
  expect(diagnostics.sourceCellCount).toBeGreaterThanOrEqual(0);
  expect(diagnostics.targetCellCount).toBeGreaterThanOrEqual(0);

  const shares = [
    diagnostics.resolvedRecordShare,
    diagnostics.sourceCellShare,
    diagnostics.targetCellShare,
    diagnostics.directPlacementCellShare,
    diagnostics.collisionCellShare,
    diagnostics.collisionResolvedCellShare,
    diagnostics.mergedCollisionCellShare,
    diagnostics.vacatedSourceCellShare,
    diagnostics.youngOceanCrustCellShare,
    diagnostics.ownershipChangedCellShare
  ];
  for (const share of shares) {
    expect(Number.isFinite(share)).toBe(true);
    expect(share).toBeGreaterThanOrEqual(0);
    expect(share).toBeLessThanOrEqual(1);
  }

  expect(Number.isFinite(diagnostics.retainedCellRatio)).toBe(true);
  expect(diagnostics.retainedCellRatio).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(diagnostics.meanDisplacementRadians)).toBe(true);
  expect(Number.isFinite(diagnostics.maxDisplacementRadians)).toBe(true);
  expect(Array.isArray(diagnostics.notes)).toBe(true);
}

describe('active plate diagnostic contract', () => {
  it.each(cases)('exposes fragment-placement-v2 across preset generation paths: $id', (testCase) => {
    const project = generate(testCase);
    const diagnostics = project.primaryWorld.deepTime.fragmentPlacement;
    expect(diagnostics).toBeDefined();
    expectFragmentPlacementSchema(diagnostics!);
  });

  it('is deterministic for a fixed prepared preset case', () => {
    const testCase = cases[0];
    const first = generate(testCase).primaryWorld.deepTime.fragmentPlacement;
    const second = generate(testCase).primaryWorld.deepTime.fragmentPlacement;

    expect(first).toBeDefined();
    expect(second).toEqual(first);
  });
});
