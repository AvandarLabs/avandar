import type { EtlScope } from "@avandar/etl";

/**
 * One HDX scope: the resources of one format, or of every format the other
 * scopes leave out. `resourceFormat` is HDX's own label for the format,
 * spelled exactly, because `package_search`'s `res_format` filter is
 * case-sensitive. A scope with no `resourceFormat` searches every dataset
 * and keeps the resources whose format is not in `excludedFormats`.
 */
export type HdxScope = EtlScope &
  Readonly<{
    resourceFormat: string | undefined;
    excludedFormats?: readonly string[];
  }>;

/**
 * The scopes the HDX pipeline indexes, crawled in this order. A scope added
 * here is backfilled in full by the next incremental run. Keep the keys as
 * they are: the migration `*_seed_pipeline_scope_keys_and_checkpoints.sql`
 * seeded the format keys, and renaming one restarts that scope's crawl from
 * the beginning.
 *
 * Only CSV and Parquet can be added to a workspace. `format:other` lists
 * every other resource as unloadable, so it still shows up in the catalog.
 */
export const HDX_SCOPES: readonly HdxScope[] = [
  { key: "format:csv", resourceFormat: "CSV" },
  { key: "format:parquet", resourceFormat: "Parquet" },
  {
    key: "format:other",
    resourceFormat: undefined,
    excludedFormats: ["CSV", "Parquet"],
  },
];
