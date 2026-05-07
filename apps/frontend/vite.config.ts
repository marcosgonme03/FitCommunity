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
    // ─────────────────────────────────────────────────────────────────────
    // NOTA SOBRE manualChunks: dejamos que Vite/Rollup decida el chunking
    // automático. Antes intentábamos partir React, router, lucide, etc. en
    // chunks separados, pero eso provocaba un error de "useState is undefined"
    // en producción cuando un chunk dependiente cargaba antes que el chunk
    // de React por timing. El auto-chunking respeta el grafo de imports y
    // es seguro a costa de tener un único `vendor` algo más grande — la
    // diferencia de tamaño es imperceptible una vez gzipeado.
    // ─────────────────────────────────────────────────────────────────────
  },
});
