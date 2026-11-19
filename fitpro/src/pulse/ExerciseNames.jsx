import { useState } from 'react'

function NameForm({ item, rename }) {
  const [saved, setSaved] = useState(false)
  return <form className="exercise-name-form" onSubmit={event => {
    event.preventDefault()
    const name = new FormData(event.currentTarget).get('name').trim()
    if (!name) return
    rename(item.id, name)
    setSaved(true)
  }}>
    <p className="muted">Nome na API: {item.apiTitle || 'não informado'}<br />ID Hevy: {item.id}</p>
    <label>Nome que você usa no Hevy<input name="name" maxLength={120} required defaultValue={item.title} onChange={() => setSaved(false)} /></label>
    <button className="quiet" type="submit">Salvar nome neste aparelho</button>
    {saved && <p role="status" className="green">Nome salvo neste aparelho.</p>}
  </form>
}

export default function ExerciseNames({ routines, rename }) {
  const [routineId, setRoutineId] = useState('')
  const [exerciseId, setExerciseId] = useState('')
  const routine = routines.find(r => r.id === routineId) || routines.find(r => r.active) || routines[0]
  const item = routine?.exercises.find(e => e.id === exerciseId) || routine?.exercises[0]
  return <section className="card exercise-names"><h2>Nomes dos exercícios</h2>
    <p className="muted">Personalize o nome exibido no app. Vale para o mesmo exercício em todas as rotinas deste aparelho; não altera a Hevy nem mistura os históricos.</p>
    {routine ? <><label>Rotina para configurar<select value={routine.id} onChange={event => { setRoutineId(event.target.value); setExerciseId('') }}>{routines.map(r => <option key={r.id} value={r.id}>{r.title}{r.active ? '' : ' · oculta'}</option>)}</select></label>
      <label>Exercício para configurar<select value={item?.id || ''} onChange={event => setExerciseId(event.target.value)}>{routine.exercises.map((e, i) => <option key={`${e.key}-${i}`} value={e.id}>{e.title}</option>)}</select></label>
      {item ? <NameForm key={item.key} item={item} rename={rename} /> : <p className="muted">Esta rotina não tem exercícios.</p>}</> : <p className="muted">Conecte a Hevy para carregar seus exercícios.</p>}
  </section>
}
