import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Resolve the config file: mode maps to src/configs/<mode>.js
  // Vite's built-in modes ('development', 'production') and Vitest's 'test' all map to 'default'
  const VITE_BUILTIN_MODES = new Set(['development', 'production', 'test']);
  const configMode = VITE_BUILTIN_MODES.has(mode) ? 'default' : (mode || 'default');
  const configFile = path.resolve(__dirname, `src/configs/${configMode}.js`);

  if (!fs.existsSync(configFile)) {
    const available = fs.readdirSync(path.resolve(__dirname, 'src/configs'))
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace(/\.js$/, ''));
    throw new Error(
      `No config found for mode "${configMode}" (expected ${configFile}).\n` +
      `Available configs: ${available.join(', ')}\n` +
      `Use --mode <name> with one of the above, or create src/configs/${configMode}.js.`
    );
  }

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
