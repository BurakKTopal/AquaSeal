import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Get API URL from environment variable
  // In production, use VITE_API_URL env var
  // In development, fallback to localhost or network IP
  const apiUrl = process.env.VITE_API_URL ||
    (mode === 'production'
      ? 'https://your-backend.vercel.app/api/v1'  // Update with your backend URL
      : 'http://localhost:8000/api/v1');

  return {
    plugins: [
      react(),
      nodePolyfills({
        include: ['buffer', 'crypto', 'stream', 'util', 'process'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    define: {
      'process.env': {},
      global: 'globalThis',
    },
    resolve: {
      alias: {
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
      include: ['crypto-browserify'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
        external: (id) => {
          // Never externalize crypto - it must be polyfilled
          if (id === 'crypto' || id === 'stream' || id === 'buffer') {
            return false;
          }
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
      host: true,
    },
  };
})

