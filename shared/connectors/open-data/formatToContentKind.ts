import type { OpenDataContentKind } from "$/connectors/open-data/acquireOpenDataResource.ts";

/**
 * Maps a CKAN resource format onto how its bytes must be read. Exported so
 * callers that need the same rule - such as the cache-aside wrapper reading
 * a cached entry's recorded format - do not reimplement it.
 */
export function formatToContentKind(format: string): OpenDataContentKind {
  return format.toLowerCase() === "parquet" ? "parquet" : "csv";
}
