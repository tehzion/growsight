import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['html2canvas', 'jspdf']
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'staging',
    minify: mode === 'production' ? 'terser' : 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Large vendor libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
          if (id.includes('node_modules/react-router-dom')) {
            return 'router';
          }
          if (id.includes('node_modules/zustand')) {
            return 'state';
          }
          
          // PDF-related libraries
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf';
          }
          
          // Charts and visualization
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          
          // Form libraries
          if (id.includes('node_modules/react-hook-form') || 
              id.includes('node_modules/@hookform/resolvers') || 
              id.includes('node_modules/zod')) {
            return 'forms';
          }
          
          // UI libraries
          if (id.includes('node_modules/lucide-react')) {
            return 'ui';
          }
          
          // Utility libraries
          if (id.includes('node_modules/date-fns') || 
              id.includes('node_modules/dompurify') ||
              id.includes('node_modules/xlsx')) {
            return 'utils';
          }
          
          // Supabase and database related
          if (id.includes('node_modules/@supabase')) {
            return 'database';
          }
          
          // Other large node_modules
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
          
          // Dynamic chunks for large app modules
          if (id.includes('src/pages/admin')) {
            return 'admin';
          }
          if (id.includes('src/components/admin')) {
            return 'admin';
          }
          if (id.includes('src/services/')) {
            return 'services';
          }
          if (id.includes('src/stores/')) {
            return 'stores';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    host: true,
    open: false
  },
  preview: {
    port: 3000,
    host: true
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
}));