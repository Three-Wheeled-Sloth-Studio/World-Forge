from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


generator_controls = r"""import {
  parameterControlBounds,
  topologyResolutionForOutput,
  type GenerationConfig,
  type NumericRange,
  type ParameterRanges,
  type Resolution
} from '@world-forge/shared';

export type GenerationRangeKey = keyof ParameterRanges;
export type GenerationRangeBound = keyof Pick<NumericRange, 'min' | 'max'>;

export type GenerationParameterControl = {
  key: GenerationRangeKey;
  label: string;
  description: string;
  step: number;
};

export type GenerationParameterGroup = {
  id: 'world-shape' | 'climate' | 'geology-history' | 'hydrology' | 'system';
  label: string;
  controls: readonly GenerationParameterControl[];
};

export const generationParameterLabels: Record<GenerationRangeKey, string> = {
  systemAgeGy: 'System age',
  oceanPercentage: 'Ocean target',
  averageTemperatureC: 'Average temperature',
  aridity: 'Aridity',
  seaLevel: 'Sea-level bias',
  axialTiltDeg: 'Axial tilt',
  orbitalEccentricity: 'Orbital eccentricity',
  sizeClass: 'Planet size',
  moonCount: 'Moon count',
  impactFrequency: 'Impact frequency',
  plateCount: 'Plate count',
  riverDensity: 'River density',
  continentCount: 'Continent count',
  continentScale: 'Continent size and cohesion',
  islandDensity: 'Island density'
};

const controls: Record<GenerationRangeKey, GenerationParameterControl> = {
  systemAgeGy: {
    key: 'systemAgeGy',
    label: generationParameterLabels.systemAgeGy,
    description: 'Age range used for impact history, weathering, and long-term terrain evolution.',
    step: 0.1
  },
  oceanPercentage: {
    key: 'oceanPercentage',
    label: generationParameterLabels.oceanPercentage,
    description: 'Target share of the projected world covered by ocean.',
    step: 1
  },
  averageTemperatureC: {
    key: 'averageTemperatureC',
    label: generationParameterLabels.averageTemperatureC,
    description: 'Planet-wide average temperature range before local climate variation.',
    step: 1
  },
  aridity: {
    key: 'aridity',
    label: generationParameterLabels.aridity,
    description: 'Higher values favor drier climate and reduce broad moisture availability.',
    step: 0.05
  },
  seaLevel: {
    key: 'seaLevel',
    label: generationParameterLabels.seaLevel,
    description: 'Bias applied to the generated elevation field before final ocean targeting.',
    step: 0.01
  },
  axialTiltDeg: {
    key: 'axialTiltDeg',
    label: generationParameterLabels.axialTiltDeg,
    description: 'Axial tilt range controlling seasonal contrast.',
    step: 1
  },
  orbitalEccentricity: {
    key: 'orbitalEccentricity',
    label: generationParameterLabels.orbitalEccentricity,
    description: 'Orbital eccentricity range controlling distance-driven seasonal variation.',
    step: 0.01
  },
  sizeClass: {
    key: 'sizeClass',
    label: generationParameterLabels.sizeClass,
    description: 'Planet radius range relative to Earth.',
    step: 0.05
  },
  moonCount: {
    key: 'moonCount',
    label: generationParameterLabels.moonCount,
    description: 'Range for major generated moons.',
    step: 1
  },
  impactFrequency: {
    key: 'impactFrequency',
    label: generationParameterLabels.impactFrequency,
    description: 'Relative impact activity applied during deep-time terrain evolution.',
    step: 0.1
  },
  plateCount: {
    key: 'plateCount',
    label: generationParameterLabels.plateCount,
    description: 'Requested tectonic plate count range.',
    step: 1
  },
  riverDensity: {
    key: 'riverDensity',
    label: generationParameterLabels.riverDensity,
    description: 'Relative river-network density after terrain and climate generation.',
    step: 0.1
  },
  continentCount: {
    key: 'continentCount',
    label: generationParameterLabels.continentCount,
    description: 'Requested number of primary continental regions.',
    step: 1
  },
  continentScale: {
    key: 'continentScale',
    label: generationParameterLabels.continentScale,
    description: 'Higher values produce broader landmasses with fewer major cuts and rifts.',
    step: 0.05
  },
  islandDensity: {
    key: 'islandDensity',
    label: generationParameterLabels.islandDensity,
    description: 'Higher values increase island frequency and island contribution to land.',
    step: 0.05
  }
};

export const generationParameterGroups: readonly GenerationParameterGroup[] = [
  {
    id: 'world-shape',
    label: 'World shape',
    controls: [
      controls.oceanPercentage,
      controls.seaLevel,
      controls.continentCount,
      controls.continentScale,
      controls.islandDensity
    ]
  },
  {
    id: 'climate',
    label: 'Climate',
    controls: [
      controls.averageTemperatureC,
      controls.aridity,
      controls.axialTiltDeg,
      controls.orbitalEccentricity
    ]
  },
  {
    id: 'geology-history',
    label: 'Geology and history',
    controls: [
      controls.plateCount,
      controls.impactFrequency,
      controls.systemAgeGy
    ]
  },
  {
    id: 'hydrology',
    label: 'Hydrology',
    controls: [controls.riverDensity]
  },
  {
    id: 'system',
    label: 'System',
    controls: [controls.sizeClass, controls.moonCount]
  }
];

export function generationActionLabel(hasCurrentProject: boolean, isGenerating: boolean): string {
  if (isGenerating) return hasCurrentProject ? 'Regenerating...' : 'Generating...';
  return hasCurrentProject ? 'Regenerate' : 'Generate';
}

export function generationConfigForQuality(
  config: GenerationConfig,
  resolution: Resolution
): GenerationConfig {
  return {
    ...config,
    outputResolution: { width: resolution.width, height: resolution.height },
    topologyResolution: topologyResolutionForOutput(resolution)
  };
}

export function updateGenerationParameterRange(
  config: GenerationConfig,
  key: GenerationRangeKey,
  bound: GenerationRangeBound,
  rawValue: number
): GenerationConfig {
  const current = config.parameterRanges[key];
  const allowed = parameterControlBounds[key];
  const fallback = current[bound];
  const value = Number.isFinite(rawValue) ? rawValue : fallback;
  const clamped = Math.max(allowed.min, Math.min(allowed.max, value));
  return {
    ...config,
    parameterRanges: {
      ...config.parameterRanges,
      [key]: {
        ...current,
        [bound]: clamped
      }
    }
  };
}
"""

