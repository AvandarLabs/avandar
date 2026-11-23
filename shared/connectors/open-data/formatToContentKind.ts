import type { OpenDataContentKind } from "$/connectors/open-data/OpenDataApiAccess.types.ts";

/** Maps a CKAN resource format onto how its bytes must be read. */
export function formatToContentKind(format: string): OpenDataContentKind {
  return format.toLowerCase() === "parquet" ? "parquet" : "csv";
}
