import { i18n } from './i18n.svelte'

export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  for (; bytes >= 1024 && i < units.length - 1; i++) bytes /= 1024
  return `${bytes.toLocaleString(i18n.locale, { maximumFractionDigits: i ? 1 : 0 })} ${units[i]}`
}

export function formatDuration(seconds: number) {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatSeconds(seconds: number) {
  return `${seconds.toLocaleString(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} s`
}

export function formatBpm(bpm: number | null) {
  return bpm ? bpm.toLocaleString(i18n.locale, { maximumFractionDigits: 1 }) : '–'
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
}
