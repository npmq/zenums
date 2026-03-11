import { defineConfig } from 'tsup'

export default defineConfig({
  tsconfig: 'tsconfig.build.json',

  entry: {
    index: 'src/index.ts',
    zod: 'src/integrations/zod.ts',
  },

  format: ['cjs', 'esm'],
  target: 'es2022',
  platform: 'neutral',

  dts: true,
  clean: true,
  sourcemap: false,
  minify: false,

  outDir: 'dist',
  splitting: false,
  treeshake: true,

  // Contract: keep optional peer deps external (no bundling into dist)
  external: ['zod'],

  shims: false,
  skipNodeModulesBundle: true,

  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    }
  },
})
