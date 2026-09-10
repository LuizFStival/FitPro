export function getRoutineStorageId(title: string): string {
  return String(title || 'Treino Geral')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]/gi, '_');
}

export function normalizeRoutineTitle(title: string): string {
  return String(title || 'Treino Geral')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
