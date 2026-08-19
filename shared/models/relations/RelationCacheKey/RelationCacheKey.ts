import { assert } from "@avandar/utils";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type {
  LogicalDefinition,
  PrincipalKey,
  RelationCacheEntryFields,
  RelationCacheIdentity,
  RelationCacheKey,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.types.ts";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/**
 * The only two snapshot bucket names a public principal may embed, mirrored
 * from `SnapshotStorageUtils.PUBLIC_BUCKET_NAME` / `PRIVATE_BUCKET_NAME`
 * (`src/clients/storage/PublicDatasetParquetStorageClient/
 * SnapshotStorageUtils/`). Duplicated rather than imported because that
 * module is browser-only `src/` code, and this file is Deno-reachable:
 * `deno check shared` cannot resolve the `@/` alias. Keep these two
 * literals in sync with that module by hand.
 */
const PUBLIC_SNAPSHOT_BUCKET_NAMES: readonly string[] = [
  "published",
  "published-private",
];

/** The exact identity, resolved into the tokens `serves` compares by. */
export type RelationCacheIdentityTokens = {
  principalKey: PrincipalKey;
  tableName: string;
  versionToken: string;
  definitionToken: string;
  /** The Dexie primary key: these four tokens, pipe-joined. */
  identityKey: string;
};

/** The resolved shape `serves` compares a stored entry against. */
export type PreparedRelationCacheKey = {
  principalKey: PrincipalKey;
  tableName: string;
  definitionToken: string;
  columns: readonly string[] | "all";
};

async function _sha256Hex128(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
  return hex.slice(0, 32);
}

async function _getVersionToken(
  version: SourceVersion | undefined,
): Promise<string> {
  if (version === undefined) {
    return "v0";
  }
  return `v1.${await _sha256Hex128(version)}`;
}

async function _getDefinitionToken(
  definition: LogicalDefinition | undefined,
): Promise<string> {
  if (definition === undefined) {
    return "d0";
  }
  return `d1.${await _sha256Hex128(`${definition.kind}\n${definition.text}`)}`;
}

/**
 * Builds the workspace-session principal key: `w:<workspaceId>:<userId>`.
 *
 * `workspaceId` and `userId` are compile-time-only brands over `string`
 * with no runtime validation elsewhere (`userId` is cast straight from
 * `session.user.id`), so without a UUID check a value containing `:` could
 * make two different principals collide on one key, for example
 * `{ workspaceId: "a", userId: "b:c" }` and
 * `{ workspaceId: "a:b", userId: "c" }` both producing `"w:a:b:c"`.
 *
 * @throws if either component is not a bare UUID.
 */
export function makePrincipalKeyFromWorkspaceSession(params: {
  workspaceId: string;
  userId: string;
}): PrincipalKey {
  assert(
    RelationRef.isUuid(params.workspaceId),
    `workspaceId "${params.workspaceId}" must be a UUID`,
  );
  assert(
    RelationRef.isUuid(params.userId),
    `userId "${params.userId}" must be a UUID`,
  );
  return `w:${params.workspaceId}:${params.userId}`;
}

/**
 * Builds the public-session principal key:
 * `p:<bucket>:<dashboardId>:<snapshotRevision>`. A published snapshot is its
 * own authorization boundary, so this form carries no user.
 *
 * `dashboardId` is a compile-time-only brand over `string` with no runtime
 * validation elsewhere, and `bucket` is likewise plain `string` at this
 * boundary, so without these checks a value containing `:` in either could
 * make two different principals collide on one key, the same defect class
 * fixed for `makePrincipalKeyFromWorkspaceSession`.
 *
 * **`snapshotRevision` is percent-encoded rather than constrained.** It used
 * to be asserted against `[A-Za-z0-9_.-]+`, which no real revision satisfies:
 * the system mints ISO-8601 timestamps such as `2026-08-14T00:00:00.000Z`, and
 * the colons in those made this builder throw. Encoding removes every `:`
 * while staying injective, so the delimiter safety the assertion was protecting
 * is preserved and a real revision can actually be used. Callers that split a
 * key back apart must `decodeURIComponent` that segment.
 *
 * @throws if `bucket` is not one of the known snapshot bucket names, if
 *   `dashboardId` is not a bare UUID, or if `snapshotRevision` is empty.
 */
export function makePrincipalKeyFromPublicSession(params: {
  bucket: string;
  dashboardId: string;
  snapshotRevision: string;
}): PrincipalKey {
  assert(
    PUBLIC_SNAPSHOT_BUCKET_NAMES.includes(params.bucket),
    `bucket "${params.bucket}" must be one of ${PUBLIC_SNAPSHOT_BUCKET_NAMES.join(", ")}`,
  );
  assert(
    RelationRef.isUuid(params.dashboardId),
    `dashboardId "${params.dashboardId}" must be a UUID`,
  );
  assert(
    params.snapshotRevision.length > 0,
    "snapshotRevision must not be empty",
  );
  return `p:${params.bucket}:${params.dashboardId}:${encodeURIComponent(
    params.snapshotRevision,
  )}`;
}

/**
 * Resolves an identity into the tokens that make up its Dexie primary key.
 * The version and definition tokens are hashed verbatim: no normalization,
 * so a false hit can only happen for byte-identical input.
 */
export async function makeIdentityTokensFromIdentity(
  identity: RelationCacheIdentity,
): Promise<RelationCacheIdentityTokens> {
  const tableName = RelationRef.toTableName(identity.relation);
  const [versionToken, definitionToken] = await Promise.all([
    _getVersionToken(identity.sourceVersion),
    _getDefinitionToken(identity.definition),
  ]);
  const identityKey = [
    identity.principal,
    tableName,
    versionToken,
    definitionToken,
  ].join("|");
  return {
    principalKey: identity.principal,
    tableName,
    versionToken,
    definitionToken,
    identityKey,
  };
}

/**
 * Resolves a full cache key into the shape `serves` compares a stored entry
 * against. Separate from `makeIdentityTokensFromIdentity` only in that it
 * carries the requested columns instead of the version token, which is
 * never part of a lookup.
 */
export async function makePreparedRelationCacheKeyFromKey(
  key: RelationCacheKey,
): Promise<PreparedRelationCacheKey> {
  const tokens = await makeIdentityTokensFromIdentity(key);
  return {
    principalKey: tokens.principalKey,
    tableName: tokens.tableName,
    definitionToken: tokens.definitionToken,
    columns: key.columns,
  };
}

/**
 * Sorts and deduplicates a finite column set. `"all"` is unchanged.
 */
export function normalizeColumns(
  columns: readonly string[] | "all",
): readonly string[] | "all" {
  if (columns === "all") {
    return "all";
  }
  return [...new Set(columns)].sort();
}

/**
 * The column set that covers both sides. `"all"` absorbs anything; two
 * finite sets are sorted and deduplicated.
 */
export function unionColumnSets(
  left: readonly string[] | "all",
  right: readonly string[] | "all",
): readonly string[] | "all" {
  if (left === "all" || right === "all") {
    return "all";
  }
  return normalizeColumns([...left, ...right]);
}

/**
 * Whether a cached column set covers a requested one. `"all"` cached covers
 * anything; a finite cached set never covers a request for `"all"`. Column
 * names are compared case-sensitively by decision: DuckDB preserves case in
 * a Parquet file, so a case-insensitive comparison could claim coverage the
 * file does not have.
 */
export function coversColumns(
  cached: readonly string[] | "all",
  needed: readonly string[] | "all",
): boolean {
  if (cached === "all") {
    return true;
  }
  if (needed === "all") {
    return false;
  }
  const cachedSet = new Set(cached);
  return needed.every((column) => {
    return cachedSet.has(column);
  });
}

/**
 * The reuse predicate: whether a stored entry may serve a requested key.
 * Every comparison but column coverage is exact equality, and every
 * ambiguity resolves toward `false`, because a false hit serves unauthorized
 * or stale rows while a false miss only costs a refetch.
 */
export function serves(
  entry: Readonly<RelationCacheEntryFields>,
  key: PreparedRelationCacheKey,
): boolean {
  return (
    entry.principalKey === key.principalKey &&
    entry.tableName === key.tableName &&
    entry.definitionToken === key.definitionToken &&
    entry.staleAt === undefined &&
    coversColumns(entry.columns, key.columns)
  );
}
