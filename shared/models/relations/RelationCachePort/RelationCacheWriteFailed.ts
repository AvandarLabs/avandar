/**
 * Thrown by `RelationCachePort.write` when a quota-exceeded failure survives
 * one evict-and-retry cycle. Callers catch this type specifically to keep a
 * query alive when the cache simply could not store a relation, while a
 * non-quota failure (a genuine Dexie fault) propagates as its own error type
 * instead of being swallowed alongside it.
 */
export class RelationCacheWriteFailed extends Error {
  /** Wraps the quota-exceeded failure that triggered the retry. */
  constructor(cause: unknown) {
    super("RelationCache write failed after evicting to make room.", {
      cause,
    });
    this.name = "RelationCacheWriteFailed";
  }
}
