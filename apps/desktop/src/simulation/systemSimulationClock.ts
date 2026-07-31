export type SystemSimulationSnapshot = {
  epochIso: string;
  yearLengthDays: number;
  simulationDays: number;
  dayOfYear: number;
  timeOfDayHours: number;
  playing: boolean;
  speedDaysPerSecond: number;
};

export type SystemSimulationClock = {
  getSnapshot: () => SystemSimulationSnapshot;
  subscribe: (listener: () => void) => () => void;
  currentDays: (realNowMs?: number) => number;
  notify: () => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setSpeedDaysPerSecond: (speed: number) => void;
  setSimulationDays: (days: number) => void;
  setDayOfYear: (day: number) => void;
  setTimeOfDayHours: (hours: number) => void;
  reset: () => void;
  dispose: () => void;
};

export const defaultSystemSimulationSpeedDaysPerSecond = 0.02;

type ClockOptions = {
  epochIso: string;
  yearLengthDays: number;
  initialSpeedDaysPerSecond?: number;
  now?: () => number;
};

export function createSystemSimulationClock(options: ClockOptions): SystemSimulationClock {
  const now = options.now ?? defaultNow;
  const epochIso = normalizeEpoch(options.epochIso);
  const yearLengthDays = finitePositive(options.yearLengthDays, 365.256);
  let baseDays = 0;
  let baseRealMs = now();
  let playing = true;
  let speedDaysPerSecond = finitePositive(
    options.initialSpeedDaysPerSecond,
    defaultSystemSimulationSpeedDaysPerSecond
  );
  let snapshot = buildSnapshot(baseDays);
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();

  function currentDays(realNowMs = now()): number {
    if (!playing) return baseDays;
    const elapsedSeconds = Math.max(0, realNowMs - baseRealMs) / 1000;
    return baseDays + elapsedSeconds * speedDaysPerSecond;
  }

  function buildSnapshot(simulationDays: number): SystemSimulationSnapshot {
    const dayWithinYear = positiveModulo(simulationDays, yearLengthDays);
    const dayFraction = positiveModulo(simulationDays, 1);
    return {
      epochIso,
      yearLengthDays,
      simulationDays,
      dayOfYear: dayWithinYear + 1,
      timeOfDayHours: dayFraction * 24,
      playing,
      speedDaysPerSecond
    };
  }

  function publish(): void {
    snapshot = buildSnapshot(currentDays());
    for (const listener of listeners) listener();
  }

  function commit(): void {
    const timestamp = now();
    baseDays = currentDays(timestamp);
    baseRealMs = timestamp;
  }

  function ensureTimer(): void {
    if (timer || listeners.size === 0) return;
    timer = setInterval(publish, 100);
  }

  function stopTimerWhenIdle(): void {
    if (!timer || listeners.size > 0) return;
    clearInterval(timer);
    timer = null;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      ensureTimer();
      return () => {
        listeners.delete(listener);
        stopTimerWhenIdle();
      };
    },
    currentDays,
    notify: publish,
    setPlaying: (nextPlaying) => {
      if (playing === nextPlaying) return;
      commit();
      playing = nextPlaying;
      publish();
    },
    togglePlaying: () => {
      commit();
      playing = !playing;
      publish();
    },
    setSpeedDaysPerSecond: (speed) => {
      const nextSpeed = finitePositive(speed, speedDaysPerSecond);
      if (nextSpeed === speedDaysPerSecond) return;
      commit();
      speedDaysPerSecond = nextSpeed;
      publish();
    },
    setSimulationDays: (days) => {
      baseDays = Number.isFinite(days) ? days : baseDays;
      baseRealMs = now();
      publish();
    },
    setDayOfYear: (day) => {
      commit();
      const yearIndex = Math.floor(baseDays / yearLengthDays);
      const timeFraction = positiveModulo(baseDays, 1);
      const clampedDay = clamp(day, 1, yearLengthDays);
      baseDays = yearIndex * yearLengthDays + (clampedDay - 1) + timeFraction;
      baseRealMs = now();
      publish();
    },
    setTimeOfDayHours: (hours) => {
      commit();
      const wholeDay = Math.floor(baseDays);
      baseDays = wholeDay + clamp(hours, 0, 23.999999) / 24;
      baseRealMs = now();
      publish();
    },
    reset: () => {
      baseDays = 0;
      baseRealMs = now();
      publish();
    },
    dispose: () => {
      listeners.clear();
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function normalizeEpoch(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '2000-01-01T12:00:00.000Z';
}

function finitePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value as number : fallback;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
