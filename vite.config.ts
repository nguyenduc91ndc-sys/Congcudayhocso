import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // base: '/Congcudayhocso/', // Uncomment for GitHub Pages
    server: {
      port: 5173,
      host: '0.0.0.0',
      fs: {
        // Allow serving files from the public folder directly
        strict: false,
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          'giai-ma-buc-tranh': path.resolve(__dirname, 'giải-mã-bức-tranh/index.html'),
          'vong-quay-may-man': path.resolve(__dirname, 'vòng-quay-may-mắn/index.html'),
        },
      },
    },
  };
});
