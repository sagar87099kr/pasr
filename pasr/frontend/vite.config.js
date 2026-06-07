import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    // Generate manifest if needed, but we'll use a direct bundled chunk for this simple integration
    manifest: true,
    outDir: path.resolve(__dirname, 'public/dist'),
    // Empty the output directory before building
    emptyOutDir: true,
    rollupOptions: {
      // The entry point of our React frontend
      input: path.resolve(__dirname, 'src/main.jsx'),
      output: {
        // Output filenames without hash so EJS can safely reference them
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  }
});
