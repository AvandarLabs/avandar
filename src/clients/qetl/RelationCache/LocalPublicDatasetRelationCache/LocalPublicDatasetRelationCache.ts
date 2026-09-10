import { assert } from "@avandar/utils";
import {
  makePreparedRelationCacheKeyFromKey,
  makePrincipalKeyFromPublicSession,
  serves,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { RelationCacheWriteFailed } from "$/models/relations/RelationCachePort/RelationCacheWriteFailed";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { isQuotaExceededError } from "@/clients/qetl/RelationCache/isQuotaExceededError";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  PrincipalKey,
  RelationCacheEntryFields,
  RelationCacheKey,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type {
  RelationCacheEntry,
  RelationCachePort,
  RelationCacheProbeResult,
  RelationCacheWrite,
} from "$/models/relations/RelationCachePort/RelationCachePort.types";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { LocalPublicDataset } from "@/models/LocalPublicDataset/LocalPublicDataset";

/**
 * Placeholder `definitionToken` for every entry this port serves. A public
 * snapshot has no logical definition: the whole downloaded parquet file is
 * the answer regardless of what SQL a caller thinks it is running over the
 * relation, so this token is never compared against a request's own token.
 */
const NO_DEFINITION_TOKEN = "none";

/** The decoded parts of a public-session principal key. */
type PublicPrincipalParts = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  snapshotRevision: string;
};

/**
 * Decodes a public-session principal key
 * (`p:<bucket>:<dashboardId>:<snapshotRevision>`) into its parts, or
 * `undefined` when `principal` is not that form. A workspace-session
 * principal (`w:<workspaceId>:<userId>`) always fails this check before any
 * `LocalPublicDataset` row is even read, which is what keeps this port
 * structurally unable to serve one. None of the three segments can contain the
 * `:` delimiter: the bucket is a closed enum, `dashboardId` is a UUID, and
 * `makePrincipalKeyFromPublicSession` percent-encodes `snapshotRevision`. That
 * last one is why the revision segment is decoded here before anything
 * compares it against a row, whose `snapshotRevision` column holds the raw
 * value. A round trip through the same builder then confirms the split
 * recovered the parts losslessly rather than merely looking plausible.
 */
