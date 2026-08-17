import type { DatasetColumnInput } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * Converts import-time columns into the rows every dataset insert RPC takes.
 *
 * This is the single funnel every import path passes through on its way to
 * `rpc_datasets__add_dataset`, whatever the source type and whether or not the
 * user was allowed to edit the columns first. Sources differ in how they seed
 * `DatasetColumn.Imported` and in whether they expose an editor for it; none of
 * them differ in how those columns reach the database.
 */
export function toDatasetColumnInputs(
  columns: readonly DatasetColumn.Imported[],
): DatasetColumnInput[] {
  return columns.map((column) => {
    return {
      original_name: column.originalName,
      name: column.name,
      description: column.description,
      original_data_type: column.originalDataType,
      detected_data_type: column.detectedDataType,
      data_type: column.dataType,
      column_idx: column.columnIdx,
      is_data_type_user_set: column.isDataTypeUserSet,
    };
  });
}
