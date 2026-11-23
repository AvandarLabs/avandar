import {
  coversColumns,
  isFreshAt,
  makeIdentityTokensFromIdentity,
  makePreparedRelationCacheKeyFromKey,
  serves,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { RelationCacheWriteFailed } from "$/models/relations/RelationCachePort/RelationCacheWriteFailed";
import { DexieRelationCacheEviction } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCacheEviction/DexieRelationCacheEviction";
import { getRelationFreshnessNow } from "@/clients/qetl/RelationCache/getRelationFreshnessNow/getRelationFreshnessNow";
import { isQuotaExceededError } from "@/clients/qetl/RelationCache/isQuotaExceededError";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import type { PreparedRelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import type { RelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type {
  RelationCacheEntry,
  RelationCachePort,
  RelationCacheProbeResult,
  RelationCacheWrite,
} from "$/models/relations/RelationCachePort/RelationCachePort.types";

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
 * acquiring fresh: same principal, table and definition, live, still fresh
 * at `freshnessNow`, and failing `serves()` on the column check alone. A
 * stale entry is never grown, since its rows are the ones being replaced.
 * By the single-live-entry rule (only one live entry can exist per
 * `(principalKey, tableName)`) at most one candidate can ever match, so more
 * than one is a violation of that rule rather than a choice to make.
 */
function _getGrowFromCandidate(
  options: Readonly<{
    candidates: readonly RelationCacheEntry[];
    prepared: PreparedRelationCacheKey;
    freshnessNow: number;
  }>,
): RelationCacheEntry | undefined {
  const { candidates, prepared, freshnessNow } = options;
  const growable = candidates.filter((entry) => {
    return (
      entry.principalKey === prepared.principalKey &&
      entry.tableName === prepared.tableName &&
      entry.definitionToken === prepared.definitionToken &&
      isFreshAt({ staleAt: entry.staleAt, now: freshnessNow }) &&
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

type PreparedProbeKey = {
  key: RelationCacheKey;
  prepared: PreparedRelationCacheKey;
};

type SortIntoHitsAndMissesOptions = {
  preparedKeys: readonly PreparedProbeKey[];
  candidates: readonly RelationCacheEntry[];
  now: number;
  freshnessNow: number;
};

/** Prepares each probed key, and lists the tables their candidates live in. */
async function _prepareProbeKeys(keys: readonly RelationCacheKey[]): Promise<{
  preparedKeys: PreparedProbeKey[];
  tableNames: string[];
}> {
  const preparedKeys = await Promise.all(
    keys.map(async (key) => {
      return { key, prepared: await makePreparedRelationCacheKeyFromKey(key) };
    }),
  );
  const tableNames = preparedKeys.map(({ prepared }) => {
    return prepared.tableName;
  });
  return { preparedKeys, tableNames: [...new Set(tableNames)] };
}

/**
 * Sorts each prepared key into a hit, stamped as queried at `now`, or a miss
 * carrying any narrower entry it could grow from. Freshness is judged at
 * `freshnessNow`.
 */
function _sortIntoHitsAndMisses(
  options: Readonly<SortIntoHitsAndMissesOptions>,
): RelationCacheProbeResult {
  const { preparedKeys, candidates, now, freshnessNow } = options;
  const result: RelationCacheProbeResult = { hits: [], misses: [] };
  preparedKeys.forEach(({ key, prepared }) => {
    const hit = candidates.find((entry) => {
      return serves({ entry, key: prepared, now: freshnessNow });
    });
    if (hit) {
      result.hits.push({ key, entry: { ...hit, lastQueriedAt: now } });
      return;
    }
    result.misses.push({
      key,
      growFrom: _getGrowFromCandidate({ candidates, prepared, freshnessNow }),
    });
  });
  return result;
}

async function _probe(
  keys: readonly RelationCacheKey[],
): Promise<RelationCacheProbeResult> {
  const { preparedKeys, tableNames } = await _prepareProbeKeys(keys);
  const now = Date.now();
  const freshnessNow = getRelationFreshnessNow();

  // The candidate read and the hit stamp run in one `rw` transaction, same
  // atomicity rationale as `DexieRelationCacheEviction`'s `evict` and
  // `evictToBudget`: without it, a concurrent `write` or `evict` could
  // delete a row between the read and the `.modify()`, and the stamp would
  // silently target a gone row. Scoped to `RelationCacheEntry` alone
  // (never `RelationCachePayload`), which is what keeps `probe` from
  // touching a payload row.
  return await AvaDexie.DB.transaction(
    "rw",
    AvaDexie.DB.RelationCacheEntry,
    async () => {
      const candidates = await AvaDexie.DB.RelationCacheEntry.where("tableName")
        .anyOf(tableNames)
        .toArray();
      const result = _sortIntoHitsAndMisses({
        preparedKeys,
        candidates,
        now,
        freshnessNow,
      });
      const hitIdentityKeys = result.hits.map(({ entry }) => {
        return entry.identityKey;
      });
      if (hitIdentityKeys.length > 0) {
        await AvaDexie.DB.RelationCacheEntry.where("identityKey")
          .anyOf(hitIdentityKeys)
          .modify({ lastQueriedAt: now });
      }
      return result;
    },
  );
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
      await DexieRelationCacheEviction.bulkDeleteEntriesAndPayloads(
        supersededKeys,
      );
      await AvaDexie.DB.RelationCacheEntry.put(entry);
      await AvaDexie.DB.RelationCachePayload.put({
        identityKey: entry.identityKey,
        parquetBlob: payload,
      });
    },
  );
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
    staleAt: write.staleAt,
    freshnessCheckedAt: undefined,
  };

  try {
    await _writeOnce(entry, write.payload);
  } catch (firstError) {
    if (!isQuotaExceededError(firstError)) {
      throw firstError;
    }
    await DexieRelationCacheEviction.evictToMakeRoomFor(write.payload.size);
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
  evict: DexieRelationCacheEviction.evict,

  /**
   * Drops least-recently-queried entries, metadata and payload together,
   * until stored bytes are at or under `budgetBytes`. Never evicts an entry
   * named in `excludeIdentityKeys`. Reads only the `RelationCacheEntry`
   * table to decide what to drop.
   */
  evictToBudget: DexieRelationCacheEviction.evictToBudget,
};
