export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  for (; bytes >= 1024 && i < units.length - 1; i++) bytes /= 1024
  return `${bytes.toLocaleString('de-DE', { maximumFractionDigits: i ? 1 : 0 })} ${units[i]}`
}

export function formatDuration(seconds: number) {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatSeconds(seconds: number) {
  return `${seconds.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} s`
}

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
export const formatDate = (timestamp: number) => dateFormat.format(timestamp)
