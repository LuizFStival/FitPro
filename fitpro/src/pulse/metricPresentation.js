const number = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
const valid = value => Number.isFinite(Number(value)) && Number(value) > 0

export function formatDistance(meters) {
  if (!valid(meters)) return '—'
  return Number(meters) >= 1000 ? `${number(Number(meters) / 1000)} km` : `${Math.round(Number(meters))} m`
}

export function formatSeconds(seconds) {
  if (!valid(seconds)) return '—'
  const total = Math.round(Number(seconds)), hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60), rest = total % 60
  if (hours) return `${hours} h${minutes ? ` ${minutes} min` : ''}`
  if (minutes) return `${minutes} min${rest ? ` ${rest} s` : ''}`
  return `${rest} s`
}

export const formatSpeed = speed => valid(speed) ? `${number(speed)} km/h` : '—'

export function metricSummary(metrics) {
  if (!metrics) return 'Sem dados comparáveis'
  if (metrics.kind !== 'cardio') return `${metrics.sets} séries · ${metrics.reps} reps totais`
  return [valid(metrics.distance) && formatDistance(metrics.distance), valid(metrics.duration) && formatSeconds(metrics.duration), valid(metrics.speed) && formatSpeed(metrics.speed)].filter(Boolean).join(' · ')
}

export function setSummary(set) {
  if (set.distance != null || set.duration != null) return [formatDistance(set.distance), formatSeconds(set.duration)].filter(value => value !== '—').join(' · ')
  return `${number(set.weight)} kg × ${set.reps}`
}

export function cardioComparison(current, previous) {
  const primary = current.distance || previous.distance
    ? `${formatDistance(previous.distance)} → ${formatDistance(current.distance)}`
    : `${formatSeconds(previous.duration)} → ${formatSeconds(current.duration)}`
  const secondary = current.distance || previous.distance
    ? `${formatSeconds(previous.duration)} → ${formatSeconds(current.duration)}${current.speed && previous.speed ? ` · ${formatSpeed(previous.speed)} → ${formatSpeed(current.speed)}` : ''}`
    : null
  return { primary, secondary }
}
