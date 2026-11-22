const FIVE_MINUTES = 5 * 60 * 1000

const normalizedTitle = value => String(value || '')
  .normalize('NFKC')
  .trim()
  .toLocaleLowerCase('pt-BR')
  .replace(/\s+/g, ' ')

const workoutSize = workout => (workout.exercises || []).reduce((total, exercise) => total + (exercise.sets || []).length, 0)

const richerWorkout = (current, candidate) => {
  const sizeDifference = workoutSize(candidate) - workoutSize(current)
  if (sizeDifference) return sizeDifference > 0 ? candidate : current
  const currentHasEnd = Number.isFinite(Date.parse(current.end_time))
  const candidateHasEnd = Number.isFinite(Date.parse(candidate.end_time))
  return candidateHasEnd && !currentHasEnd ? candidate : current
}

export function dedupeWorkouts(source = [], now = Infinity) {
  const uniqueIds = [...new Map(source
    .filter(workout => workout?.id && Number.isFinite(Date.parse(workout.start_time)) && Date.parse(workout.start_time) <= now)
    .map(workout => [workout.id, workout])).values()]
    .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))

  const retained = []
  const latestByTitle = new Map()
  for (const workout of uniqueIds) {
    const title = normalizedTitle(workout.title)
    const identity = title ? `${title}::${workout.routine_id || ''}` : ''
    const startedAt = Date.parse(workout.start_time)
    const previous = identity ? latestByTitle.get(identity) : null
    if (previous && startedAt - previous.startedAt < FIVE_MINUTES) {
      retained[previous.index] = richerWorkout(retained[previous.index], workout)
      continue
    }
    const index = retained.push(workout) - 1
    if (identity) latestByTitle.set(identity, { index, startedAt })
  }
  return retained.sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))
}
