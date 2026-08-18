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
 * A `snapshotRevision` may never carry the `:` principal-key delimiter, so it
 * is asserted rather than hashed: the raw value stays readable in the key.
 */
const SNAPSHOT_REVISION_PATTERN = /^[A-Za-z0-9_.-]+$/;

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
 */
export function makePrincipalKeyFromWorkspaceSession(params: {
  workspaceId: string;
  userId: string;
}): PrincipalKey {
  return `w:${params.workspaceId}:${params.userId}`;
}

/**
 * Builds the public-session principal key:
 * `p:<bucket>:<dashboardId>:<snapshotRevision>`. A published snapshot is its
 * own authorization boundary, so this form carries no user.
 *
 * @throws if `snapshotRevision` does not match `[A-Za-z0-9_.-]+`, which is
 *   what guarantees it never introduces a stray `:` delimiter into the key.
 */
export function makePrincipalKeyFromPublicSession(params: {
  bucket: string;
  dashboardId: string;
  snapshotRevision: string;
}): PrincipalKey {
  assert(
    SNAPSHOT_REVISION_PATTERN.test(params.snapshotRevision),
    `snapshotRevision "${params.snapshotRevision}" must match ${SNAPSHOT_REVISION_PATTERN}`,
  );
  return `p:${params.bucket}:${params.dashboardId}:${params.snapshotRevision}`;
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
  const versionToken = await _getVersionToken(identity.sourceVersion);
  const definitionToken = await _getDefinitionToken(identity.definition);
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
