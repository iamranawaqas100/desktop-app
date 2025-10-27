import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true, // Enable CSS source maps in dev
  },
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: false, // Keep all CSS in one file for Electron
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'zustand'],
        }
      }
    }
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './src/renderer')
      }
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
    host: 'localhost',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand']
  }
})
