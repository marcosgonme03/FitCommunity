import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // Pre-bundling de dependencias pesadas para acelerar el cold-start de Vite
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'zustand',
      'axios',
      'react-hook-form',
      'zod',
      '@hookform/resolvers/zod',
    ],
  },
  build: {
    sourcemap: false,
    // Chunks separados para mejor caching y carga incremental
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Iconos
            if (id.includes('lucide-react')) return 'icons';
            // Forms / validación
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
              return 'forms';
            }
            // Resto de vendor
            return 'vendor';
          }
        },
      },
    },
  },
});
