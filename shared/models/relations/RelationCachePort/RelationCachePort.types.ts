import type { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type {
  PrincipalKey,
  RelationCacheEntryFields,
  RelationCacheIdentity,
  RelationCacheKey,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.types.ts";

/**
 * One stored relation's metadata, with no payload. Every field the reuse
 * predicate reads (`RelationCacheEntryFields`) plus the bookkeeping a port
 * implementation needs for eviction and audit.
 */
export type RelationCacheEntry = RelationCacheEntryFields & {
  /** The Dexie primary key: principal, table, version and definition. */
  identityKey: string;
  relationKind: RelationRef.T["kind"];
  /** The definition's `kind`, for debugging and review. Never compared. */
  definitionKind: string | undefined;
  /** Recorded for invalidation and audit; never matched at lookup. */
  sourceVersion: string | undefined;
  /** Payload size in bytes, so a budget scan needs no payload read. */
  byteSize: number;
  /** LRU ordering key, in epoch ms. Stamped on every hit. */
  lastQueriedAt: number;
  writtenAt: number;
  /** When the last freshness recheck ran. Unused before that lands. */
  freshnessCheckedAt: number | undefined;
};

/** What `RelationCachePort.write` stores for one relation. */
export type RelationCacheWrite = {
  identity: RelationCacheIdentity;
  /** The columns actually held. Sorted and deduplicated before storing. */
  columns: readonly string[] | "all";
  payload: Blob;
};

/** One requested key that `probe` found no servable entry for. */
export type RelationCacheProbeMiss = {
  key: RelationCacheKey;
  /**
   * The narrower cached entry to grow, or `undefined` to acquire fresh.
   * Metadata only: growing with the old bytes is an explicit `readPayload`
   * by the caller, never implied by this field.
   */
  growFrom: RelationCacheEntry | undefined;
};

/** One requested key that `probe` found a servable entry for. */
export type RelationCacheProbeHit = {
  key: RelationCacheKey;
  entry: RelationCacheEntry;
};

/**
 * The outcome of probing a batch of keys. Every key in the request appears
 * in exactly one of `hits` or `misses`.
 */
export type RelationCacheProbeResult = {
  hits: RelationCacheProbeHit[];
  misses: RelationCacheProbeMiss[];
};

/**
 * A relation cache behind one interface, so the session that holds it
 * decides which store answers a probe. `probe` and `readPayload` are
 * separate calls on purpose: a probe must never deserialize a payload.
 */
export type RelationCachePort = {
  /**
   * Finds, in one batch, the entry that serves each of `keys`, per the
   * reuse predicate. Every key in the batch resolves to exactly one hit or
   * one miss; a miss carries a `growFrom` candidate when a narrower entry
   * for the same principal, table and definition exists to grow instead of
   * acquiring fresh.
   */
  probe: (
    keys: readonly RelationCacheKey[],
  ) => Promise<RelationCacheProbeResult>;

  /** Reads a hit's payload. Never called by `probe` itself. */
  readPayload: (entry: RelationCacheEntry) => Promise<Blob | undefined>;

  /**
   * Stores one relation. Idempotent on the identity's `identityKey`, and
   * supersedes any other live entry for the same principal and relation.
   * A quota-exceeded failure evicts to make room and retries exactly once;
   * if the retry also fails, throws `RelationCacheWriteFailed`.
   */
  write: (write: RelationCacheWrite) => Promise<void>;

  /** Stamps `lastQueriedAt` on a hit, without touching its payload. */
  touch: (identityKey: string) => Promise<void>;

  /** Forgets every entry for this principal and relation. */
  evict: (
    refs: readonly RelationRef.T[],
    principal: PrincipalKey,
  ) => Promise<void>;

  /**
   * Drops least-recently-queried entries, metadata and payload together,
   * until stored bytes are at or under `budgetBytes`. Never evicts an entry
   * whose `identityKey` is in `excludeIdentityKeys`, even if the budget
   * cannot be met as a result. Reads no payload row except the ones it
   * deletes.
   */
  evictToBudget: (
    budgetBytes: number,
    excludeIdentityKeys?: ReadonlySet<string>,
  ) => Promise<void>;
};
