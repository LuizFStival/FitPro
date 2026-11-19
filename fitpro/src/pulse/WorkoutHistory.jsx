import { useState } from 'react'
import { setMetrics, ordered } from './analysis.js'
import { durationMinutes, formatDuration } from './workoutMetrics.js'
import { portugueseExerciseName } from './exercisePresentation.js'

export default function WorkoutHistory({ routine, workouts, now, names = {} }) {
  const [limit, setLimit] = useState(5)
  return <section className="card workout-history"><div className="section-head"><h2>Treinos passados</h2><span>{workouts.length} sessões</span></div>
    <p className="footnote">Séries normais com carga e repetições. Aquecimentos e drop sets não entram nestes totais.</p>
    {!workouts.length && <p className="muted">Sem sessões vinculadas a esta rotina.</p>}
    {workouts.slice(0, limit).map((w, index) => {
      const exercises = ordered(w.exercises).map(e => ({ ...e, metrics: setMetrics(ordered(e.sets)) }))
      const sets = exercises.reduce((n, e) => n + (e.metrics?.sets || 0), 0)
      const reps = exercises.reduce((n, e) => n + (e.metrics?.reps || 0), 0)
      return <details className="past-workout" key={w.id}><summary><div><strong>Sessão #{workouts.length - index}</strong><span>{new Date(w.start_time).toLocaleDateString('pt-BR')}</span></div><div><b>{sets} séries · {reps} reps</b><span>{formatDuration(durationMinutes(w, now))} · ver exercícios ⌄</span></div></summary>
        {exercises.map((e, i) => <div className="past-exercise" key={`${e.exercise_template_id}-${i}`}><strong>{names[e.exercise_template_id] || routine.exercises.find(item => item.id === e.exercise_template_id)?.title || portugueseExerciseName(e.title)}</strong><span>{e.metrics ? `${e.metrics.sets} séries · ${e.metrics.reps} reps totais` : 'Sem séries comparáveis'}</span>{e.metrics && <small>{e.metrics.setDetails.map(s => `${s.weight.toLocaleString('pt-BR')} kg × ${s.reps}`).join(' · ')}</small>}</div>)}
      </details>
    })}
    {limit < workouts.length && <button className="og-choice" onClick={() => setLimit(n => n + 5)}>Ver mais sessões</button>}
  </section>
}
