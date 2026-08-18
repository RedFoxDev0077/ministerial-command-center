import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
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
