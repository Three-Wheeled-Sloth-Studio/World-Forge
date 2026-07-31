from __future__ import annotations

from pathlib import Path
from textwrap import dedent

ROOT = Path.cwd()


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dedent(content).lstrip(), encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_count(path: str, old: str, new: str, expected: int) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"Expected {expected} matches in {path}, found {count}: {old[:120]!r}")
    target.write_text(text.replace(old, new), encoding="utf-8")


def append_once(path: str, marker: str, content: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if marker in text:
        raise RuntimeError(f"Append marker already exists in {path}: {marker}")
    target.write_text(text.rstrip() + "\n\n" + dedent(content).lstrip(), encoding="utf-8")


write(
    "apps/desktop/src/simulation/systemSimulationClock.ts",
    r"""
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
    """
)

write(
    "apps/desktop/src/simulation/systemSimulationClock.test.ts",
    r"""
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
    """
)

write(
    "apps/desktop/src/globe/orbitalPresentation.ts",
    r"""
    import type { OrbitalPresentationBody } from '@world-forge/shared';

    export type OrbitalPoint = { x: number; y: number; z: number };
    export type DeterministicStarDirection = OrbitalPoint & { brightness: number };

    const TAU = Math.PI * 2;

    export function orbitalPositionAtDays(body: OrbitalPresentationBody, simulationDays: number): OrbitalPoint {
      const periodDays = finitePositive(body.orbitalPeriodDays, 1);
      const eccentricity = clamp(body.eccentricity, 0, 0.92);
      const meanAnomaly = normalizeRadians(body.phaseAtEpochRad + TAU * simulationDays / periodDays);
      let eccentricAnomaly = meanAnomaly;
      for (let iteration = 0; iteration < 6; iteration += 1) {
        const denominator = Math.max(0.08, 1 - eccentricity * Math.cos(eccentricAnomaly));
        eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / denominator;
      }

      const scale = finitePositive(body.semiMajorAxisAu ?? body.semiMajorAxisParentRadii ?? 1, 1);
      const x = scale * (Math.cos(eccentricAnomaly) - eccentricity);
      const y = scale * Math.sqrt(Math.max(0.001, 1 - eccentricity * eccentricity)) * Math.sin(eccentricAnomaly);
      return rotateOrbitalPoint(
        { x, y, z: 0 },
        body.argumentOfPeriapsisDeg,
        body.inclinationDeg,
        body.longitudeAscendingNodeDeg
      );
    }

    export function relativeOrbitalPositionAtDays(
      body: OrbitalPresentationBody,
      primary: OrbitalPresentationBody,
      simulationDays: number
    ): OrbitalPoint {
      const bodyPosition = orbitalPositionAtDays(body, simulationDays);
      const primaryPosition = orbitalPositionAtDays(primary, simulationDays);
      return {
        x: bodyPosition.x - primaryPosition.x,
        y: bodyPosition.y - primaryPosition.y,
        z: bodyPosition.z - primaryPosition.z
      };
    }

    export function displayRadiusForMoon(body: OrbitalPresentationBody): number {
      const parentRadii = finitePositive(body.semiMajorAxisParentRadii ?? 6, 6);
      return clamp(1.36 + Math.log10(parentRadii + 1) * 0.62, 1.55, 3.25);
    }

    export function displayRadiusForVisibleBody(body: OrbitalPresentationBody): number {
      return clamp(4.6 + Math.max(0, body.orbitalOrder) * 0.62, 5, 9.5);
    }

    export function displaySizeForBody(body: OrbitalPresentationBody): number {
      const base = body.kind === 'moon' ? 0.035 : body.kind === 'gas-giant' ? 0.12 : 0.065;
      const multiplier = body.kind === 'moon' ? 0.045 : 0.052;
      return clamp(base + Math.max(0, body.sizeClass) * multiplier, body.kind === 'moon' ? 0.045 : 0.075, 0.24);
    }

    export function deterministicStarDirections(seed: string, count: number): DeterministicStarDirection[] {
      const directions: DeterministicStarDirection[] = [];
      const total = Math.max(0, Math.floor(count));
      for (let index = 0; index < total; index += 1) {
        const u = unit(seed, `${index}:u`);
        const v = unit(seed, `${index}:v`);
        const z = 1 - 2 * u;
        const radial = Math.sqrt(Math.max(0, 1 - z * z));
        const angle = TAU * v;
        directions.push({
          x: radial * Math.cos(angle),
          y: radial * Math.sin(angle),
          z,
          brightness: 0.42 + unit(seed, `${index}:brightness`) * 0.58
        });
      }
      return directions;
    }

    function rotateOrbitalPoint(point: OrbitalPoint, periapsisDeg: number, inclinationDeg: number, nodeDeg: number): OrbitalPoint {
      const periapsis = degreesToRadians(periapsisDeg);
      const inclination = degreesToRadians(inclinationDeg);
      const node = degreesToRadians(nodeDeg);

      const periX = point.x * Math.cos(periapsis) - point.y * Math.sin(periapsis);
      const periY = point.x * Math.sin(periapsis) + point.y * Math.cos(periapsis);
      const inclinedY = periY * Math.cos(inclination);
      const inclinedZ = periY * Math.sin(inclination);
      return {
        x: periX * Math.cos(node) - inclinedY * Math.sin(node),
        y: periX * Math.sin(node) + inclinedY * Math.cos(node),
        z: inclinedZ
      };
    }

    function unit(seed: string, label: string): number {
      let hash = 2166136261;
      const text = `${seed}:${label}`;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) / 4294967296;
    }

    function normalizeRadians(value: number): number {
      return ((value % TAU) + TAU) % TAU;
    }

    function degreesToRadians(value: number): number {
      return Number.isFinite(value) ? value * Math.PI / 180 : 0;
    }

    function finitePositive(value: number | null | undefined, fallback: number): number {
      return Number.isFinite(value) && (value ?? 0) > 0 ? value as number : fallback;
    }

    function clamp(value: number, min: number, max: number): number {
      if (!Number.isFinite(value)) return min;
      return Math.max(min, Math.min(max, value));
    }
    """
)

write(
    "apps/desktop/src/globe/orbitalPresentation.test.ts",
    r"""
    import { describe, expect, it } from 'vitest';
    import type { OrbitalPresentationBody } from '@world-forge/shared';
    import {
      deterministicStarDirections,
      displayRadiusForMoon,
      orbitalPositionAtDays,
      relativeOrbitalPositionAtDays
    } from './orbitalPresentation';

    function body(overrides: Partial<OrbitalPresentationBody> = {}): OrbitalPresentationBody {
      return {
        id: 'body',
        parentBodyId: 'star',
        kind: 'rocky',
        orbitalOrder: 1,
        semiMajorAxisAu: 1,
        semiMajorAxisParentRadii: null,
        eccentricity: 0,
        inclinationDeg: 0,
        longitudeAscendingNodeDeg: 0,
        argumentOfPeriapsisDeg: 0,
        orbitalPeriodDays: 100,
        phaseAtEpochRad: 0,
        rotationPeriodHours: 24,
        axialTiltDeg: 23.5,
        sizeClass: 1,
        massClass: 1,
        visibleFromPrimary: true,
        placeholder: false,
        ...overrides
      };
    }

    describe('orbital presentation math', () => {
      it('places a circular orbit at deterministic quarter-period positions', () => {
        const start = orbitalPositionAtDays(body(), 0);
        const quarter = orbitalPositionAtDays(body(), 25);
        expect(start.x).toBeCloseTo(1, 6);
        expect(start.y).toBeCloseTo(0, 6);
        expect(quarter.x).toBeCloseTo(0, 6);
        expect(quarter.y).toBeCloseTo(1, 6);
      });

      it('derives a relative body vector from the same shared simulation day', () => {
        const primary = body({ id: 'primary', orbitalPeriodDays: 100, semiMajorAxisAu: 1 });
        const neighbor = body({ id: 'neighbor', orbitalPeriodDays: 200, semiMajorAxisAu: 2 });
        const relative = relativeOrbitalPositionAtDays(neighbor, primary, 0);
        expect(relative.x).toBeCloseTo(1, 6);
        expect(relative.y).toBeCloseTo(0, 6);
      });

      it('keeps deterministic star directions normalized and seed-stable', () => {
        const first = deterministicStarDirections('world-seed', 8);
        const second = deterministicStarDirections('world-seed', 8);
        expect(second).toEqual(first);
        expect(first).toHaveLength(8);
        for (const point of first) {
          expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1, 6);
          expect(point.brightness).toBeGreaterThanOrEqual(0.42);
          expect(point.brightness).toBeLessThanOrEqual(1);
        }
      });

      it('compresses moon distances into a visible but bounded display radius', () => {
        expect(displayRadiusForMoon(body({ kind: 'moon', semiMajorAxisAu: null, semiMajorAxisParentRadii: 1 }))).toBeGreaterThanOrEqual(1.55);
        expect(displayRadiusForMoon(body({ kind: 'moon', semiMajorAxisAu: null, semiMajorAxisParentRadii: 500 }))).toBeLessThanOrEqual(3.25);
      });
    });
    """
)

write(
    "apps/desktop/src/globe/SystemSimulationControls.tsx",
    r"""
    import React, { useSyncExternalStore } from 'react';
    import { Pause, Play, RotateCcw } from 'lucide-react';
    import type { SystemOrbitalContextArtifact } from '@world-forge/shared';
    import type { SystemSimulationClock } from '../simulation/systemSimulationClock';

    const speedOptions = [
      { value: 0.02, label: 'Slow' },
      { value: 0.25, label: '6 hours / sec' },
      { value: 1, label: '1 day / sec' },
      { value: 7, label: '1 week / sec' },
      { value: 30, label: '30 days / sec' }
    ];

    export function SystemSimulationControls({
      clock,
      artifact
    }: {
      clock: SystemSimulationClock;
      artifact: SystemOrbitalContextArtifact;
    }) {
      const snapshot = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
      const primary = artifact.payload.bodies.find((body) => body.id === artifact.payload.primaryBodyId);
      const moonCount = artifact.payload.bodies.filter((body) => body.kind === 'moon' && body.parentBodyId === artifact.payload.primaryBodyId).length;
      const visibleBodyCount = artifact.payload.bodies.filter((body) => body.kind !== 'moon' && body.id !== artifact.payload.primaryBodyId && (body.visibleFromPrimary || artifact.payload.visibleBodyIds.includes(body.id))).length;
      const maxDay = Math.max(1, Math.floor(snapshot.yearLengthDays));
      const currentDay = Math.max(1, Math.min(maxDay, Math.floor(snapshot.dayOfYear)));
      const currentHour = Math.max(0, Math.min(23.999, snapshot.timeOfDayHours));

      return (
        <section
          className="system-simulation-controls"
          data-system-simulation-controls="ready"
          data-simulation-playing={snapshot.playing ? 'true' : 'false'}
          aria-label="System simulation time controls"
        >
          <div className="system-simulation-toolbar">
            <button
              type="button"
              className="icon-button"
              aria-label={snapshot.playing ? 'Pause simulation' : 'Play simulation'}
              title={snapshot.playing ? 'Pause simulation' : 'Play simulation'}
              onClick={clock.togglePlaying}
            >
              {snapshot.playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <label className="system-speed-control" htmlFor="system-simulation-speed">
              <span>Speed</span>
              <select
                id="system-simulation-speed"
                aria-label="Simulation speed"
                value={String(snapshot.speedDaysPerSecond)}
                onChange={(event) => clock.setSpeedDaysPerSecond(Number(event.target.value))}
              >
                {speedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" className="icon-button" aria-label="Reset simulation time" title="Reset simulation time" onClick={clock.reset}>
              <RotateCcw size={15} />
            </button>
          </div>

          <label className="system-time-slider" htmlFor="system-day-of-year">
            <span>Day</span>
            <input
              id="system-day-of-year"
              type="range"
              min="1"
              max={maxDay}
              step="1"
              value={currentDay}
              onChange={(event) => clock.setDayOfYear(Number(event.target.value))}
            />
            <output data-simulation-day>{`Day ${currentDay}`}</output>
          </label>

          <label className="system-time-slider" htmlFor="system-time-of-day">
            <span>Time</span>
            <input
              id="system-time-of-day"
              type="range"
              min="0"
              max="23.75"
              step="0.25"
              value={currentHour}
              onChange={(event) => clock.setTimeOfDayHours(Number(event.target.value))}
            />
            <output data-simulation-time>{formatTime(currentHour)}</output>
          </label>

          <small className="system-simulation-meta">
            {`${primary?.axialTiltDeg.toFixed(1) ?? '0.0'}° tilt · ${moonCount} moon${moonCount === 1 ? '' : 's'} · ${visibleBodyCount} nearby · illustrative scale`}
          </small>
        </section>
      );
    }

    function formatTime(hours: number): string {
      const totalMinutes = Math.round(hours * 60) % (24 * 60);
      const hour = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const minute = (totalMinutes % 60).toString().padStart(2, '0');
      return `${hour}:${minute}`;
    }
    """
)

write(
    "apps/desktop/src/globe/globeSimulation.css",
    r"""
    .globe-viewer {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      background: radial-gradient(circle at 50% 44%, #15202a 0, #080d14 42%, #020408 100%);
    }

    .globe-render-surface {
      position: absolute;
      inset: 0;
    }

    .globe-render-surface canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .system-simulation-controls {
      position: absolute;
      left: 12px;
      bottom: 12px;
      z-index: 4;
      display: grid;
      gap: 7px;
      width: min(390px, calc(100% - 24px));
      padding: 9px 10px;
      border: 1px solid rgba(190, 206, 215, 0.3);
      border-radius: 10px;
      background: rgba(10, 17, 24, 0.9);
      color: #edf4f7;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(8px);
    }

    .system-simulation-toolbar,
    .system-time-slider,
    .system-speed-control {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .system-simulation-toolbar {
      justify-content: space-between;
    }

    .system-simulation-controls button,
    .system-simulation-controls select {
      min-height: 28px;
    }

    .system-simulation-controls button {
      background: linear-gradient(rgba(249, 246, 236, 0.98), rgba(214, 220, 219, 0.94));
    }

    .system-speed-control {
      flex: 1;
      min-width: 0;
    }

    .system-speed-control span,
    .system-time-slider span {
      color: #bdcbd2;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .system-speed-control select {
      flex: 1;
      min-width: 0;
    }

    .system-time-slider {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr) 62px;
    }

    .system-time-slider input {
      min-width: 0;
      padding: 0;
    }

    .system-time-slider output {
      color: #f6e3ad;
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .system-simulation-meta {
      color: #9fb0b9;
      font-size: 0.66rem;
      line-height: 1.25;
    }

    @media (max-height: 760px) {
      .system-simulation-controls {
        gap: 5px;
        padding: 7px 8px;
      }
    }
    """
)

# GlobeViewer imports and public contract.
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "import React, { useEffect, useRef } from 'react';\nimport * as THREE from 'three';\nimport { MapMode, MapTheme, PointInspectionRecord, RenderMode, renderWorldToCanvas } from '@world-forge/renderer';\nimport { WorldProject } from '@world-forge/shared';",
    "import React, { useEffect, useRef } from 'react';\nimport * as THREE from 'three';\nimport { MapMode, MapTheme, PointInspectionRecord, RenderMode, renderWorldToCanvas } from '@world-forge/renderer';\nimport type { OrbitalPresentationBody, SystemOrbitalContextArtifact, WorldProject } from '@world-forge/shared';\nimport type { SystemSimulationClock } from '../simulation/systemSimulationClock';\nimport { SystemSimulationControls } from './SystemSimulationControls';\nimport {\n  deterministicStarDirections,\n  displayRadiusForMoon,\n  displayRadiusForVisibleBody,\n  displaySizeForBody,\n  orbitalPositionAtDays,\n  relativeOrbitalPositionAtDays\n} from './orbitalPresentation';\nimport './globeSimulation.css';"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "  project,\n  mapMode,",
    "  project,\n  orbitalContext,\n  simulationClock,\n  mapMode,"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "  project: WorldProject;\n  mapMode: MapMode;",
    "  project: WorldProject;\n  orbitalContext: SystemOrbitalContextArtifact | null;\n  simulationClock: SystemSimulationClock;\n  mapMode: MapMode;"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "  const hostRef = useRef<HTMLDivElement>(null);\n  const globeMeshRef = useRef<THREE.Mesh | null>(null);",
    "  const hostRef = useRef<HTMLDivElement>(null);\n  const interactionGroupRef = useRef<THREE.Group | null>(null);\n  const globeMeshRef = useRef<THREE.Mesh | null>(null);"
)
replace_count(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    const globe = globeMeshRef.current;\n    if (!globe) return;",
    "    const globe = globeMeshRef.current;\n    const interactionGroup = interactionGroupRef.current;\n    if (!globe || !interactionGroup) return;",
    2
)
replace_count(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "orientGlobeToDirection(globe,",
    "orientGlobeToDirection(interactionGroup,",
    4
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    renderer.setClearColor(0x000000, 0);",
    "    renderer.setClearColor(orbitalContext ? 0x02050a : 0x000000, orbitalContext ? 1 : 0);"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);",
    "    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    cameraRef.current = camera;\n\n    const texture = new THREE.CanvasTexture",
    "    cameraRef.current = camera;\n\n    const interactionGroup = new THREE.Group();\n    const axialTiltGroup = new THREE.Group();\n    const planetSpinGroup = new THREE.Group();\n    scene.add(interactionGroup);\n    interactionGroup.add(axialTiltGroup);\n    axialTiltGroup.add(planetSpinGroup);\n    interactionGroupRef.current = interactionGroup;\n\n    const texture = new THREE.CanvasTexture"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    const material = createGlobeMaterial(texture, globeDebugMode);\n    const globe = new THREE.Mesh(geometry, material);\n    globe.rotation.y = -0.55;\n    scene.add(globe);\n    globeMeshRef.current = globe;",
    "    const material = createGlobeMaterial(texture, globeDebugMode);\n    const primaryPresentation = orbitalContext?.payload.bodies.find((body) => body.id === orbitalContext.payload.primaryBodyId) ?? null;\n    axialTiltGroup.rotation.z = THREE.MathUtils.degToRad(primaryPresentation?.axialTiltDeg ?? project.selectedValues.axialTiltDeg ?? 0);\n    const globe = new THREE.Mesh(geometry, material);\n    interactionGroup.rotation.y = -0.55;\n    planetSpinGroup.add(globe);\n    globeMeshRef.current = globe;"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    ocean.visible = showGlobeShells && (globeDebugMode === 'final' || globeDebugMode === 'ocean-shell');\n    scene.add(ocean);",
    "    ocean.visible = showGlobeShells && (globeDebugMode === 'final' || globeDebugMode === 'ocean-shell');\n    planetSpinGroup.add(ocean);"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    clouds.visible = false;\n    scene.add(clouds);",
    "    clouds.visible = false;\n    planetSpinGroup.add(clouds);"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    atmosphere.visible = showGlobeShells && globeDebugMode === 'final';\n    scene.add(atmosphere);",
    "    atmosphere.visible = showGlobeShells && globeDebugMode === 'final';\n    planetSpinGroup.add(atmosphere);"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    scene.add(new THREE.AmbientLight(0x9fb5bd, 0.46));\n    const sun = new THREE.DirectionalLight(0xfff1d0, 3.05);\n    sun.position.set(-4.2, 1.35, 0.55);\n    scene.add(sun);",
    "    scene.add(new THREE.AmbientLight(0x9fb5bd, orbitalContext ? 0.28 : 0.46));\n    const fallbackSun = orbitalContext ? null : new THREE.DirectionalLight(0xfff1d0, 3.05);\n    if (fallbackSun) {\n      fallbackSun.position.set(-4.2, 1.35, 0.55);\n      scene.add(fallbackSun);\n    }\n    const orbitalPresentation = orbitalContext ? createOrbitalPresentationScene(scene, orbitalContext) : null;"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "      globe.rotation.y += drag.vx;\n      globe.rotation.x = clampGlobeTilt(globe.rotation.x + drag.vy);",
    "      interactionGroup.rotation.y += drag.vx;\n      interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy);"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "    let frame = 0;\n    let disposed = false;\n    const animate = () => {\n      if (disposed) return;\n      frame = requestAnimationFrame(animate);\n      if (!drag.active && !freezeSpinRef.current) {\n        globe.rotation.y += 0.0017 + drag.vx * 0.02;\n        globe.rotation.x = clampGlobeTilt(globe.rotation.x + drag.vy * 0.018);\n        drag.vx *= 0.94;\n        drag.vy *= 0.9;\n      }\n      ocean.rotation.copy(globe.rotation);\n      clouds.rotation.copy(globe.rotation);\n      clouds.rotateY(performance.now() * 0.00000018);\n      atmosphere.rotation.copy(globe.rotation);\n      renderer.render(scene, camera);\n    };",
    "    let frame = 0;\n    let disposed = false;\n    let previousSimulationDays = simulationClock.currentDays(performance.now());\n    const animate = () => {\n      if (disposed) return;\n      frame = requestAnimationFrame(animate);\n      const simulationDays = simulationClock.currentDays(performance.now());\n      const simulationDeltaDays = simulationDays - previousSimulationDays;\n      previousSimulationDays = simulationDays;\n      if (!drag.active && !freezeSpinRef.current) {\n        interactionGroup.rotation.y += drag.vx * 0.02;\n        interactionGroup.rotation.x = clampGlobeTilt(interactionGroup.rotation.x + drag.vy * 0.018);\n        if (primaryPresentation) {\n          const rotationPeriodDays = Math.max(0.08, Math.abs(primaryPresentation.rotationPeriodHours) / 24);\n          planetSpinGroup.rotation.y += simulationDeltaDays * Math.PI * 2 / rotationPeriodDays;\n        } else {\n          planetSpinGroup.rotation.y += 0.0017;\n        }\n        drag.vx *= 0.94;\n        drag.vy *= 0.9;\n      }\n      clouds.rotation.y += simulationDeltaDays * 0.04;\n      if (orbitalPresentation && orbitalContext) updateOrbitalPresentationScene(orbitalPresentation, orbitalContext, simulationDays);\n      renderer.render(scene, camera);\n    };"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "      globeMeshRef.current = null;\n      cameraRef.current = null;",
    "      globeMeshRef.current = null;\n      interactionGroupRef.current = null;\n      cameraRef.current = null;"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "      atmosphere.geometry.dispose();\n      (atmosphere.material as THREE.Material).dispose();\n      renderer.dispose();",
    "      atmosphere.geometry.dispose();\n      (atmosphere.material as THREE.Material).dispose();\n      if (orbitalPresentation) disposeOrbitalPresentationScene(orbitalPresentation);\n      renderer.dispose();"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "  }, [focusTarget, globeDebugMode, inspectionRecord, mapMode, mapTheme, onInspect, onZoom, project, renderMode, showGlobeShells, showPlates, showRivers]);\n\n  return <div ref={hostRef} className={`globe-viewer ${diagnosticMode ? 'diagnostic-active' : ''}`} aria-label={`Generated globe for ${project.projectName}`} />;",
    "  }, [focusTarget, globeDebugMode, inspectionRecord, mapMode, mapTheme, onInspect, onZoom, orbitalContext, project, renderMode, showGlobeShells, showPlates, showRivers, simulationClock]);\n\n  const moonCount = orbitalContext?.payload.bodies.filter((body) => body.kind === 'moon' && body.parentBodyId === orbitalContext.payload.primaryBodyId).length ?? 0;\n  const visibleBodyCount = orbitalContext?.payload.bodies.filter((body) => body.kind !== 'moon' && body.id !== orbitalContext.payload.primaryBodyId && (body.visibleFromPrimary || orbitalContext.payload.visibleBodyIds.includes(body.id))).length ?? 0;\n  const axialTilt = orbitalContext?.payload.bodies.find((body) => body.id === orbitalContext.payload.primaryBodyId)?.axialTiltDeg ?? project.selectedValues.axialTiltDeg;\n\n  return (\n    <div\n      className={`globe-viewer ${diagnosticMode ? 'diagnostic-active' : ''}`}\n      aria-label={`Generated globe for ${project.projectName}`}\n      data-orbital-context={orbitalContext ? 'ready' : 'pending'}\n      data-orbital-star-count={orbitalContext ? '1' : '0'}\n      data-orbital-moon-count={moonCount}\n      data-orbital-visible-body-count={visibleBodyCount}\n      data-orbital-axial-tilt={Number.isFinite(axialTilt) ? axialTilt.toFixed(3) : '0.000'}\n      data-system-star-light={orbitalContext ? 'coupled' : 'fallback'}\n    >\n      <div ref={hostRef} className=\"globe-render-surface\" />\n      {orbitalContext && <SystemSimulationControls clock={simulationClock} artifact={orbitalContext} />}\n    </div>\n  );"
)
replace_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "function orientGlobeToDirection(globe: THREE.Mesh, direction: THREE.Vector3) {",
    "function orientGlobeToDirection(globe: THREE.Object3D, direction: THREE.Vector3) {"
)

