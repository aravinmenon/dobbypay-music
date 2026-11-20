import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/freetouse-api': {
        target: 'https://api.freetouse.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/freetouse-api/, ''),
      },
      '/itunes-api': {
        target: 'https://itunes.apple.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/itunes-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      '/infinityfree-api': {
        target: 'https://dobbypay.infinityfreeapp.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/infinityfree-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      '/production-api': {
        target: 'https://dobbypay.rf.gd/backend/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/production-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      '/dobbhypay': {
        target: 'http://localhost:40',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
