import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) return 'react-vendor';
            if (id.includes('@supabase/supabase-js')) return 'supabase';
            if (id.includes('motion')) return 'motion';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('react-zoom-pan-pinch') || id.includes('@dnd-kit')) return 'canvas';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('react-markdown')) return 'markdown';
            return undefined;
          },
        },
      },
    },
  };
});