append_once(
    "apps/desktop/src/globe/GlobeViewer.tsx",
    "type OrbitalPresentationScene =",
    r"""
    type OrbitalBodyVisual = {
      body: OrbitalPresentationBody;
      group: THREE.Group;
      mesh: THREE.Mesh;
      displayRadius: number;
    };

    type OrbitalPresentationScene = {
      starfield: THREE.Points;
      starMesh: THREE.Mesh;
      starHalo: THREE.Sprite;
      haloTexture: THREE.CanvasTexture;
      sun: THREE.DirectionalLight;
      primary: OrbitalPresentationBody;
      moons: OrbitalBodyVisual[];
      visibleBodies: OrbitalBodyVisual[];
    };

    function createOrbitalPresentationScene(
      scene: THREE.Scene,
      artifact: SystemOrbitalContextArtifact
    ): OrbitalPresentationScene | null {
      const primary = artifact.payload.bodies.find((body) => body.id === artifact.payload.primaryBodyId);
      if (!primary) return null;

      const starfield = createStarfield(`${artifact.seed}:${artifact.artifactSignature}`);
      scene.add(starfield);

      const starColor = new THREE.Color(artifact.payload.star.colorHex);
      const starMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 40, 20),
        new THREE.MeshBasicMaterial({ color: starColor })
      );
      scene.add(starMesh);

      const haloTexture = createStarHaloTexture(artifact.payload.star.colorHex);
      const starHalo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTexture,
        color: starColor,
        transparent: true,
        opacity: 0.92,
        depthWrite: false
      }));
      starHalo.scale.set(1.25, 1.25, 1.25);
      scene.add(starHalo);

      const sun = new THREE.DirectionalLight(starColor, 3.25);
      scene.add(sun);

      const moons = artifact.payload.bodies
        .filter((body) => body.kind === 'moon' && body.parentBodyId === artifact.payload.primaryBodyId)
        .map((body) => createOrbitalBodyVisual(scene, body, displayRadiusForMoon(body)));
      const visibleIds = new Set(artifact.payload.visibleBodyIds);
      const visibleBodies = artifact.payload.bodies
        .filter((body) => body.kind !== 'moon' && body.id !== artifact.payload.primaryBodyId && (body.visibleFromPrimary || visibleIds.has(body.id)))
        .map((body) => createOrbitalBodyVisual(scene, body, displayRadiusForVisibleBody(body)));

      const presentation = { starfield, starMesh, starHalo, haloTexture, sun, primary, moons, visibleBodies };
      updateOrbitalPresentationScene(presentation, artifact, 0);
      return presentation;
    }

    function createOrbitalBodyVisual(scene: THREE.Scene, body: OrbitalPresentationBody, displayRadius: number): OrbitalBodyVisual {
      const group = new THREE.Group();
      const radius = displaySizeForBody(body);
      const color = new THREE.Color(orbitalBodyColor(body.kind));
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: body.kind === 'gas-giant' || body.kind === 'ice-giant' ? 0.72 : 0.9,
        metalness: 0.01,
        transparent: body.placeholder,
        opacity: body.placeholder ? 0.78 : 1
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 30, 16), material);
      group.add(mesh);

      if (body.placeholder) {
        const wireframe = new THREE.Mesh(
          new THREE.SphereGeometry(radius * 1.15, 14, 8),
          new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.32, depthWrite: false })
        );
        group.add(wireframe);
      }
      if (body.kind === 'gas-giant' || body.kind === 'ice-giant') {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(radius * 1.55, Math.max(0.006, radius * 0.08), 8, 48),
          new THREE.MeshBasicMaterial({ color: 0xcabf9c, transparent: true, opacity: 0.45, depthWrite: false })
        );
        ring.rotation.x = Math.PI * 0.62;
        group.add(ring);
      }
      scene.add(group);
      return { body, group, mesh, displayRadius };
    }

    function updateOrbitalPresentationScene(
      presentation: OrbitalPresentationScene,
      artifact: SystemOrbitalContextArtifact,
      simulationDays: number
    ): void {
      const primaryPosition = orbitalPositionAtDays(presentation.primary, simulationDays);
      const starDirection = new THREE.Vector3(-primaryPosition.x, -primaryPosition.y, -primaryPosition.z);
      if (starDirection.lengthSq() < 0.000001) starDirection.set(-1, 0.25, -0.2);
      starDirection.normalize();
      presentation.starMesh.position.copy(starDirection).multiplyScalar(8.2);
      presentation.starHalo.position.copy(presentation.starMesh.position);
      presentation.sun.position.copy(starDirection).multiplyScalar(6.5);

      for (const visual of presentation.moons) {
        const point = orbitalPositionAtDays(visual.body, simulationDays);
        setDisplayPosition(visual.group, point, visual.displayRadius);
        rotateOrbitalVisual(visual, simulationDays);
      }
      for (const visual of presentation.visibleBodies) {
        const point = relativeOrbitalPositionAtDays(visual.body, presentation.primary, simulationDays);
        setDisplayPosition(visual.group, point, visual.displayRadius);
        rotateOrbitalVisual(visual, simulationDays);
      }

      const luminosityPulse = 1 + Math.sin(simulationDays * 0.025) * 0.025;
      presentation.starHalo.scale.setScalar(1.25 * luminosityPulse);
      presentation.sun.intensity = 3.25 * Math.max(0.72, Math.min(1.35, artifact.payload.star.luminositySolar));
    }

    function setDisplayPosition(group: THREE.Group, point: { x: number; y: number; z: number }, displayRadius: number): void {
      const direction = new THREE.Vector3(point.x, point.y, point.z);
      if (direction.lengthSq() < 0.000001) direction.set(1, 0, 0);
      group.position.copy(direction.normalize().multiplyScalar(displayRadius));
    }

    function rotateOrbitalVisual(visual: OrbitalBodyVisual, simulationDays: number): void {
      const rotationPeriodDays = Math.max(0.04, Math.abs(visual.body.rotationPeriodHours) / 24);
      visual.mesh.rotation.y = simulationDays * Math.PI * 2 / rotationPeriodDays;
      visual.mesh.rotation.z = THREE.MathUtils.degToRad(visual.body.axialTiltDeg);
    }

    function createStarfield(seed: string): THREE.Points {
      const stars = deterministicStarDirections(seed, 1100);
      const positions = new Float32Array(stars.length * 3);
      const colors = new Float32Array(stars.length * 3);
      stars.forEach((star, index) => {
        const radius = 13.5 + (index % 9) * 0.22;
        positions[index * 3] = star.x * radius;
        positions[index * 3 + 1] = star.y * radius;
        positions[index * 3 + 2] = star.z * radius;
        const tint = index % 7 === 0 ? new THREE.Color(0xbfd8ff) : index % 5 === 0 ? new THREE.Color(0xffdfb0) : new THREE.Color(0xf4f7ff);
        colors[index * 3] = tint.r * star.brightness;
        colors[index * 3 + 1] = tint.g * star.brightness;
        colors[index * 3 + 2] = tint.b * star.brightness;
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return new THREE.Points(geometry, new THREE.PointsMaterial({
        size: 0.035,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false
      }));
    }

    function createStarHaloTexture(colorHex: string): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (context) {
        const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 64);
        gradient.addColorStop(0, colorHex);
        gradient.addColorStop(0.18, `${colorHex}cc`);
        gradient.addColorStop(0.5, `${colorHex}55`);
        gradient.addColorStop(1, `${colorHex}00`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function orbitalBodyColor(kind: OrbitalPresentationBody['kind']): number {
      if (kind === 'moon') return 0xb7b1a7;
      if (kind === 'gas-giant') return 0xc89867;
      if (kind === 'ice-giant') return 0x75afc7;
      if (kind === 'dwarf') return 0x968b82;
      if (kind === 'belt') return 0x8a8179;
      return 0xa66e4d;
    }

    function disposeOrbitalPresentationScene(presentation: OrbitalPresentationScene): void {
      const roots: THREE.Object3D[] = [
        presentation.starfield,
        presentation.starMesh,
        presentation.starHalo,
        ...presentation.moons.map((visual) => visual.group),
        ...presentation.visibleBodies.map((visual) => visual.group)
      ];
      for (const root of roots) {
        root.parent?.remove(root);
        root.traverse((object) => {
          const candidate = object as THREE.Mesh & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
          candidate.geometry?.dispose();
          if (Array.isArray(candidate.material)) candidate.material.forEach((material) => material.dispose());
          else candidate.material?.dispose();
        });
      }
      presentation.sun.parent?.remove(presentation.sun);
      presentation.haloTexture.dispose();
    }
    """
)

