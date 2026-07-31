import { describe, expect, it, vi } from 'vitest';
import { createSystemSimulationClock } from './systemSimulationClock';

describe('system simulation clock', () => {
  it('advances deterministically, pauses, and changes speed without losing time', () => {
    let now = 0;
    const clock = createSystemSimulationClock({
      epochIso: '2000-01-01T12:00:00.000Z',
      yearLengthDays: 360,
      initialSpeedDaysPerSecond: 0.5,
      now: () => now
    });

    now = 2000;
    expect(clock.currentDays()).toBeCloseTo(1, 8);
    clock.notify();
    expect(clock.getSnapshot().dayOfYear).toBeCloseTo(2, 8);

    clock.setSpeedDaysPerSecond(2);
    now = 3000;
    expect(clock.currentDays()).toBeCloseTo(3, 8);

    clock.setPlaying(false);
    now = 9000;
    expect(clock.currentDays()).toBeCloseTo(3, 8);
    expect(clock.getSnapshot().playing).toBe(false);
  });

  it('sets day of year and time of day independently and resets to the epoch', () => {
    let now = 0;
    const clock = createSystemSimulationClock({
      epochIso: '2000-01-01T12:00:00.000Z',
      yearLengthDays: 365.25,
      now: () => now
    });

    clock.setPlaying(false);
    clock.setDayOfYear(120);
    clock.setTimeOfDayHours(6);
    expect(clock.getSnapshot().dayOfYear).toBeCloseTo(120.25, 8);
    expect(clock.getSnapshot().timeOfDayHours).toBeCloseTo(6, 8);

    clock.reset();
    expect(clock.getSnapshot().simulationDays).toBe(0);
    expect(clock.getSnapshot().dayOfYear).toBe(1);
    expect(clock.getSnapshot().timeOfDayHours).toBe(0);
  });

  it('publishes stable snapshots to subscribers', () => {
    vi.useFakeTimers();
    let now = 0;
    const listener = vi.fn();
    const clock = createSystemSimulationClock({
      epochIso: '2000-01-01T12:00:00.000Z',
      yearLengthDays: 365,
      now: () => now
    });
    const unsubscribe = clock.subscribe(listener);
    now = 1000;
    vi.advanceTimersByTime(100);
    expect(listener).toHaveBeenCalled();
    expect(clock.getSnapshot()).toBe(clock.getSnapshot());
    unsubscribe();
    clock.dispose();
    vi.useRealTimers();
  });
});
