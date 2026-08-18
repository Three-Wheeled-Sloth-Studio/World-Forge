import { describe, expect, it } from 'vitest';
import { globeTextureResolutionForSource } from './globeTextureResolution';

describe('globeTextureResolutionForSource', () => {
  it('preserves the Ultra Earth source resolution when the device supports it', () => {
    expect(globeTextureResolutionForSource({ width: 4096, height: 2048 }, 8192)).toEqual({
      width: 4096,
      height: 2048,
    });
  });

  it('scales proportionally when the device texture limit is lower than the source', () => {
    expect(globeTextureResolutionForSource({ width: 4096, height: 2048 }, 2048)).toEqual({
      width: 2048,
      height: 1024,
    });
  });

  it('does not upscale ordinary generated worlds', () => {
    expect(globeTextureResolutionForSource({ width: 512, height: 256 }, 8192)).toEqual({
      width: 512,
      height: 256,
    });
  });
});