function _parsePublicPrincipalKey(
  principal: PrincipalKey,
): PublicPrincipalParts | undefined {
  const segments = principal.split(":");
  if (segments.length !== 4 || segments[0] !== "p") {
    return undefined;
  }
  const [, bucket, dashboardId, snapshotRevision] = segments;
  if (
    (bucket !== SnapshotStorageUtils.PUBLIC_BUCKET_NAME &&
      bucket !== SnapshotStorageUtils.PRIVATE_BUCKET_NAME) ||
    dashboardId === undefined ||
    snapshotRevision === undefined
  ) {
    return undefined;
  }
  const candidate: PublicPrincipalParts = {
    bucket,
    dashboardId: dashboardId as Dashboard.Id,
    snapshotRevision: decodeURIComponent(snapshotRevision),
  };
  try {
    if (makePrincipalKeyFromPublicSession(candidate) !== principal) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return candidate;
}

/**
 * The Dexie primary key for a `LocalPublicDataset` row, pipe-joined. Neither
 * component can carry `|` (both are UUIDs), so the join is lossless.
 */
function _makeIdentityKeyFromRow(row: LocalPublicDataset.Read): string {
  return `${row.dashboardId}|${row.datasetId}`;
}

/** The inverse of `_makeIdentityKeyFromRow`, or `undefined` if malformed. */
function _parseIdentityKey(
  identityKey: string,
): { dashboardId: Dashboard.Id; datasetId: Dataset.Id } | undefined {
  const segments = identityKey.split("|");
  const [dashboardId, datasetId] = segments;
  const isWellFormed =
    segments.length === 2 &&
    dashboardId !== undefined &&
    datasetId !== undefined;
  if (!isWellFormed) {
    return undefined;
  }
  return {
    dashboardId: dashboardId as Dashboard.Id,
    datasetId: datasetId as Dataset.Id,
  };
}

/**
 * Rebuilds a row's own principal key from its `bucket` and
 * `snapshotRevision`, or `undefined` if either is missing (a row can predate
 * the columns being populated). Reusing the same builder that produces a
 * request's principal is what makes `_rowServesKey`'s comparison exact
 * string equality rather than a hand-rolled field-by-field check.
 */
function _getPrincipalKeyFromRow(
  row: LocalPublicDataset.Read,
): PrincipalKey | undefined {
  if (row.bucket === undefined || row.snapshotRevision === undefined) {
    return undefined;
  }
  return makePrincipalKeyFromPublicSession({
    bucket: row.bucket,
    dashboardId: row.dashboardId,
    snapshotRevision: row.snapshotRevision,
  });
}

/**
 * Builds the `RelationCacheEntry` this port hands back for a servable row.
 * `columns` is always `"all"` and `definitionToken` is the fixed sentinel:
 * a published snapshot has no column projection and no logical definition
 * to distinguish, so neither field is ever compared at lookup.
 */
function _makeEntryFromRow(row: LocalPublicDataset.Read): RelationCacheEntry {
  const principalKey = _getPrincipalKeyFromRow(row);
  assert(
    principalKey !== undefined,
    "a servable LocalPublicDataset row must carry both bucket and " +
      "snapshotRevision",
  );
  return {
    identityKey: _makeIdentityKeyFromRow(row),
    principalKey,
    tableName: RelationRef.toTableName({ kind: "dataset", id: row.datasetId }),
    relationKind: "dataset",
    definitionToken: NO_DEFINITION_TOKEN,
    definitionKind: undefined,
    sourceVersion: row.snapshotRevision,
    columns: "all",
    staleAt: undefined,
    byteSize: row.parquetData.size,
    lastQueriedAt: Date.now(),
    writtenAt: new Date(row.downloadedAt).getTime(),
    freshnessCheckedAt: undefined,
  };
}

/**
 * Whether `row` may serve `key`, decided by the shared `serves()` predicate
 * rather than a second, hand-rolled equality check: if `serves()` ever
 * learns to compare a new field (a revocation flag, say), this port picks
 * that up automatically instead of silently carrying a stale copy of the
 * old rule.
 *
 * Two fields are given values chosen for this port rather than derived from
 * `row`: `columns` is always `"all"`, because the row is the complete
 * snapshot file and so covers any column request; `definitionToken` is
 * copied from `key`'s own prepared token rather than the row's, because a
 * published snapshot has no logical definition to distinguish and copying
 * the request's token makes that comparison a deliberate no-op instead of a
 * false constraint that would reject every request. `staleAt` is always
 * `undefined`: this port has no staleness concept of its own, a
 * superseding write is what retires an old row.
 */
async function _rowServesKey(
  row: LocalPublicDataset.Read,
  key: RelationCacheKey,
): Promise<boolean> {
  const principalKey = _getPrincipalKeyFromRow(row);
  if (principalKey === undefined) {
    return false;
  }
  const prepared = await makePreparedRelationCacheKeyFromKey(key);
  const entryFields: RelationCacheEntryFields = {
    principalKey,
    tableName: RelationRef.toTableName({ kind: "dataset", id: row.datasetId }),
    definitionToken: prepared.definitionToken,
    columns: "all",
    staleAt: undefined,
  };
  return serves(entryFields, prepared);
}

/**
 * Finds the one row, if any, that serves `key`. Only a `"dataset"` relation
 * can ever match (this port never stores a concept). `_parsePublicPrincipalKey`
 * is used here only to pick which row to fetch efficiently by primary key;
 * the actual serve decision is `_rowServesKey`, so a principal that fails to
 * parse simply has no candidate to fetch rather than being rejected by a
 * security-critical branch of its own.
 */
async function _getServingRow(
  key: RelationCacheKey,
): Promise<LocalPublicDataset.Read | undefined> {
  if (key.relation.kind !== "dataset") {
    return undefined;
  }
  const parts = _parsePublicPrincipalKey(key.principal);
  if (parts === undefined) {
    return undefined;
  }
  const row = await AvaDexie.DB.LocalPublicDataset.get([
    parts.dashboardId,
    key.relation.id,
  ]);
  if (row === undefined || !(await _rowServesKey(row, key))) {
    return undefined;
  }
  return row;
}

/**
 * Finds, in one batch, the entry that serves each of `keys`. There is no
 * column projection on this port, so a miss never carries a `growFrom`:
 * there is no narrower entry to grow, only a full snapshot or nothing.
 */
async function _probe(
  keys: readonly RelationCacheKey[],
): Promise<RelationCacheProbeResult> {
  const rows = await Promise.all(
    keys.map((key) => {
      return _getServingRow(key);
    }),
  );
  const result: RelationCacheProbeResult = { hits: [], misses: [] };
  keys.forEach((key, index) => {
    const row = rows[index];
    if (row !== undefined) {
      result.hits.push({ key, entry: _makeEntryFromRow(row) });
      return;
    }
    result.misses.push({ key, growFrom: undefined });
  });
  return result;
}

/** Reads a hit's payload straight off the row `entry.identityKey` names. */
async function _readPayload(
  entry: RelationCacheEntry,
): Promise<Blob | undefined> {
  const identity = _parseIdentityKey(entry.identityKey);
  if (identity === undefined) {
    return undefined;
  }
  const row = await AvaDexie.DB.LocalPublicDataset.get([
    identity.dashboardId,
    identity.datasetId,
  ]);
  return row?.parquetData;
}

/**
 * A documented no-op. `LocalPublicDataset` carries no last-queried column,
 * and `evictToBudget` on this port orders eviction by `downloadedAt` rather
 * than access recency (see its own docstring for why), so there is no state
 * a touch could ever influence either way. Kept as a real function, rather
 * than omitted, only because `RelationCachePort` requires one.
 */
async function _touch(): Promise<void> {}

async function _putRow(row: LocalPublicDataset.Read): Promise<void> {
  await AvaDexie.DB.LocalPublicDataset.put(row);
}

/**
 * The oldest-downloaded-first prefix of `rows` whose removal brings the
 * running total at or under `budgetBytes`, skipping every row named in
 * `excludeIdentityKeys`. Pure so the eviction order is easy to test without
 * touching Dexie, matching `DexieRelationCache`'s `_selectEvictionVictims`.
 */
function _selectEvictionVictims(
  rows: readonly LocalPublicDataset.Read[],
  budgetBytes: number,
  excludeIdentityKeys: ReadonlySet<string>,
): Array<[Dashboard.Id, Dataset.Id]> {
  const sortedByAge = [...rows].sort((a, b) => {
    return (
      new Date(a.downloadedAt).getTime() - new Date(b.downloadedAt).getTime()
    );
  });
  const totalBytes = sortedByAge.reduce((sum, row) => {
    return sum + row.parquetData.size;
  }, 0);
  const { victimKeys } = sortedByAge.reduce<{
    remainingBytes: number;
    victimKeys: Array<[Dashboard.Id, Dataset.Id]>;
  }>(
    (acc, row) => {
      if (acc.remainingBytes <= budgetBytes) {
        return acc;
      }
      if (excludeIdentityKeys.has(_makeIdentityKeyFromRow(row))) {
        return acc;
      }
      return {
        remainingBytes: acc.remainingBytes - row.parquetData.size,
        victimKeys: [
          ...acc.victimKeys,
          [row.dashboardId, row.datasetId] as [Dashboard.Id, Dataset.Id],
        ],
      };
    },
    { remainingBytes: totalBytes, victimKeys: [] },
  );
  return victimKeys;
}

/**
 * Drops least-recently-downloaded rows until stored bytes are at or under
 * `budgetBytes`. Never evicts a row named in `excludeIdentityKeys`, even if
 * the budget cannot be met as a result.
 *
 * Orders by `downloadedAt` rather than a last-queried timestamp, because
 * `LocalPublicDataset` has no such column and this port may not add one. A
 * snapshot's bytes are re-downloadable from object storage on the next
 * probe miss, so evicting the wrong row costs a re-fetch, not data loss.
 * This is what keeps the cache from growing without bound in the absence of
 * a proactive scheduler: `write` below calls this on a quota-exceeded
 * retry, and any caller that wants to bound growth ahead of that point can
 * call it directly with its own budget.
 */
async function _evictToBudget(
  budgetBytes: number,
  excludeIdentityKeys: ReadonlySet<string> = new Set(),
): Promise<void> {
  const rows = await AvaDexie.DB.LocalPublicDataset.toArray();
  const victimKeys = _selectEvictionVictims(
    rows,
    budgetBytes,
    excludeIdentityKeys,
  );
  if (victimKeys.length > 0) {
    await AvaDexie.DB.LocalPublicDataset.bulkDelete(victimKeys);
  }
}

/**
 * Evicts just enough of the least-recently-downloaded rows to make room for
 * `incomingBytes` more, so a retried write has somewhere to land.
 */
async function _evictToMakeRoomFor(incomingBytes: number): Promise<void> {
  const rows = await AvaDexie.DB.LocalPublicDataset.toArray();
  const storedBytes = rows.reduce((sum, row) => {
    return sum + row.parquetData.size;
  }, 0);
  const targetBudget = Math.max(0, storedBytes - incomingBytes);
  await _evictToBudget(targetBudget);
}

/**
 * Describes a rejected principal's shape without embedding its content: a
 * principal string can carry a real `workspaceId` and `userId` (the
 * workspace form) or a real `dashboardId` (the public form), and an error
 * message is exactly the kind of place that content leaks into a console
 * or an error tracker. Only the leading `p:`/`w:` discriminator, which
 * identifies no one, is safe to surface.
 */
function _describePrincipalShape(principal: PrincipalKey): string {
  if (principal.startsWith("w:")) {
    return "a workspace-session (w:…) principal";
  }
  if (principal.startsWith("p:")) {
    return "a malformed public-session (p:…) principal";
  }
  return "a principal in neither the public nor workspace form";
}

/**
 * Stores one downloaded snapshot. This port only ever holds a `"dataset"`
 * relation under a public-session principal, so both are validated before
 * anything is written: a concept relation or a workspace-session principal
 * throws rather than being silently coerced into something servable.
 * `LocalPublicDataset`'s own primary key is `[dashboardId, datasetId]` with
 * no version component, so writing a new snapshotRevision for the same
 * dashboard and dataset naturally overwrites the previous row: the single
 * live-entry rule this port needs is a side effect of the existing schema,
 * not logic this function has to enforce itself. On a quota-exceeded
 * failure, evicts to make room and retries once; if the retry also fails,
 * throws `RelationCacheWriteFailed`.
 */
async function _write(write: RelationCacheWrite): Promise<void> {
  if (write.identity.relation.kind !== "dataset") {
    throw new Error(
      `LocalPublicDatasetRelationCache only stores "dataset" relations, ` +
        `got "${write.identity.relation.kind}"`,
    );
  }
  const parts = _parsePublicPrincipalKey(write.identity.principal);
  if (parts === undefined) {
    throw new Error(
      `LocalPublicDatasetRelationCache only accepts a public-session ` +
        `principal, got ${_describePrincipalShape(write.identity.principal)}`,
    );
  }
  const row: LocalPublicDataset.Read = {
    dashboardId: parts.dashboardId,
    datasetId: write.identity.relation.id,
    bucket: parts.bucket,
    snapshotRevision: parts.snapshotRevision,
    parquetData: write.payload,
    downloadedAt: new Date().toISOString(),
  };

  try {
    await _putRow(row);
  } catch (firstError) {
    if (!isQuotaExceededError(firstError)) {
      throw firstError;
    }
    await _evictToMakeRoomFor(write.payload.size);
    try {
      await _putRow(row);
    } catch {
      throw new RelationCacheWriteFailed(firstError);
    }
  }
}

/**
 * Forgets every row for `principal` naming one of `refs`. A `refs` entry
 * that is not a `"dataset"` relation is ignored (this port never stores
 * one), and a `principal` that does not decode as a public-session
 * principal is a no-op, since nothing of this port's could ever be stored
 * under it.
 */
async function _evict(
  refs: readonly RelationRef.T[],
  principal: PrincipalKey,
): Promise<void> {
  const parts = _parsePublicPrincipalKey(principal);
  if (parts === undefined) {
    return;
  }
  const datasetIds = new Set(
    refs
      .filter((ref) => {
        return ref.kind === "dataset";
      })
      .map((ref) => {
        return ref.id;
      }),
  );
  if (datasetIds.size === 0) {
    return;
  }
  const rows = await AvaDexie.DB.LocalPublicDataset.where("dashboardId")
    .equals(parts.dashboardId)
    .toArray();
  const victimKeys = rows
    .filter((row) => {
      return (
        datasetIds.has(row.datasetId) &&
        row.bucket === parts.bucket &&
        row.snapshotRevision === parts.snapshotRevision
      );
    })
    .map((row) => {
      return [row.dashboardId, row.datasetId] as [Dashboard.Id, Dataset.Id];
    });
  if (victimKeys.length > 0) {
    await AvaDexie.DB.LocalPublicDataset.bulkDelete(victimKeys);
  }
}

/**
 * The public-session `RelationCachePort`: the existing `LocalPublicDataset`
 * table behind the same port interface `DexieRelationCache` implements for
 * workspace sessions. A published snapshot is immutable and fully
 * identified by `(dashboardId, datasetId, snapshotRevision)`, so this port
 * needs no freshness token, no logical definition and no column
 * projection, unlike its workspace sibling. Because the two ports are
 * separate implementations behind one interface, a public session is
 * structurally unable to read a workspace-cached relation: there is no code
 * path here that ever touches `RelationCacheEntry` or `RelationCachePayload`.
 */
export const LocalPublicDatasetRelationCache: RelationCachePort = {
  /**
   * Finds, in one batch, the entry that serves each requested key. Every
   * key resolves to exactly one hit or one miss; a miss never carries a
   * `growFrom`, because there is no column projection to grow from.
   */
  probe: _probe,

  /** Reads a hit's payload straight off its `LocalPublicDataset` row. */
  readPayload: _readPayload,

  /**
   * Stores one downloaded snapshot. Throws if the relation is not a
   * `"dataset"` or the principal is not a public-session principal. On a
   * quota-exceeded failure, evicts to make room and retries once; if the
   * retry also fails, throws `RelationCacheWriteFailed`.
   */
  write: _write,

  /**
   * A documented no-op: this port has no last-queried state for a touch to
   * update, and its eviction order does not depend on one.
   */
  touch: _touch,

  /** Forgets every row for this principal naming one of `refs`. */
  evict: _evict,

  /**
   * Drops least-recently-downloaded rows until stored bytes are at or under
   * `budgetBytes`. Never evicts a row named in `excludeIdentityKeys`.
   */
  evictToBudget: _evictToBudget,
};