generator_controls_test = r"""import { describe, expect, it } from 'vitest';
import { createDefaultConfig, topologyResolutionForOutput } from '@world-forge/shared';
import {
  generationActionLabel,
  generationConfigForQuality,
  generationParameterGroups,
  generationParameterLabels,
  updateGenerationParameterRange
} from './generationParameterControls';

describe('generation parameter controls', () => {
  it('groups every generation range exactly once', () => {
    const keys = generationParameterGroups.flatMap((group) => group.controls.map((control) => control.key));
    expect(keys).toHaveLength(new Set(keys).size);
    expect(new Set(keys)).toEqual(new Set(Object.keys(generationParameterLabels)));
  });

  it('uses accurate continent terminology', () => {
    expect(generationParameterLabels.continentCount).toBe('Continent count');
    expect(generationParameterLabels.continentScale).toBe('Continent size and cohesion');
    expect(Object.values(generationParameterLabels)).not.toContain('Regions');
    expect(Object.values(generationParameterLabels)).not.toContain('Continents');
  });

  it('keeps projected output and source topology aligned for a quality choice', () => {
    const config = createDefaultConfig('quality-test', { width: 512, height: 256 });
    const next = generationConfigForQuality(config, { width: 2048, height: 1024 });
    expect(next.outputResolution).toEqual({ width: 2048, height: 1024 });
    expect(next.topologyResolution).toBe(topologyResolutionForOutput(next.outputResolution));
  });

  it('clamps edited range values to the supported control bounds', () => {
    const config = createDefaultConfig('range-test');
    const next = updateGenerationParameterRange(config, 'continentCount', 'max', 99);
    expect(next.parameterRanges.continentCount.max).toBe(12);
    expect(config.parameterRanges.continentCount.max).toBe(7);
  });

  it('labels generation and replacement actions distinctly', () => {
    expect(generationActionLabel(false, false)).toBe('Generate');
    expect(generationActionLabel(true, false)).toBe('Regenerate');
    expect(generationActionLabel(false, true)).toBe('Generating...');
    expect(generationActionLabel(true, true)).toBe('Regenerating...');
  });
});
"""

