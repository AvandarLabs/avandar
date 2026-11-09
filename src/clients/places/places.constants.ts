import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumnInput } from "@/clients/datasets/DatasetClient/DatasetClient.types";

/** Most places one dataset holds: it is for hand-placed sites, not imports. */
export const PLACES_MAX_ROWS = 500;

/**
 * Every places column, in stored order, with the DuckDB type its SQL casts
 * to. `buildPlacesValuesSql` writes tuples in this order.
 */
export const PLACES_COLUMNS = [
  { name: "place_id", duckDbType: "VARCHAR", dataType: "varchar" },
  { name: "name", duckDbType: "VARCHAR", dataType: "varchar" },
  { name: "address", duckDbType: "VARCHAR", dataType: "varchar" },
  { name: "latitude", duckDbType: "DOUBLE", dataType: "double" },
  { name: "longitude", duckDbType: "DOUBLE", dataType: "double" },
  { name: "starts_at", duckDbType: "TIMESTAMP", dataType: "timestamp" },
  { name: "ends_at", duckDbType: "TIMESTAMP", dataType: "timestamp" },
  { name: "notes", duckDbType: "VARCHAR", dataType: "varchar" },
] as const satisfies ReadonlyArray<{
  name: string;
  duckDbType: "VARCHAR" | "DOUBLE" | "TIMESTAMP";
  dataType: AvaDataType.T;
}>;

/**
 * The `dataset_columns` a places dataset is created with. The detected type
 * equals the stored type because the `VALUES` SQL casts every value, so
 * relation loading applies no cast.
 */
export const PLACES_DATASET_COLUMNS: readonly DatasetColumnInput[] =
  PLACES_COLUMNS.map((column, columnIdx) => {
    return {
      original_name: column.name,
      name: column.name,
      description: "",
      original_data_type: column.duckDbType,
      detected_data_type: column.duckDbType,
      data_type: column.dataType,
      column_idx: columnIdx,
    };
  });
