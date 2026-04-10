import { defineConfig } from 'vite';
import path from 'path';
import { execSync } from 'child_process';

export default defineConfig(({ mode }) => {
  // Resolve the config file: mode maps to src/configs/<mode>.js
  // Tests use 'test' mode which Vitest sets automatically — fall back to 'default'
  const configMode = mode === 'test' ? 'default' : (mode || 'default');
  const configFile = path.resolve(__dirname, `src/configs/${configMode}.js`);

  // Build metadata for reproducibility
  let gitTag = 'unknown';
  try {
    gitTag = execSync('git describe --tags --always --dirty', { encoding: 'utf-8' }).trim();
  } catch {
    // not a git repo or no tags — leave as 'unknown'
  }

  return {
    server: { port: 3000, open: true },
    build: {
      sourcemap: true,
      outDir: `dist/${configMode}`,
    },
    resolve: {
      alias: {
        '@experiment-config': configFile,
      },
    },
    define: {
      __GIT_TAG__: JSON.stringify(gitTag),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __EXPERIMENT_MODE__: JSON.stringify(configMode),
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.js'],
    },
  };
});
