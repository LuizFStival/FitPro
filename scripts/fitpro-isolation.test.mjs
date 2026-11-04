import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function worker(file) {
  const listeners = {}, deleted = [], fetched = [], stored = []
  const context = {
    URL, Response,
    self: { location: { origin: 'https://app.test' }, addEventListener: (name, fn) => { listeners[name] = fn }, clients: { claim: async () => {} }, skipWaiting: async () => {} },
    caches: { keys: async () => ['hevypulse-shell-v1', 'hevypulse-shell-v2', 'fitpro-pulse-old', 'another-app'], delete: async key => { deleted.push(key) }, open: async key => ({ addAll: async () => {}, match: async path => ({ cache: key, path }), put: async (...args) => stored.push(args) }), match: async () => null },
    fetch: async req => { fetched.push(req.url); return new Response('ok') },
  }
  vm.runInNewContext(readFileSync(file, 'utf8').replace('__ASSETS__', '[]'), context)
  return { listeners, deleted, fetched, stored, context }
}
test('root worker never deletes FitPro caches or intercepts its pages/API', async () => {
  const w = worker('public/sw.js'); let pending
  w.listeners.activate({ waitUntil: p => { pending = p } }); await pending
  assert.deepEqual(w.deleted, ['hevypulse-shell-v1'])
  for (const path of ['/fitpro', '/fitpro/', '/fitpro/api/hevy', '/fitpro/assets/app.js']) {
    let handled = false
    w.listeners.fetch({ request: { url: 'https://app.test' + path, method: 'GET', mode: 'navigate' }, respondWith: () => { handled = true } })
    assert.equal(handled, false, path)
  }
  let result
  w.listeners.fetch({ request: { url: 'https://app.test/', method: 'GET', mode: 'navigate' }, respondWith: p => { result = p } })
  assert.equal(await (await result).text(), 'ok')
})
test('FitPro worker only owns its cache and serves its own offline document', async () => {
  const w = worker('fitpro/pulse/public/sw.js'); let pending
  w.listeners.activate({ waitUntil: p => { pending = p } }); await pending
  assert.deepEqual(w.deleted, ['fitpro-pulse-old'])
  for (const path of ['/', '/api/hevy-proxy', '/fitpro/api/hevy', '/fitpro/source.tar.gz']) {
    let handled = false
    w.listeners.fetch({ request: { url: 'https://app.test' + path, method: 'GET', mode: 'navigate' }, respondWith: () => { handled = true } })
    assert.equal(handled, false, path)
  }
  w.context.fetch = async () => { throw Error('offline') }
  w.context.caches.open = async key => ({ match: async path => typeof path === 'string' ? { cache: key, path } : undefined })
  let result
  w.listeners.fetch({ request: { url: 'https://app.test/fitpro/', method: 'GET', mode: 'navigate' }, respondWith: p => { result = p } })
  const fallback = await result
  assert.equal(fallback.path, '/fitpro/index.html')
  assert.match(fallback.cache, /^fitpro-pulse-/)
})
test('deployment routes keep the legacy API separate and PWA stays under /fitpro/', () => {
  const config = JSON.parse(readFileSync('vercel.json'))
  assert.deepEqual(config.rewrites[0], { source: '/fitpro/api/hevy', destination: '/api/fitpro-hevy' })
  assert.ok(config.rewrites.find(r => r.source === '/api/(.*)' && r.destination === '/api/index'))
  assert.equal(config.rewrites.at(-1).destination, '/index.html')
  const manifest = JSON.parse(readFileSync('dist/fitpro/manifest.webmanifest'))
  for (const key of ['id', 'scope', 'start_url']) assert.equal(manifest[key], '/fitpro/')
  assert.ok(manifest.icons.every(i => i.src.startsWith('/fitpro/')))
  const html = readFileSync('dist/fitpro/index.html', 'utf8')
  for (const [, url] of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) assert.ok(url.startsWith('/fitpro/'), url)
  assert.ok(readFileSync('dist/index.html', 'utf8').includes('/assets/'))
  const sw = readFileSync('dist/fitpro/sw.js', 'utf8')
  assert.ok(!sw.includes('__BUILD__')); assert.ok(!sw.includes('__ASSETS__'))
})
