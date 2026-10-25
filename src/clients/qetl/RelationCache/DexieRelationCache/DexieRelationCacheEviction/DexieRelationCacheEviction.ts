import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import type { PrincipalKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type { RelationCacheEntry } from "$/models/relations/RelationCachePort/RelationCachePort.types";

async function _bulkDeleteEntriesAndPayloads(
  identityKeys: readonly string[],
): Promise<void> {
  if (identityKeys.length === 0) {
    return;
  }
  const mutableKeys = [...identityKeys];
  await AvaDexie.DB.RelationCacheEntry.bulkDelete(mutableKeys);
  await AvaDexie.DB.RelationCachePayload.bulkDelete(mutableKeys);
}

async function _evict(
  refs: readonly RelationRef.T[],
  principal: PrincipalKey,
): Promise<void> {
  const tableNames = new Set(
    refs.map((ref) => {
      return RelationRef.toTableName(ref);
    }),
  );
  // The candidate read and the delete run in one transaction, the same way
  // `DexieRelationCache.write` reads its superseded siblings and deletes
  // them: atomicity here is what makes a revocation stick rather than just
  // tidy bookkeeping. A `write` for this principal landing between a bare
  // read and a separate delete transaction would create a row this scan
  // never saw, and that row would survive the eviction, letting a revoked
  // principal keep a live cache entry.
  await AvaDexie.DB.transaction(
    "rw",
    AvaDexie.DB.RelationCacheEntry,
    AvaDexie.DB.RelationCachePayload,
    async () => {
      const candidates = await AvaDexie.DB.RelationCacheEntry.where(
        "principalKey",
      )
        .equals(principal)
        .toArray();
      const victimKeys = candidates
        .filter((entry) => {
          return tableNames.has(entry.tableName);
        })
        .map((entry) => {
          return entry.identityKey;
        });
      await _bulkDeleteEntriesAndPayloads(victimKeys);
    },
  );
}

/**
 * The oldest-first prefix of `entries` (by `lastQueriedAt`), skipping every
 * entry in `excludeIdentityKeys`, whose removal brings the running total at
 * or under `budgetBytes`. Never removes an excluded entry, even if the
 * budget cannot be met as a result: the reduce is a single pass over a
 * finite array, so an all-excluded batch simply returns the empty prefix it
 * found rather than looping. Pure so the eviction order is easy to test
 * without touching Dexie.
 */
function _selectEvictionVictims(
  entries: readonly RelationCacheEntry[],
  budgetBytes: number,
  excludeIdentityKeys: ReadonlySet<string>,
): readonly string[] {
  const sortedByAge = [...entries].sort((a, b) => {
    return a.lastQueriedAt - b.lastQueriedAt;
  });
  const totalBytes = sortedByAge.reduce((sum, entry) => {
    return sum + entry.byteSize;
  }, 0);
  const { victimKeys } = sortedByAge.reduce<{
    remainingBytes: number;
    victimKeys: string[];
  }>(
    (acc, entry) => {
      if (acc.remainingBytes <= budgetBytes) {
        return acc;
      }
      if (excludeIdentityKeys.has(entry.identityKey)) {
        return acc;
      }
      return {
        remainingBytes: acc.remainingBytes - entry.byteSize,
        victimKeys: [...acc.victimKeys, entry.identityKey],
      };
    },
    { remainingBytes: totalBytes, victimKeys: [] },
  );
  return victimKeys;
}

async function _evictToBudget(
  budgetBytes: number,
  excludeIdentityKeys: ReadonlySet<string> = new Set(),
): Promise<void> {
  // Same atomicity rationale as `_evict`: reading the candidates and
  // deleting them in one transaction keeps a concurrent write from landing
  // in between. A miss here is benign on its own (the byte total can
  // overshoot by one write until the next pass, a false miss in the safe
  // direction), but leaving one eviction path atomic and this one not would
  // read as though the gap were deliberate rather than an oversight.
  await AvaDexie.DB.transaction(
    "rw",
    AvaDexie.DB.RelationCacheEntry,
    AvaDexie.DB.RelationCachePayload,
    async () => {
      const entries =
        await AvaDexie.DB.RelationCacheEntry.orderBy("lastQueriedAt").toArray();
      const victimKeys = _selectEvictionVictims(
        entries,
        budgetBytes,
        excludeIdentityKeys,
      );
      await _bulkDeleteEntriesAndPayloads(victimKeys);
    },
  );
}

async function _evictToMakeRoomFor(incomingBytes: number): Promise<void> {
  const entries = await AvaDexie.DB.RelationCacheEntry.toArray();
  const storedBytes = entries.reduce((sum, entry) => {
    return sum + entry.byteSize;
  }, 0);
  const targetBudget = Math.max(0, storedBytes - incomingBytes);
  await _evictToBudget(targetBudget);
}

/**
 * Every way `DexieRelationCache` deletes entries: by relation, down to a byte
 * budget, and to make room for a write. Each deletes an entry's metadata and
 * payload rows together.
 */
export const DexieRelationCacheEviction = {
  /**
   * Deletes both rows for every identity key in `identityKeys`. Does **not**
   * open its own transaction: every caller must already be running inside an
   * `AvaDexie.DB.transaction("rw", RelationCacheEntry, RelationCachePayload,
   * ...)` block, so the read that produced `identityKeys` and this delete
   * commit atomically. That atomicity is what makes eviction (and
   * revocation, which is built on it) stick: a `write` landing between the
   * read and the delete would otherwise create a row the read never saw, and
   * that row would survive.
   */
  bulkDeleteEntriesAndPayloads: _bulkDeleteEntriesAndPayloads,

  /** Forgets every entry for this principal and relation. */
  evict: _evict,

  /**
   * Drops least-recently-queried entries, metadata and payload together,
   * until stored bytes are at or under `budgetBytes`. Never evicts an entry
   * named in `excludeIdentityKeys`. Reads only the `RelationCacheEntry`
   * table to decide what to drop.
   */
  evictToBudget: _evictToBudget,

  /**
   * Evicts just enough of the least-recently-queried entries to make room
   * for `incomingBytes` more, so a retried write has somewhere to land.
   */
  evictToMakeRoomFor: _evictToMakeRoomFor,
};
