import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('maintained Sol reference command', () => {
  it('owns Mars preparation and the full source-to-package pipeline behind one command', () => {
    const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const packageFile = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const command = packageFile.scripts?.['reference:build-sol'];

    expect(command).toBe(
      'npm run reference:prepare-mars && npm run reference:pipeline-sol -- --body-input .local/reference-data/mars-mola-viking',
    );
  });
});
