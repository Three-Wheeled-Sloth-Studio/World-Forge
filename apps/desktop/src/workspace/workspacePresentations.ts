import type { MapMode } from '@world-forge/renderer';

export const worldPresentationOptions = [
  { value: 'data', label: 'Data', mapOnly: false },
  { value: 'natural', label: 'Natural', mapOnly: false },
  { value: 'ttrpg', label: 'TTRPG', mapOnly: true },
] as const;

export function isTtrpgWorldPresentation(renderMode: string): boolean {
  return renderMode === 'ttrpg';
}

export function supportsTtrpgWorldPresentation(viewMode: 'map' | 'globe' | 'system', mapMode: MapMode): boolean {
  return viewMode === 'map' && mapMode === 'biomes';
}
