import { defineConfig } from 'vite';

export default defineConfig({
  base: '/nhan-xet-tt27/',
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    target: 'es2020',
    outDir: '../../public/nhan-xet-tt27',
    emptyOutDir: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
});
