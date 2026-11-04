// Stateless read-only gateway. No shared personal key and no user data on the server.
const resources = new Set(['workouts', 'routines', 'exercise_templates', 'body_measurements'])
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  const reply = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return reply(405, { error: 'method' }) }
  if (req.headers['sec-fetch-site'] === 'cross-site') return reply(403, { error: 'origin' })
  const url = new URL(req.url, 'http://localhost')
  const resource = url.searchParams.get('resource')
  const page = url.searchParams.get('page') || '1'
  if (!resources.has(resource) || !/^[1-9]\d{0,4}$/.test(page)) return reply(400, { error: 'resource' })
  const key = req.headers['x-hevy-key']
  if (typeof key !== 'string' || key.length < 8 || key.length > 256 || /[\s\x00-\x1f]/.test(key)) return reply(401, { error: 'key' })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`https://api.hevyapp.com/v1/${resource}?page=${page}&pageSize=${resource === 'exercise_templates' ? 100 : 10}`, {
      headers: { 'api-key': key, Accept: 'application/json' }, signal: controller.signal, redirect: 'error',
    })
    if (!response.ok) {
      const status = [401, 403, 404, 429].includes(response.status) ? response.status : 502
      if (status === 429) res.setHeader('Retry-After', '30')
      return reply(status, { error: status === 429 ? 'rate-limit' : status === 502 ? 'upstream' : 'key' })
    }
    const data = await response.json()
    if (!Array.isArray(data[resource]) || !Number.isInteger(data.page_count) || data.page_count < 0) return reply(502, { error: 'format' })
    return reply(200, { [resource]: data[resource], page_count: data.page_count })
  } catch { return reply(502, { error: 'upstream' }) }
  finally { clearTimeout(timer) }
}
