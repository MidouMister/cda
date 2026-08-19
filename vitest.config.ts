import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [...configDefaults.exclude, 'out/**', 'dist/**'],
  },
})
