import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 'base' must be './' for GitHub Pages to find assets correctly
  base: './',
  build: {
    outDir: 'dist',
  },
  define: {
    // Defines process.env.API_KEY globally for the code to use
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Fallback for other process calls if any lib uses them
    'process.env': {}
  }
});
