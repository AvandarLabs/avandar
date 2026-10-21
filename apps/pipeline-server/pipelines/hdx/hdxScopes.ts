import type { EtlScope } from "@avandar/etl";

/**
 * One HDX scope: the hosted resources of one format. `resourceFormat` is
 * HDX's own label for the format, spelled exactly, because
 * `package_search`'s `res_format` filter is case-sensitive.
 */
export type HdxScope = EtlScope & Readonly<{ resourceFormat: string }>;

/**
 * The formats the HDX pipeline indexes, one scope each, crawled in this
 * order. A format added here is backfilled in full by the next incremental
 * run. Keep the keys as they are: the migration
 * `*_seed_pipeline_scope_keys_and_checkpoints.sql` seeded them, and renaming
 * one restarts that format's crawl from the beginning.
 */
export const HDX_SCOPES: readonly HdxScope[] = [
  { key: "format:csv", resourceFormat: "CSV" },
  { key: "format:parquet", resourceFormat: "Parquet" },
];
