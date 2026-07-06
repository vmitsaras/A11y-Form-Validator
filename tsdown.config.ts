import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    docs: './src/docs.ts',
    'addons/error-summary': './src/addons/error-summary.ts',
    'addons/character-count': './src/addons/character-count.ts',
    'presets/default': './src/presets/default.ts',
    'presets/no-summary': './src/presets/no-summary.ts',
    'presets/minimal': './src/presets/minimal.ts'
  },
  format: ['esm'],
  dts: true,
  clean: false,
  hash: false,
  sourcemap: true,
  target: 'es2022',
  platform: 'neutral',
  outDir: 'dist',
  minify: false
});
