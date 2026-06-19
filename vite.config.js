// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, 'env');
  const env = loadEnv(mode, envDir, 'VITE_');

  // Clean the URL (remove any trailing whitespace/newlines)
  const apiTarget = (env.VITE_API_BASE_URL || 'https://internalaudit.hub.swajyot.co.in:8090').trim();

  return {
    plugins: [react()],
    envDir,
    
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''), // Optional: removes /api prefix if your backend doesn't expect it
        }
      }
    },
    
    // ✅ FIXED: preview proxy (Vite 4+ supports this)
    preview: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
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
      chunkSizeWarningLimit: 1000,
      // Optional: Add sourcemap for debugging
      sourcemap: mode === 'development',
    },
    
    // Optional: Resolve aliases for cleaner imports
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
      }
    }
  };
});