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

it('shows last load and total reps while collapsed and moves name editing exclusively to settings', async () => {
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot, preferences: {} }))
  await mount(); await click('Treino')
  const exercise = container.querySelector('details.exercise')
  expect(exercise.open).toBe(false)
  expect(exercise.querySelector('.exercise-last').textContent).toContain('100 kg')
  expect(exercise.querySelector('.exercise-last').textContent).toContain('10 reps')
  expect(container.querySelector('input[name="name"]')).toBeNull()
  expect(container.textContent).not.toContain('ID Hevy:')
  expect(exercise.querySelector('.performance-value').textContent).toContain('1 × 10reps · 100 kg')
  await click('Config')
  expect(container.textContent).toContain('ID Hevy: leg')
  const form = container.querySelector('.exercise-name-form')
  form.querySelector('input').value = 'Meu leg press'
  await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(container.textContent).toContain('Nome salvo neste aparelho.')
  expect(JSON.parse(localStorage.getItem(STORAGE)).preferences.names.leg).toBe('Meu leg press')
  await click('Treino')
  expect(container.querySelector('details.exercise summary strong').textContent).toBe('Meu leg press')
  expect(container.querySelector('.exercise-last').textContent).toContain('100 kg')
})

it('explains mixed progress when maximum load rises but total volume falls', async () => {
  const workouts = [7, 1].map((ago, i) => ({ id: `mixed-${i}`, routine_id: 'b', start_time: new Date(now - ago * DAY).toISOString(), exercises: [{ ...exercises[0], sets: (i ? [55, 55, 40, 40] : [50, 50, 50, 50]).map(weight_kg => ({ type: 'normal', weight_kg, reps: i ? 8 : 10 })) }] }))
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot: { ...snapshot, workouts }, preferences: {} }))
  await mount(); await click('Treino')
  const exercise = container.querySelector('details.exercise')
  expect(exercise.querySelector('.exercise-last').textContent).toContain('32 reps')
  expect(exercise.querySelector('.mixed-progress').textContent).toContain('2.000 para 1.520 kg')
  expect(exercise.querySelectorAll('.compact-sets li')).toHaveLength(4)
  expect(exercise.querySelector('.progress-change').textContent).toContain('+5 kg máx. · -8 reps')
})

it('automatically consults Hevy with a remembered key and opens exercises in routine order', async () => {
  localStorage.setItem(KEY_STORAGE, 'fake-testing-key'); await mount()
  expect(fetch).toHaveBeenCalledTimes(4)
  expect(container.textContent).toContain('2 em atenção')
  await click('Treino')
  expect([...container.querySelectorAll('details.exercise > summary strong')].map(e => e.textContent)).toEqual(exercises.map(e => e.title))
  expect(container.textContent).toContain('Próxima sessão #5')
  expect(container.querySelectorAll('details[open]')).toHaveLength(0)
  expect(container.textContent).toContain('3 sessões sem progresso')
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
  expect(exercise.querySelector('.execution a')).toBeNull()
  expect(exercise.querySelector('.progress-status').compareDocumentPosition(player) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(exercise.querySelector('.compact-streak').textContent).toContain('3 sessões')
  expect(exercise.querySelector('.exercise-extra').open).toBe(false)
  expect(exercise.querySelector('.progress-advice').textContent).toContain('mesma carga')
  await act(async () => { exercise.open = false; exercise.dispatchEvent(new Event('toggle')) })
  expect(container.querySelector('iframe')).toBeNull()
})

it('keeps A/B/C consistent across plan, workout and statistics, with per-routine alerts and no effort panel', async () => {
  const routines = ['b', 'c', 'a'].map(id => ({ id, title: `Treino ${id.toUpperCase()}`, exercises }))
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot: { ...snapshot, routines }, preferences: {} }))
  await mount(); await click('Plano')
  expect([...container.querySelectorAll('.og-routine-line strong')].map(e => e.textContent)).toEqual(['Treino A', 'Treino B', 'Treino C'])
  await click('Treino')
  expect([...container.querySelectorAll('.routine-choice > strong')].map(e => e.textContent)).toEqual(['Treino A', 'Treino B', 'Treino C'])
  await click('Estatísticas')
  expect([...container.querySelectorAll('[aria-label="Rotina da evolução"] button')].map(e => e.textContent)).toEqual(['Treino A', 'Treino B', 'Treino C'])
  expect(container.textContent).not.toContain('Esforço no treino')
  const rows = container.querySelectorAll('.og-plateau-row')
  expect(rows[1].textContent).toContain('2 em atenção')
  await act(async () => rows[1].click())
  expect(container.querySelector('.routine-choice[aria-pressed=true]').getAttribute('aria-label')).toBe('Treino B')
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