generator_panel = r"""import React from 'react';
import { ChevronDown, RefreshCw, Shuffle } from 'lucide-react';
import {
  generationWorkflowDescriptor,
  generationWorkflowDescriptors,
  type GenerationWorkflowId
} from '@world-forge/generator-core/workflows';
import { parameterControlBounds, type GenerationConfig, type NumericRange } from '@world-forge/shared';
import type { WorkspaceMode } from '../workspace/workspaceModes';
import {
  generationActionLabel,
  generationParameterGroups,
  updateGenerationParameterRange,
  type GenerationParameterControl,
  type GenerationRangeBound
} from './generationParameterControls';
import './generatorPanel.css';

export type StarPresetId = 'sol-like' | 'habitable';

type ExtendedGenerationConfig = GenerationConfig & {
  workflowId?: GenerationWorkflowId;
  starPresetId?: StarPresetId;
  worldPresetId?: string;
  seeds?: { star?: string; world?: string };
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

function randomSeed(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

function selectedValuesForNewSeed(config: GenerationConfig): GenerationConfig['selectedValues'] {
  return {
    oceanTolerancePercentagePoints: config.selectedValues?.oceanTolerancePercentagePoints ?? 5
  };
}

function ParameterRangeEditor({
  control,
  range,
  disabled,
  onChange
}: {
  control: GenerationParameterControl;
  range: NumericRange;
  disabled: boolean;
  onChange: (bound: GenerationRangeBound, value: number) => void;
}) {
  const allowed = parameterControlBounds[control.key];
  const unit = range.unit ?? allowed.unit;
  return (
    <div className="parameter-range-control">
      <div className="parameter-range-label">
        <strong>{control.label}</strong>
        <span>{control.description}</span>
      </div>
      <div className="parameter-range-inputs">
        <label>
          <span>Min{unit ? ` (${unit})` : ''}</span>
          <input
            type="number"
            min={allowed.min}
            max={allowed.max}
            step={control.step}
            value={range.min}
            disabled={disabled}
            onChange={(event) => onChange('min', event.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          <span>Max{unit ? ` (${unit})` : ''}</span>
          <input
            type="number"
            min={allowed.min}
            max={allowed.max}
            step={control.step}
            value={range.max}
            disabled={disabled}
            onChange={(event) => onChange('max', event.currentTarget.valueAsNumber)}
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

  const updateRange = (
    control: GenerationParameterControl,
    bound: GenerationRangeBound,
    value: number
  ) => onConfigChange(updateGenerationParameterRange(config, control.key, bound, value));

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
            <span>{generationStage || generationAction}</span>
            <progress value={generationProgress} max={1} />
            <output>{Math.round(generationProgress * 100)}%</output>
          </div>
        )}
        {hasCurrentProject && <p className="replacement-note">The current world stays visible until its replacement finishes successfully.</p>}
        {invalidRanges.length > 0 && <div className="validation">Invalid advanced ranges: {invalidRanges.join(', ')}</div>}
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
                  <ParameterRangeEditor
                    key={control.key}
                    control={control}
                    range={config.parameterRanges[control.key]}
                    disabled={isGenerating}
                    onChange={(bound, value) => updateRange(control, bound, value)}
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
"""

