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

/**
 * A relation cache behind one interface, so the session that holds it
 * decides which store answers a probe. `lookup` and `readPayload` are
 * separate calls on purpose: a lookup must never deserialize a payload.
 */
export type RelationCachePort = {
  /** Finds the entry that serves `key`, per the reuse predicate. */
  lookup: (key: RelationCacheKey) => Promise<RelationCacheEntry | undefined>;

  /** Reads a hit's payload. Never called by `lookup` itself. */
  readPayload: (entry: RelationCacheEntry) => Promise<Blob | undefined>;

  /**
   * Stores one relation. Idempotent on the identity's `identityKey`, and
   * supersedes any other live entry for the same principal and relation.
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
   * until stored bytes are at or under `budgetBytes`. Reads no payload row
   * except the ones it deletes.
   */
  evictToBudget: (budgetBytes: number) => Promise<void>;
};