it('closes the other exercise and its player when a new exercise opens', async () => {
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot, preferences: {} }))
  await mount(); await click('Treino')
  const [first, second] = container.querySelectorAll('details.exercise')
  await act(async () => { second.open = true; second.dispatchEvent(new Event('toggle')) })
  await act(async () => second.querySelector('.execution-play').click())
  expect(second.querySelector('iframe')).toBeTruthy()
  await act(async () => { first.open = true; first.dispatchEvent(new Event('toggle')) })
  expect(first.open).toBe(true)
  expect(second.open).toBe(false)
  expect(container.querySelector('iframe')).toBeNull()
  await act(async () => { const nested = first.querySelector('.exercise-extra'); nested.open = true; nested.dispatchEvent(new Event('toggle', { bubbles: true })) })
  expect(first.open).toBe(true)
})

it('shows per-routine past sessions with sets, reps and actual elapsed duration', async () => {
  const workouts = snapshot.workouts.map(w => ({ ...w, end_time: new Date(Date.parse(w.start_time) + 55 * 60000).toISOString() }))
  localStorage.setItem(STORAGE, JSON.stringify({ version: 1, snapshot: { ...snapshot, workouts }, preferences: {} }))
  await mount(); await click('Treino')
  const history = container.querySelector('.workout-history')
  expect(history.textContent).toContain('4 sessões')
  expect(history.querySelector('summary').textContent).toContain('Sessão #4')
  expect(history.querySelector('summary').textContent).toContain('2 séries · 25 reps')
  expect(history.querySelector('summary').textContent).toContain('55 min')
  expect(history.querySelector('.past-exercise').textContent).toContain('100 kg × 10')
  await click('Estatísticas')
  expect(container.textContent).toContain('Tempo de treino')
})


it('keeps the gym view compact, with comparison details hidden and visual routine switching', async () => {
  const routines = ['a', 'b', 'c'].map(id => ({ id, title: `Treino ${id.toUpperCase()}`, exercises }))
  const workouts = [7, 1].map((ago, i) => ({ id: `up-${i}`, routine_id: 'a', start_time: new Date(now - ago * DAY).toISOString(), exercises: [{ ...exercises[0], sets: Array.from({ length: 4 }, () => ({ type: 'normal', weight_kg: 45, reps: i ? 12 : 11 })) }] }))
  const templates = [{ id: 'leg', primary_muscle_group: 'quadriceps', secondary_muscle_groups: [] }]
  await act(async () => root.render(<Pulse previewSnapshot={{ ...snapshot, routines, workouts, templates }} />))
  await click('Treino')
  expect(container.querySelector('.routine-choice small').textContent).toContain('Quadríceps')
  expect(container.querySelector('.routine-history').open).toBe(false)
  const exercise = container.querySelector('details.exercise')
  await act(async () => { exercise.open = true; exercise.dispatchEvent(new Event('toggle')) })
  expect(exercise.querySelector('.exercise-last')).toBeNull()
  expect(exercise.querySelector('.performance-value').textContent).toContain('4 × 12reps · 45 kg')
  expect(exercise.querySelector('.progress-change').textContent).toContain('Mesma carga · +4 reps')
  expect(exercise.querySelector('.compact-streak')).toBeNull()
  expect(exercise.querySelector('.exercise-extra').open).toBe(false)
  expect(exercise.querySelector('.exercise-extra table').textContent).toContain('48')
  expect(exercise.querySelector('.progress-rule').closest('details')).toBe(exercise.querySelector('.exercise-extra'))
  await act(async () => container.querySelectorAll('.routine-choice')[1].click())
  expect(container.querySelector('.routine-choice[aria-pressed=true]').getAttribute('aria-label')).toBe('Treino B')
  expect(container.querySelector('details.exercise[open]')).toBeNull()
  expect(container.querySelector('.progress-change')).toBeNull()
  expect(container.querySelector('.progress-advice').textContent).toContain('Ainda não há séries normais')
})
