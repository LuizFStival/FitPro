export const STORAGE = 'fitpro_hevy_readonly_v1'
export const KEY_STORAGE = 'fitpro_hevy_key_v1'
const errors = { 401: 'Chave Hevy inválida. Confira a chave nas configurações.', 403: 'A Hevy recusou o acesso. Confira sua chave e o acesso à API.',
  429: 'A Hevy limitou as consultas. Aguarde um minuto e tente novamente.' }

export async function fetchSnapshot(key, { signal, onProgress = () => {}, fetcher = fetch, now = () => Date.now(), previous = null } = {}) {
  const result = { routines: [], workouts: [], templates: [], bodyMeasurements: [], warnings: [] }
  async function pages(resource) {
    const items = []
    let count = 1
    for (let page = 1; page <= count; page++) {
      const response = await fetcher(`/fitpro/api/hevy?resource=${resource}&page=${page}`, {
        headers: { 'X-Hevy-Key': key }, cache: 'no-store', signal,
      })
      if (!response.ok) throw new Error(errors[response.status] || 'Não foi possível consultar a Hevy agora. Os dados anteriores foram mantidos.')
      const data = await response.json()
      if (!Array.isArray(data[resource]) || !Number.isInteger(data.page_count) || data.page_count < 0 || data.page_count > 2000 || (data.page_count >= page && !data[resource].length && !(page === 1 && data.page_count === 1))) throw new Error('Resposta incompleta da Hevy. Os dados anteriores foram mantidos.')
      count = Math.max(1, data.page_count)
      items.push(...data[resource])
      onProgress({ resource, page, count })
    }
    const identity = item => resource === 'body_measurements' ? item?.date : item?.id
    if (items.some(item => !item || typeof identity(item) !== 'string' || (item.exercises != null && (!Array.isArray(item.exercises) || item.exercises.some(e => !e || (e.sets != null && !Array.isArray(e.sets))))))) throw new Error('Dados inválidos recebidos da Hevy.')
    return [...new Map(items.map(item => [identity(item), item])).values()]
  }
  for (const resource of ['routines', 'workouts']) result[resource] = await pages(resource)
  // Optional metadata must never turn a successful workout refresh into a lost snapshot.
  // On failure preserve the previous metadata and explicitly report its separate freshness.
  if (previous?.templates?.length && now() - previous.templatesAt < 86400000) {
    result.templates = previous.templates; result.templatesAt = previous.templatesAt
  } else {
    try { result.templates = await pages('exercise_templates'); result.templatesAt = now() }
    catch (error) {
      if (signal?.aborted) throw error
      result.templates = previous?.templates || []; result.templatesAt = previous?.templatesAt || null
      result.warnings.push('Metadados musculares não atualizados. O mapa pode estar incompleto ou usar a última consulta disponível.')
    }
  }
  try { result.bodyMeasurements = await pages('body_measurements'); result.measurementsAt = now() }
  catch (error) {
    if (signal?.aborted) throw error
    result.bodyMeasurements = previous?.bodyMeasurements || []; result.measurementsAt = previous?.measurementsAt || null
    result.warnings.push('Medidas corporais não atualizadas pela Hevy. Mostramos somente os registros já disponíveis.')
  }
  return { ...result, syncedAt: now() }
}

export function loadCache(storage) {
  try {
    const data = JSON.parse(storage.getItem(STORAGE) || 'null')
    if (data?.version !== 1) return { snapshot: null, preferences: {} }
    const s = data.snapshot
    const snapshot = s && Array.isArray(s.routines) && Array.isArray(s.workouts) && Number.isFinite(s.syncedAt) ? s : null
    return { snapshot, preferences: data.preferences && typeof data.preferences === 'object' ? data.preferences : {} }
  } catch { return { snapshot: null, preferences: {} } }
}

export function saveCache(storage, snapshot, preferences) {
  try { storage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot, preferences })); return true }
  catch { return false }
}
