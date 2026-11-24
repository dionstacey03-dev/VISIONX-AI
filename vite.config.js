import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'ml-runtime',
              test: /node_modules/,
              minSize: 100_000,
              maxSize: 450_000,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
