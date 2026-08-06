import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const ignoredDirectories = new Set([
  '.git',
  '.local',
  'dist',
  'node_modules',
]);

export function findCaseCollisions(filePaths) {
  const pathsByFoldedName = new Map();
  for (const filePath of filePaths) {
    const normalized = String(filePath)
      .replaceAll('\\', '/')
      .replace(/^\.\//, '')
      .normalize('NFC');
    if (!normalized) continue;
    const folded = normalized.toLowerCase();
    const entries = pathsByFoldedName.get(folded) ?? new Set();
    entries.add(normalized);
    pathsByFoldedName.set(folded, entries);
  }

  return [...pathsByFoldedName.values()]
    .map((entries) => [...entries].sort())
    .filter((entries) => entries.length > 1)
    .sort((left, right) => left[0].localeCompare(right[0]));
}

export function repositoryFilePaths(root = repositoryRoot) {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output.split('\0').filter(Boolean);
  } catch {
    return walkFiles(root);
  }
}

export function assertNoCaseCollisions(filePaths) {
  const collisions = findCaseCollisions(filePaths);
  if (collisions.length === 0) return;

  const details = collisions
    .map((entries) => entries.map((entry) => `  - ${entry}`).join('\n'))
    .join('\n\n');
  throw new Error([
    'Case-insensitive repository path collision detected.',
    'Windows treats each group below as the same path even though Linux does not:',
    '',
    details,
    '',
    'Rename files so their complete paths differ by more than capitalization.',
    'For case-only renames, use a temporary intermediate name with `git mv`.',
  ].join('\n'));
}

function walkFiles(root) {
  const output = [];
  const visit = (directory, relativeDirectory = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath, relativePath);
      else if (entry.isFile()) output.push(relativePath);
    }
  };
  visit(root);
  return output;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  try {
    assertNoCaseCollisions(repositoryFilePaths());
    console.log('Repository paths are case-collision free.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
