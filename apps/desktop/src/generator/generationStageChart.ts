import { formatGenerationDuration, type GenerationStageTiming } from '../generation/generationTiming';

export const generationStageChartColors = [
  '#315f45',
  '#6d8fa8',
  '#d98c3c',
  '#d9ad42',
  '#8d6d96',
  '#58a59a',
  '#a7755e',
  '#777d63',
  '#bb6f7f',
  '#7d9f8d'
] as const;

export type GenerationStageChartSlice = GenerationStageTiming & {
  color: string;
  percentage: number;
  startFraction: number;
  endFraction: number;
  path: string;
};

export type GenerationStageChart = {
  totalElapsedMs: number;
  slices: GenerationStageChartSlice[];
};

function pointOnCircle(fraction: number, center: number, radius: number): { x: number; y: number } {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius
  };
}

export function pieSlicePath(startFraction: number, endFraction: number, center = 80, radius = 66): string {
  const span = Math.max(0, endFraction - startFraction);
  if (span <= 0) return '';
  if (span >= 0.999999) {
    return [
      `M ${center} ${center}`,
      `L ${center} ${center - radius}`,
      `A ${radius} ${radius} 0 1 1 ${center} ${center + radius}`,
      `A ${radius} ${radius} 0 1 1 ${center} ${center - radius}`,
      'Z'
    ].join(' ');
  }
  const start = pointOnCircle(startFraction, center, radius);
  const end = pointOnCircle(endFraction, center, radius);
  const largeArcFlag = span > 0.5 ? 1 : 0;
  return [
    `M ${center} ${center}`,
    `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
    'Z'
  ].join(' ');
}

export function buildGenerationStageChart(stages: readonly GenerationStageTiming[]): GenerationStageChart {
  const normalized = stages.map((stage) => ({
    ...stage,
    elapsedMs: Number.isFinite(stage.elapsedMs) ? Math.max(0, stage.elapsedMs) : 0
  }));
  const totalElapsedMs = normalized.reduce((total, stage) => total + stage.elapsedMs, 0);
  let cursor = 0;
  const slices = normalized.map((stage, index) => {
    const fraction = totalElapsedMs > 0 ? stage.elapsedMs / totalElapsedMs : 0;
    const startFraction = cursor;
    const endFraction = cursor + fraction;
    cursor = endFraction;
    return {
      ...stage,
      color: generationStageChartColors[index % generationStageChartColors.length],
      percentage: fraction * 100,
      startFraction,
      endFraction,
      path: pieSlicePath(startFraction, endFraction)
    };
  });
  return { totalElapsedMs, slices };
}

export function formatGenerationStagePercentage(percentage: number): string {
  const safe = Number.isFinite(percentage) ? Math.max(0, percentage) : 0;
  return `${safe.toFixed(1)}%`;
}

export function generationStageTooltipText(slice: Pick<GenerationStageChartSlice, 'label' | 'elapsedMs' | 'percentage'>): string {
  return [
    slice.label,
    formatGenerationDuration(slice.elapsedMs),
    `${formatGenerationStagePercentage(slice.percentage)} of measured stage time`
  ].join('\n');
}
