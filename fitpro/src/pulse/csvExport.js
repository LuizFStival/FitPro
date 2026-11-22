import { ordered, routineFor } from './analysis.js'
import { portugueseExerciseName } from './exercisePresentation.js'
import { durationMinutes } from './workoutMetrics.js'

export const CSV_COLUMNS = [
  'data_inicio', 'data_fim', 'duracao_treino_min', 'treino_id', 'rotina_id', 'rotina_nome',
  'exercicio_ordem', 'exercicio_id', 'exercicio_nome', 'exercicio_nome_hevy',
  'grupo_muscular_primario', 'grupos_musculares_secundarios', 'serie_ordem', 'serie_tipo',
  'peso_kg', 'repeticoes', 'distancia_metros', 'duracao_segundos', 'velocidade_kmh',
  'volume_kg', 'rpe', 'metrica_personalizada', 'tendencia', 'sessoes_sem_progresso',
  'motivos_evolucao', 'nota_treino', 'nota_exercicio',
]

const localDay = value => {
  const date = new Date(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const dayStart = value => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) ? date.getTime() : null
}

const dayEnd = value => {
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isFinite(date.getTime()) ? date.getTime() : null
}

export function periodRange(period, now = Date.now(), custom = {}) {
  const today = new Date(now)
  if (period === 'custom') {
    const from = dayStart(custom.from), to = dayEnd(custom.to)
    return { from, to, fromDay: custom.from || '', toDay: custom.to || '', valid: from != null && to != null && from <= to }
  }
  const fromDate = new Date(today)
  if (period === 'month') fromDate.setDate(1)
  else fromDate.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  fromDate.setHours(0, 0, 0, 0)
  today.setHours(23, 59, 59, 999)
  return { from: fromDate.getTime(), to: today.getTime(), fromDay: localDay(fromDate), toDay: localDay(today), valid: true }
}

const finite = value => value !== null && value !== '' && Number.isFinite(Number(value))
const number = value => finite(value) ? Number(value) : ''
const speed = set => number(set.distance_meters) && number(set.duration_seconds) ? number(set.distance_meters) / number(set.duration_seconds) * 3.6 : ''

export function exportRows(snapshot, data, preferences, range, now = Date.now()) {
  if (!snapshot || !range?.valid) return []
  const routines = snapshot.routines || []
  const templates = new Map((snapshot.templates || []).map(template => [template.id, template]))
  const analyzedRoutines = new Map((data?.routines || []).map(routine => [routine.id, routine]))
  return (snapshot.workouts || [])
    .filter(workout => {
      const at = Date.parse(workout.start_time)
      return Number.isFinite(at) && at >= range.from && at <= range.to
    })
    .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))
    .flatMap(workout => {
      const routine = routineFor(workout, routines)
      const analyzed = analyzedRoutines.get(routine?.id)
      const workoutMinutes = durationMinutes(workout, now)
      return ordered(workout.exercises).flatMap((exercise, exerciseIndex) => {
        const id = exercise.exercise_template_id || ''
        const template = templates.get(id)
        const analysis = analyzed?.exercises.find(item => item.id === id)
        const session = analysis?.sessions.find(item => item.id === workout.id)
        const apiTitle = exercise.title || template?.title || 'Exercício sem nome'
        const displayName = preferences?.names?.[id] || (template?.is_custom ? apiTitle : portugueseExerciseName(apiTitle))
        return ordered(exercise.sets).map((set, setIndex) => ({
          data_inicio: workout.start_time || '', data_fim: workout.end_time || '', duracao_treino_min: workoutMinutes || '', treino_id: workout.id || '',
          rotina_id: routine?.id || workout.routine_id || '', rotina_nome: routine?.title || workout.title || 'Sem rotina identificada',
          exercicio_ordem: (exercise.index ?? exerciseIndex) + 1, exercicio_id: id, exercicio_nome: displayName, exercicio_nome_hevy: apiTitle,
          grupo_muscular_primario: template?.primary_muscle_group || '', grupos_musculares_secundarios: (template?.secondary_muscle_groups || []).join('|'),
          serie_ordem: (set.index ?? setIndex) + 1, serie_tipo: set.type || '', peso_kg: number(set.weight_kg), repeticoes: number(set.reps),
          distancia_metros: number(set.distance_meters), duracao_segundos: number(set.duration_seconds), velocidade_kmh: speed(set),
          volume_kg: finite(set.weight_kg) && finite(set.reps) ? number(set.weight_kg) * number(set.reps) : '', rpe: number(set.rpe),
          metrica_personalizada: number(set.custom_metric), tendencia: session?.trend || '', sessoes_sem_progresso: session?.streak ?? '',
          motivos_evolucao: (session?.reasons || []).join('|'), nota_treino: workout.description || '', nota_exercicio: exercise.notes || '',
        }))
      })
    })
}

const safeCell = value => {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function rowsToCsv(rows) {
  return `\uFEFF${[CSV_COLUMNS, ...rows.map(row => CSV_COLUMNS.map(column => row[column]))].map(line => line.map(safeCell).join(';')).join('\r\n')}`
}

export function csvFilename(range) {
  return `fitpro-treinos-${range.fromDay}-a-${range.toDay}.csv`
}

export function downloadCsv(rows, range, documentRef = document, urlRef = URL) {
  const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const href = urlRef.createObjectURL(blob)
  const link = documentRef.createElement('a')
  link.href = href; link.download = csvFilename(range); link.hidden = true
  documentRef.body.append(link); link.click(); link.remove(); urlRef.revokeObjectURL(href)
}
