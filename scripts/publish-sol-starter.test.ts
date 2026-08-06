import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parchmentCandidateRoots,
  parchmentChildEnvironment,
} from './publish-sol-starter';

describe('Sol starter publisher', () => {
  it('prefers an explicit Parchment checkout and retains sibling discovery', () => {
    const worldForgeRoot = path.resolve('/workspace/World-Forge');
    const candidates = parchmentCandidateRoots(worldForgeRoot, {
      PARCHMENT_WORLDS_LOCAL_PATH: '../Parchment-Override',
    }, 'linux');

    expect(candidates[0]).toBe(path.resolve('/workspace/Parchment-Override'));
    expect(candidates).toContain(path.resolve('/workspace/Parchment-Worlds'));
    expect(candidates).toContain(path.resolve('/workspace/parchment-worlds'));
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it('collapses case-only sibling variants under Windows path semantics', () => {
    const worldForgeRoot = path.resolve('/workspace/World-Forge');
    const candidates = parchmentCandidateRoots(worldForgeRoot, {}, 'win32');

    expect(candidates).toEqual([path.resolve('/workspace/Parchment-Worlds')]);
  });

  it('deduplicates an override that resolves to a normal sibling candidate', () => {
    const worldForgeRoot = path.resolve('/workspace/World-Forge');
    const candidates = parchmentCandidateRoots(worldForgeRoot, {
      PARCHMENT_WORLDS_LOCAL_PATH: '../Parchment-Worlds',
    }, 'linux');
    const expected = path.resolve('/workspace/Parchment-Worlds');

    expect(candidates.filter((candidate) => candidate === expected)).toHaveLength(1);
  });

  it('does not leak the World Forge tsx config into the Parchment process', () => {
    const source = {
      PATH: 'test-path',
      npm_execpath: 'npm-cli.js',
      TSX_TSCONFIG_PATH: 'tsconfig.scripts.json',
    };

    const child = parchmentChildEnvironment(source);

    expect(child).toEqual({
      PATH: 'test-path',
      npm_execpath: 'npm-cli.js',
    });
    expect(source.TSX_TSCONFIG_PATH).toBe('tsconfig.scripts.json');
  });
});
