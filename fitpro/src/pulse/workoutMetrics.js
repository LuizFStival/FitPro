export function durationMinutes(workout, now = Date.now()) {
  const start = Date.parse(workout?.start_time), end = Date.parse(workout?.end_time)
  return Number.isFinite(start) && Number.isFinite(end) && end > start && end <= now ? (end - start) / 60000 : null
}

export function formatDuration(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return 'Tempo não informado'
  if (minutes < 1) return '<1 min'
  const total = Math.round(minutes)
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)}h${total % 60 ? ` ${total % 60} min` : ''}`
}
