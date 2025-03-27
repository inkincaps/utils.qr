import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'buffer': 'buffer/',
      'process': 'process/browser',
    }
  },
  define: {
    'process.env': {},
    'global': {},
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  }
})
