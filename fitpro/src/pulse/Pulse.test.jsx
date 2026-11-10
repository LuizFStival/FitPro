// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import Pulse from './Pulse.jsx'
import { KEY_STORAGE, STORAGE } from './sync.js'
import { DAY } from './analysis.js'
let container, root
const now = Date.now()
const exercises = [{ index: 0, exercise_template_id: 'leg', title: 'Leg Press 45° (Máquina)', sets: [{ type: 'normal', weight_kg: 100, reps: 10 }] },
  { index: 1, exercise_template_id: 'abs', title: 'Abdominal (Máquina)', sets: [{ type: 'normal', weight_kg: 40, reps: 15 }] }]
const snapshot = { syncedAt: now, routines: [{ id: 'b', title: 'Treino B', exercises }], workouts: [10, 7, 4, 1].map((ago, i) => ({ id: String(i), routine_id: 'b', title: 'Treino B', start_time: new Date(now - ago * DAY).toISOString(), exercises })) }
beforeEach(() => {
  history.replaceState(null, '', '/')
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear(); container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  vi.stubGlobal('fetch', vi.fn(async url => { const resource = new URL(url, 'http://localhost').searchParams.get('resource'); return { ok: true, json: async () => ({ [resource]: resource === 'routines' ? snapshot.routines : resource === 'workouts' ? snapshot.workouts : [], page_count: 1 }) } }))
  window.scrollTo = vi.fn()
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); localStorage.clear() })
async function mount() { await act(async () => { root.render(<Pulse />) }) }
async function click(text) { const button = [...container.querySelectorAll('button')].find(b => b.textContent === text); expect(button).toBeTruthy(); await act(async () => button.click()) }

it('automatically consults Hevy with a remembered key and opens exercises in routine order', async () => {
  localStorage.setItem(KEY_STORAGE, 'fake-testing-key'); await mount()
  expect(fetch).toHaveBeenCalledTimes(4)
  expect(container.textContent).toContain('2 em atenção')
  await click('Treino')
  expect([...container.querySelectorAll('summary strong')].map(e => e.textContent)).toEqual(exercises.map(e => e.title))
  expect(container.textContent).toContain('Próxima sessão #5')
  expect(container.querySelectorAll('details[open]')).toHaveLength(0)
  expect(container.textContent).toContain('3 sessão(ões) seguida(s)')
  await click('Início')
  await click('Ver estagnação por treino →')
  expect(container.querySelectorAll('details.exercise')).toHaveLength(2)
  expect(container.textContent).toContain('Treino B')
})

it('loads the execution player only on request and removes it when the exercise closes', async () => {
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot, preferences: {} }))
  await mount(); await click('Treino')
  expect(container.querySelector('iframe')).toBeNull()
  const exercise = container.querySelectorAll('details.exercise')[1]
  await act(async () => { exercise.open = true; exercise.dispatchEvent(new Event('toggle')) })
  const play = exercise.querySelector('.execution-play')
  expect(play.textContent).toContain('Ver execução')
  await act(async () => play.click())
  const player = exercise.querySelector('iframe')
  expect(player.src).toContain('https://www.youtube-nocookie.com/embed/5uTPwcdt4gQ')
  expect(player.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
  expect(player.title).toContain('Abdominal (Máquina)')
  await act(async () => { exercise.open = false; exercise.dispatchEvent(new Event('toggle')) })
  expect(container.querySelector('iframe')).toBeNull()
})

it('keeps last-good data and timestamp when a refresh fails', async () => {
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot, preferences: {} }))
  localStorage.setItem(KEY_STORAGE, 'fake-testing-key')
  fetch.mockResolvedValue({ ok: false, status: 429 }); await mount()
  expect(container.textContent).toContain('A Hevy limitou')
  expect(container.textContent).toContain('Treino B')
  expect(JSON.parse(localStorage.getItem(STORAGE)).snapshot.syncedAt).toBe(now)
})

it('filters routines without erasing history and persists the visibility setting', async () => {
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot, preferences: {} })); await mount()
  await click('Config')
  const checkbox = container.querySelector('.routine-toggle input')
  await act(async () => checkbox.click())
  await click('Início')
  await click('Ver estagnação por treino →')
  expect(container.textContent).toContain('Sem alertas recentes')
  const saved = JSON.parse(localStorage.getItem(STORAGE))
  expect(saved.preferences.active.b).toBe(false); expect(saved.snapshot.workouts).toHaveLength(4)
})

it('does not fetch without a key and disconnect removes only Pulse data', async () => {
  localStorage.setItem('gym_state_v1', 'untouched')
  await mount(); expect(fetch).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Conecte seus treinos')
  expect(localStorage.getItem('gym_state_v1')).toBe('untouched')
})

it('replaces the inactive connection form with an exit link in demo mode', async () => {
  await act(async () => root.render(<Pulse previewSnapshot={snapshot} />))
  await click('Config')
  expect(container.querySelector('input[type="password"]')).toBeNull()
  const link = [...container.querySelectorAll('a')].find(a => a.textContent.includes('Sair da demonstração'))
  expect(link?.getAttribute('href')).toBe('./#settings')
  expect(fetch).not.toHaveBeenCalled()
  expect(localStorage.getItem(KEY_STORAGE)).toBeNull()
})
