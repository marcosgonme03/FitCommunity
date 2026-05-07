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
  // ─────────────────────────────────────────────────────────────────────────
  // Pre-bundling de dependencias pesadas para acelerar el cold-start de Vite
  // (en dev) y reducir el primer paint. Listamos todo lo que se importa muy
  // pronto en la app para que esbuild lo procese una sola vez.
  // ─────────────────────────────────────────────────────────────────────────
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
    // Sourcemaps fuera en producción → bundles más pequeños y carga más rápida
    sourcemap: false,
    // Subimos el límite del warning para no spamear logs (los chunks vendor son grandes)
    chunkSizeWarningLimit: 1024,
    // Minificación con esbuild: ~20× más rápida que terser y comparable en tamaño
    minify: 'esbuild',
    // Target moderno → menos polyfills, JS más pequeño
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Manual chunking: separamos vendors estables del código de la app.
        // Los chunks vendor cambian poco entre deploys → caché del navegador
        // se reutiliza, las páginas posteriores cargan en milisegundos.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-dom') ||
              id.includes('scheduler') ||
              id.match(/[\\/]react[\\/]/)
            ) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('zod')
            ) {
              return 'vendor-forms';
            }
            if (id.includes('axios')) return 'vendor-http';
            if (id.includes('zustand')) return 'vendor-state';
            // Resto de dependencias → un único bundle vendor
            return 'vendor';
          }
        },
      },
    },
  },
});
