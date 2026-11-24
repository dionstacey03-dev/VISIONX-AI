import { defineConfig } from 'vite';

// Keep TensorFlow.js and its backend registration modules in Vite's native
// chunk graph. Custom vendor chunk grouping can break TFJS' side-effect-based
// backend registration and produce runtime errors such as "z is not a function".
export default defineConfig({
  build: {
    sourcemap: true,
  },
});
