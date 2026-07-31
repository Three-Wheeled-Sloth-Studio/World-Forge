from __future__ import annotations

import json
import sys
from pathlib import Path
from statistics import mean

ROOT = Path.cwd()


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:100]!r}")
    target.write_text(text.replace(old, new), encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def apply() -> None:
    write(
        "packages/generator-core/src/presentClimateTraversal.ts",
        r'''
import { clamp, type CubedSphereTopology } from '@world-forge/shared';

export type TopologyDirectionGeometry = {
  dx: Float64Array;
  dy: Float64Array;
  distance: Float64Array;
  distanceSquared: Float64Array;
};

export function buildTopologyDirectionGeometry(topology: CubedSphereTopology): TopologyDirectionGeometry {
  const length = topology.neighbors.length;
  const dx = new Float64Array(length);
  const dy = new Float64Array(length);
  const distance = new Float64Array(length);
  const distanceSquared = new Float64Array(length);

  for (let cell = 0; cell < topology.cellCount; cell += 1) {
    const longitude = topology.longitudes[cell];
    const latitude = topology.latitudes[cell];
    const longitudeScale = Math.max(0.12, Math.cos(latitude));
    for (let direction = 0; direction < 4; direction += 1) {
      const offset = cell * 4 + direction;
      const neighbor = topology.neighbors[offset];
      if (neighbor < 0) continue;
      const localX = wrappedAngle(topology.longitudes[neighbor] - longitude) * longitudeScale;
      const localY = topology.latitudes[neighbor] - latitude;
      dx[offset] = localX;
      dy[offset] = localY;
      distanceSquared[offset] = Math.max(0.000001, localX * localX + localY * localY);
      distance[offset] = Math.max(0.000001, Math.hypot(localX, localY));
    }
  }

  return { dx, dy, distance, distanceSquared };
}

export function topologyTerrainGradientWithGeometry(
  layer: Float32Array,
  topology: CubedSphereTopology,
  geometry: TopologyDirectionGeometry,
  cell: number
): { x: number; y: number } {
  let gx = 0;
  let gy = 0;
  let count = 0;
  for (let direction = 0; direction < 4; direction += 1) {
    const offset = cell * 4 + direction;
    const neighbor = topology.neighbors[offset];
    if (neighbor < 0) continue;
    const delta = layer[neighbor] - layer[cell];
    gx += (delta * geometry.dx[offset]) / geometry.distanceSquared[offset];
    gy += (delta * geometry.dy[offset]) / geometry.distanceSquared[offset];
    count += 1;
  }
  return count
    ? { x: clamp(gx / count, -1, 1), y: clamp(gy / count, -1, 1) }
    : { x: 0, y: 0 };
}

export function stepTopologyByVectorWithGeometry(
  topology: CubedSphereTopology,
  geometry: TopologyDirectionGeometry,
  cell: number,
  vectorX: number,
  vectorY: number
): number {
  const length = Math.hypot(vectorX, vectorY);
  if (length < 0.0001) return cell;
  let best = cell;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let direction = 0; direction < 4; direction += 1) {
    const offset = cell * 4 + direction;
    const neighbor = topology.neighbors[offset];
    if (neighbor < 0) continue;
    const score = (geometry.dx[offset] / geometry.distance[offset]) * (vectorX / length)
      + (geometry.dy[offset] / geometry.distance[offset]) * (vectorY / length);
    if (score > bestScore) {
      best = neighbor;
      bestScore = score;
    }
  }
  return best;
}

function wrappedAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
'''
    )

    write(
        "packages/generator-core/src/presentClimateTraversal.test.ts",
        r'''
import { buildCubedSphereTopology, clamp, type CubedSphereTopology } from '@world-forge/shared';
import { describe, expect, it } from 'vitest';
import {
  buildTopologyDirectionGeometry,
  stepTopologyByVectorWithGeometry,
  topologyTerrainGradientWithGeometry
} from './presentClimateTraversal';

describe('present-climate topology traversal', () => {
  const topology = buildCubedSphereTopology(8);
  const geometry = buildTopologyDirectionGeometry(topology);
  const elevation = new Float32Array(topology.cellCount);
  for (let cell = 0; cell < elevation.length; cell += 1) {
    elevation[cell] = Math.fround(Math.sin(cell * 0.137) * 0.42 + Math.cos(cell * 0.031) * 0.18);
  }

  it('matches legacy terrain gradients exactly', () => {
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      expect(topologyTerrainGradientWithGeometry(elevation, topology, geometry, cell))
        .toEqual(legacyTerrainGradient(elevation, topology, cell));
    }
  });

  it('matches legacy directional steps exactly', () => {
    const vectors = [
      { x: 1, y: 0 },
      { x: -0.73, y: 0.42 },
      { x: 0.18, y: -0.91 },
      { x: 0, y: 0 }
    ];
    for (let cell = 0; cell < topology.cellCount; cell += 1) {
      for (const vector of vectors) {
        expect(stepTopologyByVectorWithGeometry(topology, geometry, cell, vector.x, vector.y))
          .toBe(legacyStep(topology, cell, vector.x, vector.y));
      }
    }
  });
});

function legacyTerrainGradient(layer: Float32Array, topology: CubedSphereTopology, cell: number) {
  let gx = 0;
  let gy = 0;
  let count = 0;
  for (let direction = 0; direction < 4; direction += 1) {
    const neighbor = topology.neighbors[cell * 4 + direction];
    if (neighbor < 0) continue;
    const dx = wrappedAngle(topology.longitudes[neighbor] - topology.longitudes[cell])
      * Math.max(0.12, Math.cos(topology.latitudes[cell]));
    const dy = topology.latitudes[neighbor] - topology.latitudes[cell];
    const distance2 = Math.max(0.000001, dx * dx + dy * dy);
    const delta = layer[neighbor] - layer[cell];
    gx += (delta * dx) / distance2;
    gy += (delta * dy) / distance2;
    count += 1;
  }
  return count ? { x: clamp(gx / count, -1, 1), y: clamp(gy / count, -1, 1) } : { x: 0, y: 0 };
}

function legacyStep(topology: CubedSphereTopology, cell: number, vectorX: number, vectorY: number): number {
  const length = Math.hypot(vectorX, vectorY);
  if (length < 0.0001) return cell;
  let best = cell;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let direction = 0; direction < 4; direction += 1) {
    const neighbor = topology.neighbors[cell * 4 + direction];
    if (neighbor < 0) continue;
    const dx = wrappedAngle(topology.longitudes[neighbor] - topology.longitudes[cell])
      * Math.max(0.12, Math.cos(topology.latitudes[cell]));
    const dy = topology.latitudes[neighbor] - topology.latitudes[cell];
    const distance = Math.max(0.000001, Math.hypot(dx, dy));
    const score = (dx / distance) * (vectorX / length) + (dy / distance) * (vectorY / length);
    if (score > bestScore) {
      best = neighbor;
      bestScore = score;
    }
  }
  return best;
}

function wrappedAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
'''
    )

    replace_once(
        "packages/generator-core/src/workflows.ts",
        "export type GenerationWorkflowDeepTimeFeatures = {\n  reusePresentClimateDerivedFields: boolean;\n  optimizeHydrologyTraversal: boolean;\n};",
        "export type GenerationWorkflowDeepTimeFeatures = {\n  reusePresentClimateDerivedFields: boolean;\n  optimizeHydrologyTraversal: boolean;\n  optimizePresentClimateTraversal: boolean;\n};"
    )
    replace_once(
        "packages/generator-core/src/workflows.ts",
        "    version: '0.1.0',\n    label: 'World Generation (Experimental)',\n    description: 'Development copy of the Detailed workflow reserved for further optimization and science-model experiments.',",
        "    version: '0.2.0',\n    label: 'World Generation (Experimental)',\n    description: 'Development workflow testing cached present-climate topology traversal while Detailed remains the comparison baseline.',"
    )
    replace_once(
        "packages/generator-core/src/workflows.ts",
        "  return {\n    reusePresentClimateDerivedFields,\n    optimizeHydrologyTraversal: optimizedWorkflow\n  };",
        "  return {\n    reusePresentClimateDerivedFields,\n    optimizeHydrologyTraversal: optimizedWorkflow,\n    optimizePresentClimateTraversal: workflowId === 'core.world-generation-experimental'\n  };"
    )

    write(
        "packages/generator-core/src/workflows.test.ts",
        r'''
import { describe, expect, it } from 'vitest';
import {
  defaultGenerationWorkflowId,
  generationWorkflowDeepTimeFeatures,
  generationWorkflowDescriptor
} from './workflows';

describe('generation workflow contracts', () => {
  it('keeps legacy and attribution controls off optimized traversal paths', () => {
    expect(generationWorkflowDeepTimeFeatures('core.live-world')).toEqual({
      reusePresentClimateDerivedFields: false,
      optimizeHydrologyTraversal: false,
      optimizePresentClimateTraversal: false
    });
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation-aging-control')).toEqual({
      reusePresentClimateDerivedFields: false,
      optimizeHydrologyTraversal: false,
      optimizePresentClimateTraversal: false
    });
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation-derived-control')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: false,
      optimizePresentClimateTraversal: false
    });
  });

  it('keeps Detailed as the production comparison baseline', () => {
    expect(defaultGenerationWorkflowId).toBe('core.performance-foundation');
    expect(generationWorkflowDeepTimeFeatures('core.performance-foundation')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true,
      optimizePresentClimateTraversal: false
    });
    expect(generationWorkflowDescriptor('core.performance-foundation')).toMatchObject({
      version: '1.0.0',
      label: 'World Generation (Detailed)',
      status: 'production',
      seedStrategy: 'semantic-node',
      selectableInGenerator: true
    });
  });

  it('retains Legacy as an explicit selectable rollback path', () => {
    expect(generationWorkflowDescriptor('core.live-world')).toMatchObject({
      label: 'World Generation (Legacy)',
      status: 'experimental',
      seedStrategy: 'legacy-shared',
      selectableInGenerator: true
    });
  });

  it('isolates present-climate traversal optimization to Experimental', () => {
    expect(generationWorkflowDeepTimeFeatures('core.world-generation-experimental')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true,
      optimizePresentClimateTraversal: true
    });
    expect(generationWorkflowDescriptor('core.world-generation-experimental')).toMatchObject({
      version: '0.2.0',
      label: 'World Generation (Experimental)',
      status: 'experimental',
      seedStrategy: 'semantic-node',
      selectableInGenerator: true
    });
  });

  it('defaults missing and unknown workflow ids to Detailed', () => {
    expect(generationWorkflowDescriptor(undefined).id).toBe('core.performance-foundation');
    expect(generationWorkflowDescriptor('unknown').id).toBe('core.performance-foundation');
    expect(generationWorkflowDeepTimeFeatures('unknown')).toEqual({
      reusePresentClimateDerivedFields: true,
      optimizeHydrologyTraversal: true,
      optimizePresentClimateTraversal: false
    });
  });
});
'''
    )

    write(
        "packages/generation-runtime/src/graph/generationWorkflows.ts",
        r'''
import {
  generationWorkflowDescriptor,
  generationWorkflowDescriptors,
  type GenerationWorkflowId
} from '@world-forge/generator-core/workflows';
import { coreGenerationGraph, type GenerationGraphNodeDefinition } from './generationGraph';

export type GenerationGraphWorkflow = {
  id: GenerationWorkflowId;
  version: string;
  label: string;
  description: string;
  status: 'production' | 'experimental';
  nodes: readonly GenerationGraphNodeDefinition[];
};

function copyGraph(nodes: readonly GenerationGraphNodeDefinition[]): GenerationGraphNodeDefinition[] {
  return nodes.map((node) => ({
    ...node,
    inputs: [...node.inputs],
    outputs: [...node.outputs],
    fidelity: [...node.fidelity]
  }));
}

function nodesForWorkflow(workflowId: GenerationWorkflowId): GenerationGraphNodeDefinition[] {
  const nodes = copyGraph(coreGenerationGraph);
  if (workflowId === 'core.performance-foundation-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.semantic-seed-control', version: '1-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation-aging-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.bounded-three-era-control', version: '2-control' }
      : node);
  }
  if (workflowId === 'core.performance-foundation-derived-control') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.bounded-three-era-derived-climate-control', version: '3-control' }
      : node);
  }
  if (workflowId === 'core.world-generation-experimental') {
    return nodes.map((node) => node.id === 'world.deep-time-aging'
      ? { ...node, implementationId: 'core.world.deep-time-aging.present-climate-traversal-v1', version: '4-experimental' }
      : node);
  }
  if (workflowId !== 'core.performance-foundation') return nodes;
  return nodes.map((node) => node.id === 'world.deep-time-aging'
    ? { ...node, implementationId: 'core.world.deep-time-aging.bounded-three-era-derived-climate-v1', version: '3' }
    : node);
}

export const generationGraphWorkflows: readonly GenerationGraphWorkflow[] = generationWorkflowDescriptors.map((workflow) => ({
  ...workflow,
  nodes: nodesForWorkflow(workflow.id)
}));

export function generationGraphWorkflow(id: string | undefined): GenerationGraphWorkflow {
  const descriptor = generationWorkflowDescriptor(id);
  return generationGraphWorkflows.find((workflow) => workflow.id === descriptor.id)!;
}
'''
    )

    write(
        "packages/generation-runtime/src/graph/generationWorkflows.test.ts",
        r'''
import { describe, expect, it } from 'vitest';
import { generationGraphWorkflow, generationGraphWorkflows } from './generationWorkflows';

describe('generation graph workflows', () => {
  it('keeps Detailed, Legacy, Experimental, and controls independent', () => {
    const detailed = generationGraphWorkflow('core.performance-foundation');
    const legacy = generationGraphWorkflow('core.live-world');
    const experimental = generationGraphWorkflow('core.world-generation-experimental');
    const agingControl = generationGraphWorkflow('core.performance-foundation-control');
    const boundedAgingControl = generationGraphWorkflow('core.performance-foundation-aging-control');
    const derivedControl = generationGraphWorkflow('core.performance-foundation-derived-control');

    expect(detailed.nodes).not.toBe(legacy.nodes);
    expect(detailed.nodes).not.toBe(experimental.nodes);
    expect(legacy.nodes).not.toBe(agingControl.nodes);
    expect(agingControl.nodes).not.toBe(boundedAgingControl.nodes);
    expect(boundedAgingControl.nodes).not.toBe(derivedControl.nodes);
    expect(derivedControl.nodes).not.toBe(detailed.nodes);
    expect(detailed.nodes.map((node) => node.id)).toEqual(experimental.nodes.map((node) => node.id));
    expect(legacy.nodes.map((node) => node.id)).toEqual(agingControl.nodes.map((node) => node.id));
    expect(agingControl.nodes.map((node) => node.id)).toEqual(boundedAgingControl.nodes.map((node) => node.id));
    expect(boundedAgingControl.nodes.map((node) => node.id)).toEqual(derivedControl.nodes.map((node) => node.id));
    expect(derivedControl.nodes.map((node) => node.id)).toEqual(detailed.nodes.map((node) => node.id));
    expect(detailed.status).toBe('production');
    expect(experimental.status).toBe('experimental');
  });

  it('isolates the Experimental present-climate implementation from Detailed', () => {
    const detailed = generationGraphWorkflow('core.performance-foundation');
    const experimental = generationGraphWorkflow('core.world-generation-experimental');
    const detailedById = new Map(detailed.nodes.map((node) => [node.id, node]));

    for (const node of experimental.nodes) {
      const baseline = detailedById.get(node.id);
      expect(baseline).toBeDefined();
      if (node.id === 'world.deep-time-aging') {
        expect(node.implementationId).toBe('core.world.deep-time-aging.present-climate-traversal-v1');
        expect(node.implementationId).not.toBe(baseline?.implementationId);
      } else {
        expect(node.implementationId).toBe(baseline?.implementationId);
      }
    }
  });

  it('isolates hydrology traversal from the derived-field control contract', () => {
    const control = generationGraphWorkflow('core.performance-foundation-derived-control');
    const candidate = generationGraphWorkflow('core.performance-foundation');
    const controlById = new Map(control.nodes.map((node) => [node.id, node]));
    for (const node of candidate.nodes) {
      const baseline = controlById.get(node.id);
      expect(baseline).toBeDefined();
      if (node.id === 'world.deep-time-aging') expect(node.implementationId).not.toBe(baseline?.implementationId);
      else expect(node.implementationId).toBe(baseline?.implementationId);
    }
  });

  it('falls back to Detailed for unknown IDs', () => {
    expect(generationGraphWorkflow('missing').id).toBe('core.performance-foundation');
    expect(generationGraphWorkflows.map((workflow) => workflow.id)).toEqual([
      'core.performance-foundation',
      'core.live-world',
      'core.world-generation-experimental',
      'core.performance-foundation-control',
      'core.performance-foundation-aging-control',
      'core.performance-foundation-derived-control'
    ]);
  });
});
'''
    )

    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "import { stableDescendingFloat32Indices, traceCachedDownstreamPath } from './hydrologyTraversal';\n",
        "import { stableDescendingFloat32Indices, traceCachedDownstreamPath } from './hydrologyTraversal';\nimport {\n  buildTopologyDirectionGeometry,\n  stepTopologyByVectorWithGeometry,\n  topologyTerrainGradientWithGeometry,\n  type TopologyDirectionGeometry\n} from './presentClimateTraversal';\n"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "function presentDayWindVector(topology: CubedSphereTopology, elevation: Float32Array, temperature: Float32Array, cell: number, averageTemperatureC: number): { x: number; y: number } {",
        "function presentDayWindVector(\n  topology: CubedSphereTopology,\n  elevation: Float32Array,\n  temperature: Float32Array,\n  cell: number,\n  averageTemperatureC: number,\n  terrainGradient?: { x: number; y: number }\n): { x: number; y: number } {"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "  const gradient = topologyTerrainGradient(elevation, topology, cell);\n  const highlandBlock = clamp((elevation[cell] - 0.22) * 2.2, 0, 1);",
        "  const gradient = terrainGradient ?? topologyTerrainGradient(elevation, topology, cell);\n  const highlandBlock = clamp((elevation[cell] - 0.22) * 2.2, 0, 1);"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "  windY: number,\n  oceanInfluence: number\n): number {",
        "  windY: number,\n  oceanInfluence: number,\n  geometry?: TopologyDirectionGeometry\n): number {"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "    cursor = stepTopologyByVector(topology, cursor, -windX, -windY);\n    const decay = 1 - step / 19;",
        "    cursor = geometry\n      ? stepTopologyByVectorWithGeometry(topology, geometry, cursor, -windX, -windY)\n      : stepTopologyByVector(topology, cursor, -windX, -windY);\n    const decay = 1 - step / 19;"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "  cell: number,\n  windX: number,\n  windY: number\n): { lift: number; shadow: number } {\n  const gradient = topologyTerrainGradient(elevation, topology, cell);",
        "  cell: number,\n  windX: number,\n  windY: number,\n  terrainGradient?: { x: number; y: number },\n  geometry?: TopologyDirectionGeometry\n): { lift: number; shadow: number } {\n  const gradient = terrainGradient ?? topologyTerrainGradient(elevation, topology, cell);"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "    cursor = stepTopologyByVector(topology, cursor, -windX, -windY);\n    const barrier = Math.max(0, elevation[cursor] - elevation[cell] + 0.06) + Math.max(0, elevation[cursor] - 0.36) * 0.48;",
        "    cursor = geometry\n      ? stepTopologyByVectorWithGeometry(topology, geometry, cursor, -windX, -windY)\n      : stepTopologyByVector(topology, cursor, -windX, -windY);\n    const barrier = Math.max(0, elevation[cursor] - elevation[cell] + 0.06) + Math.max(0, elevation[cursor] - 0.36) * 0.48;"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "function refreshTopologyClimate(\n  project: DeepTimeProject,\n  topology: CubedSphereTopology,\n  captureDerivedFields = false\n): PresentClimateRefresh {",
        "function refreshTopologyClimate(\n  project: DeepTimeProject,\n  topology: CubedSphereTopology,\n  captureDerivedFields = false,\n  optimizeTraversal = false\n): PresentClimateRefresh {"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "  const count = topology.cellCount;\n  const oceanInfluenceSet = captureDerivedFields",
        "  const count = topology.cellCount;\n  const topologyGeometry = optimizeTraversal ? buildTopologyDirectionGeometry(topology) : undefined;\n  const oceanInfluenceSet = captureDerivedFields"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "    const wind = presentDayWindVector(topology, layers.elevation, layers.temperature, cell, world.averageTemperatureC);\n    const fetch = presentDayMoistureFetch(layers.elevation, layers.water, topology, cell, wind.x, wind.y, oceanInfluence[cell]);\n    const orographic = presentDayOrographicEffect(layers.elevation, topology, cell, wind.x, wind.y);",
        "    let fetch: number;\n    let orographic: { lift: number; shadow: number };\n    if (topologyGeometry && ocean) {\n      fetch = 1;\n      orographic = { lift: 0, shadow: 0 };\n    } else {\n      const terrainGradient = topologyGeometry\n        ? topologyTerrainGradientWithGeometry(layers.elevation, topology, topologyGeometry, cell)\n        : undefined;\n      const wind = presentDayWindVector(\n        topology,\n        layers.elevation,\n        layers.temperature,\n        cell,\n        world.averageTemperatureC,\n        terrainGradient\n      );\n      fetch = presentDayMoistureFetch(\n        layers.elevation,\n        layers.water,\n        topology,\n        cell,\n        wind.x,\n        wind.y,\n        oceanInfluence[cell],\n        topologyGeometry\n      );\n      orographic = presentDayOrographicEffect(\n        layers.elevation,\n        topology,\n        cell,\n        wind.x,\n        wind.y,\n        terrainGradient,\n        topologyGeometry\n      );\n    }"
    )
    replace_once(
        "packages/generator-core/src/deepTimePipeline.ts",
        "  const climateRefresh = refreshTopologyClimate(mutable, topology, workflowFeatures.reusePresentClimateDerivedFields);",
        "  const climateRefresh = refreshTopologyClimate(\n    mutable,\n    topology,\n    workflowFeatures.reusePresentClimateDerivedFields,\n    workflowFeatures.optimizePresentClimateTraversal\n  );"
    )