# Main application clock ownership and Globe props.
replace_once(
    "apps/desktop/src/main.tsx",
    "import { GlobeViewer, type GlobeDebugMode } from './globe/GlobeViewer';",
    "import { GlobeViewer, type GlobeDebugMode } from './globe/GlobeViewer';\nimport { createSystemSimulationClock } from './simulation/systemSimulationClock';"
)
replace_once(
    "apps/desktop/src/main.tsx",
    "  const enrichment = useProjectEnrichment({ project, onProjectEnriched: setProject });\n\n  useEffect(() => {",
    "  const enrichment = useProjectEnrichment({ project, onProjectEnriched: setProject });\n  const simulationClock = useMemo(() => {\n    const artifact = enrichment.artifact;\n    const primary = artifact?.payload.bodies.find((body) => body.id === artifact.payload.primaryBodyId);\n    return createSystemSimulationClock({\n      epochIso: artifact?.epochIso ?? '2000-01-01T12:00:00.000Z',\n      yearLengthDays: primary?.orbitalPeriodDays ?? 365.256\n    });\n  }, [enrichment.artifact?.artifactSignature, project?.projectId]);\n\n  useEffect(() => () => simulationClock.dispose(), [simulationClock]);\n\n  useEffect(() => {"
)
replace_once(
    "apps/desktop/src/main.tsx",
    "              project={project}\n              mapMode={mapMode}",
    "              project={project}\n              orbitalContext={enrichment.artifact}\n              simulationClock={simulationClock}\n              mapMode={mapMode}"
)

