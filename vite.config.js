import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      // The Laravel app shares this directory tree. Without these, running the
      // PHP test suite or writing a log line makes the dev server reload the
      // page you are working in.
      ignored: [
        '**/backend/**',
        '**/dist/**',
        '**/vendor/**',
      ],
    },
  },
})
