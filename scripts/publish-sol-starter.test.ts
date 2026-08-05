import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parchmentCandidateRoots } from './publish-sol-starter';

describe('Sol starter publisher', () => {
  it('prefers an explicit Parchment checkout and retains sibling discovery', () => {
    const worldForgeRoot = path.resolve('/workspace/World-Forge');
    const candidates = parchmentCandidateRoots(worldForgeRoot, {
      PARCHMENT_WORLDS_LOCAL_PATH: '../Parchment-Override',
    });

    expect(candidates[0]).toBe(path.resolve('/workspace/Parchment-Override'));
    expect(candidates).toContain(path.resolve('/workspace/Parchment-Worlds'));
    expect(candidates).toContain(path.resolve('/workspace/parchment-worlds'));
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it('deduplicates an override that resolves to a normal sibling candidate', () => {
    const worldForgeRoot = path.resolve('/workspace/World-Forge');
    const candidates = parchmentCandidateRoots(worldForgeRoot, {
      PARCHMENT_WORLDS_LOCAL_PATH: '../Parchment-Worlds',
    });
    const expected = path.resolve('/workspace/Parchment-Worlds');

    expect(candidates.filter((candidate) => candidate === expected)).toHaveLength(1);
  });
});