generator_css = r""".simplified-generator {
  display: grid;
  gap: 12px;
}

.generator-section {
  background: rgba(255, 249, 235, 0.68);
  border: 1px solid #c9baa1;
  border-radius: 8px;
  display: grid;
  gap: 10px;
  padding: 10px;
}

.generator-section h3,
.advanced-settings-group h4 {
  color: #3b3025;
  font-family: Georgia, "Times New Roman", serif;
  margin: 0;
}

.generator-section h3 {
  font-size: 17px;
}

.advanced-settings-group h4 {
  font-size: 14px;
  margin-bottom: 8px;
}

.quick-build-header {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.generator-kicker {
  color: var(--pm-muted);
  display: block;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  margin-bottom: 1px;
  text-transform: uppercase;
}

.build-target-status {
  background: rgba(121, 165, 135, 0.16);
  border: 1px solid rgba(88, 129, 99, 0.5);
  border-radius: 999px;
  color: #31513a;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 7px;
  white-space: nowrap;
}

.build-target-status.replacement {
  background: rgba(198, 152, 80, 0.14);
  border-color: rgba(155, 110, 50, 0.5);
  color: #68451d;
}

.quick-build-grid {
  display: grid;
  gap: 8px;
}

.generator-control {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.generator-control > span {
  font-size: 12px;
  font-weight: 800;
}

.seed-input-row {
  display: grid;
  gap: 6px;
  grid-template-columns: minmax(0, 1fr) 34px;
}

.seed-input-row .icon-button {
  justify-content: center;
  min-width: 34px;
  padding: 5px;
}

.generation-quality-note,
.replacement-note,
.generator-field-help {
  color: var(--pm-muted);
  font-size: 11px;
  line-height: 1.35;
  margin: 0;
}

.build-generation-progress {
  align-items: center;
  display: grid;
  gap: 6px;
  grid-template-columns: minmax(0, 1fr) 72px 34px;
}

.build-generation-progress span,
.build-generation-progress output {
  color: var(--pm-muted);
  font-size: 10px;
  font-weight: 800;
}

.build-generation-progress progress {
  width: 100%;
}

.build-generation-progress output {
  text-align: right;
}

.replacement-note {
  background: rgba(198, 152, 80, 0.1);
  border-left: 3px solid rgba(155, 110, 50, 0.6);
  padding: 6px 8px;
}

.generator-primary-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}

.generator-primary-actions button {
  justify-content: center;
}

.advanced-generator-settings {
  background: rgba(232, 223, 203, 0.7);
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  overflow: hidden;
}

.advanced-generator-settings summary {
  align-items: center;
  cursor: pointer;
  display: flex;
  font-size: 13px;
  font-weight: 800;
  gap: 7px;
  list-style: none;
  min-height: 36px;
  padding: 7px 10px;
}

.advanced-generator-settings summary::-webkit-details-marker {
  display: none;
}

.advanced-generator-settings summary svg {
  transition: transform 120ms ease;
}

.advanced-generator-settings[open] summary svg {
  transform: rotate(180deg);
}

.advanced-settings-content {
  border-top: 1px solid var(--pm-border);
  display: grid;
  gap: 12px;
  padding: 10px;
}

.advanced-settings-group {
  border-top: 1px solid rgba(167, 155, 134, 0.55);
  padding-top: 10px;
}

.advanced-settings-group:first-child {
  border-top: 0;
  padding-top: 0;
}

.parameter-range-grid {
  display: grid;
  gap: 8px;
}

.parameter-range-control {
  background: rgba(255, 252, 244, 0.55);
  border: 1px solid rgba(167, 155, 134, 0.45);
  border-radius: 6px;
  display: grid;
  gap: 7px;
  padding: 8px;
}

.parameter-range-label {
  display: grid;
  gap: 2px;
}

.parameter-range-label strong {
  font-size: 12px;
}

.parameter-range-label span {
  color: var(--pm-muted);
  font-size: 10px;
  line-height: 1.3;
}

.parameter-range-inputs {
  display: grid;
  gap: 6px;
  grid-template-columns: 1fr 1fr;
}

.parameter-range-inputs label,
.single-value-input {
  display: grid;
  gap: 3px;
}

.parameter-range-inputs label > span,
.single-value-input > span {
  color: var(--pm-muted);
  font-size: 10px;
  font-weight: 800;
}

.single-value-control {
  grid-template-columns: minmax(0, 1fr) 86px;
}

.single-value-input {
  align-self: end;
}

.validation {
  background: rgba(169, 69, 45, 0.1);
  border: 1px solid rgba(169, 69, 45, 0.45);
  border-radius: 6px;
  color: #7a2f20;
  font-size: 11px;
  font-weight: 700;
  padding: 7px 8px;
}

@media (max-width: 1100px) {
  .generator-primary-actions,
  .parameter-range-inputs,
  .single-value-control {
    grid-template-columns: 1fr;
  }
}
"""

# Write complete/new files.
Path('apps/desktop/src/generator/generationParameterControls.ts').write_text(generator_controls)
Path('apps/desktop/src/generator/generationParameterControls.test.ts').write_text(generator_controls_test)
Path('apps/desktop/src/generator/GeneratorPanel.tsx').write_text(generator_panel)
Path('apps/desktop/src/generator/generatorPanel.css').write_text(generator_css)

