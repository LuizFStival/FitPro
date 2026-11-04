import { createRoot } from 'react-dom/client'
import Pulse from '../src/pulse/Pulse.jsx'
let previewSnapshot = null
if (import.meta.env.DEV && new URLSearchParams(location.search).get('demo') === '1') {
  const { makePreview } = await import('../src/pulse/preview.js')
  previewSnapshot = makePreview()
}
createRoot(document.getElementById('root')).render(<Pulse previewSnapshot={previewSnapshot} />)
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  // Refresh the old root worker so it stops handling /fitpro and deleting its caches.
  navigator.serviceWorker.getRegistration('/').then(reg => reg?.update()).catch(() => {})
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
}