replace_once(
    "apps/desktop/src/appVersion.ts",
    "export const APP_VERSION = '0.3.36';",
    "export const APP_VERSION = '0.3.37';"
)

write(
    "refs/handoffs/system-visualization-enrichment.md",
    r"""
    # System Visualization and Enrichment Handoff

    Updated: 2026-07-31

    Status: Visualizer Cycle 1 living-globe slice implemented for validation

    Planning source: `refs/planning/pi-system-visualization-and-progressive-body-enrichment.md`

    Tracking issue: #35

    ## Delivered foundation

    - Versioned project-enrichment workflow contract.
    - Inspectable `project.system-orbital-context@1.0.0` graph.
    - Six instrumented nodes from system scaffold read through artifact packaging.
    - Deterministic orbital presentation payload and artifact signature.
    - Lazy first-Globe execution outside ordinary generation.
    - Visible running, completed, stale, cancelled, and failed UI state.
    - Optional artifact attached to `WorldProject.enrichmentArtifacts` and carried by normal project save and export serialization.
    - Graph-node editor selection and completed-node timing for the enrichment workflow.

    ## Visualizer Cycle 1 slice

    Globe view now consumes the saved orbital-context artifact and adds:

    - one reusable simulation clock owned above the renderer so later Globe and System surfaces can share it;
    - play, pause, speed, reset, day-of-year, and time-of-day controls;
    - deterministic procedural star background with no external texture asset;
    - visible generated star whose position drives the directional light;
    - physical axial-tilt grouping separate from manual camera inspection;
    - deterministic moon traversal using the artifact's orbital elements;
    - nearby visible system-body motion relative to the primary world;
    - standard-material illumination phases;
    - wireframe placeholder treatment for unresolved moons and system bodies;
    - deliberately compressed display distances and sizes, labeled as illustrative rather than literal scale.

    ## Current boundaries

    - No cloud or weather presentation yet.
    - No seasonal surface response yet.
    - No full `System` Explore mode yet.
    - No secondary-body generation.
    - No N-body simulation or authoritative ephemeris.
    - The primary generation graph, deterministic world signature, and replay contract remain unchanged.

    ## Next increment

    Add `atmospheric-weather-presentation` as a lazy, inspectable enrichment workflow and use it to drive optional procedural cloud and illustrative weather layers on the shared simulation clock.
    """
)

