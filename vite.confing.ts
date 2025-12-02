import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // This ensures the app works correctly on GitHub Pages subpaths
  base: './',
  define: {
    // This injects the secret from GitHub Actions into the code during build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
