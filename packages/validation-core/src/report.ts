import type { ValidationMetricResult, ValidationReport } from './validation';

export function renderValidationReportMarkdown(report: ValidationReport): string {
  const lines = [
    `# ${report.scenario.label} validation`,
    '',
    `Generated: ${report.generatedAt}`,
    `Tier: ${report.scenario.tier}`,
    `Adapter: ${report.adapter.id}@${report.adapter.version}`,
    `Wall time: ${formatNumber(report.performance.wallMs)} ms`,
    `Result: ${report.summary.passed ? 'PASS' : 'FAIL'}`,
    '',
    '## Component metrics',
    '',
    '| Component | Metric | Evidence | Value | Gate | Baseline |',
    '| --- | --- | --- | ---: | --- | --- |',
    ...report.metrics.map(renderMetricRow),
    '',
    '## Interpretation',
    '',
    ...report.metrics.flatMap((metric) => [
      `### ${metric.label}`,
      '',
      `Proves: ${metric.proves}`,
      '',
      `Does not prove: ${metric.doesNotProve}`,
      '',
    ]),
  ];
  if (report.performance.stages && Object.keys(report.performance.stages).length > 0) {
    lines.push(
      '## Performance stages',
      '',
      '| Stage | ms |',
      '| --- | ---: |',
      ...Object.entries(report.performance.stages)
        .sort((left, right) => right[1] - left[1])
        .map(([stage, ms]) => `| ${stage} | ${formatNumber(ms)} |`),
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

function renderMetricRow(metric: ValidationMetricResult): string {
  const gate = metric.thresholdPassed === null ? 'informational' : metric.thresholdPassed ? 'pass' : 'FAIL';
  const baseline = metric.baselinePassed === undefined
    ? 'not compared'
    : `${metric.baselinePassed ? 'pass' : 'FAIL'} (${formatSigned(metric.baselineDelta ?? 0)})`;
  return `| ${metric.component} | ${metric.label} | ${metric.evidence} | ${formatNumber(metric.value)} ${metric.unit} | ${gate} | ${baseline} |`;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function formatSigned(value: number): string {
  const formatted = formatNumber(value);
  return value > 0 ? `+${formatted}` : formatted;
}
