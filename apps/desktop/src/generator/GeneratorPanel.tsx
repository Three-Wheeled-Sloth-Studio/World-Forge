import React from 'react';
import { ChevronDown, RefreshCw, Shuffle } from 'lucide-react';
import {
  generationWorkflowDescriptor,
  generationWorkflowDescriptors,
  type GenerationWorkflowId
} from '@world-forge/generator-core/workflows';
import type { NumericDistribution } from '@world-forge/generator-core/numericDistribution';
import {
  distributionHardBounds,
  distributionTargetAndSpread,
  type WorldParameterKey
} from '@world-forge/generator-core/worldParameterPresets';
import { parameterControlBounds, type GenerationConfig } from '@world-forge/shared';
import type { WorkspaceMode } from '../workspace/workspaceModes';
import { formatGenerationDuration, type GenerationRunSummary } from '../generation/generationTiming';
import { GenerationStageTimeChart } from './GenerationStageTimeChart';
import {
  generationActionLabel,
  generationParameterDistribution,
  generationParameterGroups,
  updateGenerationParameterDistribution,
  type GenerationDistributionField,
  type GenerationParameterControl
} from './generationParameterControls';
import './generatorPanel.css';

export type StarPresetId = 'sol-like' | 'habitable';

type ExtendedGenerationConfig = GenerationConfig & {
  workflowId?: GenerationWorkflowId;
  starPresetId?: StarPresetId;
  worldPresetId?: string;
  seeds?: { star?: string; world?: string };
  parameterDistributions?: Partial<Record<WorldParameterKey, NumericDistribution>>;
};

export type ResolutionOption = { label: string; width: number; height: number };

export type GeneratorPanelProps = {
  workspaceMode: WorkspaceMode;
  hasCurrentProject: boolean;
  config: GenerationConfig;
  selectedPreset: string;
  presetLabels: string[];
  resolutionOptions: ResolutionOption[];
  sourceTopologyResolution: number;
  invalidRanges: string[];
  isGenerating: boolean;
  generationStage: string;
  generationProgress: number;
  generationElapsedMs: number;
  generationStageElapsedMs: number;
  lastGenerationRun: GenerationRunSummary | null;
  onConfigChange: (config: GenerationConfig) => void;
  onRandomizeSeed: () => void;
  onGenerate: () => void;
  onGenerationQualityChange: (resolution: ResolutionOption) => void;
  onPresetChange: (preset: string) => void;
  onOceanToleranceChange: (value: number) => void;
};

const starPresetOptions: Array<{ id: StarPresetId; label: string; description: string }> = [
  { id: 'sol-like', label: 'Sol-Like', description: 'Strongly favors a quiet, Sun-like main-sequence star and a near-Earth orbital baseline.' },
  { id: 'habitable', label: 'Earthlike-Friendly', description: 'Selects from stable F, G, and K stars with a practical habitable zone, then places the world within that star-specific zone.' }
];

