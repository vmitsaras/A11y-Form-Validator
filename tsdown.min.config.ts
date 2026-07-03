import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    'index.min': './src/index.ts'
  },
  format: ['esm'],
  dts: false,
  clean: false,
  sourcemap: true,
  target: 'es2022',
  platform: 'browser',
  outDir: 'dist',
  minify: true
});
