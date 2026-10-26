/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/project-life/',
  plugins: [react(), tailwindcss()],
  build: {
    // The main chunk carries the UK life tables (about 60 kB gzipped) so the grid can be sized on first paint.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