# main.tsx imports and range labels
main = Path('apps/desktop/src/main.tsx')
text = main.read_text()
text = text.replace(
"""  can,
  isLoggedIn,
  isLocalOnlyIdentity,
  loadCloudSyncSettings,""",
"""  can,
  loadCloudSyncSettings,""",
1)
text = text.replace(
"""import { GeneratorPanel } from './generator/GeneratorPanel';
import { WorldWorkspace } from './workspace/WorldWorkspace';""",
"""import { GeneratorPanel } from './generator/GeneratorPanel';
import { generationConfigForQuality, generationParameterLabels } from './generator/generationParameterControls';
import { WorldWorkspace } from './workspace/WorldWorkspace';""",
1)
old_labels = """const rangeLabels: Record<RangeKey, string> = {
  systemAgeGy: 'System age',
  oceanPercentage: 'Ocean',
  averageTemperatureC: 'Avg temp',
  aridity: 'Aridity',
  seaLevel: 'Sea level',
  axialTiltDeg: 'Axial tilt',
  orbitalEccentricity: 'Eccentricity',
  sizeClass: 'Size',
  moonCount: 'Moons',
  impactFrequency: 'Impacts',
  plateCount: 'Plates',
  riverDensity: 'Rivers',
  continentCount: 'Regions',
  continentScale: 'Continents',
  islandDensity: 'Islands'
};

"""
if old_labels not in text:
    raise RuntimeError('main.tsx range label block changed unexpectedly')
text = text.replace(old_labels, '', 1)
text = text.replace(
""".map(([key]) => rangeLabels[key as RangeKey]);""",
""".map(([key]) => generationParameterLabels[key as RangeKey]);""",
1)
profile_block = """  const profileStatus = (() => {
    if (!cloudSync.keepSynced) return { className: 'off', label: 'Sync off', title: 'Sync is turned off.' };
    if (cloudSync.lastError) return { className: 'warn', label: isLoggedIn(identity) ? identity.displayName : 'Not Logged In', title: cloudSync.lastError };
    if (isLoggedIn(identity) && cloudSync.serviceBaseUrl && !isLocalOnlyIdentity(identity)) return { className: 'online', label: identity.displayName, title: `Signed in. ${syncStatus}` };
    if (isLoggedIn(identity)) return { className: 'local', label: identity.displayName, title: 'Signed in locally. Cloud service is not configured or unavailable.' };
    return { className: 'offline', label: 'Not Logged In', title: syncStatus };
  })();
"""
if profile_block not in text:
    raise RuntimeError('main.tsx profile block changed unexpectedly')
text = text.replace(profile_block, '', 1)

old_generator_props = """          <GeneratorPanel
            workspaceMode={workspaceMode}
            config={config}
            selectedPreset={selectedPreset}
            presetLabels={worldPresets.map((preset) => preset.label)}
            previewResolution={previewResolution}
            previewResolutionOptions={previewResolutionOptions}
            exportResolution={exportResolution}
            resolutionOptions={resolutionOptions}
            sourceTopologyResolution={config.topologyResolution ?? topologyResolutionForOutput(config.outputResolution)}
            invalidRanges={invalidRanges}
            isGenerating={isGenerating}
            profileStatus={profileStatus}
            onConfigChange={setConfig}
            onRandomizeSeed={randomizeSeed}
            onGenerate={() => generate()}
            onOpenSyncSettings={() => {
              setConfigTab('sync');
              setConfigOpen(true);
            }}
            onGenerationResolutionChange={(nextResolution) => setConfig({
              ...config,
              outputResolution: { width: nextResolution.width, height: nextResolution.height }
            })}
            onPresetChange={applyPreset}
            onPreviewResolutionChange={setPreviewResolution}
            onExportResolutionChange={setExportResolution}
            onOceanToleranceChange={updateOceanTolerance}
          />"""
new_generator_props = """          <GeneratorPanel
            workspaceMode={workspaceMode}
            hasCurrentProject={Boolean(project)}
            config={config}
            selectedPreset={selectedPreset}
            presetLabels={worldPresets.map((preset) => preset.label)}
            resolutionOptions={resolutionOptions}
            sourceTopologyResolution={config.topologyResolution ?? topologyResolutionForOutput(config.outputResolution)}
            invalidRanges={invalidRanges}
            isGenerating={isGenerating}
            generationStage={generationStage}
            generationProgress={generationProgress}
            onConfigChange={setConfig}
            onRandomizeSeed={randomizeSeed}
            onGenerate={() => generate()}
            onGenerationQualityChange={(nextResolution) => setConfig((current) => generationConfigForQuality(current, nextResolution))}
            onPresetChange={applyPreset}
            onOceanToleranceChange={updateOceanTolerance}
          />"""
if old_generator_props not in text:
    raise RuntimeError('main.tsx GeneratorPanel block changed unexpectedly')
text = text.replace(old_generator_props, new_generator_props, 1)

old_export_actions = """        exportActions={(
          <>
            <ExportButton icon={<Image size={16} />} label="PNG" task={exportTasks.png} disabled={!project} title="Export PNG" onClick={downloadPng} />"""
