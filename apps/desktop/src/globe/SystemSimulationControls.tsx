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
