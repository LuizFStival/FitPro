import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['src/pulse/**/*.test.{js,jsx}'], maxWorkers: 2 } })
