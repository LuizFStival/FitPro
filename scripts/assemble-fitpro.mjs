import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
const from = resolve('fitpro/dist-pulse'), to = resolve('dist/fitpro')
if (!existsSync(resolve(from, 'index.html'))) throw new Error('Build FitPro before assembling the deployment')
cpSync(from, to, { recursive: true })
console.log('Deployment assembled: existing app at / and FitPro at /fitpro/')
