import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Get API URL from environment variable or use default network IP
  const apiUrl = process.env.VITE_API_URL || 'http://10.45.107.163:8000';

  return {
    plugins: [
      react(),
      nodePolyfills({
        include: ['buffer'],
      }),
    ],
    define: {
      'process.env': {},
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

