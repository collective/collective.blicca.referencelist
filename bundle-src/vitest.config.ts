// `@plone/registry` and `@plone/helpers` are installed for real at the
// versions the host provides; `test/upstream-registry.ts` runs Aurora's own
// installers so every assertion is about Aurora, not about a stub. jsdom,
// because the widgets, the edit and the view are mounted.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
