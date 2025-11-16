import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Plugin to inject exports polyfill at build time
const injectExportsPolyfill = () => {
  return {
    name: 'inject-exports-polyfill',
    transformIndexHtml(html: string) {
      return html.replace(
        '<head>',
        `<head><script>
          if (typeof exports === 'undefined') {
            window.exports = {};
            window.module = { exports: window.exports };
            if (typeof globalThis !== 'undefined') {
              globalThis.exports = window.exports;
              globalThis.module = window.module;
            }
          }
        </script>`
      );
    },
  };
};

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
      injectExportsPolyfill(),
      react(),
      nodePolyfills({
        include: [
          'buffer',
          'crypto',
          'stream',
          'util',
          'process',
          'events',
          'string_decoder',
          'assert',
          'constants',
          'path',
          'os',
        ],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Fix for readable-stream compatibility
        protocolImports: true,
      }),
    ],
    define: {
      'process.env': {},
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(mode),
      // Ensure process.browser is defined for readable-stream
      'process.browser': 'true',
    },
    resolve: {
      alias: {
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        // Ensure readable-stream uses browser-compatible version
        'readable-stream': 'readable-stream',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
      include: [
        'crypto-browserify',
        'stream-browserify',
        'buffer',
        'readable-stream',
        'ripemd160',
        'create-hash',
      ],
      // Force pre-bundling of nested dependencies
      force: true,
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/],
        // Ensure CommonJS modules are properly transformed
        strictRequires: true,
      },
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
        external: (id) => {
          // Never externalize crypto/stream polyfills - they must be bundled
          if (id === 'crypto' || id === 'stream' || id === 'buffer') {
            return false;
          }
        },
      },
    },
    server: {
      port: 3000,
      host: true, // Allow access from network
      hmr: {
        // Use the same host as the server
        host: 'localhost',
        port: 3000,
      },
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
})

