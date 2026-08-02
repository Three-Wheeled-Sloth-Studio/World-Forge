import React, { useId, useMemo, useState } from 'react';
import type { GenerationStageTiming } from '../generation/generationTiming';
import { formatGenerationDuration } from '../generation/generationTiming';
import {
  buildGenerationStageChart,
  formatGenerationStagePercentage,
  generationStageTooltipText
} from './generationStageChart';

export function GenerationStageTimeChart({ stages }: { stages: readonly GenerationStageTiming[] }) {
  const titleId = useId();
  const { totalElapsedMs, slices } = useMemo(() => buildGenerationStageChart(stages), [stages]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  if (slices.length === 0 || totalElapsedMs <= 0) return null;
  const activeSlice = slices.find((slice) => slice.stageId === activeStageId) ?? null;

  return (
    <section className="stage-time-chart" aria-labelledby={titleId}>
      <h4 id={titleId}>Stage time breakdown</h4>
      <div className="stage-time-chart-body">
        <div className="stage-time-chart-visual" onMouseLeave={() => setActiveStageId(null)}>
          <svg viewBox="0 0 160 160" role="img" aria-label="Pie chart of measured generation stage time">
            {slices.filter((slice) => slice.elapsedMs > 0).map((slice) => {
              const tooltip = generationStageTooltipText(slice);
              return (
                <path
                  key={slice.stageId}
                  className={`stage-time-chart-slice${activeStageId === slice.stageId ? ' active' : ''}`}
                  d={slice.path}
                  fill={slice.color}
                  tabIndex={0}
                  aria-label={tooltip.replaceAll('\n', ', ')}
                  onMouseEnter={() => setActiveStageId(slice.stageId)}
                  onFocus={() => setActiveStageId(slice.stageId)}
                  onBlur={() => setActiveStageId(null)}
                >
                  <title>{tooltip}</title>
                </path>
              );
            })}
          </svg>
          {activeSlice && (
            <div className="stage-time-chart-tooltip" role="tooltip">
              <strong>{activeSlice.label}</strong>
              <span>{formatGenerationDuration(activeSlice.elapsedMs)}</span>
              <span>{formatGenerationStagePercentage(activeSlice.percentage)} of stage time</span>
            </div>
          )}
        </div>
        <div className="stage-time-chart-legend" aria-label="Generation stage timing legend">
          {slices.map((slice) => (
            <button
              type="button"
              className={`stage-time-chart-legend-item${activeStageId === slice.stageId ? ' active' : ''}`}
              key={slice.stageId}
              onMouseEnter={() => setActiveStageId(slice.stageId)}
              onMouseLeave={() => setActiveStageId(null)}
              onFocus={() => setActiveStageId(slice.stageId)}
              onBlur={() => setActiveStageId(null)}
              aria-label={generationStageTooltipText(slice).replaceAll('\n', ', ')}
            >
              <i aria-hidden="true" style={{ backgroundColor: slice.color }} />
              <span>
                <small>{slice.label}</small>
                <output>{formatGenerationDuration(slice.elapsedMs)} · {formatGenerationStagePercentage(slice.percentage)}</output>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
