import { describe, expect, it } from 'vitest';

import { isLegacyGeographicMapLayer } from './geographicAtlasLayerVisibility';

describe('geographic atlas legacy layer visibility', () => {
  it('classifies direct legacy canvases and map markers for suppression', () => {
    expect(isLegacyGeographicMapLayer('canvas', [])).toBe(true);
    expect(isLegacyGeographicMapLayer('DIV', ['hex-overlay-canvas'])).toBe(true);
    expect(isLegacyGeographicMapLayer('div', ['inspection-map-marker'])).toBe(true);
    expect(isLegacyGeographicMapLayer('div', ['hex-inspection-marker'])).toBe(true);
    expect(isLegacyGeographicMapLayer('div', ['highest-point-map-marker'])).toBe(true);
  });

  it('does not classify the atlas workspace or ordinary overlays as legacy map layers', () => {
    expect(isLegacyGeographicMapLayer('div', ['geographic-drilldown-surface'])).toBe(false);
    expect(isLegacyGeographicMapLayer('div', ['geographic-scene-layer'])).toBe(false);
    expect(isLegacyGeographicMapLayer('aside', ['geographic-atlas-compact-inspector'])).toBe(false);
  });
});
