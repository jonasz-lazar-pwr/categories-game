// === backend/vitest.config.ts ===

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '#/': resolve(__dirname, 'src') + '/',
      '#generated/': resolve(__dirname, 'generated') + '/',
    },
  },
})
