import type { ListingRowValues } from "@etl/stores/EtlStores.types";

/**
 * Builds a string that identifies a listing the same way the listings
 * table's conflict targets do: `(api_service, api_base_url,
 * external_dataset_id, api_resource_id)` for an `api_resource` row, and
 * `(pipeline_name, parquet_file_name)` for a `pipeline_parquet` row.
 */
export function buildListingKeyFromRow(
  row: Pick<
    ListingRowValues,
    | "access_kind"
    | "api_service"
    | "api_base_url"
    | "external_dataset_id"
    | "api_resource_id"
    | "pipeline_name"
    | "parquet_file_name"
  >,
): string {
  return row.access_kind === "api_resource" ?
      JSON.stringify([
        row.access_kind,
        row.api_service,
        row.api_base_url,
        row.external_dataset_id,
        row.api_resource_id,
      ])
    : JSON.stringify([
        row.access_kind,
        row.pipeline_name,
        row.parquet_file_name,
      ]);
}
