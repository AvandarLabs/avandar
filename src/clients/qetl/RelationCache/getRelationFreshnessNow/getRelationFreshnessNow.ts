/**
 * The time, in epoch ms, a cached relation's freshness is judged against.
 * Offline it is before every stale-at time, so a stored relation is never
 * judged stale: stale rows beat no rows while the source cannot be reached
 * to acquire fresh ones.
 */
export function getRelationFreshnessNow(): number {
  return navigator.onLine === false ? Number.NEGATIVE_INFINITY : Date.now();
}
