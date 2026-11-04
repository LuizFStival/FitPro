import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import handler from './api/hevy.mjs'

const base = dirname(fileURLToPath(import.meta.url))
const publicBase = '/fitpro/'
const api = middlewares => middlewares.use((req, res, next) => {
  if (req.url.split('?')[0] === '/fitpro/api/hevy') handler(req, res)
  else next()
})
export default defineConfig({
  root: resolve(base, 'pulse'),
  base: publicBase,
  plugins: [react(), {
    name: 'pulse-readonly',
    configureServer(server) { api(server.middlewares) },
    configurePreviewServer(server) { api(server.middlewares) },
    generateBundle(_, bundle) {
      const assets = ['index.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png', ...Object.keys(bundle).filter(n => /\.(js|css)$/.test(n))].map(n => publicBase + n)
      const stamp = createHash('sha256').update(JSON.stringify(bundle)).digest('hex').slice(0, 12)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync(resolve(base, 'pulse/public/sw.js'), 'utf8').replace('__BUILD__', stamp).replace('__ASSETS__', JSON.stringify(assets)) })
    },
    closeBundle() {
      for (const size of [180, 512]) copyFileSync(resolve(base, `public/icon-${size}.png`), resolve(base, `dist-pulse/icon-${size}.png`))
    },
  }],
  server: { host: '127.0.0.1', port: 8182, strictPort: true, fs: { allow: [base] } },
  preview: { host: '127.0.0.1', port: 8182, strictPort: true },
  build: { outDir: resolve(base, 'dist-pulse'), emptyOutDir: true, target: ['safari15', 'chrome100', 'firefox100', 'edge100'] },
})
