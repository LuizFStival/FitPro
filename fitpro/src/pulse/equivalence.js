const validGroup = group => group && typeof group.routineId === 'string' && Array.isArray(group.exerciseIds)

export const equivalenceGroups = preferences => (preferences?.equivalenceGroups || [])
  .filter(validGroup)
  .map(group => ({ routineId: group.routineId, exerciseIds: [...new Set(group.exerciseIds.filter(id => typeof id === 'string' && id))].sort() }))
  .filter(group => group.exerciseIds.length >= 2)

export function equivalentIdsFor(preferences, routineId, exerciseId) {
  const group = equivalenceGroups(preferences).find(item => item.routineId === routineId && item.exerciseIds.includes(exerciseId))
  return new Set(group?.exerciseIds || [exerciseId])
}

export function setEquivalenceGroup(current, routineId, exerciseId, selectedIds) {
  const nextIds = new Set([exerciseId, ...(selectedIds || [])].filter(Boolean))
  const untouched = []
  for (const group of equivalenceGroups({ equivalenceGroups: current })) {
    if (group.routineId !== routineId) { untouched.push(group); continue }
    if (group.exerciseIds.includes(exerciseId)) continue
    const remaining = group.exerciseIds.filter(id => !nextIds.has(id) && id !== exerciseId)
    if (remaining.length >= 2) untouched.push({ ...group, exerciseIds: remaining })
  }
  if (nextIds.size >= 2) untouched.push({ routineId, exerciseIds: [...nextIds].sort() })
  return untouched
}
