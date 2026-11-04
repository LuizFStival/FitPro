import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/hevy.mjs'
async function request(url = '/api/hevy?resource=workouts&page=1', options = {}) {
  const headers = {}; let body
  const res = { setHeader: (k, v) => { headers[k] = v }, end: text => { body = JSON.parse(text) } }
  await handler({ method: 'GET', url, headers: { 'x-hevy-key': 'fake-testing-key' }, ...options }, res)
  return { status: res.statusCode, headers, body }
}
afterEach(() => vi.unstubAllGlobals())
describe('Vercel read-only gateway', () => {
  it('rejects writes and unknown upstream targets before fetching', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    expect((await request(undefined, { method: 'POST' })).status).toBe(405)
    expect((await request('/api/hevy?resource=https://evil.example')).status).toBe(400)
    expect((await request('/api/hevy?resource=workouts&page=1%26evil=1')).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('requires a user key and rejects cross-site browser requests', async () => {
    expect((await request(undefined, { headers: {} })).status).toBe(401)
    expect((await request(undefined, { headers: { 'sec-fetch-site': 'cross-site' } })).status).toBe(403)
  })
  it('forwards only to the fixed upstream and prevents caching', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ workouts: [], page_count: 0 }) }); vi.stubGlobal('fetch', fetcher)
    const result = await request()
    expect(result.status).toBe(200); expect(result.headers['Cache-Control']).toContain('no-store')
    expect(fetcher.mock.calls[0][0]).toBe('https://api.hevyapp.com/v1/workouts?page=1&pageSize=10')
    expect(fetcher.mock.calls[0][1].redirect).toBe('error')
    expect(JSON.stringify(result)).not.toContain('fake-testing-key')
  })
  it('does not leak upstream errors or keys and preserves rate limiting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    expect((await request()).status).toBe(429)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Error('secret-url-key')))
    const result = await request(); expect(result.status).toBe(502); expect(JSON.stringify(result)).not.toContain('secret')
  })
})
