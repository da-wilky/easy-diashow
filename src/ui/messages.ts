import { isQuotaError } from '../lib/storage'

export function storageError(error: unknown) {
  return isQuotaError(error)
    ? 'Der Speicher des Browsers ist voll. Bitte Projekte oder Dateien löschen und erneut versuchen.'
    : `Speichern fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`
}
