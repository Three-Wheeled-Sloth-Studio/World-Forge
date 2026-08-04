import type { Object3D } from 'three';
import type { WorldProject } from '@world-forge/shared';
import { worldBodyRecord } from '@world-forge/shared/worldBodies';
import {
  createAtmosphericBodyPresentation,
  type AtmosphericPresentationMaterialMode,
} from '../presentation/atmosphericBodyPresentation';
import type { SystemCatalogEntry } from './systemPresentation';

export type ReferenceSystemBodyPresentation = {
  object: Object3D;
  materialMode: AtmosphericPresentationMaterialMode;
};

export function createReferenceSystemBodyPresentation(
  project: WorldProject,
  entry: SystemCatalogEntry,
  displaySize: number,
): ReferenceSystemBodyPresentation | null {
  const record = worldBodyRecord(project, entry.id);
  if (record?.detail?.kind !== 'atmospheric-presentation') return null;
  const presentation = createAtmosphericBodyPresentation(
    project,
    record.detail,
    displaySize,
    entry.id,
    'system',
  );
  return {
    object: presentation.object,
    materialMode: presentation.materialMode,
  };
}