def evidence() -> None:
    generated = sorted((ROOT / "refs/testing").glob("generation-workflow-comparison-*.json"))
    if not generated:
        raise RuntimeError("No workflow comparison report was generated")
    source_path = generated[-1]
    report = json.loads(source_path.read_text(encoding="utf-8"))
    baseline_id = "core.performance-foundation"
    candidate_id = "core.world-generation-experimental"
    by_pair: dict[str, dict[str, dict]] = {}
    for result in report["results"]:
        by_pair.setdefault(result["pairId"], {})[result["workflowId"]] = result

    comparisons = []
    for pair_id, pair in sorted(by_pair.items()):
        baseline = pair[baseline_id]
        candidate = pair[candidate_id]
        baseline_climate = next(stage for stage in baseline["deepTime"]["substages"] if stage["id"] == "climate-rebuild")["elapsedMs"]
        candidate_climate = next(stage for stage in candidate["deepTime"]["substages"] if stage["id"] == "climate-rebuild")["elapsedMs"]
        comparisons.append({
            "pairId": pair_id,
            "scenarioId": baseline["scenarioId"],
            "seed": baseline["seed"],
            "authoritativeSignaturesEqual": baseline["authoritativeSignature"] == candidate["authoritativeSignature"],
            "coarseSignaturesEqual": baseline["outputSignature"] == candidate["outputSignature"],
            "metricsEqual": baseline["metrics"] == candidate["metrics"],
            "baselineTotalMs": baseline["reportedTotalMs"],
            "candidateTotalMs": candidate["reportedTotalMs"],
            "totalReductionPercent": percent_reduction(baseline["reportedTotalMs"], candidate["reportedTotalMs"]),
            "baselineDeepTimeMs": baseline["deepTime"]["reportedDeepTimeMs"],
            "candidateDeepTimeMs": candidate["deepTime"]["reportedDeepTimeMs"],
            "deepTimeReductionPercent": percent_reduction(baseline["deepTime"]["reportedDeepTimeMs"], candidate["deepTime"]["reportedDeepTimeMs"]),
            "baselineClimateMs": baseline_climate,
            "candidateClimateMs": candidate_climate,
            "climateReductionPercent": percent_reduction(baseline_climate, candidate_climate),
            "baselineRssAfterMb": baseline["memoryAfter"]["rssMb"],
            "candidateRssAfterMb": candidate["memoryAfter"]["rssMb"]
        })

    if len(comparisons) != 9:
        raise RuntimeError(f"Expected 9 comparisons, found {len(comparisons)}")
    if not all(row["authoritativeSignaturesEqual"] and row["coarseSignaturesEqual"] and row["metricsEqual"] for row in comparisons):
        raise RuntimeError("Experimental output diverged from Detailed")

    climate_mean = mean(row["climateReductionPercent"] for row in comparisons)
    deep_time_mean = mean(row["deepTimeReductionPercent"] for row in comparisons)
    total_mean = mean(row["totalReductionPercent"] for row in comparisons)
    if climate_mean < 35:
        raise RuntimeError(f"Climate rebuild improvement was too small: {climate_mean:.2f}%")
    if total_mean < 5:
        raise RuntimeError(f"Total generation improvement was too small: {total_mean:.2f}%")
    if not all(row["candidateClimateMs"] < row["baselineClimateMs"] for row in comparisons):
        raise RuntimeError("At least one climate-rebuild comparison regressed")

    baseline_max_rss = max(row["baselineRssAfterMb"] for row in comparisons)
    candidate_max_rss = max(row["candidateRssAfterMb"] for row in comparisons)
    if candidate_max_rss > baseline_max_rss * 1.25:
        raise RuntimeError("Sequential post-run RSS exceeded the PI guardrail")

    summary = {
        "format": "world-forge-present-climate-traversal-summary",
        "version": 1,
        "sourceCommit": report["environment"]["sourceCommit"],
        "baselineWorkflow": baseline_id,
        "candidateWorkflow": candidate_id,
        "pairCount": len(comparisons),
        "allAuthoritativeSignaturesEqual": True,
        "allCoarseSignaturesEqual": True,
        "allMetricsEqual": True,
        "meanClimateRebuildReductionPercent": round(climate_mean, 2),
        "meanDeepTimeReductionPercent": round(deep_time_mean, 2),
        "meanTotalGenerationReductionPercent": round(total_mean, 2),
        "minimumClimateRebuildReductionPercent": round(min(row["climateReductionPercent"] for row in comparisons), 2),
        "maximumClimateRebuildReductionPercent": round(max(row["climateReductionPercent"] for row in comparisons), 2),
        "baselineMaximumPostRunRssMb": baseline_max_rss,
        "candidateMaximumPostRunRssMb": candidate_max_rss,
        "memoryCaveat": "Sequential before/after process RSS is not peak stage memory.",
        "comparisons": comparisons
    }

    durable_json = ROOT / "refs/testing/present-climate-topology-traversal-benchmark.json"
    durable_summary = ROOT / "refs/testing/present-climate-topology-traversal-summary.json"
    durable_markdown = ROOT / "refs/testing/present-climate-topology-traversal-benchmark.md"
    durable_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    durable_summary.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    durable_markdown.write_text(render_markdown(summary), encoding="utf-8")

    for path in generated:
        path.unlink()
    for path in (ROOT / "refs/testing").glob("generation-workflow-comparison-*.md"):
        path.unlink()

    planning = ROOT / "refs/planning/pi-generation-performance-foundation.md"
    text = planning.read_text(encoding="utf-8")
    marker = "## Experimental present-climate traversal optimization"
    section = f'''\n\n{marker}\n\nImplemented on `dev` for `core.world-generation-experimental` only. Detailed remains the production comparison baseline.\n\n- marine cells bypass wind, moisture-fetch, and orographic traversal that cannot affect authoritative ocean precipitation or moisture;\n- land cells reuse one exact topology-direction geometry cache;\n- wind deflection and orographic lift reuse the same exact terrain gradient;\n- all nine Detailed/Experimental pairs retained identical coarse signatures, authoritative signatures, and metric objects;\n- mean climate-rebuild reduction: **{climate_mean:.2f}%**;\n- mean deep-time reduction: **{deep_time_mean:.2f}%**;\n- mean total-generation reduction: **{total_mean:.2f}%**;\n- sequential post-run RSS remained within the PI guardrail, but does not establish peak-memory equivalence.\n\nEvidence:\n\n- `refs/testing/present-climate-topology-traversal-benchmark.json`\n- `refs/testing/present-climate-topology-traversal-benchmark.md`\n- `refs/testing/present-climate-topology-traversal-summary.json`\n'''
    if marker in text:
        text = text[:text.index(marker)].rstrip() + section
    else:
        text = text.rstrip() + section
    planning.write_text(text.rstrip() + "\n", encoding="utf-8")


