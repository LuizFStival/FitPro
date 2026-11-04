// Explicit source allowlist: no profiles, API keys, environment files or licensed catalogue.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = ['pulse', 'src/pulse', 'api/hevy.mjs', 'scripts/pulse-source.mjs', 'vite.pulse.config.js', 'vite.pulse.test.config.js',
  'vercel.json', 'package.json', 'package-lock.json', 'PULSE-LICENSE.txt', 'PULSE-README.md',
  'public/icon-180.png', 'public/icon-512.png', 'PULSE-NOTICE.md',
  'src/components/BodyMap.jsx', 'src/components/LineChart.jsx', 'src/lib/body-map-model.js',
  'src/lib/body-paths.js', 'src/lib/format.js', 'src/lib/i18n-core.js', 'src/lib/catalogue-langs.js']
const result = spawnSync('tar', ['-czf', resolve(root, 'dist-pulse/source.tar.gz'), ...files], { cwd: root, stdio: 'inherit' })
if (result.error || result.status !== 0) throw new Error('Could not package the corresponding Pulse source code')
