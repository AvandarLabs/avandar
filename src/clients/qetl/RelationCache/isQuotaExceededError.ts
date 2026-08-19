/**
 * Whether `error` is IndexedDB refusing a write for lack of storage space,
 * as opposed to any other Dexie or DOM fault. Recognises the modern signal
 * every current engine (Chromium, Firefox, WebKit) uses, and Dexie carries
 * straight through: a `DexieError` or `DOMException` named
 * `"QuotaExceededError"`. Also recognises the legacy numeric DOMException
 * code (`22`) that pre-standardization engines raised instead of the name.
 * Deliberately narrow: a message that happens to mention "quota" does not
 * qualify, so a genuine Dexie fault (a constraint violation, a closed
 * database) is never mistaken for exhausted storage.
 *
 * Shared by every `RelationCachePort` implementation's quota-exceeded
 * retry, so the classification cannot drift between them.
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof Error && error.name === "QuotaExceededError") {
    return true;
  }
  // `DOMException.code` is deprecated in favor of `.name`, but this is the
  // deliberate legacy fallback for engines that predate the standardized
  // `"QuotaExceededError"` name and only ever set the numeric code: `22` is
  // the legacy `DOMException.QUOTA_EXCEEDED_ERR` constant. Read
  // intentionally, not accidentally, so keep it rather than remove it.
  return error instanceof DOMException && error.code === 22;
}
