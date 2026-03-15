import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    target: 'es2020',
    commonjsOptions: { transformMixedEsModules: true },
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
});
