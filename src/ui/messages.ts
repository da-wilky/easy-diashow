import { isQuotaError } from '../lib/storage'
import { i18n } from './i18n.svelte'

export function storageError(error: unknown) {
  return isQuotaError(error) ? i18n.m.quotaFull : i18n.m.saveFailed(error instanceof Error ? error.message : String(error))
}