new_export_actions = """        displayActions={(
          <label className="workspace-inline-setting" htmlFor="preview-resolution">
            <span>Preview</span>
            <select
              id="preview-resolution"
              aria-label="Preview resolution"
              value={`${previewResolution.width}x${previewResolution.height}`}
              onChange={(event) => {
                const resolution = previewResolutionOptions.find((option) => `${option.width}x${option.height}` === event.target.value);
                if (resolution) setPreviewResolution(resolution);
              }}
            >
              {previewResolutionOptions.map((option) => <option key={option.label} value={`${option.width}x${option.height}`}>{option.label.replace(' preview', '')}</option>)}
            </select>
          </label>
        )}
        exportActions={(
          <>
            <label className="workspace-inline-setting export-resolution-setting" htmlFor="export-resolution">
              <span>PNG</span>
              <select
                id="export-resolution"
                aria-label="PNG export resolution"
                value={`${exportResolution.width}x${exportResolution.height}`}
                onChange={(event) => {
                  const resolution = resolutionOptions.find((option) => `${option.width}x${option.height}` === event.target.value);
                  if (resolution) setExportResolution(resolution);
                }}
              >
                {resolutionOptions.map((option) => <option key={option.label} value={`${option.width}x${option.height}`}>{option.label}</option>)}
              </select>
            </label>
            <ExportButton icon={<Image size={16} />} label="PNG" task={exportTasks.png} disabled={!project} title="Export PNG" onClick={downloadPng} />"""
if old_export_actions not in text:
    raise RuntimeError('main.tsx export actions marker changed unexpectedly')
text = text.replace(old_export_actions, new_export_actions, 1)
main.write_text(text)

# WorldWorkspace controlled display settings.
workspace = Path('apps/desktop/src/workspace/WorldWorkspace.tsx')
text = workspace.read_text()
text = text.replace(
"""  exportActions: ReactNode;
  developerActions?: ReactNode;""",
"""  exportActions: ReactNode;
  displayActions?: ReactNode;
  developerActions?: ReactNode;""",
1)
text = text.replace(
"""  exportActions,
  developerActions,""",
"""  exportActions,
  displayActions,
  developerActions,""",
1)
text = text.replace(
"""                <div className="view-zoom-controls" role="group" aria-label="View zoom">""",
"""                {displayActions}
                <div className="view-zoom-controls" role="group" aria-label="View zoom">""",
1)
workspace.write_text(text)

# Toolbar styles for rehomed preview and export resolution controls.
toolbar_css = Path('apps/desktop/src/workspace/workspaceToolbar.css')
text = toolbar_css.read_text()
marker = """.view-mode-toggle {
  display: inline-flex;
  gap: 0;
}
"""
addition = """.workspace-inline-setting {
  align-items: center;
  display: inline-flex;
  flex: 0 1 auto;
  gap: 4px;
  min-width: 0;
}

.workspace-inline-setting > span {
  color: var(--pm-muted);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.workspace-inline-setting select {
  max-width: 165px;
  min-width: 0;
  padding-left: 6px;
  padding-right: 6px;
}

.export-resolution-setting select {
  max-width: 150px;
}

"""
if marker not in text:
    raise RuntimeError('workspaceToolbar.css marker changed unexpectedly')
text = text.replace(marker, addition + marker, 1)
toolbar_css.write_text(text)

# Version and release notes.
replace_once(
    Path('apps/desktop/src/appVersion.ts'),
    "export const APP_VERSION = '0.3.29';",
    "export const APP_VERSION = '0.3.30';"
)
release = Path('apps/desktop/src/release/ReleaseNotesModal.tsx')
text = release.read_text()
release_marker = """        <div className="release-notes-body">
          <section>
            <p className="release-kicker">Release 0.3.29</p>"""
release_addition = """        <div className="release-notes-body">
          <section>
            <p className="release-kicker">Release 0.3.30</p>
            <h3>Build controls that describe what they do</h3>
            <ul>
              <li>Quick Build now keeps world, star, seeds, generation quality, randomization, and the primary action together.</li>
              <li>Generate becomes Regenerate when replacing a loaded world, which remains visible until replacement succeeds.</li>
              <li>Advanced generation inputs are grouped by world shape, climate, geology, hydrology, and system, with corrected continent terminology.</li>
              <li>Preview and PNG output resolution moved to Explore and Export instead of pretending to be generation inputs.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.29</p>"""
if release_marker not in text:
    raise RuntimeError('Release notes marker changed unexpectedly')
release.write_text(text.replace(release_marker, release_addition, 1))
