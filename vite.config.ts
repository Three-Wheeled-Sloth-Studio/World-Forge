import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const defaultPublicEnv: Record<string, string> = {
  VITE_WORLD_FORGE_SERVICE_URL: ''
};

for (const [name, value] of Object.entries(defaultPublicEnv)) {
  process.env[name] ||= value;
}

export default defineConfig({
  base: './',
  plugins: [react()],
  root: 'apps/desktop',
  envDir: __dirname,
  publicDir: '../../public',
  resolve: {
    alias: {
      '@world-forge/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@world-forge/validation-core': path.resolve(__dirname, 'packages/validation-core/src'),
      '@world-forge/generator-core': path.resolve(__dirname, 'packages/generator-core/src'),
      '@world-forge/generation-runtime': path.resolve(__dirname, 'packages/generation-runtime/src'),
      '@world-forge/renderer': path.resolve(__dirname, 'packages/renderer/src/bodyAwarePresentation.ts'),
      '@world-forge/exporters': path.resolve(__dirname, 'packages/exporters/src/desktop.ts')
    }
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  test: {
    environment: 'node',
    include: ['../../packages/**/*.test.ts', '../../scripts/**/*.test.ts', 'src/**/*.test.ts'],
    // Correctness tests exercise full deterministic generation and can contend with
    // other generator-heavy files on local Windows runners. Performance regressions
    // are owned by the dedicated profiling and production-attribution harnesses.
    testTimeout: 15_000
  }
});
