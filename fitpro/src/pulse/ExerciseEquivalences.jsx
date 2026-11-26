import { useMemo, useState } from 'react'
import { ordered, routineFor } from './analysis.js'
import { equivalentIdsFor, setEquivalenceGroup } from './equivalence.js'
import { exerciseDisplayName } from './exercisePresentation.js'
import { MUSCLE_LABELS, muscleWeights } from './insights.js'

const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export function equivalenceCandidates(snapshot, routine, item, preferences = {}) {
  if (!snapshot || !routine || !item) return []
  const rawRoutine = snapshot.routines?.find(raw => raw.id === routine.id)
  const templates = new Map((snapshot.templates || []).map(template => [template.id, template]))
  const occurrences = new Map()
  const add = (exercise, fallbackOrder) => {
    const id = exercise.exercise_template_id
    if (!id || id === item.id) return
    const old = occurrences.get(id)
    occurrences.set(id, { id, title: exercise.title || templates.get(id)?.title || old?.title || id, order: exercise.index ?? exercise.position ?? fallbackOrder ?? old?.order })
  }
  ordered(rawRoutine?.exercises || []).forEach((exercise, index) => add(exercise, index))
  for (const workout of snapshot.workouts || []) {
    if (routineFor(workout, snapshot.routines || [])?.id !== routine.id) continue
    ordered(workout.exercises).forEach((exercise, index) => add(exercise, index))
  }
  const baseTemplate = templates.get(item.id)
  const primary = Object.keys(muscleWeights(baseTemplate))[0]
  const existing = equivalentIdsFor(preferences, routine.id, item.id)
  return [...occurrences.values()].filter(candidate => {
    if (existing.has(candidate.id)) return true
    const candidatePrimary = Object.keys(muscleWeights(templates.get(candidate.id)))[0]
    return primary && candidatePrimary === primary && candidate.order === item.order
  }).map(candidate => ({ ...candidate,
    title: exerciseDisplayName(candidate.title, templates.get(candidate.id), preferences.names?.[candidate.id]),
    muscle: MUSCLE_LABELS[Object.keys(muscleWeights(templates.get(candidate.id)))[0]] || 'Grupo não identificado',
  })).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

function EquivalenceForm({ api, routine, item, candidates }) {
  const existing = equivalentIdsFor(api.preferences, routine.id, item.id)
  const [selected, setSelected] = useState(() => new Set([...existing].filter(id => id !== item.id)))
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState(false)
  const visible = candidates.filter(candidate => normalized(candidate.title).includes(normalized(search)))
  const save = event => {
    event.preventDefault()
    api.setPreferences(preferences => ({ ...preferences,
      equivalenceGroups: setEquivalenceGroup(preferences.equivalenceGroups, routine.id, item.id, [...selected]) }))
    setSaved(true)
  }
  return <form className="equivalence-form" onSubmit={save}>
    <div className="equivalence-base"><span>Exercício de referência</span><strong>{item.title}</strong><small>Slot #{item.order + 1} · somente dentro de {routine.title}</small></div>
    {candidates.length ? <><label>Buscar alternativa<input type="search" value={search} onChange={event => { setSearch(event.target.value); setSaved(false) }} placeholder="Nome do exercício" /></label>
      <div className="equivalence-options">{visible.map(candidate => <label key={candidate.id}><input type="checkbox" checked={selected.has(candidate.id)} onChange={event => { const next = new Set(selected); event.target.checked ? next.add(candidate.id) : next.delete(candidate.id); setSelected(next); setSaved(false) }} /><span><strong>{candidate.title}</strong><small>Slot #{candidate.order + 1} · {candidate.muscle}</small></span></label>)}</div>
      {!visible.length && <p className="muted">Nenhuma alternativa corresponde à busca.</p>}
      <button className="quiet" type="submit">Salvar equivalências</button>
      {saved && <p className="green" role="status">Equivalências salvas neste aparelho.</p>}</> : <p className="muted">Nenhuma variação histórica com o mesmo slot e músculo principal foi encontrada para este exercício.</p>}
    <p className="footnote">Ao combinar, carga, repetições, volume e estagnação usam sessões de qualquer variação. Exercícios de outro treino nunca entram nesta comparação.</p>
  </form>
}

export default function ExerciseEquivalences({ api, routines, initialTarget = null }) {
  const [routineId, setRoutineId] = useState(initialTarget?.routineId || '')
  const [exerciseId, setExerciseId] = useState(initialTarget?.exerciseId || '')
  const routine = routines.find(item => item.id === routineId) || routines.find(item => item.active) || routines[0]
  const item = routine?.exercises.find(exercise => exercise.id === exerciseId) || routine?.exercises[0]
  const candidates = useMemo(() => equivalenceCandidates(api.snapshot, routine, item, api.preferences), [api.snapshot, api.preferences, routine, item])
  return <section id="exercise-equivalences" className="card exercise-equivalences"><h2>Exercícios equivalentes</h2><p className="muted">Una variações usadas no mesmo lugar do treino, como supino máquina e supino com barra.</p>
    {routine ? <><label>Treino<select value={routine.id} onChange={event => { setRoutineId(event.target.value); setExerciseId('') }}>{routines.map(option => <option key={option.id} value={option.id}>{option.title}{option.active ? '' : ' · oculto'}</option>)}</select></label>
      <label>Exercício<select value={item?.id || ''} onChange={event => setExerciseId(event.target.value)}>{routine.exercises.map((exercise, index) => <option key={`${exercise.key}-${index}`} value={exercise.id}>{index + 1}. {exercise.title}</option>)}</select></label>
      {item && <EquivalenceForm key={`${routine.id}:${item.id}`} {...{ api, routine, item, candidates }} />}</> : <p className="muted">Conecte a Hevy para configurar equivalências.</p>}
  </section>
}
