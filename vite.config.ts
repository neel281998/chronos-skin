import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    // hls.js is large by nature; suppress the warning
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/hls.js')) return 'hls';
          if (id.includes('node_modules/react-dom')) return 'vendor';
          if (id.includes('node_modules/react')) return 'vendor';
          if (id.includes('node_modules/@videojs')) return 'videojs';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
