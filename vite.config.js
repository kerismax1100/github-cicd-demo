import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the site works at https://<user>.github.io/<repo>/
  base: './',
  test: {
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/todo.js'],
      reporter: ['text', 'html'],
      thresholds: { lines: 90, functions: 90 },
    },
  },
});
