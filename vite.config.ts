/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    // The app calls a relative /api, so dev needs a proxy to the local backend.
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/socket.io": { target: "http://localhost:3000", ws: true, changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "ckeditor5/dist/browser/ckeditor5.js": path.resolve(__dirname, "./node_modules/ckeditor5/dist/browser/ckeditor5.js"),
      "ckeditor5/dist/browser/ckeditor5.css": path.resolve(__dirname, "./node_modules/ckeditor5/dist/browser/ckeditor5.css"),
    },
  },
  optimizeDeps: {
    include: ['ckeditor5'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/components/ui/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Add timestamp to filenames for cache busting
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
      },
    },
  },
}));
