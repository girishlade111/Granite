import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-codemirror': [
            'codemirror',
            '@codemirror/autocomplete',
            '@codemirror/commands',
            '@codemirror/lang-markdown',
            '@codemirror/language-data',
            '@codemirror/lint',
            '@codemirror/search',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/theme-one-dark',
            '@lezer/highlight',
            '@lezer/markdown',
          ],
          'vendor-d3': ['d3-force', 'd3-selection', 'd3-zoom'],
          'vendor-markdown': [
            'react-markdown',
            'remark-gfm',
            'remark-math',
            'remark-parse',
            'remark-rehype',
            'rehype-katex',
            'rehype-raw',
            'rehype-sanitize',
            'rehype-stringify',
            'unified',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
})
