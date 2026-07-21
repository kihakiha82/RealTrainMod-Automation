import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 開発時は `npm start`(ルート側)で立てたAPIサーバーにプロキシする
    proxy: {
      '/api': 'http://localhost:4500',
      '/images': 'http://localhost:4500',
    },
  },
  define: {
    'process.env': {},
  },
  build: {
    outDir: 'dist',
  },
});