import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSnapshot, KEY_STORAGE, loadCache, saveCache, STORAGE } from './sync.js'

const storage = {
  getItem: key => { try { return localStorage.getItem(key) } catch { return null } },
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: key => { try { localStorage.removeItem(key) } catch { /* unavailable */ } },
}

export default function useHevy(previewSnapshot = null) {
  const [initial] = useState(() => previewSnapshot ? { snapshot: previewSnapshot, preferences: previewSnapshot.previewPreferences || {} } : loadCache(storage))
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const [preferences, setPreferences] = useState(initial.preferences)
  const [key, setKey] = useState(() => previewSnapshot ? '' : storage.getItem(KEY_STORAGE) || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [progress, setProgress] = useState('')
  const inFlight = useRef(null)
  const lastAttempt = useRef(0)
  const lastSnapshot = useRef(snapshot)
  lastSnapshot.current = snapshot
  const refresh = useCallback(async (force = false) => {
    if (!key || inFlight.current || (!force && Date.now() - lastAttempt.current < 60000)) return
    const controller = new AbortController()
    inFlight.current = controller
    lastAttempt.current = Date.now()
    setBusy(true); setError(''); setProgress('Consultando Hevy…')
    const timeout = setTimeout(() => controller.abort(), 120000)
    try {
      const next = await fetchSnapshot(key, { signal: controller.signal, previous: lastSnapshot.current,
        onProgress: p => setProgress(`${({ routines: 'Rotinas', workouts: 'Histórico', exercise_templates: 'Músculos', body_measurements: 'Medidas' })[p.resource]}: ${p.page}/${p.count}`) })
      if (!controller.signal.aborted) setSnapshot(next)
    } catch (e) {
      if (inFlight.current === controller) setError(e.name === 'AbortError' ? 'A consulta demorou demais. Tente atualizar novamente.' : e instanceof TypeError ? 'Sem conexão com a Hevy. Mantivemos a última consulta.' : e.message || 'Não foi possível consultar a Hevy.')
    } finally {
      clearTimeout(timeout)
      if (inFlight.current === controller) { inFlight.current = null; setBusy(false); setProgress('') }
    }
  }, [key])

  useEffect(() => {
    refresh()
    const foreground = () => { if (document.visibilityState === 'visible') refresh() }
    const online = () => refresh()
    window.addEventListener('focus', foreground)
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', foreground)
    const timer = setInterval(foreground, 5 * 60000)
    return () => { window.removeEventListener('focus', foreground); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', foreground); clearInterval(timer) }
  }, [refresh])
  useEffect(() => {
    if (previewSnapshot) return
    if (!saveCache(storage, snapshot, preferences)) setStorageError('O navegador não conseguiu guardar os dados. Eles continuam disponíveis nesta tela, mas podem se perder ao fechar.')
  }, [snapshot, preferences, previewSnapshot])
  useEffect(() => () => { inFlight.current?.abort(); inFlight.current = null }, [])

  const connect = (nextKey, remember) => {
    if (previewSnapshot) return
    inFlight.current?.abort(); inFlight.current = null; setBusy(false); lastAttempt.current = 0
    storage.removeItem(KEY_STORAGE)
    if (key !== nextKey) { lastSnapshot.current = null; setSnapshot(null); setPreferences({}); storage.removeItem(STORAGE) }
    setStorageError('')
    if (remember) { try { storage.setItem(KEY_STORAGE, nextKey) } catch { setStorageError('Não foi possível lembrar a chave neste aparelho.') } }
    setError('')
    if (nextKey === key) refresh(true)
    else setKey(nextKey)
  }
  const disconnect = () => {
    if (previewSnapshot) return
    inFlight.current?.abort(); inFlight.current = null; setBusy(false)
    storage.removeItem(KEY_STORAGE); storage.removeItem(STORAGE)
    setKey(''); setSnapshot(null); setPreferences({}); setError(''); setStorageError('')
  }
  return { snapshot, preferences, setPreferences, connected: !!key, busy, error, storageError, progress, refresh, connect, disconnect }
}
