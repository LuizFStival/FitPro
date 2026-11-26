import BodyMap from '../components/BodyMap.jsx'
import { MUSCLE_LABELS, routineMuscles } from './insights.js'

export default function RoutinePicker({ routines, selected, snapshot, onSelect }) {
  return <section className="routine-picker" aria-label="Escolha seu treino">
    <h2>Qual treino hoje?</h2>
    <div className="routine-choices">{routines.map(r => {
      const raw = snapshot?.routines?.find(item => item.id === r.id)
      const load = raw ? routineMuscles(raw, snapshot.templates) : {}
      const muscles = Object.entries(load).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => MUSCLE_LABELS[id]).join(' · ')
      return <button key={r.id} className="routine-choice" aria-pressed={selected === r.id} aria-label={r.title} onClick={() => onSelect(r.id)}>
        <strong>{r.title.match(/^Treino\s+[A-Z]\b/i)?.[0] || r.title.split('—')[0].trim()}</strong>
        <span aria-hidden="true"><BodyMap load={load} className="bm-mini" /></span>
        <span className="routine-choice-info"><small>{muscles || `${r.exercises.length} exercícios`}</small><small className={r.alerts ? 'amber' : 'green'}>{r.alerts ? `${r.alerts} em atenção` : 'Sem alertas'} · próxima #{r.nextSession}</small></span>
      </button>
    })}</div>
  </section>
}
