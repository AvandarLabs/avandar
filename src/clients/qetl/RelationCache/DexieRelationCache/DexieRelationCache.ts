import type { PreparedRelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import type {
  PrincipalKey,
  RelationCacheKey,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type {
  RelationCacheEntry,
  RelationCachePort,
  RelationCacheProbeResult,
  RelationCacheWrite,
} from "$/models/relations/RelationCachePort/RelationCachePort.types";

import {
  coversColumns,
  makeIdentityTokensFromIdentity,
  makePreparedRelationCacheKeyFromKey,
  serves,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { RelationCacheWriteFailed } from "$/models/relations/RelationCachePort/RelationCacheWriteFailed";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { isQuotaExceededError } from "@/clients/qetl/RelationCache/isQuotaExceededError";
import { AvaDexie } from "@/db/dexie/AvaDexie";

function _normalizeColumns(
  columns: readonly string[] | "all",
): readonly string[] | "all" {
  if (columns === "all") {
    return "all";
  }
  return [...new Set(columns)].sort();
}

/**
 * The narrower cached entry a miss on `prepared` could grow instead of
 * acquiring fresh: same principal, table and definition, live, and failing
 * `serves()` on the column check alone. By the single-live-entry rule (only
 * one live entry can exist per `(principalKey, tableName)`) at most one
 * candidate can ever match, so more than one is a §6.2 violation rather than
 * a choice to make.
 */
function _getGrowFromCandidate(
  candidates: readonly RelationCacheEntry[],
  prepared: PreparedRelationCacheKey,
): RelationCacheEntry | undefined {
  const growable = candidates.filter((entry) => {
    return (
      entry.principalKey === prepared.principalKey &&
      entry.tableName === prepared.tableName &&
      entry.definitionToken === prepared.definitionToken &&
      entry.staleAt === undefined &&
      !coversColumns(entry.columns, prepared.columns)
    );
  });
  if (growable.length > 1) {
    const duplicateIdentityKeys = growable
      .map((entry) => {
        return entry.identityKey;
      })
      .join(", ");
    throw new Error(
      `RelationCache §6.2 violation: more than one live entry for ` +
        `(${prepared.principalKey}, ${prepared.tableName}): ` +
        `${duplicateIdentityKeys}`,
    );
  }
  return growable[0];
}

async function _probe(
  keys: readonly RelationCacheKey[],
): Promise<RelationCacheProbeResult> {
  const preparedKeys = await Promise.all(
    keys.map(async (key) => {
      return { key, prepared: await makePreparedRelationCacheKeyFromKey(key) };
    }),
  );
  const tableNames = [
    ...new Set(
      preparedKeys.map(({ prepared }) => {
        return prepared.tableName;
      }),
    ),
  ];

  const result: RelationCacheProbeResult = { hits: [], misses: [] };
  const now = Date.now();

  // The candidate read and the hit stamp run in one `rw` transaction, same
  // atomicity rationale as `_evict` and `_evictToBudget`: without it, a
  // concurrent `write` or `evict` could delete a row between the read and
  // the `.modify()`, and the stamp would silently target a gone row. Scoped
  // to `RelationCacheEntry` alone (never `RelationCachePayload`), which is
  // what keeps `probe` from touching a payload row.
  await AvaDexie.DB.transaction(
    "rw",
    AvaDexie.DB.RelationCacheEntry,
    async () => {
      const candidates = await AvaDexie.DB.RelationCacheEntry.where("tableName")
        .anyOf(tableNames)
        .toArray();
      const hitIdentityKeys: string[] = [];

      preparedKeys.forEach(({ key, prepared }) => {
        const hit = candidates.find((entry) => {
          return serves(entry, prepared);
        });
        if (hit) {
          hitIdentityKeys.push(hit.identityKey);
          result.hits.push({ key, entry: { ...hit, lastQueriedAt: now } });
          return;
        }
        result.misses.push({
          key,
          growFrom: _getGrowFromCandidate(candidates, prepared),
        });
      });

      if (hitIdentityKeys.length > 0) {
        await AvaDexie.DB.RelationCacheEntry.where("identityKey")
          .anyOf(hitIdentityKeys)
          .modify({ lastQueriedAt: now });
      }
    },
  );

  return result;
}

async function _readPayload(
  entry: RelationCacheEntry,
): Promise<Blob | undefined> {
  const row = await AvaDexie.DB.RelationCachePayload.get(entry.identityKey);
  return row?.parquetBlob;
}

/**
 * Every other live entry sharing this row's `(principalKey, tableName)`,
 * which a successful `write` supersedes. Bounded to "a handful" by the
 * single-live-entry rule the previous write already enforced.
 */
async function _getSupersededIdentityKeys(
  entry: RelationCacheEntry,
): Promise<string[]> {
  const siblings = await AvaDexie.DB.RelationCacheEntry.where("tableName")
    .equals(entry.tableName)
    .toArray();
  return siblings
    .filter((sibling) => {
      return (
        sibling.principalKey === entry.principalKey &&
        sibling.identityKey !== entry.identityKey
      );
    })
    .map((sibling) => {
      return sibling.identityKey;
    });
}

/**
 * Deletes both rows for every identity key in `identityKeys`. Does **not**
 * open its own transaction: every caller must already be running inside an
 * `AvaDexie.DB.transaction("rw", RelationCacheEntry, RelationCachePayload,
 * ...)` block, so the read that produced `identityKeys` and this delete
 * commit atomically. That atomicity is what makes eviction (and revocation,
 * which is built on it) stick: a `write` landing between the read and the
 * delete would otherwise create a row the read never saw, and that row
 * would survive.
 */
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

async function _writeOnce(
  entry: RelationCacheEntry,
  payload: Blob,
): Promise<void> {
  await AvaDexie.DB.transaction(
    "rw",
    AvaDexie.DB.RelationCacheEntry,
    AvaDexie.DB.RelationCachePayload,
    async () => {
      const supersededKeys = await _getSupersededIdentityKeys(entry);
      await _bulkDeleteEntriesAndPayloads(supersededKeys);
      await AvaDexie.DB.RelationCacheEntry.put(entry);
      await AvaDexie.DB.RelationCachePayload.put({
        identityKey: entry.identityKey,
        parquetBlob: payload,
      });
    },
  );
}

/**
 * Evicts just enough of the least-recently-queried entries to make room for
 * `incomingBytes` more, so a retried write has somewhere to land.
 */
async function _evictToMakeRoomFor(incomingBytes: number): Promise<void> {
  const entries = await AvaDexie.DB.RelationCacheEntry.toArray();
  const storedBytes = entries.reduce((sum, entry) => {
    return sum + entry.byteSize;
  }, 0);
  const targetBudget = Math.max(0, storedBytes - incomingBytes);
  await _evictToBudget(targetBudget);
}

async function _write(write: RelationCacheWrite): Promise<void> {
  const tokens = await makeIdentityTokensFromIdentity(write.identity);
  const now = Date.now();
  const entry: RelationCacheEntry = {
    identityKey: tokens.identityKey,
    tableName: tokens.tableName,
    principalKey: tokens.principalKey,
    relationKind: write.identity.relation.kind,
    definitionToken: tokens.definitionToken,
    definitionKind: write.identity.definition?.kind,
    sourceVersion: write.identity.sourceVersion,
    columns: _normalizeColumns(write.columns),
    byteSize: write.payload.size,
    lastQueriedAt: now,
    writtenAt: now,
    staleAt: undefined,
    freshnessCheckedAt: undefined,
  };

  try {
    await _writeOnce(entry, write.payload);
  } catch (firstError) {
    if (!isQuotaExceededError(firstError)) {
      throw firstError;
    }
    await _evictToMakeRoomFor(write.payload.size);
    try {
      await _writeOnce(entry, write.payload);
    } catch {
      throw new RelationCacheWriteFailed(firstError);
    }
  }
}

async function _touch(identityKey: string): Promise<void> {
  await AvaDexie.DB.RelationCacheEntry.update(identityKey, {
    lastQueriedAt: Date.now(),
  });
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
  // `_write` reads its superseded siblings and deletes them: atomicity here
  // is what makes a revocation stick rather than just tidy bookkeeping. A
  // `write` for this principal landing between a bare read and a separate
  // delete transaction would create a row this scan never saw, and that row
  // would survive the eviction, letting a revoked principal keep a live
  // cache entry.
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

/**
 * The workspace-session `RelationCachePort`: two Dexie tables (metadata and
 * payload, v10 of `dexieVersions.ts`) behind one port, so a probe never
 * deserializes a blob and a byte-budget scan never reads one either.
 */
export const DexieRelationCache: RelationCachePort = {
  /**
   * Finds, in one batch, the entry that serves each requested key. Every
   * key resolves to exactly one hit or one miss; a miss carries a
   * `growFrom` candidate when a narrower live entry exists to grow.
   */
  probe: _probe,

  /** Reads a hit's payload. Never called by `probe` itself. */
  readPayload: _readPayload,

  /**
   * Stores one relation. Idempotent on the identity's `identityKey`, and,
   * in the same transaction, deletes every other entry sharing this row's
   * `(principalKey, tableName)` so at most one live entry survives. On a
   * quota-exceeded failure, evicts to make room and retries once; if the
   * retry also fails, throws `RelationCacheWriteFailed`.
   */
  write: _write,

  /** Stamps `lastQueriedAt` on a hit, without touching its payload. */
  touch: _touch,

  /** Forgets every entry for this principal and relation. */
  evict: _evict,

  /**
   * Drops least-recently-queried entries, metadata and payload together,
   * until stored bytes are at or under `budgetBytes`. Never evicts an entry
   * named in `excludeIdentityKeys`. Reads only the `RelationCacheEntry`
   * table to decide what to drop.
   */
  evictToBudget: _evictToBudget,
};
