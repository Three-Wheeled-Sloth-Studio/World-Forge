export type DeepTimeAgingProfileId = 'legacy-six-epoch' | 'bounded-three-era-v1';

export type DeepTimeAgingProfile = {
  id: DeepTimeAgingProfileId;
  label: string;
  description: string;
};

export type DeepTimeEpochSchedule = {
  index: number;
  startAgeMy: number;
  endAgeMy: number;
  durationMy: number;
  tectonicIterations: number;
  impactIntensity: number;
  climateSamples: number;
  erosionIterations: number;
  glacialIterations: number;
  coastalIterations: number;
};

export const legacyDeepTimeAgingProfile: DeepTimeAgingProfile = {
  id: 'legacy-six-epoch',
  label: 'Legacy six-epoch aging',
  description: 'Production-compatible six-epoch schedule with fourteen forcing samples.'
};

export const boundedThreeEraAgingProfile: DeepTimeAgingProfile = {
  id: 'bounded-three-era-v1',
  label: 'Bounded three-era aging',
  description: 'Experimental ancient, mature, and recent eras with five forcing samples and bounded process iteration budgets.'
};

export function deepTimeAgingProfileForWorkflow(workflowId: string | undefined): DeepTimeAgingProfile {
  return workflowId === 'core.performance-foundation'
    || workflowId === 'core.performance-foundation-aging-control'
    ? boundedThreeEraAgingProfile
    : legacyDeepTimeAgingProfile;
}

export function buildDeepTimeEpochs(ageGy: number, profile: DeepTimeAgingProfile): DeepTimeEpochSchedule[] {
  const totalMy = Math.max(250, ageGy * 1000);
  if (profile.id === 'bounded-three-era-v1') {
    return buildSchedule(totalMy, [
      {
        fraction: 0.34,
        tectonicIterations: 2,
        impactIntensity: 1,
        climateSamples: 1,
        erosionIterations: 1,
        glacialIterations: 0,
        coastalIterations: 0
      },
      {
        fraction: 0.38,
        tectonicIterations: 2,
        impactIntensity: 0.34,
        climateSamples: 2,
        erosionIterations: 1,
        glacialIterations: 1,
        coastalIterations: 0
      },
      {
        fraction: 0.28,
        tectonicIterations: 1,
        impactIntensity: 0.06,
        climateSamples: 2,
        erosionIterations: 1,
        glacialIterations: 1,
        coastalIterations: 1
      }
    ]);
  }

  return buildSchedule(totalMy, [
    { fraction: 0.08, tectonicIterations: 3, impactIntensity: 1, climateSamples: 1, erosionIterations: 1, glacialIterations: 0, coastalIterations: 0 },
    { fraction: 0.12, tectonicIterations: 3, impactIntensity: 0.64, climateSamples: 1, erosionIterations: 1, glacialIterations: 0, coastalIterations: 0 },
    { fraction: 0.16, tectonicIterations: 3, impactIntensity: 0.36, climateSamples: 3, erosionIterations: 2, glacialIterations: 0, coastalIterations: 0 },
    { fraction: 0.2, tectonicIterations: 2, impactIntensity: 0.16, climateSamples: 3, erosionIterations: 2, glacialIterations: 2, coastalIterations: 0 },
    { fraction: 0.22, tectonicIterations: 2, impactIntensity: 0.04, climateSamples: 3, erosionIterations: 2, glacialIterations: 2, coastalIterations: 2 },
    { fraction: 0.22, tectonicIterations: 2, impactIntensity: 0, climateSamples: 3, erosionIterations: 2, glacialIterations: 2, coastalIterations: 2 }
  ]);
}

export function scheduledDeepTimeIterations(epochs: readonly DeepTimeEpochSchedule[]): number {
  return epochs.reduce((total, epoch) => total + Math.max(1, epoch.climateSamples) * (
    epoch.tectonicIterations
    + epoch.erosionIterations
    + epoch.glacialIterations
    + epoch.coastalIterations
    + 1
  ), 0);
}

function buildSchedule(
  totalMy: number,
  definitions: Array<Omit<DeepTimeEpochSchedule, 'index' | 'startAgeMy' | 'endAgeMy' | 'durationMy'> & { fraction: number }>
): DeepTimeEpochSchedule[] {
  let cursor = 0;
  return definitions.map((definition, index) => {
    const durationMy = totalMy * definition.fraction;
    const startAgeMy = cursor;
    cursor += durationMy;
    const { fraction: _fraction, ...schedule } = definition;
    return {
      index,
      startAgeMy: round(startAgeMy, 1),
      endAgeMy: round(cursor, 1),
      durationMy: round(durationMy, 1),
      ...schedule
    };
  });
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
