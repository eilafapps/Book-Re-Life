import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configure Vite to recognize shared folders outside frontend/src
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, '../components'),
      '@ui': path.resolve(__dirname, '../components/ui'),
      '@types': path.resolve(__dirname, '../types.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