def percent_reduction(baseline: float, candidate: float) -> float:
    return round(((baseline - candidate) / max(0.001, baseline)) * 100, 4)


def render_markdown(summary: dict) -> str:
    lines = [
        "# Present-climate topology traversal benchmark",
        "",
        f"- Source commit: `{summary['sourceCommit']}`",
        f"- Baseline: `{summary['baselineWorkflow']}`",
        f"- Candidate: `{summary['candidateWorkflow']}`",
        f"- Matched pairs: {summary['pairCount']}",
        "- Coarse signatures: 9/9 identical",
        "- Authoritative signatures: 9/9 identical",
        "- Metric objects: 9/9 identical",
        f"- Mean climate-rebuild reduction: **{summary['meanClimateRebuildReductionPercent']:.2f}%**",
        f"- Mean deep-time reduction: **{summary['meanDeepTimeReductionPercent']:.2f}%**",
        f"- Mean total-generation reduction: **{summary['meanTotalGenerationReductionPercent']:.2f}%**",
        f"- Climate-rebuild range: {summary['minimumClimateRebuildReductionPercent']:.2f}% to {summary['maximumClimateRebuildReductionPercent']:.2f}%",
        f"- Maximum post-run RSS: baseline {summary['baselineMaximumPostRunRssMb']:.1f} MB; candidate {summary['candidateMaximumPostRunRssMb']:.1f} MB",
        "",
        "The RSS reading is sequential process RSS before and after each run, not a peak-stage memory measurement.",
        "",
        "## Pair results",
        "",
        "| Scenario | Seed | Climate reduction | Deep-time reduction | Total reduction |",
        "| --- | ---: | ---: | ---: | ---: |"
    ]
    for row in summary["comparisons"]:
        lines.append(
            f"| {row['scenarioId']} | {row['seed']} | {row['climateReductionPercent']:.2f}% | "
            f"{row['deepTimeReductionPercent']:.2f}% | {row['totalReductionPercent']:.2f}% |"
        )
    lines.extend([
        "",
        "## Implementation boundary",
        "",
        "Only `core.world-generation-experimental` enables the traversal optimization. Detailed, Legacy, and developer controls retain their existing paths. Rollback is workflow selection or reverting the isolated feature flag and helper module.",
        ""
    ])
    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"apply", "evidence"}:
        raise SystemExit("usage: automation-issue-14-experimental-climate.py apply|evidence")
    if sys.argv[1] == "apply":
        apply()
    else:
        evidence()
