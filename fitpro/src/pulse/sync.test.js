import { describe, expect, it, vi } from 'vitest'
import { fetchSnapshot, loadCache, saveCache } from './sync.js'
const response = data => ({ ok: true, json: async () => data })
describe('Hevy snapshot', () => {
  it('fetches every page, deduplicates and retains source IDs, names and sets', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ routines: [{ id: 'r', title: 'Atual' }], page_count: 1 }))
      .mockResolvedValueOnce(response({ workouts: [{ id: '1', routine_id: 'r', exercises: [] }], page_count: 2 }))
      .mockResolvedValueOnce(response({ workouts: [{ id: '1', routine_id: 'r', exercises: [] }, { id: '2' }], page_count: 2 }))
    const result = await fetchSnapshot('fake-test-key', { fetcher, now: () => 100 })
    expect(result.workouts).toHaveLength(2); expect(result.workouts[0].routine_id).toBe('r'); expect(result.syncedAt).toBe(100)
    expect(fetcher.mock.calls[2][0]).toBe('/fitpro/api/hevy?resource=workouts&page=2')
    expect(fetcher.mock.calls[0][1].headers['X-Hevy-Key']).toBe('fake-test-key')
  })
  it('never returns a partial successful snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ routines: [{ id: 'r' }], page_count: 1 })).mockResolvedValueOnce({ ok: false, status: 429 })
    await expect(fetchSnapshot('test', { fetcher })).rejects.toThrow('limitou')
  })
  it('refreshes workouts while preserving optional metadata on endpoint failure', async () => {
    const previous = { templates: [{ id: 'leg', primary_muscle_group: 'quadriceps' }], templatesAt: 1, bodyMeasurements: [{ date: '2026-10-01', weight_kg: 80 }], measurementsAt: 2 }
    const fetcher = vi.fn(async url => {
      const resource = new URL(url, 'http://test').searchParams.get('resource')
      return ['routines', 'workouts'].includes(resource) ? response({ [resource]: [], page_count: 1 }) : { ok: false, status: 404 }
    })
    const result = await fetchSnapshot('test', { previous, fetcher, now: () => 100000000 })
    expect(result.syncedAt).toBe(100000000)
    expect(result.templates).toEqual(previous.templates); expect(result.templatesAt).toBe(1)
    expect(result.bodyMeasurements).toEqual(previous.bodyMeasurements); expect(result.measurementsAt).toBe(2)
    expect(result.warnings).toHaveLength(2)
  })
  it('caches the catalogue for a day but refreshes dated measurements', async () => {
    const previous = { templates: [{ id: 'leg' }], templatesAt: 10 }
    const fetcher = vi.fn(async url => {
      const resource = new URL(url, 'http://test').searchParams.get('resource')
      return response({ [resource]: resource === 'body_measurements' ? [{ date: '2026-11-01', weight_kg: 80 }, { date: '2026-11-01', weight_kg: 79 }] : [], page_count: 1 })
    })
    const result = await fetchSnapshot('test', { previous, fetcher, now: () => 100 })
    expect(fetcher).toHaveBeenCalledTimes(3); expect(result.templates).toEqual(previous.templates)
    expect(result.bodyMeasurements).toEqual([{ date: '2026-11-01', weight_kg: 79 }])
    expect(result.measurementsAt).toBe(100); expect(result.warnings).toEqual([])
  })
  it('rejects malformed and incomplete pages', async () => {
    for (const data of [{ routines: [], page_count: 2 }, { routines: [], page_count: 99999 }, { routines: null, page_count: 1 }]) {
      await expect(fetchSnapshot('test', { fetcher: async () => response(data) })).rejects.toThrow('incompleta')
    }
  })
  it('supports empty accounts', async () => {
    for (const page_count of [0, 1]) {
      const fetcher = async url => response({ [url.includes('routines') ? 'routines' : 'workouts']: [], page_count })
      expect((await fetchSnapshot('test', { fetcher })).workouts).toEqual([])
    }
  })
  it('survives corrupt or inaccessible storage and reports a full disk', () => {
    expect(loadCache({ getItem: () => '{broken' }).snapshot).toBeNull()
    expect(loadCache({ getItem: () => { throw Error() } }).snapshot).toBeNull()
    expect(saveCache({ setItem: () => { throw Error() } }, {}, {})).toBe(false)
  })
})
