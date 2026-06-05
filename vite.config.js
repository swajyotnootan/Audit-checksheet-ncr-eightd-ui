import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, 'env');
  const env = loadEnv(mode, envDir, 'VITE_');

  return {
    plugins: [react()],
    base: '/', // Important for Vercel
    envDir,
    
    server: {
      proxy: {
        '/api': {
          target: (env.VITE_API_BASE_URL || 'https://qsutrarmsclm.hub.swajyot.co.in:8476').trim(),
          changeOrigin: true,
          secure: false,
        }
      }
    },
    
    preview: {
      proxy: {
        '/api': {
          target: (env.VITE_API_BASE_URL || 'https://qsutrarmsclm.hub.swajyot.co.in:8476').trim(),
          changeOrigin: true,
          secure: false,
        }
      }
    },
    
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        }
      },
      chunkSizeWarningLimit: 1000
    }
  };
});