replace_once(
    "refs/planning/pi-system-visualization-and-progressive-body-enrichment.md",
    "### Visualizer Cycle 1: orbital context and living globe\n\nUpgrade Globe view to consume the orbital-context artifact and show:",
    "### Visualizer Cycle 1: orbital context and living globe\n\nImplementation status (2026-07-31): the first living-globe slice is implemented for validation, including the shared clock, starfield, star/light coupling, axial tilt, moon and visible-body motion, illuminated phases, compact time controls, and explicit placeholder styling. Full System view remains a later cycle.\n\nUpgrade Globe view to consume the orbital-context artifact and show:"
)

write(
    "refs/testing/system-visualization-enrichment-qa.md",
    r"""
    # System Visualization and Enrichment QA

    Updated: 2026-07-31

    ## Automated contract coverage

    - Simulation clock advances deterministically from a fixed epoch.
    - Pause preserves simulation time.
    - Speed changes commit elapsed time before applying the new rate.
    - Day-of-year and time-of-day can be changed independently.
    - Reset returns to day 1 at 00:00.
    - Orbital positions are deterministic for fixed elements and time.
    - Relative visible-body vectors use the same shared simulation day.
    - Procedural star directions are deterministic and normalized.
    - Display compression remains within accepted moon and background-body bounds.

    ## Focused browser acceptance

    1. Generate a Fast world.
    2. Confirm no orbital enrichment exists before Globe entry.
    3. Enter Globe and wait for the saved orbital artifact to complete.
    4. Confirm the scene reports one coupled star light, the generated axial tilt, and artifact-derived moon/body counts.
    5. Confirm play, pause, speed, reset, day-of-year, and time-of-day controls are visible.
    6. Increase speed and confirm simulation day advances.
    7. Pause and confirm the displayed day stops advancing.
    8. Set day 120 and 06:00, then reset and confirm day 1 at 00:00.
    9. Confirm no browser console errors or page-level overflow at 1440x900 and 1920x1080.

    ## Manual visual review

    - Starfield is stable for the same artifact and does not shimmer between renders.
    - Star location and terminator direction agree.
    - Axial tilt is visible without corrupting manual globe inspection.
    - Moons and nearby bodies move smoothly when time advances.
    - Placeholder bodies are visually distinct from the primary generated globe.
    - Display scale reads as an illustrative context view, not an astronomical-scale claim.
    """
)

print("Applied living orbital globe visual slice.")