function completedAtLabel(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function randomSeed(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

function selectedValuesForNewSeed(config: GenerationConfig): GenerationConfig['selectedValues'] {
  return {
    oceanTolerancePercentagePoints: config.selectedValues?.oceanTolerancePercentagePoints ?? 5
  };
}

function ParameterDistributionEditor({
  control,
  distribution,
  disabled,
  onChange
}: {
  control: GenerationParameterControl;
  distribution: NumericDistribution;
  disabled: boolean;
  onChange: (field: GenerationDistributionField, value: number) => void;
}) {
  const allowed = parameterControlBounds[control.key];
  const unit = allowed.unit;
  const editable = distributionTargetAndSpread(distribution);
  const hardBounds = distributionHardBounds(distribution);
  return (
    <div className="parameter-range-control parameter-distribution-control">
      <div className="parameter-range-label">
        <strong>{control.label}</strong>
        <span>{control.description}</span>
        <small>Hard limits: {hardBounds.min} to {hardBounds.max}{unit ? ` ${unit}` : ''}</small>
      </div>
      <div className="parameter-range-inputs">
        <label>
          <span>Target{unit ? ` (${unit})` : ''}</span>
          <input
            type="number"
            min={allowed.min}
            max={allowed.max}
            step={control.step}
            value={editable.target}
            disabled={disabled}
            onChange={(event) => onChange('target', event.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          <span>Standard deviation{unit ? ` (${unit})` : ''}</span>
          <input
            type="number"
            min={0}
            max={allowed.max - allowed.min}
            step={control.spreadStep ?? control.step}
            value={editable.spread}
            disabled={disabled}
            onChange={(event) => onChange('spread', event.currentTarget.valueAsNumber)}
          />
        </label>
      </div>
    </div>
  );
}

export function GeneratorPanel(props: GeneratorPanelProps) {
  const {
    workspaceMode, hasCurrentProject, config, selectedPreset, presetLabels, resolutionOptions,
    sourceTopologyResolution, invalidRanges, isGenerating, generationStage, generationProgress,
    generationElapsedMs, generationStageElapsedMs, lastGenerationRun,
    onConfigChange, onRandomizeSeed, onGenerate, onGenerationQualityChange, onPresetChange,
    onOceanToleranceChange
  } = props;
  const extended = config as ExtendedGenerationConfig;
  const workflow = generationWorkflowDescriptor(extended.workflowId);
  const starPresetId = extended.starPresetId === 'habitable' ? 'habitable' : 'sol-like';
  const starSeed = extended.seeds?.star || config.seed;
  const starPreset = starPresetOptions.find((option) => option.id === starPresetId) ?? starPresetOptions[0];
  const generationAction = generationActionLabel(hasCurrentProject, isGenerating);

  const updateWorkflow = (workflowId: GenerationWorkflowId) => onConfigChange({
    ...config,
    workflowId
  } as GenerationConfig);

  const updateStarPreset = (next: StarPresetId) => onConfigChange({
    ...config,
    starPresetId: next,
    worldPresetId: selectedPreset,
    seeds: { ...extended.seeds, star: starSeed, world: config.seed }
  } as GenerationConfig);

  const updateStarSeed = (next: string) => onConfigChange({
    ...config,
    starPresetId,
    worldPresetId: selectedPreset,
    selectedValues: selectedValuesForNewSeed(config),
    seeds: { ...extended.seeds, star: next, world: config.seed }
  } as GenerationConfig);

  const updateWorldSeed = (next: string) => onConfigChange({
    ...config,
    seed: next,
    starPresetId,
    worldPresetId: selectedPreset,
    selectedValues: selectedValuesForNewSeed(config),
    seeds: { ...extended.seeds, star: starSeed, world: next }
  } as GenerationConfig);

  const randomizeAll = () => {
    const world = randomSeed();
    onConfigChange({
      ...config,
      seed: world,
      starPresetId,
      worldPresetId: selectedPreset,
      selectedValues: selectedValuesForNewSeed(config),
      seeds: { star: randomSeed(), world }
    } as GenerationConfig);
  };

  const updateDistribution = (
    control: GenerationParameterControl,
    field: GenerationDistributionField,
    value: number
  ) => onConfigChange(updateGenerationParameterDistribution(config, selectedPreset, control.key, field, value));

  return (
    <div className="generator-panel simplified-generator" role="tabpanel" aria-label="World generator" data-workspace-mode={workspaceMode}>
      <section className="generator-section quick-build-section" aria-labelledby="quick-build-heading">
        <div className="quick-build-header">
          <div>
            <span className="generator-kicker">Build</span>
            <h3 id="quick-build-heading">Quick build</h3>
          </div>
          <span className={`build-target-status ${hasCurrentProject ? 'replacement' : ''}`}>
            {hasCurrentProject ? 'Replace current world' : 'New world'}
          </span>
        </div>

        <div className="quick-build-grid">
          <label className="generator-control" htmlFor="world-preset">
            <span>World type</span>
            <select id="world-preset" value={selectedPreset} disabled={isGenerating} onChange={(event) => onPresetChange(event.target.value)}>
              {presetLabels.map((label) => <option key={label} value={label}>{label}</option>)}
            </select>
          </label>

          <label className="generator-control" htmlFor="world-seed">
            <span>World seed</span>
            <div className="seed-input-row">
              <input id="world-seed" inputMode="numeric" pattern="[0-9]*" value={config.seed} disabled={isGenerating} onChange={(event) => updateWorldSeed(event.target.value.replace(/\D/g, ''))} />
              <button type="button" title="Randomize world seed" aria-label="Randomize world seed" className="secondary-button icon-button" disabled={isGenerating} onClick={onRandomizeSeed}><Shuffle size={16} /></button>
            </div>
          </label>

          <label className="generator-control" htmlFor="star-preset">
            <span>Star type</span>
            <select id="star-preset" value={starPresetId} disabled={isGenerating} title={starPreset.description} onChange={(event) => updateStarPreset(event.target.value as StarPresetId)}>
              {starPresetOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>

          <label className="generator-control" htmlFor="star-seed">
            <span>Star seed</span>
            <div className="seed-input-row">
              <input id="star-seed" inputMode="numeric" pattern="[0-9]*" value={starSeed} disabled={isGenerating} onChange={(event) => updateStarSeed(event.target.value.replace(/\D/g, ''))} />
              <button type="button" title="Randomize star seed" aria-label="Randomize star seed" className="secondary-button icon-button" disabled={isGenerating} onClick={() => updateStarSeed(randomSeed())}><Shuffle size={16} /></button>
            </div>
          </label>

          <label className="generator-control generation-quality-control" htmlFor="generation-quality">
            <span>Generation quality</span>
            <select
              id="generation-quality"
              value={`${config.outputResolution.width}x${config.outputResolution.height}`}
              disabled={isGenerating}
              onChange={(event) => {
                const resolution = resolutionOptions.find((option) => `${option.width}x${option.height}` === event.target.value);
                if (resolution) onGenerationQualityChange(resolution);
              }}
            >
              {resolutionOptions.map((option) => <option key={option.label} value={`${option.width}x${option.height}`}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <p className="generation-quality-note">
          {config.outputResolution.width} x {config.outputResolution.height} generated map from {sourceTopologyResolution} cubed-sphere source topology.
        </p>

        <div className="generator-primary-actions">
          <button type="button" className="secondary-button randomize-all-button" disabled={isGenerating} onClick={randomizeAll} title="Randomize star and world seeds"><Shuffle size={16} />Randomize All</button>
          <button
            type="button"
            className="primary-button"
            disabled={invalidRanges.length > 0 || isGenerating}
            onClick={onGenerate}
            title={hasCurrentProject ? 'Generate a replacement world. The current world remains available unless generation succeeds.' : 'Generate a world.'}
          >
            <RefreshCw size={16} />{generationAction}
          </button>
        </div>

        {isGenerating && (
          <div className="build-generation-progress" role="status" aria-live="polite">
            <span className="build-generation-progress-copy">
              <strong>{generationStage || generationAction}</strong>
              <small>Total {formatGenerationDuration(generationElapsedMs)} · Stage {formatGenerationDuration(generationStageElapsedMs)}</small>
            </span>
            <progress value={generationProgress} max={1} />
            <output>{Math.round(generationProgress * 100)}%</output>
          </div>
        )}
        {!isGenerating && lastGenerationRun && (
          <section className="last-generation-summary" aria-labelledby="last-generation-summary-heading">
            <header>
              <div>
                <span className="generator-kicker">Last generation</span>
                <strong id="last-generation-summary-heading" title={lastGenerationRun.workflowId}>
                  {lastGenerationRun.workflowLabel} v{lastGenerationRun.workflowVersion}
                </strong>
              </div>
              <time dateTime={lastGenerationRun.completedAt}>{completedAtLabel(lastGenerationRun.completedAt)}</time>
            </header>
            <div className="last-generation-headline">
              <span><small>Total wall time</small><strong>{formatGenerationDuration(lastGenerationRun.totalElapsedMs)}</strong></span>
              <span>
                <small>Slowest stage</small>
                <strong>{lastGenerationRun.slowestStage?.label ?? 'No measured stage'}</strong>
                {lastGenerationRun.slowestStage && <output>{formatGenerationDuration(lastGenerationRun.slowestStage.elapsedMs)}</output>}
              </span>
            </div>
            <div className="last-generation-stage-grid" aria-label="Last generation native stage durations">
              {lastGenerationRun.stages.map((stage) => (
                <span key={stage.stageId} title={`${stage.label}: ${formatGenerationDuration(stage.elapsedMs)}`}>
                  <small>{stage.label}</small>
                  <output>{formatGenerationDuration(stage.elapsedMs)}</output>
                </span>
              ))}
            </div>
            <GenerationStageTimeChart stages={lastGenerationRun.stages} />
          </section>
        )}
        {hasCurrentProject && <p className="replacement-note">The current world stays visible until its replacement finishes successfully.</p>}
        {invalidRanges.length > 0 && <div className="validation">Invalid advanced settings: {invalidRanges.join(', ')}</div>}
      </section>

      <details className="advanced-generator-settings">
        <summary><ChevronDown size={16} /> Advanced generation</summary>
        <div className="advanced-settings-content">
          <section className="advanced-settings-group" aria-labelledby="generation-engine-heading">
            <h4 id="generation-engine-heading">Generation engine</h4>
            <label className="generator-control" htmlFor="generation-workflow">
              <span>Generation path</span>
              <select
                id="generation-workflow"
                value={workflow.id}
                disabled={isGenerating}
                title={workflow.description}
                onChange={(event) => updateWorkflow(event.target.value as GenerationWorkflowId)}
              >
                {generationWorkflowDescriptors.filter((option) => option.selectableInGenerator).map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <p className="generator-field-help">{workflow.description}</p>
          </section>

          {generationParameterGroups.map((group) => (
            <section className="advanced-settings-group" aria-labelledby={`generation-${group.id}-heading`} key={group.id}>
              <h4 id={`generation-${group.id}-heading`}>{group.label}</h4>
              <div className="parameter-range-grid">
                {group.controls.map((control) => (
                  <ParameterDistributionEditor
                    key={control.key}
                    control={control}
                    distribution={generationParameterDistribution(config, selectedPreset, control.key)}
                    disabled={isGenerating}
                    onChange={(field, value) => updateDistribution(control, field, value)}
                  />
                ))}
                {group.id === 'world-shape' && (
                  <div className="parameter-range-control single-value-control">
                    <div className="parameter-range-label">
                      <strong>Ocean tolerance</strong>
                      <span>Allowed percentage-point difference between the requested target and final generated ocean share.</span>
                    </div>
                    <label className="single-value-input" htmlFor="ocean-tolerance">
                      <span>Points</span>
                      <input
                        id="ocean-tolerance"
                        min="0"
                        max="30"
                        step="0.5"
                        type="number"
                        value={config.selectedValues?.oceanTolerancePercentagePoints ?? 5}
                        disabled={isGenerating}
                        onChange={(event) => {
                          const value = event.currentTarget.valueAsNumber;
                          if (Number.isFinite(value)) onOceanToleranceChange(value);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </details>
    </div>
  );
}