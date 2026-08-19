import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { CkanResource } from "$/open-data/CkanClient/CkanClient.types.ts";

/**
 * Marks a token built from CKAN's content hash, which is the stronger of the
 * two inputs.
 */
const HASH_PREFIX = "ckan:hash:";

/**
 * Marks a token built from a modified time and size, used when CKAN reports no
 * hash. The prefix is not decoration: without it a resource whose hash happened
 * to equal another's modified-time string would produce an identical token and
 * read as unchanged.
 */
const MODIFIED_TIME_PREFIX = "ckan:mtime:";

/** Stands in for a size CKAN did not report, so the token stays well formed. */
const UNKNOWN_SIZE = "unknown";

/**
 * Builds an opaque change token for one CKAN resource, or undefined when the
 * resource reports nothing that could serve as one.
 *
 * Prefers the content hash, which real CKAN deployments populate for nearly
 * every resource and which is a digest of the bytes. Falls back to the modified
 * time and size, which move together when a resource is replaced.
 *
 * The result is compared for equality and never parsed, so callers must not
 * split it. It is evidence of change rather than proof of sameness: a changed
 * token means the resource changed, while an unchanged one only means the
 * source reported nothing new. The fallback form is the weaker of the two,
 * because a modified time is uploader-supplied, carries no timezone, and cannot
 * see a same-size replacement.
 */
export function buildCkanSourceVersion(
  resource: Readonly<CkanResource>,
): SourceVersion | undefined {
  const contentHash = resource.hash.trim();
  if (contentHash !== "") {
    return `${HASH_PREFIX}${contentHash}`;
  }

  const modifiedTime = resource.last_modified;
  if (modifiedTime === undefined) {
    return undefined;
  }

  const size = resource.size === undefined ? UNKNOWN_SIZE : `${resource.size}`;
  return `${MODIFIED_TIME_PREFIX}${modifiedTime}:${size}`;
}
